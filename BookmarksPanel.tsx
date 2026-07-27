import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Edit2, Check, X, ExternalLink, Globe, MoreHorizontal } from 'lucide-react';
import { Bookmark } from '../types';

interface BookmarksPanelProps {
  key?: string;
  title: string;
  category: string;
  bookmarks: Bookmark[];
  onAddBookmark: (bookmark: Omit<Bookmark, 'id'>) => void;
  onEditBookmark: (id: string, updated: Partial<Bookmark>) => void;
  onDeleteBookmark: (id: string) => void;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  onDeleteWidget?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
  openInNewTab?: boolean;
  showDescriptions?: boolean;
  hideExtra?: boolean;
}

export default function BookmarksPanel({
  title,
  category,
  bookmarks,
  onAddBookmark,
  onEditBookmark,
  onDeleteBookmark,
  onRenameBoard,
  onDeleteBoard,
  onDeleteWidget,
  alignMenu = 'right',
  onMenuToggle,
  openInNewTab = true,
  showDescriptions = true,
  hideExtra = false,
}: BookmarksPanelProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [showAllBookmarks, setShowAllBookmarks] = useState(false);
  const linkTarget = openInNewTab ? '_blank' : undefined;
  const linkRel = openInNewTab ? 'noopener noreferrer' : undefined;
  const HIDE_EXTRA_LIMIT = 4;
  const visibleBookmarks = hideExtra && !showAllBookmarks ? bookmarks.slice(0, HIDE_EXTRA_LIMIT) : bookmarks;
  const hiddenCount = bookmarks.length - visibleBookmarks.length;

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [tempTitle, setTempTitle] = useState(title);
  
  // Form states
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  
  // Edit states
  const [editLabel, setEditLabel] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim() || !url.trim()) return;
    
    // Normalize url
    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    onAddBookmark({
      label: label.trim(),
      url: normalizedUrl,
      category,
    });
    
    setLabel('');
    setUrl('');
    setIsAdding(false);
  };

  const startEditing = (bookmark: Bookmark) => {
    setEditingId(bookmark.id);
    setEditLabel(bookmark.label);
    setEditUrl(bookmark.url);
  };

  const saveEdit = (id: string) => {
    if (!editLabel.trim() || !editUrl.trim()) return;
    
    let normalizedUrl = editUrl.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    onEditBookmark(id, {
      label: editLabel.trim(),
      url: normalizedUrl,
    });
    setEditingId(null);
  };

  // Favicon fetching: prefer Chrome's own built-in favicon service (chrome-extension://<id>/_favicon/,
  // gated by the "favicon" manifest permission) which reads favicons straight from the browser's
  // local cache — far more reliable than the old public Google s2/favicons endpoint, which is an
  // undocumented internal Google URL that increasingly 403s for non-Google origins (including
  // chrome-extension:// pages with no normal referrer), which is why icons were silently failing
  // and falling back to the generic globe icon for everyone.
  const getFaviconUrl = (bookmarkUrl: string) => {
    try {
      const urlObj = new URL(bookmarkUrl);
      return `https://icon.horse/icon/${urlObj.hostname}`;
    } catch {
      return '';
    }
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-[210px] relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5">
        {isEditingTitle ? (
          <div className="flex items-center space-x-1">
            <input
              type="text"
              value={tempTitle}
              onChange={(e) => setTempTitle(e.target.value)}
              className="bg-white/10 text-white text-xs px-1.5 py-0.5 rounded outline-none border border-white/15 w-28 font-display font-semibold uppercase tracking-wider"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onRenameBoard?.(tempTitle);
                  setIsEditingTitle(false);
                } else if (e.key === 'Escape') {
                  setIsEditingTitle(false);
                }
              }}
            />
            <button
              onClick={() => {
                onRenameBoard?.(tempTitle);
                setIsEditingTitle(false);
              }}
              className="p-0.5 hover:bg-white/10 rounded text-green-400"
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setIsEditingTitle(false)}
              className="p-0.5 hover:bg-white/10 rounded text-red-400"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight truncate max-w-[120px]">
            {title}
          </h3>
        )}

        <div className="flex items-center space-x-0.5 relative">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Add bookmark"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Board options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Board Options Popup */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${
                    alignMenu === 'left' ? 'left-0' : 'right-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTitle(true);
                      setTempTitle(title);
                      toggleMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      bookmarks.forEach((b) => {
                        try {
                          const win = window.open(b.url, '_blank', 'noopener,noreferrer');
                          if (win) win.focus();
                        } catch (e) {
                          console.warn("Could not open link:", b.url, e);
                        }
                      });
                      toggleMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                    <span>Open all links</span>
                  </button>
                  <div className="h-[1px] bg-white/5 my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBoard?.();
                      onDeleteWidget?.();
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

      {/* Add New Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleSubmit}
            className="mb-2 p-2 bg-black/40 rounded-xl border border-white/10 space-y-1.5 overflow-hidden z-20"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">Label</label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="WhatsApp"
                  className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/15 px-2 py-1 rounded-lg text-[11px] outline-none border border-white/5 focus:border-white/10 text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-[8px] text-gray-400 uppercase tracking-widest mb-0.5">URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="web.whatsapp.com"
                  className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/15 px-2 py-1 rounded-lg text-[11px] outline-none border border-white/5 focus:border-white/10 text-white placeholder-gray-500 transition-all"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end space-x-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-2 py-0.5 text-[9px] uppercase tracking-wider rounded-md text-gray-400 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-2.5 py-0.5 text-[9px] uppercase tracking-wider rounded-md text-white border border-white/10 bg-white/10 hover:bg-white/20"
              >
                Save
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Bookmarks List */}
      <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 scrollbar-thin">
        {bookmarks.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500 font-mono">
            No links added yet.
          </div>
        ) : (
          visibleBookmarks.map((bookmark) => (
            <div key={bookmark.id} className="group relative flex items-center justify-between p-1 rounded-lg hover:bg-white/5 transition-all duration-300">
              {editingId === bookmark.id ? (
                <div className="w-full flex items-center space-x-1 bg-black/25 p-1 rounded-lg border border-white/5">
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="w-1/3 bg-white/10 text-white text-[11px] px-1 py-0.5 rounded outline-none border border-white/5"
                  />
                  <input
                    type="text"
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    className="w-2/3 bg-white/10 text-white text-[11px] px-1 py-0.5 rounded outline-none border border-white/5"
                  />
                  <div className="flex space-x-0.5">
                    <button onClick={() => saveEdit(bookmark.id)} className="p-0.5 text-green-400 hover:bg-white/10 rounded">
                      <Check className="w-3 h-3" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-0.5 text-red-400 hover:bg-white/10 rounded">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <a
                    href={bookmark.url}
                    target={linkTarget}
                    rel={linkRel}
                    className="flex items-center space-x-2 flex-1 min-w-0 pr-4"
                  >
                    <div className="w-6 h-6 flex items-center justify-center rounded bg-black/35 border border-white/5 overflow-hidden group-hover:border-white/15 transition-colors flex-shrink-0">
                      {getFaviconUrl(bookmark.url) ? (
                        <img
                          src={getFaviconUrl(bookmark.url)}
                          alt={bookmark.label}
                          className="w-3.5 h-3.5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const parent = e.currentTarget.parentElement;
                            if (parent) {
                              const svg = document.createElement('div');
                              svg.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-globe w-3 h-3 text-gray-400"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`;
                              parent.appendChild(svg);
                            }
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Globe className="w-3.5 h-3.5 text-gray-400" />
                      )}
                    </div>
                    <div className="truncate">
                      <p className="text-[11px] font-medium text-white group-hover:text-primary-accent transition-colors truncate">
                        {bookmark.label}
                      </p>
                      {showDescriptions && (
                        <p className="text-[9px] text-gray-500 truncate font-mono">
                          {bookmark.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </p>
                      )}
                    </div>
                  </a>

                  {/* Actions (visible on hover) */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 transition-opacity duration-300">
                    <button
                      onClick={() => startEditing(bookmark)}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-primary-accent transition-colors"
                      title="Edit link"
                    >
                      <Edit2 className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBookmark(bookmark.id)}
                      className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors"
                      title="Delete link"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                    <a
                      href={bookmark.url}
                      target={linkTarget}
                      rel={linkRel}
                      className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </>
              )}
            </div>
          ))
        )}
        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAllBookmarks(true)}
            className="w-full text-center text-[10px] text-gray-400 hover:text-primary-accent py-1.5 font-medium transition-colors"
          >
            +{hiddenCount} more
          </button>
        )}
      </div>
    </div>
  );

}
