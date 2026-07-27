// RSSReaderWidget - RSS/Atom feed reader with multiple feed management, tab-based switching, and auto-refresh
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { proxyFetch } from '../lib/tauri-api';
// ICON: Rss - header icon; replace with Radio or Signal
// ICON: RefreshCw - refresh button; replace with RotateCcw or Sync
// ICON: ExternalLink - open link indicator; replace with ArrowUpRight
// ICON: Plus - add feed button; replace with CirclePlus
// ICON: Trash2 - delete feed action; replace with X
// ICON: MoreHorizontal - context menu trigger; replace with EllipsisVertical
// ICON: Loader2 - loading spinner; replace with Spinner or CircleDashed
// ICON: Newspaper - empty state icon; replace with FileText
import { Rss, RefreshCw, ExternalLink, Plus, Trash2, MoreHorizontal, Loader2, Newspaper } from 'lucide-react';

interface RSSReaderWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  source: string;
  feedIndex: number;
}

interface FeedConfig {
  url: string;
  label: string;
}

const DEFAULT_FEEDS: FeedConfig[] = [
  { url: 'https://hnrss.org/frontpage', label: 'Hacker News' },
  { url: 'https://techcrunch.com/feed/', label: 'TechCrunch' },
  { url: 'https://www.theverge.com/rss/index.xml', label: 'The Verge' },
  { url: 'https://feeds.arstechnica.com/arstechnica/index', label: 'Ars Technica' },
];

const STORAGE_KEY = 'rss_feeds';
const REFRESH_INTERVAL = 5 * 60 * 1000;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return dateStr;
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function parseFeed(xml: string, sourceLabel: string): FeedItem[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const entries = doc.querySelectorAll('entry, item');
  const items: FeedItem[] = [];
  entries.forEach((entry) => {
    const title = entry.querySelector('title')?.textContent || '(no title)';
    const linkEl = entry.querySelector('link');
    const link = linkEl?.getAttribute('href') || linkEl?.textContent || '';
    const pubDate = entry.querySelector('published, updated, pubDate')?.textContent || '';
    items.push({ title, link, pubDate, source: sourceLabel, feedIndex: -1 });
  });
  return items;
}

function loadFeeds(): FeedConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return DEFAULT_FEEDS;
}

function saveFeeds(feeds: FeedConfig[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
}

export default function RSSReaderWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: RSSReaderWidgetProps) {
  const [feeds, setFeeds] = useState<FeedConfig[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(-1);
  const [addUrl, setAddUrl] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [readSet, setReadSet] = useState<Set<string>>(new Set());

  const fetchAllFeeds = useCallback(async (feedList: FeedConfig[]) => {
    setLoading(true);
    const allItems: FeedItem[] = [];
    await Promise.all(feedList.map(async (feed, idx) => {
      try {
        const text = await proxyFetch(feed.url);
        const parsed = parseFeed(text, feed.label);
        parsed.forEach((p) => { p.feedIndex = idx; });
        allItems.push(...parsed);
      } catch { /* skip failed feed */ }
    }));
    allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    setItems(allItems.slice(0, 50));
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = loadFeeds();
    setFeeds(saved);
    setReadSet(new Set());
    fetchAllFeeds(saved);
    const interval = setInterval(() => fetchAllFeeds(saved), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchAllFeeds]);

  const handleRefresh = () => fetchAllFeeds(feeds);

  const handleAddFeed = () => {
    const trimmed = addUrl.trim();
    if (!trimmed) return;
    const label = trimmed.split('/')[2] || trimmed;
    const updated = [...feeds, { url: trimmed, label }];
    setFeeds(updated);
    saveFeeds(updated);
    setAddUrl('');
    setShowAdd(false);
    fetchAllFeeds(updated);
  };

  const handleRemoveFeed = (idx: number) => {
    const updated = feeds.filter((_, i) => i !== idx);
    setFeeds(updated);
    saveFeeds(updated);
    if (activeTab === idx) setActiveTab(-1);
    else if (activeTab > idx) setActiveTab(activeTab - 1);
    fetchAllFeeds(updated);
  };

  const markRead = (key: string) => {
    setReadSet((prev) => new Set(prev).add(key));
  };

  const filteredItems = activeTab === -1 ? items : items.filter((i) => i.feedIndex === activeTab);
  const unreadCount = (idx: number) => items.filter((i) => i.feedIndex === idx && !readSet.has(`${idx}_${i.title}`)).length;

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <Rss className="w-3.5 h-3.5" /> {/* CHANGE: Icon color */}
          <span>RSS Reader</span> {/* CHANGE: Widget title */}
        </h3>
        <div className="flex items-center space-x-1">
          <button
            onClick={handleRefresh}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Refresh all feeds"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Add feed"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="flex items-center relative">
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
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-2"
          >
            <div className="flex space-x-2 p-2 bg-white/5 rounded-xl">
              <input
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddFeed()}
                placeholder="Paste RSS feed URL..."
                className="flex-1 bg-transparent border border-white/10 rounded-lg px-2 py-1.5 text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-primary-accent/50"
              />
              <button
                onClick={handleAddFeed}
                className="px-2 py-1 bg-primary-accent/20 text-primary-accent rounded-lg text-[11px] hover:bg-primary-accent/30 transition-colors"
              >
                Add
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex space-x-1 overflow-x-auto pb-2 mb-2 scrollbar-thin">
        <button
          onClick={() => setActiveTab(-1)}
          className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-colors ${activeTab === -1 ? 'bg-primary-accent/20 text-primary-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
        >
          All ({items.length})
        </button>
        {feeds.map((feed, idx) => (
          <div key={idx} className="flex items-center shrink-0">
            <button
              onClick={() => setActiveTab(idx)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-colors flex items-center space-x-1 ${activeTab === idx ? 'bg-primary-accent/20 text-primary-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
            >
              <span>{feed.label}</span>
              {unreadCount(idx) > 0 && (
                <span className="bg-primary-accent/30 text-primary-accent px-1 rounded text-[8px]">{unreadCount(idx)}</span>
              )}
            </button>
            <button
              onClick={() => handleRemoveFeed(idx)}
              className="ml-0.5 p-0.5 hover:bg-red-500/20 rounded text-gray-500 hover:text-red-400 transition-colors"
              title={`Remove ${feed.label}`}
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-col space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
        {loading && items.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Loading feeds...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-gray-500">
            <Newspaper className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-[10px] font-mono">No items</span>
          </div>
        ) : (
          filteredItems.map((item, idx) => {
            const key = `${item.feedIndex}_${item.title}`;
            const isRead = readSet.has(key);
            return (
              <a
                key={`${key}_${idx}`}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => markRead(key)}
                className={`flex flex-col p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5 ${isRead ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <h4 className="text-[12px] font-medium text-gray-200 group-hover:text-primary-accent transition-colors leading-snug line-clamp-2 flex-1 pr-2">
                    {item.title}
                  </h4>
                  <ExternalLink className="w-3 h-3 shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 text-primary-accent transition-opacity" />
                </div>
                <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-gray-500 font-mono">
                  <span className="text-primary-accent/70">{item.source}</span>
                  <span>{relativeTime(item.pubDate)}</span>
                </div>
              </a>
            );
          })
        )}
      </div>
    </div>
  );
}
