/**
 * TodoListWidget - A task management widget with priorities, categories,
 * and filter tabs (all/active/completed). Persists to extension storage
 * so AI-added todos appear in the widget.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ListTodo, MoreHorizontal, Trash2, Plus, Check, X } from 'lucide-react';
import { extensionStorage } from '../lib/storage';

interface TodoItem {
  id: string;
  text: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

interface TodoListWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

type FilterTab = 'all' | 'active' | 'completed';

const PRIORITY_COLORS: Record<TodoItem['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-yellow-500',
  low: 'bg-green-500',
};

const CATEGORIES = ['General', 'Work', 'Personal', 'Urgent', 'Errands'];

const STORAGE_KEY = 'dashboard_todos';

export default function TodoListWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: TodoListWidgetProps) {
  const [tasks, setTasks] = useState<TodoItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TodoItem['priority']>('medium');
  const [newTaskCategory, setNewTaskCategory] = useState('General');
  const [isAdding, setIsAdding] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Load tasks from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const raw = await extensionStorage.get(STORAGE_KEY, []);
        const items = (raw as any[]).map((t: any): TodoItem => ({
          id: t.id || crypto.randomUUID(),
          text: t.text || '',
          completed: !!t.completed,
          priority: t.priority || 'medium',
          category: t.category || 'General',
        }));
        setTasks(items);
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, []);

  // Save tasks to storage whenever they change
  useEffect(() => {
    if (!loaded) return;
    extensionStorage.set(STORAGE_KEY, tasks);
  }, [tasks, loaded]);

  // Listen for AI-added todos (via custom event from ai-tools)
  const reloadFromStorage = useCallback(async () => {
    try {
      const raw = await extensionStorage.get(STORAGE_KEY, []);
      const items = (raw as any[]).map((t: any): TodoItem => ({
        id: t.id || crypto.randomUUID(),
        text: t.text || '',
        completed: !!t.completed,
        priority: t.priority || 'medium',
        category: t.category || 'General',
      }));
      setTasks(items);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handler = () => reloadFromStorage();
    window.addEventListener('dashboard-todos-change', handler);
    return () => window.removeEventListener('dashboard-todos-change', handler);
  }, [reloadFromStorage]);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  // Filter tasks by active tab (all/active/completed)
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'active') return !t.completed;
    if (activeFilter === 'completed') return t.completed;
    return true;
  });

  const counts = {
    all: tasks.length,
    active: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };

  // Add a new task with text, priority, and category
  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskText.trim()) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        text: newTaskText.trim(),
        completed: false,
        priority: newTaskPriority,
        category: newTaskCategory,
      },
    ]);
    setNewTaskText('');
    setIsAdding(false);
  };

  const toggleTask = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <div
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible ${
        isMenuOpen ? 'z-50' : 'z-10 hover:z-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <ListTodo className="w-3.5 h-3.5" />
          <span>Todo List</span>
        </h3>
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
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${
                    alignMenu === 'left' ? 'left-0' : 'right-0'
                  }`}
                >
                  <button
                    type="button"
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

      {/* Add Task Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
            onSubmit={addTask}
          >
            <div className="flex flex-col bg-black/20 rounded-xl border border-white/10 p-2 space-y-2">
              <input
                type="text"
                autoFocus
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                placeholder="What needs to be done?"
                className="w-full bg-transparent px-2 py-1.5 text-[12px] text-white outline-none placeholder-gray-500"
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {(['high', 'medium', 'low'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p)}
                      className={`flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[10px] transition-colors ${
                        newTaskPriority === p
                          ? 'bg-white/10 text-white'
                          : 'text-gray-500 hover:text-gray-300'
                      }`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${PRIORITY_COLORS[p]}`} />
                      <span className="capitalize">{p}</span>
                    </button>
                  ))}
                </div>
                <select
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-[10px] text-gray-300 outline-none appearance-none cursor-pointer"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="bg-[#1d1b26] text-white">
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end space-x-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdding(false);
                    setNewTaskText('');
                  }}
                  className="p-1 rounded-lg text-gray-500 hover:text-white text-[10px] flex items-center space-x-0.5 transition-colors"
                >
                  <X className="w-3 h-3" /> <span>Cancel</span>
                </button>
                <button
                  type="submit"
                  disabled={!newTaskText.trim()}
                  className="p-1 rounded-lg bg-primary-accent/20 text-primary-accent hover:bg-primary-accent/40 text-[10px] flex items-center space-x-0.5 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> <span>Add</span>
                </button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex bg-black/30 p-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold">
          {(['all', 'active', 'completed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-2.5 py-0.5 rounded-full transition-all ${
                activeFilter === tab
                  ? 'bg-white/15 text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-gray-500">
          {counts[activeFilter]} {counts[activeFilter] === 1 ? 'task' : 'tasks'}
        </span>
      </div>

      {/* Task List */}
      <div className="flex flex-col space-y-1.5 flex-1 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-4 text-center text-[11px] text-gray-500 italic"
            >
              {tasks.length === 0
                ? 'No tasks yet. Add one above!'
                : `No ${activeFilter} tasks`}
            </motion.div>
          ) : (
            filteredTasks.map((task) => (
              <motion.div
                key={task.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.2 }}
                className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  task.completed
                    ? 'bg-white/3 border-white/5 text-gray-500'
                    : 'bg-white/5 border-transparent hover:bg-white/10 text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <button
                    onClick={() => toggleTask(task.id)}
                    className={`flex-shrink-0 w-4.5 h-4.5 rounded-md flex items-center justify-center transition-all border ${
                      task.completed
                        ? 'bg-primary-accent border-primary-accent text-white'
                        : 'border-gray-500 text-transparent hover:border-indigo-400'
                    }`}
                    style={{ width: '18px', height: '18px' }}
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <div className="flex items-center space-x-2 min-w-0">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[task.priority]}`} />
                    <span
                      className={`text-[12px] truncate ${
                        task.completed ? 'line-through decoration-gray-600' : ''
                      }`}
                    >
                      {task.text}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <span className="text-[9px] text-gray-600 hidden group-hover:inline transition-colors">
                    {task.category}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
