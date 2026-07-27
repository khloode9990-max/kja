/**
 * DailyPlannerWidget - A day-by-day planner with tasks, priorities, and time tracking.
 * Navigates between days, persists per-day tasks in localStorage.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Calendar - board header icon, replace with any date/calendar icon
// ICON: MoreHorizontal - overflow menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board / clear completed, replace with X or Minus
// ICON: Plus - add task, replace with CirclePlus
// ICON: Check - task completion, replace with CheckCircle
// ICON: Clock - optional time display, replace with Timer
// ICON: GripHorizontal - reorder handle, replace with ArrowUpDown
// ICON: Edit2 - edit task, replace with Pencil
// ICON: ChevronLeft - previous day, replace with ArrowLeft
// ICON: ChevronRight - next day, replace with ArrowRight
import { Calendar, Plus, Trash2, Check, Clock, MoreHorizontal, GripHorizontal, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlannerTask {
  id: string;
  text: string;
  completed: boolean;
  time: string;       // CHANGE: format "HH:MM" or empty string
  priority: 'low' | 'medium' | 'high';
}

interface DailyPlannerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Priority color map — green=low, yellow=medium, red=high
const PRIORITY_COLORS: Record<PlannerTask['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const STORAGE_KEY = 'daily_planner_tasks'; // CHANGE: localStorage key

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }); // CHANGE: date display format
}

function loadTasks(key: string): PlannerTask[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const all = JSON.parse(raw) as Record<string, PlannerTask[]>;
    return all[key] || [];
  } catch { return []; }
}

function saveTasks(key: string, tasks: PlannerTask[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: Record<string, PlannerTask[]> = raw ? JSON.parse(raw) : {};
    all[key] = tasks;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch { /* ignore */ }
}

export default function DailyPlannerWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: DailyPlannerWidgetProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [tasks, setTasks] = useState<PlannerTask[]>(() => loadTasks(dateKey(new Date())));
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPriority, setNewPriority] = useState<PlannerTask['priority']>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const key = dateKey(currentDate);

  useEffect(() => { setTasks(loadTasks(key)); }, [key]);
  useEffect(() => { saveTasks(key, tasks); }, [key, tasks]);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  const goDay = (offset: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + offset);
    setCurrentDate(next);
    setIsAdding(false);
    setEditingId(null);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) return;
    const task: PlannerTask = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      completed: false,
      time: newTime,
      priority: newPriority,
    };
    setTasks((p) => [...p, task]);
    setNewText('');
    setNewTime('');
    setNewPriority('medium');
    setIsAdding(false);
  };

  const toggleTask = (id: string) =>
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));

  const deleteTask = (id: string) =>
    setTasks((p) => p.filter((t) => t.id !== id));

  const startEdit = (t: PlannerTask) => {
    setEditingId(t.id);
    setEditText(t.text);
  };

  const saveEdit = (id: string) => {
    setTasks((p) => p.map((t) => (t.id === id ? { ...t, text: editText.trim() || t.text } : t)));
    setEditingId(null);
  };

  const moveTask = (id: string, dir: -1 | 1) => {
    setTasks((p) => {
      const idx = p.findIndex((t) => t.id === id);
      if (idx < 0) return p;
      const ni = idx + dir;
      if (ni < 0 || ni >= p.length) return p;
      const next = [...p];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  };

  const clearCompleted = () => {
    setTasks((p) => p.filter((t) => !t.completed));
    toggleMenu(false);
  };

  const completedCount = tasks.filter((t) => t.completed).length;

  return (
    <div
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible ${
        isMenuOpen ? 'z-50' : 'z-10 hover:z-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>Daily Planner</span> {/* CHANGE: Widget title */}
        </h3>
        <div className="flex items-center space-x-1 relative">
          <button onClick={() => setIsAdding(!isAdding)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
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
                  className={`absolute top-8 w-48 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}
                >
                  <button onClick={clearCompleted} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                    <span>Clear completed</span> {/* CHANGE: menu label */}
                  </button>
                  <button onClick={() => { onDeleteBoard?.(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Day Navigator */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => goDay(-1)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-[13px] font-semibold text-white">{formatDate(currentDate)}</div> {/* CHANGE: date format */}
          <div className="text-[10px] text-gray-500">{completedCount}/{tasks.length} completed</div> {/* CHANGE: counter label */}
        </div>
        <button onClick={() => goDay(1)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Add Task Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mb-3" onSubmit={addTask}>
            <div className="flex flex-col bg-black/20 rounded-xl border border-white/10 p-2 space-y-2">
              <input ref={inputRef} type="text" autoFocus value={newText} onChange={(e) => setNewText(e.target.value)} placeholder="What needs to be done?" className="w-full bg-transparent px-2 py-1.5 text-[12px] text-white outline-none placeholder-gray-500" />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <button key={p} type="button" onClick={() => setNewPriority(p)} className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${newPriority === p ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[p]}`} />
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
                <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-gray-300 outline-none appearance-none cursor-pointer" /> {/* CHANGE: time input */}
              </div>
              <div className="flex justify-end space-x-1.5">
                <button type="button" onClick={() => { setIsAdding(false); setNewText(''); setNewTime(''); }} className="p-1 rounded-lg text-gray-500 hover:text-white text-[10px] transition-colors">Cancel</button>
                <button type="submit" disabled={!newText.trim()} className="p-1 rounded-lg bg-primary-accent/20 text-primary-accent hover:bg-primary-accent/40 text-[10px] flex items-center space-x-0.5 transition-colors disabled:opacity-40">
                  <Plus className="w-3 h-3" /><span>Add</span>
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task List */}
      <div className="flex flex-col space-y-1.5 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {tasks.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-4 text-center text-[11px] text-gray-500 italic">
              No tasks for this day. Add one above! {/* CHANGE: empty state text */}
            </motion.div>
          ) : (
            tasks.map((task, idx) => (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 40 }} transition={{ duration: 0.2 }}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${task.completed ? 'bg-white/3 border-white/5 text-gray-500' : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-200'}`}
              >
                <div className="flex items-center space-x-2 min-w-0 flex-1">
                  {/* Reorder buttons */}
                  <div className="flex flex-col space-y-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => moveTask(task.id, -1)} disabled={idx === 0} className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"><GripHorizontal className="w-3 h-3 -rotate-90" /></button> {/* ICON: GripHorizontal */}
                    <button onClick={() => moveTask(task.id, 1)} disabled={idx === tasks.length - 1} className="text-gray-500 hover:text-white disabled:opacity-20 transition-colors"><GripHorizontal className="w-3 h-3 rotate-90" /></button>
                  </div>
                  {/* Checkbox */}
                  <button onClick={() => toggleTask(task.id)} className={`flex-shrink-0 w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all border ${task.completed ? 'bg-primary-accent border-primary-accent text-white' : 'border-gray-500 text-transparent hover:border-indigo-400'}`}>
                    <Check className="w-3 h-3" />
                  </button>
                  {/* Content */}
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                    {editingId === task.id ? (
                      <input type="text" autoFocus value={editText} onChange={(e) => setEditText(e.target.value)} onBlur={() => saveEdit(task.id)} onKeyDown={(e) => e.key === 'Enter' && saveEdit(task.id)} className="w-full bg-transparent text-[12px] text-white outline-none border-b border-white/20" />
                    ) : (
                      <span className={`text-[12px] truncate ${task.completed ? 'line-through decoration-gray-600' : ''}`}>{task.text}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  {task.time && <span className="text-[9px] text-gray-500 flex items-center space-x-0.5"><Clock className="w-2.5 h-2.5" /><span>{task.time}</span></span>} {/* ICON: Clock */}
                  <button onClick={() => startEdit(task)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-white transition-all"><Edit2 className="w-3 h-3" /></button> {/* ICON: Edit2 */}
                  <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"><Trash2 className="w-3 h-3" /></button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
