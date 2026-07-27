import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Headphones, MoreHorizontal, Trash2, CloudRain, Wind, TreePine, Coffee, Pencil } from 'lucide-react';

interface AmbientSoundsWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const SOUNDS = [
  { id: 'rain', label: 'Rain', icon: CloudRain, color: 'text-blue-400', bg: 'bg-blue-500' },
  { id: 'wind', label: 'Wind', icon: Wind, color: 'text-teal-400', bg: 'bg-teal-500' },
  { id: 'forest', label: 'Forest', icon: TreePine, color: 'text-emerald-400', bg: 'bg-emerald-500' },
  { id: 'coffee', label: 'Cafe', icon: Coffee, color: 'text-amber-400', bg: 'bg-amber-500' },
] as const;

type SoundId = typeof SOUNDS[number]['id'];

/**
 * Builds a looping noise-based ambient sound node graph for one sound type.
 * Everything here is procedurally synthesized (white/pink/brown noise run through
 * filters + slow LFOs) — no audio files, no network, no copyright concerns, and it
 * works fully offline. Returns the source + gain node so volume/stop can be controlled.
 */
function buildAmbientGraph(ctx: AudioContext, id: SoundId): { source: AudioBufferSourceNode; gain: GainNode; extraNodes: AudioNode[] } {
  const bufferSize = ctx.sampleRate * 4; // 4s of noise, looped seamlessly
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);

  // Generate the base noise. Pink/brown noise use a simple running-sum filter for
  // a warmer, less hissy character than pure white noise.
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    if (id === 'rain') {
      data[i] = white; // filtered later for a bright hiss
    } else if (id === 'wind' || id === 'forest') {
      lastOut = (lastOut + 0.02 * white) / 1.02;
      data[i] = lastOut * 3.5; // pink-ish
    } else {
      lastOut = (lastOut + 0.15 * white) / 1.15;
      data[i] = lastOut * 2.2; // brown-ish, used as a low murmur bed for cafe
    }
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const gain = ctx.createGain();
  gain.gain.value = 0;

  const extraNodes: AudioNode[] = [];
  let chain: AudioNode = source;

  if (id === 'rain') {
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 3200;
    bandpass.Q.value = 0.6;
    chain.connect(bandpass);
    chain = bandpass;
    extraNodes.push(bandpass);
  } else if (id === 'wind') {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 700;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.12;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 300;
    lfo.connect(lfoGain);
    lfoGain.connect(lowpass.frequency);
    lfo.start();
    chain.connect(lowpass);
    chain = lowpass;
    extraNodes.push(lowpass, lfo, lfoGain);
  } else if (id === 'forest') {
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.value = 1000;
    bandpass.Q.value = 0.4;
    chain.connect(bandpass);
    chain = bandpass;
    extraNodes.push(bandpass);
  } else {
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 900;
    chain.connect(lowpass);
    chain = lowpass;
    extraNodes.push(lowpass);
  }

  chain.connect(gain);
  gain.connect(ctx.destination);

  return { source, gain, extraNodes };
}

export default function AmbientSoundsWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: AmbientSoundsWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeSounds, setActiveSounds] = useState<Record<string, boolean>>({});
  const [volumes, setVolumes] = useState<Record<string, number>>({ rain: 50, wind: 50, forest: 50, coffee: 50 });

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<Partial<Record<SoundId, { source: AudioBufferSourceNode; gain: GainNode }>>>({});

  const getCtx = () => {
    if (!audioCtxRef.current) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new Ctx();
    }
    return audioCtxRef.current;
  };

  // Clean up all audio nodes on unmount so navigating away actually stops sound.
  useEffect(() => {
    return () => {
      Object.values(nodesRef.current).forEach((n) => {
        try { n?.source.stop(); } catch { /* already stopped */ }
      });
      audioCtxRef.current?.close().catch(() => {});
    };
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Ambient Sounds');

  const toggleSound = (id: SoundId) => {
    const ctx = getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const isCurrentlyActive = !!activeSounds[id];

    if (!isCurrentlyActive) {
      const { source, gain } = buildAmbientGraph(ctx, id);
      const targetVol = (volumes[id] ?? 50) / 100 * 0.5; // 0.5 ceiling keeps layered sounds from clipping
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(targetVol, ctx.currentTime + 0.6);
      source.start();
      nodesRef.current[id] = { source, gain };
    } else {
      const node = nodesRef.current[id];
      if (node) {
        node.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
        const sourceToStop = node.source;
        setTimeout(() => { try { sourceToStop.stop(); } catch { /* already stopped */ } }, 450);
        delete nodesRef.current[id];
      }
    }

    setActiveSounds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleVolumeChange = (id: SoundId, val: number) => {
    setVolumes((prev) => ({ ...prev, [id]: val }));
    const node = nodesRef.current[id];
    if (node && audioCtxRef.current) {
      node.gain.gain.setValueAtTime(val / 100 * 0.5, audioCtxRef.current.currentTime);
    }
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5 relative z-10">
        {isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim());
              setIsEditingTitle(false);
            }}
            className="flex-1 mr-2"
          >
            <input
              type="text"
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim()); setIsEditingTitle(false); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white outline-none"
            />
          </form>
        ) : (
          <h3
            onClick={() => { setTitleDraft(title || 'Ambient Sounds'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Headphones className="w-3.5 h-3.5" />
            <span>{title || 'Ambient Sounds'}</span>
          </h3>
        )}
        <div className="flex items-center relative space-x-1">
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}
                >
                  <button
                    onClick={() => {
                      setTitleDraft(title || 'Ambient Sounds');
                      setIsEditingTitle(true);
                      toggleMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    onClick={() => {
                      if (onDeleteBoard) onDeleteBoard();
                      toggleMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col space-y-3 z-10 relative">
        {SOUNDS.map(sound => {
          const isActive = activeSounds[sound.id];
          const Icon = sound.icon;
          return (
            <div key={sound.id} className={`flex items-center p-2.5 rounded-xl border transition-all ${isActive ? 'bg-white/10 border-white/10' : 'bg-transparent border-transparent hover:bg-white/5'}`}>
              <button
                onClick={() => toggleSound(sound.id)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isActive ? `${sound.bg} text-white shadow-lg` : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                <Icon className="w-5 h-5" />
              </button>
              
              <div className="flex flex-col ml-3 flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[12px] font-medium ${isActive ? 'text-white' : 'text-gray-400'}`}>{sound.label}</span>
                  {isActive && <span className="text-[10px] font-mono text-gray-500">{volumes[sound.id]}%</span>}
                </div>
                <div className={`h-1.5 w-full rounded-full overflow-hidden transition-all ${isActive ? 'bg-black/30' : 'bg-transparent'}`}>
                  {isActive && (
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={volumes[sound.id]}
                      onChange={(e) => handleVolumeChange(sound.id, parseInt(e.target.value))}
                      className="w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0"
                      style={{
                        background: `linear-gradient(to right, currentColor ${volumes[sound.id]}%, transparent ${volumes[sound.id]}%)`,
                        color: 'rgba(255,255,255,0.7)'
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
