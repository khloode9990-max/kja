import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Github, MoreHorizontal, Trash2, Star, GitFork, Pencil } from 'lucide-react';

interface GitHubWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function GitHubWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: GitHubWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [repos, setRepos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        // Fetch repositories created in the last 7 days sorted by stars
        const date = new Date();
        date.setDate(date.getDate() - 7);
        const dateStr = date.toISOString().split('T')[0];
        
        const res = await fetch(`https://api.github.com/search/repositories?q=created:>${dateStr}&sort=stars&order=desc`);
        const data = await res.json();
        setRepos((data.items || []).slice(0, 4));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'GitHub Trending');

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5 relative z-10">
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
            onClick={() => { setTitleDraft(title || 'GitHub Trending'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-gray-100 font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Github className="w-3.5 h-3.5" />
            <span>{title || 'GitHub Trending'}</span>
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
                      setTitleDraft(title || 'GitHub Trending');
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

      <div className="flex flex-col space-y-2 z-10 relative">
        {loading ? (
          <div className="py-4 text-center text-xs text-gray-500 animate-pulse font-mono uppercase tracking-widest">Fetching...</div>
        ) : (
          repos.map((repo, idx) => (
            <a 
              key={repo.id} 
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
            >
              <div className="flex items-center space-x-2">
                <img src={repo.owner.avatar_url} alt={repo.owner.login} className="w-5 h-5 rounded-full" />
                <h4 className="text-[13px] font-semibold text-gray-200 group-hover:text-primary-accent transition-colors truncate flex-1">
                  {repo.full_name}
                </h4>
              </div>
              <p className="text-[11px] text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                {repo.description || 'No description provided.'}
              </p>
              <div className="flex items-center space-x-4 mt-2 text-[10px] text-gray-400 font-mono">
                <span className="flex items-center">
                  <Star className="w-3 h-3 mr-1 text-yellow-500/70" />
                  {repo.stargazers_count.toLocaleString()}
                </span>
                <span className="flex items-center">
                  <GitFork className="w-3 h-3 mr-1" />
                  {repo.forks_count.toLocaleString()}
                </span>
                {repo.language && (
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 opacity-70"></span>
                    {repo.language}
                  </span>
                )}
              </div>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
