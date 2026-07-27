import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, MoreHorizontal, Trash2, ExternalLink, Pencil } from 'lucide-react';

interface NewsWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function NewsWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: NewsWidgetProps) {
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
        const ids = await res.json();
        const topIds = ids.slice(0, 4);
        
        const stories = await Promise.all(
          topIds.map(async (id: number) => {
            const storyRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
            return storyRes.json();
          })
        );
        setNews(stories);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchNews();
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Tech News');

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
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
            onClick={() => { setTitleDraft(title || 'Tech News'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span>{title || 'Tech News'}</span>
          </h3>
        )}
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
                      setTitleDraft(title || 'Tech News');
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

      <div className="flex flex-col space-y-0.5">
        {loading ? (
          <div className="py-4 text-center text-xs text-gray-500 animate-pulse font-mono uppercase tracking-widest">Loading latest...</div>
        ) : (
          news.map((item, idx) => (
            <a 
              key={item.id} 
              href={item.url || `https://news.ycombinator.com/item?id=${item.id}`} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex flex-col p-2.5 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
            >
              <h4 className="text-[12px] font-medium text-gray-200 group-hover:text-primary-accent transition-colors leading-snug line-clamp-2 pr-4 relative">
                {item.title}
                <ExternalLink className="w-3 h-3 absolute right-0 top-0.5 opacity-0 group-hover:opacity-100 text-primary-accent transition-opacity" />
              </h4>
              <div className="flex items-center space-x-3 mt-2 text-[10px] text-gray-500 font-mono">
                <span>{item.score} pts</span>
                <span>{item.descendants ?? 0} comments</span>
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
