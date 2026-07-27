import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckSquare, MoreHorizontal, Trash2, Plus, Check, Pencil } from 'lucide-react';
import { HabitItem } from '../types';

interface HabitWidgetProps {
  habits: HabitItem[];
  onAddHabit: (text: string) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  onDeleteWidget?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function HabitWidget({ 
  habits, onAddHabit, onToggleHabit, onDeleteHabit, 
  title, onRenameBoard, onDeleteBoard, onDeleteWidget, alignMenu = 'right', onMenuToggle 
}: HabitWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [newHabit, setNewHabit] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Habit Tracker');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabit.trim()) {
      onAddHabit(newHabit.trim());
      setNewHabit('');
      setIsAdding(false);
    }
  };

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
            onClick={() => { setTitleDraft(title || 'Habit Tracker'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>{title || 'Habit Tracker'}</span>
          </h3>
        )}
        <div className="flex items-center space-x-1 relative">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
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
                      setTitleDraft(title || 'Habit Tracker');
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

      <AnimatePresence>
        {isAdding && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
            onSubmit={handleAdd}
          >
            <div className="flex items-center bg-black/20 rounded-xl border border-white/10 p-1">
              <input
                type="text"
                autoFocus
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                placeholder="New habit..."
                className="w-full bg-transparent px-3 py-1.5 text-[12px] text-white outline-none placeholder-gray-500"
              />
              <button type="submit" disabled={!newHabit.trim()} className="p-1.5 bg-primary-accent/20 text-primary-accent rounded-lg hover:bg-primary-accent/80 hover:text-white transition-colors disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="flex flex-col space-y-1.5">
        {habits.length === 0 ? (
          <div className="py-4 text-center text-xs text-gray-500 italic">No habits for this space</div>
        ) : (
          habits.map((habit) => (
            <div 
              key={habit.id}
              className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                habit.completed 
                  ? 'bg-primary-accent/10 border-primary-accent/20 text-gray-400' 
                  : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-200'
              }`}
              onClick={() => onToggleHabit(habit.id)}
            >
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                  habit.completed 
                    ? 'bg-primary-accent border-primary-accent text-white' 
                    : 'border-gray-500 text-transparent group-hover:border-indigo-400'
                }`}>
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className={`text-[13px] ${habit.completed ? 'line-through decoration-gray-600' : ''}`}>
                  {habit.text}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onDeleteHabit(habit.id); }}
                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
