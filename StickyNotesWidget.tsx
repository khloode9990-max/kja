/**
 * StickyNotesWidget - Create, edit, and color-code sticky notes on a
 * grid layout. Supports auto-resize text and random slight rotations.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: StickyNote - header icon, replace with any note/memo icon
// ICON: Plus - add note button, replace with any "add" icon
// ICON: Trash2 - delete note/board action, replace with any delete icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
import { StickyNote, Plus, Trash2, MoreHorizontal } from 'lucide-react';

interface Note {
  id: string;
  text: string;
  color: string;
}

interface StickyNotesWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Edit note color palette and their display labels
const COLORS = ['#fde68a', '#fbcfe8', '#bfdbfe', '#bbf7d0', '#ddd6fe'];
const COLOR_LABELS = ['Yellow', 'Pink', 'Blue', 'Green', 'Purple'];

function randomRotation(): string {
  return (Math.random() * 4 - 2).toFixed(1) + 'deg';
}

function autoResize(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

export default function StickyNotesWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: StickyNotesWidgetProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  const addNote = () => {
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newNote: Note = { id: crypto.randomUUID(), text: '', color };
    setNotes((prev) => [newNote, ...prev]);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, ...updates } : n)));
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5">
          <StickyNote className="w-3.5 h-3.5" />
          <span>Sticky Notes</span>
        </h3>
        <div className="flex items-center space-x-1 relative">
          <button
            onClick={addNote}
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

      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-gray-500">
          {notes.length} {notes.length === 1 ? 'note' : 'notes'}
        </span>
      </div>

      {notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <StickyNote className="w-8 h-8 text-gray-600 mb-3" />
          <p className="text-xs text-gray-500 italic mb-3">No sticky notes yet</p>
          <button
            onClick={addNote}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 rounded-xl text-[11px] text-gray-400 hover:text-white transition-all"
          >
            <Plus className="w-3 h-3" />
            <span>Add note</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onUpdate={updateNote} onDelete={deleteNote} />
          ))}
        </div>
      )}
    </div>
  );
}

function NoteCard({ note, onUpdate, onDelete }: { note: Note; onUpdate: (id: string, updates: Partial<Note>) => void; onDelete: (id: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [rotation] = useState(randomRotation);

  useEffect(() => {
    if (textareaRef.current) {
      autoResize(textareaRef.current);
    }
  }, [note.text]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.8, y: -10 }}
      onDoubleClick={handleDoubleClick}
      className="group relative rounded-xl p-3 shadow-lg flex flex-col transition-shadow hover:shadow-xl cursor-default"
      style={{ backgroundColor: note.color, rotate: rotation, color: '#1e1b2e' }}
    >
      <div className="absolute top-1.5 right-1.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="relative">
          <ColorPicker
            current={note.color}
            onChange={(color) => onUpdate(note.id, { color })}
          />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(note.id); }}
          className="p-1 rounded-md hover:bg-black/10 transition-colors"
        >
          <Trash2 className="w-3 h-3 text-gray-600" />
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={note.text}
        onChange={(e) => onUpdate(note.id, { text: e.target.value })}
        onInput={(e) => autoResize(e.currentTarget)}
        placeholder="Type here..."
        rows={1}
        className="w-full bg-transparent text-[12px] font-medium leading-relaxed outline-none resize-none placeholder-gray-500/60 pr-6"
        style={{ color: '#1e1b2e' }}
      />
      <span className="text-[9px] text-gray-600 mt-1 opacity-60">double-click to delete</span>
    </motion.div>
  );
}

function ColorPicker({ current, onChange }: { current: string; onChange: (color: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1 rounded-md hover:bg-black/10 transition-colors"
      >
        <div className="w-3 h-3 rounded-full border border-black/20" style={{ backgroundColor: current }} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute top-6 right-0 z-50 flex space-x-1 p-1.5 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              {COLORS.map((c, i) => (
                <button
                  key={c}
                  onClick={() => { onChange(c); setOpen(false); }}
                  className={`w-5 h-5 rounded-full border transition-all ${c === current ? 'border-white scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                  title={COLOR_LABELS[i]}
                />
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
