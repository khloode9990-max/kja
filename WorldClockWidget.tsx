import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe2, MoreHorizontal, Trash2, Sun, Moon, Clock, Pencil } from 'lucide-react';

interface WorldClockWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const CITIES = [
  { name: 'San Francisco', tz: 'America/Los_Angeles' },
  { name: 'New York', tz: 'America/New_York' },
  { name: 'London', tz: 'Europe/London' },
  { name: 'Tokyo', tz: 'Asia/Tokyo' },
];

export default function WorldClockWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: WorldClockWidgetProps) {
  const [time, setTime] = useState(new Date());
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Global Time');

  const getCityInfo = (date: Date, tz: string) => {
    try {
      const timeString = date.toLocaleTimeString('en-US', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: true });
      const hourStr = date.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', hour12: false });
      const hour = parseInt(hourStr, 10);
      const isDay = hour >= 6 && hour < 18;
      
      return { timeString, isDay };
    } catch {
      return { timeString: '--:--', isDay: true };
    }
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
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
            onClick={() => { setTitleDraft(title || 'Global Time'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Globe2 className="w-3.5 h-3.5" />
            <span>{title || 'Global Time'}</span>
          </h3>
        )}
        <div className="flex items-center relative">
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
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
                      setTitleDraft(title || 'Global Time');
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

      <div className="flex flex-col space-y-2 mt-1">
        {CITIES.map((city, idx) => {
          const { timeString, isDay } = getCityInfo(time, city.tz);
          return (
            <div 
              key={city.name} 
              className={`flex items-center justify-between p-3 rounded-xl border border-white/5 transition-all ${
                isDay ? 'bg-gradient-to-r from-blue-900/20 to-sky-900/10' : 'bg-gradient-to-r from-indigo-900/20 to-purple-900/10'
              } hover:border-white/10`}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 rounded-lg ${isDay ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-300'}`}>
                  {isDay ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-semibold tracking-wide text-gray-200">{city.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-mono tracking-widest">{city.tz.split('/')[1]?.replace('_', ' ')}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-base font-bold tracking-wider font-mono text-white">{timeString}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
