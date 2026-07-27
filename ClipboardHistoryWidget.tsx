// ClipboardHistoryWidget — Capture, search, pin, and manage clipboard history with auto-capture and localStorage persistence.
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clipboard, // ICON: Replace with any clipboard icon (e.g. ClipboardList)
  Copy, // ICON: Replace with any copy icon (e.g. ClipboardCopy)
  Trash2, // ICON: Replace with any delete icon (e.g. Trash)
  MoreHorizontal, // ICON: Replace with any overflow-menu icon (e.g. Ellipsis)
  Search, // ICON: Replace with any magnifying glass icon
  Pin, // ICON: Replace with any pin/thumbtack icon
  Clock, // ICON: Replace with any clock/history icon
  Check, // ICON: Replace with any success/checkmark icon
} from 'lucide-react';

interface ClipboardItem {
  id: string;
  text: string;
  timestamp: number;
  pinned: boolean;
}

interface ClipboardHistoryWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const STORAGE_KEY = 'clipboard_history';
const MAX_ITEMS = 50;
const TRUNCATE_LINES = 3;

const generateId = () => crypto.randomUUID();

const formatTime = (ts: number) => {
  const diff = Date.now() - ts;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString();
};

export default function ClipboardHistoryWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: ClipboardHistoryWidgetProps) {
  const [items, setItems] = useState<ClipboardItem[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setItems(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* ignore */ }
  }, [items]);

  // Listen for copy events on the document to auto-capture
  useEffect(() => {
    const handleCopy = () => {
      navigator.clipboard.readText().then((text) => {
        if (!text.trim()) return;
        setItems((prev) => {
          // Deduplicate: skip if same text was last copied
          if (prev.length > 0 && prev[0].text === text) return prev;
          const newItem: ClipboardItem = {
            id: generateId(),
            text,
            timestamp: Date.now(),
            pinned: false,
          };
          const updated = [newItem, ...prev];
          return updated.slice(0, MAX_ITEMS);
        });
      }).catch(() => { /* permission denied — silent */ });
    };
    document.addEventListener('copy', handleCopy);
    return () => document.removeEventListener('copy', handleCopy);
  }, []);

  // Sort: pinned first, then by timestamp
  const sortedItems = [...items].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return b.timestamp - a.timestamp;
  });

  const filteredItems = sortedItems.filter((item) =>
    item.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMenu = useCallback(() => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  }, [menuOpen, onMenuToggle]);

  const handleCopyBack = useCallback(async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch { /* fallback */ }
  }, []);

  const togglePin = useCallback((id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, pinned: !item.pinned } : item
      )
    );
  }, []);

  const deleteItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setItems((prev) => prev.filter((item) => item.pinned));
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onMenuToggle?.(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onMenuToggle]);

  const needsTruncate = (text: string) => text.split('\n').length > TRUNCATE_LINES || text.length > 200;

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Clipboard size={16} className="text-sky-400" /> {/* CHANGE: Icon color */}
          <h3 className="text-sm font-semibold text-white/90">Clipboard History</h3> {/* CHANGE: Widget title */}
          <span className="text-[10px] bg-white/10 rounded-full px-1.5 py-0.5 text-white/50">
            {items.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-1 z-50 min-w-[160px] rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl p-1 ${
                    alignMenu === 'left' ? 'right-0' : 'left-0'
                  }`}
                >
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onMenuToggle?.(false);
                      clearAll();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 size={12} />
                    Clear unpinned
                  </button>
                  {onDeleteBoard && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onMenuToggle?.(false);
                        onDeleteBoard();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete board
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search */}
      {items.length > 0 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search clipboard..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      )}

      {/* Item List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 custom-scrollbar">
        <AnimatePresence>
          {filteredItems.map((item) => {
            const isExpanded = expandedId === item.id;
            const isCopied = copiedId === item.id;
            const truncated = needsTruncate(item.text);
            const displayText = !isExpanded && truncated
              ? item.text.split('\n').slice(0, TRUNCATE_LINES).join('\n')
              : item.text;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/15 transition-all group"
              >
                {/* Content */}
                <div className="px-3 py-2">
                  <pre className="text-[11px] leading-relaxed text-white/80 whitespace-pre-wrap break-all font-sans max-h-[4.5rem] overflow-hidden">
                    {displayText}
                  </pre>

                  {truncated && (
                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 mt-1 transition-colors"
                    >
                      {isExpanded ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-3 py-1.5 border-t border-white/5 bg-white/[0.02]">
                  <div className="flex items-center gap-2 text-[9px] text-white/35">
                    <Clock size={10} />
                    <span>{formatTime(item.timestamp)}</span>
                    <span className="text-white/20">|</span>
                    <span>{item.text.length} chars</span>
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => togglePin(item.id)}
                      className={`p-1 rounded-md transition-colors ${
                        item.pinned
                          ? 'text-amber-400 bg-amber-500/15'
                          : 'text-white/40 hover:bg-white/10'
                      }`}
                      title={item.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={11} />
                    </button>
                    <button
                      onClick={() => handleCopyBack(item.id, item.text)}
                      className="p-1 rounded-md text-white/40 hover:bg-white/10 transition-colors"
                      title="Copy to clipboard"
                    >
                      {isCopied ? (
                        <Check size={11} className="text-emerald-400" />
                      ) : (
                        <Copy size={11} />
                      )}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 rounded-md text-white/40 hover:bg-red-500/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={11} className="hover:text-red-400" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {items.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
            <Clipboard size={18} className="text-white/20" />
          </div>
          <p className="text-xs text-white/40 mb-1">No clipboard history</p>
          <p className="text-[10px] text-white/25">Copied text will appear here automatically</p>
        </div>
      )}

      {/* No search results */}
      {items.length > 0 && filteredItems.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Search size={16} className="text-white/15 mb-2" />
          <p className="text-xs text-white/35">No matches for &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
