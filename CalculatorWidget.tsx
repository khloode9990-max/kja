import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator as CalcIcon, Trash2, MoreHorizontal, History, Pencil } from 'lucide-react';
import { evaluate } from 'mathjs';

interface CalculatorWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function CalculatorWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: CalculatorWidgetProps) {
  const [display, setDisplay] = useState('0');
  const [equation, setEquation] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyList, setHistoryList] = useState<{ eq: string, res: string }[]>([]);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Calculator');

  const handlePress = (val: string) => {
    if (val === 'C') {
      setDisplay('0');
      setEquation('');
      return;
    }
    if (val === 'DEL') {
      if (display.length > 1) {
        setDisplay(display.slice(0, -1));
      } else {
        setDisplay('0');
      }
      return;
    }
    if (val === '=') {
      try {
        const result = evaluate(display.replace(/×/g, '*').replace(/÷/g, '/'));
        const resultStr = String(Math.round(result * 1e8) / 1e8); // Fix float precision
        setEquation(display + ' =');
        setDisplay(resultStr);
        setHistoryList(prev => [{ eq: display, res: resultStr }, ...prev].slice(0, 10));
      } catch {
        setDisplay('Error');
      }
      return;
    }
    if (display === '0' || display === 'Error') {
      setDisplay(val === '.' ? '0.' : val);
    } else {
      setDisplay(display + val);
    }
  };

  const basicButtons = [
    '(', ')', 'DEL', 'C',
    '7', '8', '9', '÷',
    '4', '5', '6', '×',
    '1', '2', '3', '-',
    '0', '.', '=', '+'
  ];

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[320px] relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
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
            onClick={() => { setTitleDraft(title || 'Calculator'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <CalcIcon className="w-3.5 h-3.5" />
            <span>{title || 'Calculator'}</span>
          </h3>
        )}
        <div className="flex items-center relative space-x-1">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-lg transition-colors duration-300 ${showHistory ? 'bg-primary-accent/20 text-primary-accent' : 'hover:bg-white/10 text-gray-400 hover:text-white'}`}
            title="History"
          >
            <History className="w-4 h-4" />
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
                  className={`absolute top-10 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}
                >
                  <button
                    onClick={() => {
                      setTitleDraft(title || 'Calculator');
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

      <div className="flex-1 flex flex-col relative overflow-hidden">
        <AnimatePresence mode="wait">
          {showHistory ? (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute inset-0 flex flex-col z-10 bg-[#1d1b26] rounded-xl overflow-y-auto scrollbar-thin p-2 space-y-2"
            >
              {historyList.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-500 text-xs italic">
                  No history yet
                </div>
              ) : (
                historyList.map((item, i) => (
                  <div key={i} className="p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors" onClick={() => {
                    setDisplay(item.res);
                    setShowHistory(false);
                  }}>
                    <div className="text-xs text-gray-400 font-mono text-right">{item.eq} =</div>
                    <div className="text-sm font-bold text-primary-accent font-mono text-right mt-1">{item.res}</div>
                  </div>
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="calculator"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col h-full"
            >
              {/* Screen */}
              <div className="bg-[#0f0e13]/80 rounded-xl p-4 mb-3 text-right flex flex-col justify-center border border-white/5 h-[80px] shadow-inner">
                <div className="text-[11px] text-gray-500 font-mono tracking-wider mb-1 min-h-[16px] truncate">
                  {equation}
                </div>
                <div className="text-2xl font-mono tracking-wider truncate text-white font-bold">
                  {display}
                </div>
              </div>

              {/* Keypad */}
              <div className="grid grid-cols-4 gap-2 flex-1">
                {basicButtons.map((btn, i) => (
                  <button
                    key={i}
                    onClick={() => handlePress(btn)}
                    className={`rounded-xl flex items-center justify-center font-mono text-sm font-bold transition-all transform active:scale-95 ${
                      btn === '=' 
                        ? 'bg-primary-accent text-white shadow-md shadow-black/20' 
                        : btn === 'C' || btn === 'DEL'
                        ? 'text-red-400 bg-white/5 hover:bg-white/10'
                        : ['÷','×','-','+'].includes(btn)
                        ? 'text-primary-accent bg-primary-accent/10 hover:bg-primary-accent/20'
                        : 'text-gray-100 bg-[#2a2835]/50 hover:bg-white/10'
                    }`}
                  >
                    {btn}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
