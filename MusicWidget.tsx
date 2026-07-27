import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, MoreHorizontal, Trash2, X, List, SkipBack, SkipForward, Play, Pause, Volume2, VolumeX, Plus, Link, ExternalLink } from 'lucide-react';
import { isTauri, downloadYtAudio, extractYtAudio, extractPlaylistInfo, cleanupAudio, proxyFetch, fetchImageBase64, searchYoutubeViaYtdlp } from '../lib/tauri-api';

const STORAGE_KEY = 'music_playlist';
const STORAGE_IDX = 'music_current_idx';
const STORAGE_VOLUME = 'music_volume';
const YT_API_KEY = 'youtube_api_key';

function getYoutubeApiKey(): string {
  return localStorage.getItem(YT_API_KEY) || '';
}

interface Track {
  id: string;
  title: string;
  artist: string;
  url: string;
  thumbnail?: string;
}

interface MusicWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

function isValidUrl(input: string): boolean {
  const trimmed = input.trim();
  try {
    const u = new URL(trimmed);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

function isDirectAudio(input: string): boolean {
  return /\.(mp3|wav|ogg|flac|aac|m4a|webm)($|\?)/i.test(input);
}

// YouTube thumbnails — free, no API key needed.
// Uses mqdefault (320x180) for playlist items, hqdefault for now-playing.
function ytThumb(id: string): string {
  return `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;
}

// ─── Thumbnail Proxy ──────────────────────────────────────────────
// WebView2 blocks <img> tags from loading cross-origin URLs (i.ytimg.com,
// i.scdn.co, etc.) even when CSP img-src allows https:. This function
// downloads the image in Rust via fetch_image_base64 and returns a base64
// data: URL that the WebView can always render.
//
// On error (network timeout, 404, etc.) returns the original URL so the
// browser can attempt direct loading as a last resort.
async function proxyThumb(url: string): Promise<string> {
  if (!isTauri || !url) return url;
  try {
    const result = await fetchImageBase64(url);
    return result || url;
  } catch (e) {
    console.warn('[Music] Thumbnail proxy failed:', e);
    return url;
  }
}

// ProxiedImg — renders a cross-origin image safely through the Rust backend.
//
// How it works:
// 1. On mount, calls proxyThumb(src) which downloads the image in Rust.
// 2. If the proxy succeeds, swaps <img src> to the base64 data URL.
// 3. If the proxy fails, keeps the original HTTPS URL (browser may load it
//    directly if CSP allows, otherwise shows a broken image).
// 4. Cleanup: cancels the proxy call if the component unmounts or src changes.
function ProxiedImg({ src, className, alt, loading }: { src: string; className?: string; alt?: string; loading?: string }) {
  const [realSrc, setRealSrc] = React.useState(src);
  React.useEffect(() => {
    if (!src) return;
    let cancelled = false;
    proxyThumb(src).then(proxied => {
      if (!cancelled) setRealSrc(proxied || src);
    });
    return () => { cancelled = true; };
  }, [src]);
  if (!realSrc) return null;
  return <img src={realSrc} alt={alt || ''} className={className} loading={loading as any} />;
}

function extractVideoIdFromUrl(url: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(url)) return url;
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('/')[0];
    if (u.searchParams.has('v')) return u.searchParams.get('v');
    const m = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
    if (m) return m[1];
  } catch {}
  return null;
}

async function searchYouTube(query: string): Promise<{ id: string; title: string; channel: string; thumbnail: string } | null> {
  const key = getYoutubeApiKey();
  if (!key) return null;
  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=5&q=${encodeURIComponent(query)}&key=${key}`,
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    if (data.error) {
      console.warn('[Music] YouTube API error:', data.error.message);
      return null;
    }
    if (data.items?.length > 0) {
      const item = data.items[0];
      const thumb = item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '';
      return { id: item.id.videoId, title: item.snippet.title || query, channel: item.snippet.channelTitle || 'YouTube', thumbnail: thumb };
    }
  } catch {}
  return null;
}

const JAMENDO_CLIENT_ID = '709fa152';

async function searchJamendo(query: string): Promise<{ id: string; title: string; artist: string; audio: string; thumbnail: string } | null> {
  try {
    const jamendoUrl = `https://api.jamendo.com/v3.0/tracks/?client_id=${JAMENDO_CLIENT_ID}&format=json&limit=3&search=${encodeURIComponent(query)}&include=musicinfo`;
    let data: any;
    if (isTauri) {
      const text = await proxyFetch(jamendoUrl);
      data = JSON.parse(text);
    } else {
      const res = await fetch(jamendoUrl, { signal: AbortSignal.timeout(10000) });
      data = await res.json();
    }
    if (data.results?.length > 0) {
      const t = data.results[0];
      const thumb = t.album_image || t.image || '';
      return { id: String(t.id), title: t.name || query, artist: t.artist_name || 'Jamendo', audio: t.audio, thumbnail: thumb };
    }
  } catch (e) {
    console.warn('[Music] Jamendo API error:', e);
  }
  return null;
}

function getPlatform(url: string): string {
  if (url.includes('soundcloud.com')) return 'SoundCloud';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('spotify.com') || url.includes('spotify:')) return 'Spotify';
  if (url.includes('jamendo.com') || url.includes('storage.jamendo.com')) return 'Jamendo';
  return 'Custom';
}

function extractSpotifyId(url: string): { type: string; id: string } | null {
  try {
    const u = new URL(url.replace('spotify:', 'https://open.spotify.com/'));
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { type: parts[0], id: parts[1] };
    }
  } catch {}
  return null;
}

function isSpotifyUrl(url: string): boolean {
  return url.includes('spotify.com') || url.includes('spotify:');
}

async function fetchSpotifyOEmbed(trackId: string): Promise<{ title: string; artist: string; thumbnail: string } | null> {
  try {
    const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;
    let data: any;
    if (isTauri) {
      // Use Rust-side fetch to avoid CORS issues
      const text = await proxyFetch(oembedUrl);
      data = JSON.parse(text);
    } else {
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      data = await res.json();
    }
    const title = data.title || 'Spotify Track';
    const artist = data.author_name || 'Spotify';
    const thumbnail = data.thumbnail_url || '';
    return { title, artist, thumbnail };
  } catch {
    return null;
  }
}

async function searchYouTubeForSpotifyTrack(title: string, artist: string): Promise<{ id: string; title: string; channel: string; thumbnail: string } | null> {
  const query = `${artist} ${title} audio`;
  return searchYouTube(query);
}

function extractPlaylistId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.searchParams.has('list')) return u.searchParams.get('list');
  } catch {}
  return null;
}

async function fetchYouTubePlaylist(playlistId: string): Promise<{ id: string; title: string; channel: string; thumbnail: string }[]> {
  const key = getYoutubeApiKey();
  if (!key) return [];
  const all: { id: string; title: string; channel: string; thumbnail: string }[] = [];
  let pageToken = '';
  try {
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${key}${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
      const data = await res.json();
      if (data.error) {
        console.warn('[Music] YouTube Playlist API error:', data.error.message);
        break;
      }
      if (data.items?.length > 0) {
        for (const item of data.items) {
          if (item.snippet.resourceId?.kind === 'youtube#video') {
            const s = item.snippet;
            all.push({ id: s.resourceId.videoId, title: s.title || 'YouTube Video', channel: s.channelTitle || 'YouTube', thumbnail: s.thumbnails?.medium?.url || s.thumbnails?.default?.url || '' });
          }
        }
      }
      pageToken = data.nextPageToken || '';
    } while (pageToken);
  } catch (e) {
    console.warn('[Music] YouTube Playlist fetch error:', e);
  }
  return all;
}

function extractTitle(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').pop() || 'Track';
    return decodeURIComponent(filename).replace(/\.\w+$/, '').replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  } catch {
    return 'Untitled Track';
  }
}

// ─── YouTube: Open in System Browser ──────────────────────────────
// YouTube embeds are blocked in Electron. We show the thumbnail in the
// widget and open the video in the user's default browser on play.

function loadJson<T>(key: string, fallback: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
}

// Module-level singletons — survive component unmount during drag
let _sharedAudio: HTMLAudioElement | null = null;
const _sharedUrlCache = new Map<string, string>();
function getSharedAudio() {
  if (!_sharedAudio) { _sharedAudio = new Audio(); _sharedAudio.preload = 'metadata'; }
  return _sharedAudio;
}

export default function MusicWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: MusicWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => loadJson<Track | null>(STORAGE_KEY + '_current', null));
  const [playlist, setPlaylist] = useState<Track[]>(() => loadJson<Track[]>(STORAGE_KEY, []));
  const [currentIndex, setCurrentIndex] = useState<number>(() => loadJson<number>(STORAGE_IDX, -1));
  const [isPlaying, setIsPlaying] = useState(() => loadJson<boolean>(STORAGE_KEY + '_playing', false));
  const [volume, setVolume] = useState<number>(() => loadJson<number>(STORAGE_VOLUME, 50));
  const [isMuted, setIsMuted] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [ytLoading, setYtLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; title: string; channel: string; thumbnail: string; url: string }[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(getSharedAudio());
  const playerModeRef = useRef<'audio' | 'youtube'>('audio');
  const playlistRef = useRef<Track[]>([]);
  const currentIndexRef = useRef(-1);
  const audioUrlCache = useRef(_sharedUrlCache);

  const isTauriEnv = isTauri;

  const toggleMenu = (val: boolean) => { setIsMenuOpen(val); onMenuToggle?.(val); };

  useEffect(() => { playlistRef.current = playlist; }, [playlist]);
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlist));
  }, [playlist]);
  useEffect(() => {
    localStorage.setItem(STORAGE_IDX, JSON.stringify(currentIndex));
  }, [currentIndex]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_current', JSON.stringify(currentTrack));
  }, [currentTrack]);
  useEffect(() => {
    localStorage.setItem(STORAGE_VOLUME, JSON.stringify(volume));
  }, [volume]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY + '_playing', JSON.stringify(isPlaying));
  }, [isPlaying]);

  function cleanupTempAudio() {
    if (isTauriEnv) cleanupAudio();
  }

  // ─── YouTube Audio Playback ───────────────────────────────────────
  // extractAndPlay downloads audio from YouTube via yt-dlp and plays it
  // through the HTML5 Audio element. Two strategies are tried in order:
  //
  // 1. downloadYtAudio (primary): Downloads full MP3 to temp dir, reads
  //    it into a base64 data URL. Most reliable but slower for long videos.
  //    The data URL is cached per video ID so replays are instant.
  //
  // 2. extractYtAudio (fallback): Gets a direct streaming URL from yt-dlp
  //    and sets it as the audio src. Faster but URLs expire after ~6 hours.
  //
  // The audio element is a module-level singleton that survives component
  // unmounts during drag-and-drop reordering.
  const extractAndPlay = useCallback(async (track: Track, index: number) => {
    setCurrentTrack(track);
    setCurrentIndex(index);
    playerModeRef.current = 'youtube';
    const cacheKey = track.id || track.url;

    // Check cache first — instant playback
    const cached = audioUrlCache.current.get(cacheKey);
    if (cached && audioRef.current) {
      audioRef.current.src = cached;
      audioRef.current.play().catch(() => setIsPlaying(false));
      return;
    }

    setYtLoading(true);
    try {
      // Download actual audio file via yt-dlp, get base64 data URL
      const dataUrl = await downloadYtAudio(track.url);
      if (dataUrl && audioRef.current) {
        audioUrlCache.current.set(cacheKey, dataUrl);
        audioRef.current.src = dataUrl;
        audioRef.current.play().catch(() => setIsPlaying(false));
      } else {
        console.warn('[Music] yt-dlp returned no data');
      }
    } catch (e) {
      console.warn('[Music] yt-dlp download failed, trying streaming URL:', e);
      // Fallback: try the old streaming URL approach
      try {
        const streamUrl = await extractYtAudio(track.url);
        if (streamUrl && audioRef.current) {
          audioUrlCache.current.set(cacheKey, streamUrl);
          audioRef.current.src = streamUrl;
          audioRef.current.play().catch(() => setIsPlaying(false));
          return;
        }
      } catch {}
    } finally {
      setYtLoading(false);
    }
  }, []);

  const playTrack = useCallback((track: Track, index?: number) => {
    const idx = typeof index === 'number' ? index : currentIndexRef.current;
    setCurrentTrack(track);
    if (typeof index === 'number') setCurrentIndex(index);

    const ytId = extractVideoIdFromUrl(track.url) || (track.artist === 'YouTube' ? track.id : null);
    if (ytId && isTauriEnv) {
      extractAndPlay(track, idx);
    } else {
      playerModeRef.current = 'audio';
      const audio = audioRef.current;
      if (audio) {
        audio.src = track.url;
        audio.play().catch(() => setIsPlaying(false));
      }
    }
  }, [extractAndPlay, isTauriEnv]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    const next = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    playTrack(playlist[next], next);
  }, [playlist, currentIndex, playTrack]);

  const playPrev = useCallback(() => {
    if (playlist.length === 0) return;
    const prev = currentIndex > 0 ? currentIndex - 1 : playlist.length - 1;
    playTrack(playlist[prev], prev);
  }, [playlist, currentIndex, playTrack]);

  const togglePlayPause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;
    if (isPlaying) audio.pause(); else audio.play().catch(() => {});
  }, [isPlaying, currentTrack]);

  // ─── HTML5 Audio Setup ────────────────────────────────────────────
  useEffect(() => {
    const audio = audioRef.current;
    let playStartTime = 0;

    const onPlay = () => { setIsPlaying(true); playStartTime = Date.now(); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      const elapsed = Date.now() - playStartTime;
      const pl = playlistRef.current;
      const ci = currentIndexRef.current;
      if (elapsed < 2000) {
        console.warn('[Music] Audio ended too quickly, not auto-advancing');
        return;
      }
      if (pl.length > 0 && ci < pl.length - 1) {
        playTrack(pl[ci + 1], ci + 1);
      } else if (pl.length > 0) {
        playTrack(pl[0], 0);
      }
    };
    const onError = () => {
      setIsPlaying(false);
      setYtLoading(false);
    };

    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('error', onError);

    return () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('error', onError);
    };
  }, [playTrack]);

  // ─── Pre-load next track ────────────────────────────────────────
  useEffect(() => {
    if (!isTauriEnv || playlist.length === 0) return;
    const nextIdx = currentIndex < playlist.length - 1 ? currentIndex + 1 : 0;
    const nextTrack = playlist[nextIdx];
    if (!nextTrack) return;
    const cacheKey = nextTrack.id || nextTrack.url;
    if (audioUrlCache.current.has(cacheKey)) return;
    const isYT = extractVideoIdFromUrl(nextTrack.url) || nextTrack.artist === 'YouTube';
    if (!isYT) return;
    downloadYtAudio(nextTrack.url).then(dataUrl => {
      if (dataUrl) audioUrlCache.current.set(cacheKey, dataUrl);
    }).catch(() => {});
  }, [currentIndex, playlist]);

  // ─── Volume Control ───────────────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted]);

  // ─── AI Tool Control Events ───────────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.action === 'play' && detail.video) {
        const v = detail.video;
        const vid = extractVideoIdFromUrl(v.url || v.id || '');
        if (vid) {
          const track: Track = { id: vid, title: v.title || 'YouTube Video', artist: v.channel || 'YouTube', url: v.url || `https://www.youtube.com/watch?v=${vid}` };
          setPlaylist(prev => {
            const exists = prev.find(t => t.id === vid);
            if (exists) return prev;
            return [...prev, track];
          });
          const idx = playlistRef.current.length;
          setCurrentTrack(track);
          if (isTauriEnv) {
            extractAndPlay(track, idx);
          } else {
            playerModeRef.current = 'youtube';
            setIsPlaying(true);
          }
        }
      }
      if (detail.action === 'pause') {
        audioRef.current?.pause();
        setIsPlaying(false);
      }
      if (detail.action === 'resume') {
        audioRef.current?.play().catch(() => {});
        setIsPlaying(true);
      }
    };
    window.addEventListener('youtube-music-control', handler);
    return () => window.removeEventListener('youtube-music-control', handler);
  }, [extractAndPlay, isTauriEnv]);

  const [urlLoading, setUrlLoading] = useState(false);

  const addUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrlLoading(true);

    try {
      if (isDirectAudio(trimmed)) {
        const track: Track = { id: trimmed, title: extractTitle(trimmed), artist: 'Custom', url: trimmed };
        const exists = playlist.find(t => t.url === track.url);
        if (!exists) setPlaylist(prev => [...prev, track]);
        const idx = exists ? playlist.indexOf(exists) : playlist.length;
        playTrack(track, idx);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }

      // Spotify: extract track/playlist/album info, find on YouTube for full audio
      if (isSpotifyUrl(trimmed)) {
        const spotifyInfo = extractSpotifyId(trimmed);
        if (spotifyInfo && spotifyInfo.type === 'track') {
          // Single track: search YouTube for it
          const oembed = await fetchSpotifyOEmbed(spotifyInfo.id);
          if (oembed) {
            setYtLoading(true);
            try {
              const ytResult = await searchYouTubeForSpotifyTrack(oembed.title, oembed.artist);
              if (ytResult) {
                const track: Track = {
                  id: ytResult.id,
                  title: oembed.title,
                  artist: oembed.artist,
                  url: `https://www.youtube.com/watch?v=${ytResult.id}`,
                  thumbnail: oembed.thumbnail || ytResult.thumbnail || ytThumb(ytResult.id),
                };
                const exists = playlist.find(t => t.id === ytResult.id);
                if (!exists) setPlaylist(prev => [...prev, track]);
                const idx = exists ? playlist.indexOf(exists) : playlist.length;
                playTrack(track, idx);
                setUrlInput('');
                setShowUrlInput(false);
                return;
              }
            } finally {
              setYtLoading(false);
            }
          }
          alert('Could not find audio for this Spotify track.');
          setUrlInput('');
          setShowUrlInput(false);
          return;
        }

        // Spotify playlist or album: extract all tracks, search YouTube for each
        if (spotifyInfo && (spotifyInfo.type === 'playlist' || spotifyInfo.type === 'album')) {
          if (!isTauriEnv) {
            alert('Playlist extraction requires the desktop app.');
            setUrlInput('');
            setShowUrlInput(false);
            return;
          }
          setYtLoading(true);
          try {
            const infoJson = await extractPlaylistInfo(trimmed);
            const items = JSON.parse(infoJson);
            if (Array.isArray(items) && items.length > 0) {
              // Search YouTube for each Spotify track
              const newTracks: Track[] = [];
              for (const item of items) {
                const query = `${item.channel || ''} ${item.title || ''} audio`.trim();
                const ytResult = await searchYouTubeForSpotifyTrack(item.title, item.channel || '');
                if (ytResult) {
                  newTracks.push({
                    id: ytResult.id,
                    title: item.title || ytResult.title,
                    artist: item.channel || ytResult.channel,
                    url: `https://www.youtube.com/watch?v=${ytResult.id}`,
                    thumbnail: item.thumbnail || ytResult.thumbnail || ytThumb(ytResult.id),
                  });
                }
              }
              if (newTracks.length > 0) {
                setPlaylist(prev => {
                  const existingIds = new Set(prev.map(t => t.id));
                  const toAdd = newTracks.filter(t => !existingIds.has(t.id));
                  return [...prev, ...toAdd];
                });
                playTrack(newTracks[0], playlist.length);
              } else {
                alert('Could not find audio for tracks in this playlist.');
              }
            } else {
              alert('No tracks found in this Spotify playlist/album.');
            }
          } catch (e) {
            console.warn('[Music] Spotify playlist extraction failed:', e);
            alert('Failed to extract Spotify playlist.');
          } finally {
            setYtLoading(false);
          }
          setUrlInput('');
          setShowUrlInput(false);
          return;
        }

        // Unknown Spotify URL type
        alert('Unsupported Spotify URL type.');
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }

      // Check for YouTube playlist URL — always try yt-dlp first (no API key needed)
      const playlistId = extractPlaylistId(trimmed);
      if (playlistId && trimmed.includes('youtube.com')) {
        let videos: { id: string; title: string; channel: string; thumbnail: string }[] = [];

        // Always try yt-dlp first (works without API key)
        if (isTauriEnv) {
          try {
            const infoJson = await extractPlaylistInfo(trimmed);
            const items = JSON.parse(infoJson);
            if (Array.isArray(items) && items.length > 0) {
              videos = items.map((v: any) => ({
                id: v.id,
                title: v.title || 'YouTube Video',
                channel: v.channel || 'YouTube',
                thumbnail: v.thumbnail || ytThumb(v.id),
              }));
            }
          } catch (e) {
            console.warn('[Music] yt-dlp playlist extraction failed:', e);
          }
        }

        // Fallback to YouTube API if yt-dlp failed
        if (videos.length === 0) {
          videos = await fetchYouTubePlaylist(playlistId);
        }

        if (videos.length > 0) {
          const newTracks: Track[] = videos.map(v => ({
            id: v.id,
            title: v.title,
            artist: v.channel,
            url: `https://www.youtube.com/watch?v=${v.id}`,
            thumbnail: v.thumbnail,
          }));
          setPlaylist(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const toAdd = newTracks.filter(t => !existingIds.has(t.id));
            return [...prev, ...toAdd];
          });
          playTrack(newTracks[0], playlist.length);
          setUrlInput('');
          setShowUrlInput(false);
          return;
        }
      }

      const videoId = extractVideoIdFromUrl(trimmed);
      if (videoId) {
        let thumbnail = ytThumb(videoId);
        const key = getYoutubeApiKey();
        if (key) {
          try {
            const res = await fetch(
              `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${key}`,
              { signal: AbortSignal.timeout(5000) }
            );
            const data = await res.json();
            if (data.items?.[0]) {
              thumbnail = data.items[0].snippet.thumbnails?.medium?.url || data.items[0].snippet.thumbnails?.default?.url || thumbnail;
            }
          } catch {}
        }
        const track: Track = { id: videoId, title: extractTitle(trimmed) || 'YouTube Video', artist: 'YouTube', url: trimmed, thumbnail };
        const exists = playlist.find(t => t.id === videoId);
        if (!exists) setPlaylist(prev => [...prev, track]);
        const idx = exists ? playlist.indexOf(exists) : playlist.length;
        playTrack(track, idx);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }

      if (isValidUrl(trimmed)) {
        const track: Track = { id: trimmed, title: extractTitle(trimmed), artist: getPlatform(trimmed), url: trimmed };
        const exists = playlist.find(t => t.url === track.url);
        if (!exists) setPlaylist(prev => [...prev, track]);
        const idx = exists ? playlist.indexOf(exists) : playlist.length;
        playTrack(track, idx);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }

      // Search Jamendo first (direct audio, plays in-widget)
      const jamendoResult = await searchJamendo(trimmed);
      if (jamendoResult) {
        const track: Track = { id: `jamendo-${jamendoResult.id}`, title: jamendoResult.title, artist: jamendoResult.artist, url: jamendoResult.audio, thumbnail: jamendoResult.thumbnail };
        const exists = playlist.find(t => t.id === track.id);
        if (!exists) setPlaylist(prev => [...prev, track]);
        const idx = exists ? playlist.indexOf(exists) : playlist.length;
        playTrack(track, idx);
        setUrlInput('');
        setShowUrlInput(false);
        return;
      }

      // Fallback to YouTube via yt-dlp search (no API key needed)
      try {
        if (isTauri) {
          const searchJson = await searchYoutubeViaYtdlp(trimmed);
          const results = JSON.parse(searchJson);
          if (Array.isArray(results) && results.length > 0) {
            const newTracks: Track[] = results.map((r: any) => ({
              id: r.id,
              title: r.title,
              artist: r.channel || 'YouTube',
              url: r.url,
              thumbnail: r.thumbnail || ytThumb(r.id),
            }));
            const existingIds = new Set(playlist.map(t => t.id));
            const toAdd = newTracks.filter(t => !existingIds.has(t.id));
            if (toAdd.length > 0) {
              setPlaylist(prev => [...prev, ...toAdd]);
              playTrack(toAdd[0], playlist.length);
            } else {
              playTrack(newTracks[0], playlist.indexOf(playlist.find(t => t.id === newTracks[0].id)!) || 0);
            }
            setUrlInput('');
            setShowUrlInput(false);
            return;
          }
        } else {
          const ytResult = await searchYouTube(trimmed);
          if (ytResult) {
            const track: Track = { id: ytResult.id, title: ytResult.title, artist: ytResult.channel, url: `https://www.youtube.com/watch?v=${ytResult.id}`, thumbnail: ytResult.thumbnail || ytThumb(ytResult.id) };
            const exists = playlist.find(t => t.id === ytResult.id);
            if (!exists) setPlaylist(prev => [...prev, track]);
            const idx = exists ? playlist.indexOf(exists) : playlist.length;
            playTrack(track, idx);
            setUrlInput('');
            setShowUrlInput(false);
            return;
          }
        }
      } catch (e) {
        console.warn('[Music] yt-dlp search failed:', e);
      }

      alert(`No results found for "${trimmed}". Try a different name.`);
    } catch (e) {
      console.warn('Failed to add track:', e);
      alert('Failed to add track. Check your connection and try again.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleRemove = (idx: number) => {
    const wasCurrent = idx === currentIndex;
    setPlaylist(prev => prev.filter((_, i) => i !== idx));
    if (wasCurrent) {
      setCurrentIndex(-1);
      setCurrentTrack(null);
      setIsPlaying(false);
      if (audioRef.current) audioRef.current.pause();
    } else if (idx < currentIndex) setCurrentIndex(prev => prev - 1);
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-3xl p-5 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <Music className="w-3.5 h-3.5" />
          <span>Music</span>
        </h3>
        <div className="flex items-center space-x-1 relative">
          <button onClick={() => setShowUrlInput(!showUrlInput)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Add audio URL">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Options">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 0 }}
                  className={`absolute top-8 w-48 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}>
                  <button onClick={() => { setPlaylist([]); setCurrentIndex(-1); setCurrentTrack(null); setIsPlaying(false); cleanupTempAudio(); if (audioRef.current) audioRef.current.pause(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-400 hover:text-white transition-colors">
                    <span>Clear Playlist</span>
                  </button>
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={() => { if (onDeleteBoard) onDeleteBoard(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" /><span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* URL Input */}
      <AnimatePresence>
        {showUrlInput && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="mb-3 overflow-hidden">
            <div className="bg-black/30 rounded-xl border border-white/10 p-3 space-y-2">
              <p className="text-[10px] text-gray-400 flex items-center space-x-1">
                <Link className="w-3 h-3" />
                <span>Song name, YouTube, Spotify, or audio URL</span>
              </p>
              <div className="flex space-x-1.5">
                <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addUrl(); }}
                  placeholder="Song, YouTube, Spotify, or URL"
                  className="flex-1 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-orange-500/50 transition-colors" autoFocus />
                <button onClick={addUrl} disabled={!urlInput.trim() || urlLoading}
                  className="px-3 py-1.5 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-xl text-[11px] font-medium disabled:opacity-40 transition-colors">{urlLoading ? '...' : 'Add'}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Now Playing */}
      {currentTrack ? (
        <div className="mb-3 rounded-xl bg-black/30 border border-white/5 p-3 relative z-10">
          {/* Now Playing — thumbnail only, audio plays via HTML5 Audio */}
          <div className="w-full relative rounded-lg overflow-hidden mb-2 flex items-center justify-center bg-black/40" style={{ minHeight: '80px' }}>
            {currentTrack.thumbnail ? (
              <ProxiedImg src={currentTrack.thumbnail} className="w-full h-full object-cover opacity-50" />
            ) : (
              <Music className="w-10 h-10 text-gray-600" />
            )}
            {ytLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="text-center">
                  <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-1.5" />
                  <p className="text-[10px] text-gray-400">Loading audio...</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3 relative" style={{ zIndex: 1 }}>
            <div className="w-12 h-12 rounded-lg bg-orange-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {currentTrack.thumbnail ? (
                <ProxiedImg src={currentTrack.thumbnail} className="w-full h-full object-cover" />
              ) : playerModeRef.current === 'youtube' ? (
                <ExternalLink className="w-5 h-5 text-orange-400" />
              ) : (
                <Music className="w-5 h-5 text-orange-400" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-bold text-gray-100 leading-tight truncate">{currentTrack.title}</p>
              <p className="text-[10px] text-primary-accent opacity-80 font-medium truncate">{currentTrack.artist}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 rounded-xl bg-black/30 border border-white/5 flex items-center justify-center relative z-10" style={{ minHeight: '80px' }}>
          <div className="text-center">
            <Music className="w-10 h-10 text-gray-600 mx-auto mb-2" />
            <p className="text-[11px] text-gray-500">Type a song name or paste a URL</p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center space-x-3 mb-3 relative z-10">
        <button onClick={playPrev} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Previous">
          <SkipBack className="w-4 h-4" />
        </button>
        <button onClick={togglePlayPause} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors" title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="w-4 h-4 text-white" /> : <Play className="w-4 h-4 text-white ml-0.5" />}
        </button>
        <button onClick={playNext} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Next">
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      {/* Volume */}
      {currentTrack && (
        <div className="flex items-center space-x-2 mb-3 relative z-10">
          <button onClick={() => setIsMuted(!isMuted)} className="p-0.5 text-gray-400 hover:text-white transition-colors">
            {isMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
          </button>
          <input type="range" min="0" max="100" value={isMuted ? 0 : volume} onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            setIsMuted(false);
            if (audioRef.current) audioRef.current.volume = v / 100;
          }}
            className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-primary-accent" />
        </div>
      )}

      {/* Playlist */}
      {playlist.length > 0 && (
        <div className="relative z-10">
          <span className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center space-x-1 mb-1.5">
            <List className="w-3 h-3" />
            <span>Playlist ({playlist.length})</span>
          </span>
          <div className="max-h-32 overflow-y-auto scrollbar-thin space-y-0.5">
            {playlist.map((track, idx) => (
              <div key={`${track.id}-${idx}`}
                className={`flex items-center space-x-2 px-2 py-1 rounded-lg cursor-pointer transition-colors group ${idx === currentIndex ? 'bg-orange-500/10 border border-orange-500/20' : 'hover:bg-white/5'}`}
                onClick={() => playTrack(track, idx)}>
                <div className="w-7 h-5 rounded bg-orange-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {track.thumbnail ? (
                    <ProxiedImg src={track.thumbnail} className="w-full h-full object-cover" loading="lazy" />
                  ) : idx === currentIndex && isPlaying ? (
                    <div className="flex space-x-0.5">
                      <div className="w-0.5 h-2 bg-orange-400 animate-pulse" />
                      <div className="w-0.5 h-3 bg-orange-400 animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <div className="w-0.5 h-2 bg-orange-400 animate-pulse" style={{ animationDelay: '0.2s' }} />
                    </div>
                  ) : (
                    <Music className="w-2.5 h-2.5 text-orange-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] truncate ${idx === currentIndex ? 'text-orange-400 font-medium' : 'text-gray-400'}`}>{track.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleRemove(idx); }}
                  className="p-0.5 opacity-0 group-hover:opacity-100 text-gray-600 hover:text-orange-400 transition-all">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
