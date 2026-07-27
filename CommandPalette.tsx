import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Compass, Layout, Settings, ArrowRight, Zap, CheckSquare, Code } from 'lucide-react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, payload?: any) => void;
  tabs: string[];
  activeTab: string;
}

const ACTIONS = [
  { id: 'search-google', label: 'Search Google', icon: Search, shortcut: 'G' },
  { id: 'add-habit', label: 'New Habit', icon: CheckSquare, shortcut: 'H' },
  { id: 'toggle-settings', label: 'Dashboard Settings', icon: Settings, shortcut: 'S' },
  { id: 'edit-layout', label: 'Edit Layout', icon: Layout, shortcut: 'L' },
  { id: 'toggle-dev-mode', label: 'Toggle Dev Mode', icon: Code, shortcut: 'Ctrl+Shift+D' },
];

export default function CommandPalette({ isOpen, onClose, onAction, tabs, activeTab }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredActions = ACTIONS.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));
  const filteredTabs = tabs.filter(t => t.toLowerCase().includes(query.toLowerCase()) && t !== activeTab);

  const allItems = [
    ...filteredActions.map(a => ({ type: 'action' as const, ...a, tab: undefined })),
    ...filteredTabs.map(t => ({ type: 'tab' as const, id: `switch-tab-${t}`, label: `Switch to ${t}`, tab: t, icon: Compass, shortcut: undefined }))
  ];

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % allItems.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[selectedIndex];
      if (item) {
        if (item.type === 'action') {
          if (item.id === 'search-google' && query) {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
            onClose();
          } else {
            onAction(item.id);
            onClose();
          }
        } else if (item.type === 'tab') {
          onAction('switch-tab', item.tab);
          onClose();
        }
      } else if (query) {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.95, y: -20, x: '-50%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-[20vh] left-1/2 w-full max-w-2xl bg-[#161211]/90 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[10000]"
          >
            <div className="flex items-center px-4 py-4 border-b border-white/10">
              <Search className="w-5 h-5 text-gray-400 mr-3" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-white text-lg outline-none placeholder-gray-500 font-sans"
              />
              <div className="flex items-center space-x-1 border border-white/10 rounded-md px-2 py-1 bg-white/5">
                <span className="text-[10px] text-gray-400 font-mono tracking-wider">ESC</span>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto scrollbar-thin py-2">
              {allItems.length === 0 && !query && (
                <div className="px-6 py-8 text-center flex flex-col items-center">
                  <Zap className="w-8 h-8 text-primary-accent/50 mb-3" />
                  <p className="text-gray-400 text-sm">Type to search the web or run a command.</p>
                </div>
              )}
              {allItems.length === 0 && query && (
                <div 
                  className="px-4 py-3 mx-2 rounded-xl bg-primary-accent/10 text-primary-accent cursor-pointer flex items-center"
                  onClick={() => {
                    window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener,noreferrer');
                    onClose();
                  }}
                >
                  <Search className="w-4 h-4 mr-3 text-primary-accent" />
                  <span className="flex-1">Search Google for "{query}"</span>
                  <ArrowRight className="w-4 h-4 text-primary-accent/50" />
                </div>
              )}
              
              {allItems.length > 0 && (
                <div className="px-2">
                  {allItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.id}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        onClick={() => {
                          if (item.type === 'action') {
                            onAction(item.id);
                          } else if (item.type === 'tab') {
                            onAction('switch-tab', item.tab);
                          }
                          onClose();
                        }}
                        className={`flex items-center px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary-accent/15 text-white' : 'text-gray-300 hover:bg-white/5'
                        }`}
                      >
                        <Icon className={`w-4 h-4 mr-3 ${isSelected ? 'text-primary-accent' : 'text-gray-500'}`} />
                        <span className="flex-1 text-sm">{item.label}</span>
                        {item.shortcut && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                            isSelected ? 'border-primary-accent/30 text-primary-accent bg-primary-accent/10' : 'border-white/10 text-gray-500'
                          }`}>
                            {item.shortcut}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
