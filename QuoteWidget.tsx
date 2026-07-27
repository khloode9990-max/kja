import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Quote, MoreHorizontal, Trash2, RefreshCcw, Sparkles, Pencil } from 'lucide-react';

interface QuoteWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const QUOTES = [
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "Amateurs sit and wait for inspiration, the rest of us just get up and go to work.", author: "Stephen King" },
  { text: "If you spend too much time thinking about a thing, you'll never get it done.", author: "Bruce Lee" }
];

export default function QuoteWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: QuoteWidgetProps) {
  const [quote, setQuote] = useState(QUOTES[0]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    handleRefresh();
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Daily Inspiration');

  const handleRefresh = () => {
    setIsAnimating(true);
    setTimeout(() => {
      let randomQuote;
      do {
        randomQuote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      } while (randomQuote.text === quote.text && QUOTES.length > 1);
      
      setQuote(randomQuote);
      setIsAnimating(false);
    }, 400);
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-5 text-white hover:border-white/15 transition-all duration-500 shadow-2xl flex flex-col min-h-[220px] relative overflow-hidden ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      
      {/* Decorative background element */}
      <div className="absolute -right-8 -top-8 text-white/5 rotate-12 pointer-events-none">
        <Quote className="w-48 h-48" />
      </div>

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
            onClick={() => { setTitleDraft(title || 'Daily Inspiration'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-accent" />
            <span>{title || 'Daily Inspiration'}</span>
          </h3>
        )}
        <div className="flex items-center relative space-x-1">
          <button
            onClick={handleRefresh}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300 group"
            title="New quote"
          >
            <RefreshCcw className="w-3.5 h-3.5 group-hover:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
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
                      setTitleDraft(title || 'Daily Inspiration');
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
      
      <div className="flex flex-col items-center justify-center flex-1 relative z-10 px-2">
        <div className="text-center">
          <AnimatePresence mode="wait">
            {!isAnimating && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
              >
                <p className="text-[14px] md:text-[16px] italic text-gray-200 leading-relaxed font-serif relative inline-block">
                  <span className="text-primary-accent/40 text-2xl absolute -top-2 -left-4 font-serif">"</span>
                  {quote.text}
                  <span className="text-primary-accent/40 text-2xl absolute -bottom-4 -right-4 font-serif">"</span>
                </p>
                <div className="mt-6 flex items-center justify-center space-x-3">
                  <div className="h-[1px] w-8 bg-white/10"></div>
                  <p className="text-[11px] text-primary-accent/80 font-mono tracking-widest uppercase">{quote.author}</p>
                  <div className="h-[1px] w-8 bg-white/10"></div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
