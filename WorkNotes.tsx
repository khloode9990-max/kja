import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Trash2, Check, MoreHorizontal, X, Edit2, Eraser } from 'lucide-react';

interface WorkNotesProps {
  key?: string;
  title: string;
  initialNotes: string;
  onNotesChange: (notes: string) => void;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  onDeleteWidget?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function WorkNotes({
  title,
  initialNotes,
  onNotesChange,
  onRenameBoard,
  onDeleteBoard,
  onDeleteWidget,
  alignMenu = 'right',
  onMenuToggle,
}: WorkNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [copied, setCopied] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [height, setHeight] = useState(() => {
    try {
      const savedHeight = localStorage.getItem('dashboard_notes_height');
      return savedHeight ? parseInt(savedHeight, 10) : 180;
    } catch {
      return 180;
    }
  });

  const saveHeight = (newHeight: number) => {
    setHeight(newHeight);
    try {
      localStorage.setItem('dashboard_notes_height', String(newHeight));
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => {
    setNotes(initialNotes);
  }, [initialNotes]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setNotes(val);
    onNotesChange(val);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(notes);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newHeight = Math.max(120, Math.min(800, startHeight + deltaY));
      saveHeight(newHeight);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startY = touch.clientY;
    const startHeight = height;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const touchMove = moveEvent.touches[0];
      const deltaY = touchMove.clientY - startY;
      const newHeight = Math.max(120, Math.min(800, startHeight + deltaY));
      saveHeight(newHeight);
    };

    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };

    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
  };

  return (
    <div 
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col relative pb-6 overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}
      style={{ height: `${height}px` }}
    >
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

        <div className="flex items-center space-x-1 relative">
          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`p-1 rounded transition-all duration-300 ${
              copied ? 'text-green-400 bg-green-500/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            title="Copy to clipboard"
            disabled={!notes}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          
          {/* Options Button */}
          <button
            onClick={() => {
              toggleMenu(!isMenuOpen);
              setShowClearConfirm(false);
            }}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300 animate-none"
            title="Board options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Board Options Popup */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => { toggleMenu(false); setShowClearConfirm(false); }} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${
                    alignMenu === 'left' ? 'left-0' : 'right-0'
                  }`}
                >
                  {showClearConfirm ? (
                    <div className="p-1.5 flex flex-col space-y-1 bg-red-500/10 rounded-lg border border-red-500/20 m-1">
                      <span className="text-[9px] uppercase tracking-wider text-red-400 font-mono text-center">Are you sure?</span>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => {
                            setNotes('');
                            onNotesChange('');
                            setShowClearConfirm(false);
                            toggleMenu(false);
                          }}
                          className="flex-1 text-center py-1 bg-red-500 text-white rounded text-[9px] font-semibold tracking-wider font-mono uppercase hover:bg-red-600 transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 text-center py-1 bg-white/10 text-gray-300 rounded text-[9px] font-semibold tracking-wider font-mono uppercase hover:bg-white/25 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
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
                          setShowClearConfirm(true);
                        }}
                        className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors disabled:opacity-50 disabled:hover:bg-transparent"
                        disabled={!notes}
                      >
                        <Eraser className="w-4 h-4 text-gray-400" />
                        <span>Clear notes</span>
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
                    </>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Editable Scratchpad Textarea */}
      <div className="flex-1 relative">
        <textarea
          value={notes}
          onChange={handleChange}
          placeholder="Write down details here..."
          className="w-full h-full bg-transparent text-[11px] text-gray-200 placeholder-gray-500 outline-none resize-none font-sans leading-relaxed scrollbar-thin overflow-y-auto"
          style={{ border: 'none' }}
        />
        {!notes && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-[10px] text-gray-500 font-mono select-none">
            Click to edit notes...
          </div>
        )}
      </div>

      {/* Bottom Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-2.5 hover:h-3.5 rounded-full bg-white/5 hover:bg-white/20 cursor-ns-resize transition-all flex items-center justify-center"
        title="Drag down to resize notes board"
      >
        <div className="w-5 h-[2px] bg-white/30 rounded" />
      </div>
    </div>
  );
}
