import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookA, MoreHorizontal, Trash2, Search, Play, Volume2, Pencil } from 'lucide-react';

interface DictionaryWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function DictionaryWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: DictionaryWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Dictionary');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    setError('');
    setResult(null);
    
    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Word not found');
      const data = await res.json();
      setResult(data[0]);
    } catch (e) {
      setError('Word not found or error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const playAudio = (url: string) => {
    if (url) {
      const audio = new Audio(url);
      audio.play();
    }
  };

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
            onClick={() => { setTitleDraft(title || 'Dictionary'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <BookA className="w-3.5 h-3.5" />
            <span>{title || 'Dictionary'}</span>
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
                      setTitleDraft(title || 'Dictionary');
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

      <div className="flex flex-col z-10 relative">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex items-center bg-black/20 rounded-xl border border-white/10 p-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search word..."
              className="w-full bg-transparent px-3 py-1.5 text-[13px] text-white outline-none placeholder-gray-500 font-sans"
            />
            <button type="submit" disabled={!query.trim() || loading} className="p-1.5 bg-primary-accent/20 text-primary-accent rounded-lg hover:bg-primary-accent/80 hover:text-white transition-colors disabled:opacity-50">
              <Search className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </form>

        {error && <div className="text-[12px] text-red-400 text-center py-2">{error}</div>}

        {result && !loading && !error && (
          <div className="flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-end justify-between mb-2">
              <div className="flex flex-col">
                <h4 className="text-xl font-bold font-serif text-white">{result.word}</h4>
                {result.phonetic && <span className="text-[11px] font-mono text-primary-accent opacity-80 mt-0.5">{result.phonetic}</span>}
              </div>
              {result.phonetics?.find((p: any) => p.audio) && (
                <button 
                  onClick={() => playAudio(result.phonetics.find((p: any) => p.audio).audio)}
                  className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-primary-accent transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className="max-h-[160px] overflow-y-auto scrollbar-thin pr-1 mt-2 space-y-4">
              {result.meanings.slice(0, 2).map((meaning: any, idx: number) => (
                <div key={idx} className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1 border-b border-white/5 pb-1 inline-block">
                    {meaning.partOfSpeech}
                  </span>
                  <ul className="list-disc list-inside space-y-1.5 mt-1">
                    {meaning.definitions.slice(0, 2).map((def: any, didx: number) => (
                      <li key={didx} className="text-[12px] text-gray-300 leading-snug">
                        {def.definition}
                        {def.example && <p className="text-[11px] text-gray-500 italic mt-0.5 pl-4">"{def.example}"</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
