/**
 * WeeklyPlannerWidget - A 7-day week view planner with tasks, priorities, and week navigation.
 * Persists tasks in localStorage, highlights today, shows progress bar.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: CalendarDays - board header icon, replace with Calendar
// ICON: MoreHorizontal - overflow menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board / clear completed, replace with X
// ICON: Plus - add task, replace with CirclePlus
// ICON: Check - task completion, replace with CheckCircle
// ICON: Clock - optional time display, replace with Timer
// ICON: Edit2 - edit task, replace with Pencil
// ICON: ChevronLeft - previous week, replace with ArrowLeft
// ICON: ChevronRight - next week, replace with ArrowRight
import { CalendarDays, Plus, Trash2, MoreHorizontal, ChevronLeft, ChevronRight, Clock, Check, Edit2 } from 'lucide-react';

interface WeeklyTask {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

interface WeeklyPlannerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Priority color map — green=low, yellow=medium, red=high
const PRIORITY_COLORS: Record<WeeklyTask['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const STORAGE_KEY = 'weekly_planner_tasks'; // CHANGE: localStorage key

function startOfWeek(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1); // Monday-based
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(d: Date): string {
  return d.toISOString().split('T')[0]; // YYYY-MM-DD
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function formatDayShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

function formatDayNum(d: Date): string {
  return d.getDate().toString();
}

function getWeekNumber(d: Date): number {
  const onejan = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
}

function loadAllTasks(): Record<string, WeeklyTask[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveAllTasks(data: Record<string, WeeklyTask[]>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

export default function WeeklyPlannerWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: WeeklyPlannerWidgetProps) {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [allTasks, setAllTasks] = useState<Record<string, WeeklyTask[]>>(loadAllTasks);
  const [addingDay, setAddingDay] = useState<string | null>(null);
  const [newText, setNewText] = useState('');
  const [newPriority, setNewPriority] = useState<WeeklyTask['priority']>('medium');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [movingId, setMovingId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayKey = dateKey(new Date());

  useEffect(() => { saveAllTasks(allTasks); }, [allTasks]);

  const toggleMenu = useCallback((val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  }, [onMenuToggle]);

  const goWeek = useCallback((offset: number) => {
    setWeekStart((prev) => addDays(prev, offset * 7));
    setAddingDay(null);
    setEditingId(null);
    setMovingId(null);
  }, []);

  const getTasks = useCallback((day: Date): WeeklyTask[] => {
    return allTasks[dateKey(day)] || [];
  }, [allTasks]);

  const updateDayTasks = useCallback((dayKey: string, updater: (prev: WeeklyTask[]) => WeeklyTask[]) => {
    setAllTasks((prev) => ({ ...prev, [dayKey]: updater(prev[dayKey] || []) }));
  }, []);

  const addTask = useCallback((day: Date) => {
    if (!newText.trim()) return;
    const task: WeeklyTask = {
      id: crypto.randomUUID(),
      text: newText.trim(),
      completed: false,
      priority: newPriority,
    };
    updateDayTasks(dateKey(day), (prev) => [...prev, task]);
    setNewText('');
    setNewPriority('medium');
    setAddingDay(null);
  }, [newText, newPriority, updateDayTasks]);

  const toggleTask = useCallback((day: string, id: string) => {
    updateDayTasks(day, (prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  }, [updateDayTasks]);

  const deleteTask = useCallback((day: string, id: string) => {
    updateDayTasks(day, (prev) => prev.filter((t) => t.id !== id));
  }, [updateDayTasks]);

  const startEdit = useCallback((task: WeeklyTask) => {
    setEditingId(task.id);
    setEditText(task.text);
  }, []);

  const saveEdit = useCallback((day: string, id: string) => {
    updateDayTasks(day, (prev) => prev.map((t) => (t.id === id ? { ...t, text: editText.trim() || t.text } : t)));
    setEditingId(null);
  }, [editText, updateDayTasks]);

  const moveTaskToDay = useCallback((targetDay: string) => {
    if (!movingId) return;
    let movedTask: WeeklyTask | null = null;
    let sourceDay = '';
    for (const dk of Object.keys(allTasks)) {
      const found = allTasks[dk].find((t) => t.id === movingId);
      if (found) { movedTask = found; sourceDay = dk; break; }
    }
    if (!movedTask || sourceDay === targetDay) { setMovingId(null); return; }
    updateDayTasks(sourceDay, (prev) => prev.filter((t) => t.id !== movingId));
    updateDayTasks(targetDay, (prev) => [...prev, movedTask!]);
    setMovingId(null);
  }, [movingId, allTasks, updateDayTasks]);

  const clearCompleted = useCallback(() => {
    setAllTasks((prev) => {
      const next: Record<string, WeeklyTask[]> = {};
      for (const dk of Object.keys(prev)) {
        const remaining = prev[dk].filter((t) => !t.completed);
        if (remaining.length > 0) next[dk] = remaining;
      }
      return next;
    });
    toggleMenu(false);
  }, [toggleMenu]);

  const totalTasks = days.reduce((sum, d) => sum + getTasks(d).length, 0);
  const completedTasks = days.reduce((sum, d) => sum + getTasks(d).filter((t) => t.completed).length, 0);
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[320px] relative overflow-visible ${
        isMenuOpen ? 'z-50' : 'z-10 hover:z-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <CalendarDays className="w-3.5 h-3.5" /> {/* ICON: CalendarDays */}
          <span>Weekly Planner</span> {/* CHANGE: Widget title */}
        </h3>
        <div className="flex items-center space-x-1 relative">
          <span className="text-[10px] text-gray-500 mr-1">Week {getWeekNumber(weekStart)}</span> {/* CHANGE: week number display */}
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

      {/* Week Navigator */}
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => goWeek(-1)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="text-center">
          <div className="text-[11px] font-semibold text-white">
            {formatDayShort(days[0])} {formatDayNum(days[0])} — {formatDayShort(days[6])} {formatDayNum(days[6])}
          </div> {/* CHANGE: date range format */}
          <div className="text-[10px] text-gray-500">{completedTasks}/{totalTasks} completed</div>
        </div>
        <button onClick={() => goWeek(1)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-white/5 rounded-full mb-3 overflow-hidden">
        <motion.div
          className="h-full bg-primary-accent rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* 7-Day Columns */}
      <div className="flex gap-1.5 flex-1 overflow-x-auto min-h-0">
        {days.map((day) => {
          const dk = dateKey(day);
          const isToday = dk === todayKey;
          const dayTasks = getTasks(day);
          const isAddingHere = addingDay === dk;

          return (
            <div
              key={dk}
              onClick={() => movingId && moveTaskToDay(dk)}
              className={`flex-1 min-w-[70px] flex flex-col rounded-xl border transition-all ${
                isToday
                  ? 'bg-primary-accent/10 border-primary-accent/30'
                  : movingId
                    ? 'bg-white/5 border-white/10 hover:bg-primary-accent/10 hover:border-primary-accent/20 cursor-pointer'
                    : 'bg-white/[0.02] border-transparent hover:bg-white/5'
              }`}
            >
              {/* Day Header */}
              <div className={`text-center py-1.5 border-b ${isToday ? 'border-primary-accent/20' : 'border-white/5'}`}>
                <div className={`text-[10px] font-medium uppercase ${isToday ? 'text-primary-accent' : 'text-gray-500'}`}>
                  {formatDayShort(day)}
                </div>
                <div className={`text-[13px] font-bold ${isToday ? 'text-white' : 'text-gray-300'}`}>
                  {formatDayNum(day)}
                </div>
              </div>

              {/* Tasks */}
              <div className="flex-1 p-1 space-y-1 overflow-y-auto max-h-[160px]">
                <AnimatePresence mode="popLayout">
                  {dayTasks.map((task) => (
                    <motion.div
                      key={task.id}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      onClick={(e) => { e.stopPropagation(); }}
                      className={`group relative p-1.5 rounded-lg text-[10px] border transition-all ${
                        movingId === task.id
                          ? 'opacity-50 border-primary-accent/50 bg-primary-accent/10'
                          : task.completed
                            ? 'bg-white/[0.02] border-white/5 text-gray-500'
                            : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-200'
                      }`}
                    >
                      <div className="flex items-start space-x-1">
                        <button
                          onClick={() => toggleTask(dk, task.id)}
                          className={`flex-shrink-0 w-3.5 h-3.5 mt-0.5 rounded-sm flex items-center justify-center transition-all border ${
                            task.completed ? 'bg-primary-accent border-primary-accent text-white' : 'border-gray-500 text-transparent hover:border-indigo-400'
                          }`}
                        >
                          <Check className="w-2.5 h-2.5" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1">
                            <div className={`w-1 h-1 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                            {editingId === task.id ? (
                              <input
                                type="text"
                                autoFocus
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onBlur={() => saveEdit(dk, task.id)}
                                onKeyDown={(e) => e.key === 'Enter' && saveEdit(dk, task.id)}
                                className="w-full bg-transparent text-white outline-none border-b border-white/20 text-[10px]"
                              />
                            ) : (
                              <span className={`truncate block ${task.completed ? 'line-through decoration-gray-600' : ''}`}>
                                {task.text}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Task actions on hover */}
                      <div className="absolute top-0.5 right-0.5 flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(task)} className="p-0.5 text-gray-500 hover:text-white">
                          <Edit2 className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={() => setMovingId(movingId === task.id ? null : task.id)}
                          className={`p-0.5 transition-colors ${movingId === task.id ? 'text-primary-accent' : 'text-gray-500 hover:text-white'}`}
                          title="Move to another day"
                        >
                          <Clock className="w-2.5 h-2.5" />
                        </button>
                        <button onClick={() => deleteTask(dk, task.id)} className="p-0.5 text-gray-500 hover:text-red-400">
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Add Task */}
              <div className="p-1 border-t border-white/5">
                <AnimatePresence mode="wait">
                  {isAddingHere ? (
                    <motion.form
                      key="form"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                      onSubmit={(e) => { e.preventDefault(); addTask(day); }}
                    >
                      <input
                        type="text"
                        autoFocus
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        onBlur={() => { if (!newText.trim()) setAddingDay(null); }}
                        onKeyDown={(e) => { if (e.key === 'Escape') setAddingDay(null); }}
                        placeholder="Task..."
                        className="w-full bg-transparent text-[10px] text-white outline-none placeholder-gray-500 mb-1"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1">
                          {(['high', 'medium', 'low'] as const).map((p) => (
                            <button key={p} type="button" onClick={() => setNewPriority(p)}
                              className={`w-2 h-2 rounded-full transition-all ${newPriority === p ? `${PRIORITY_COLORS[p]} ring-1 ring-white/40` : `${PRIORITY_COLORS[p]} opacity-30`}`}
                              title={p}
                            />
                          ))}
                        </div>
                        <div className="flex items-center space-x-1">
                          <button type="button" onClick={() => setAddingDay(null)} className="text-[9px] text-gray-500 hover:text-white">Esc</button>
                          <button type="submit" disabled={!newText.trim()} className="text-[9px] text-primary-accent hover:text-white disabled:opacity-30">OK</button>
                        </div>
                      </div>
                    </motion.form>
                  ) : (
                    <motion.button
                      key="btn"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      onClick={() => setAddingDay(dk)}
                      className="w-full flex items-center justify-center space-x-1 py-1 text-[10px] text-gray-500 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" /> {/* ICON: Plus */}
                      <span>Add</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      {/* Moving task hint */}
      <AnimatePresence>
        {movingId && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-primary-accent/90 text-white text-[10px] px-3 py-1 rounded-full flex items-center space-x-2"
          >
            <span>Click a day to move</span>
            <button onClick={() => setMovingId(null)} className="underline">Cancel</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
