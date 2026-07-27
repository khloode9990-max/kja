// KanbanBoardWidget — A three-column (To Do / In Progress / Done) drag-style task board with add, move, and delete.
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Columns3, // ICON: Replace with any columns/board layout icon
  Plus, // ICON: Replace with any add icon
  ArrowRight, // ICON: Replace with any right-arrow icon
  ArrowLeft, // ICON: Replace with any left-arrow icon
  Trash2, // ICON: Replace with any delete icon
  GripVertical, // ICON: Replace with any drag-handle icon
  MoreHorizontal // ICON: Replace with any overflow-menu icon
} from 'lucide-react';

type ColumnKey = 'todo' | 'progress' | 'done';

interface Task {
  id: string;
  text: string;
  column: ColumnKey;
  createdAt: string;
}

interface KanbanBoardWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Rename labels, swap colors, or add/remove columns here
const COLUMNS: { key: ColumnKey; label: string; color: string; colorBorder: string; colorText: string }[] = [
  { key: 'todo', label: 'To Do', color: 'bg-blue-500', colorBorder: 'border-blue-500/50', colorText: 'text-blue-400' },
  { key: 'progress', label: 'In Progress', color: 'bg-yellow-500', colorBorder: 'border-yellow-500/50', colorText: 'text-yellow-400' },
  { key: 'done', label: 'Done', color: 'bg-green-500', colorBorder: 'border-green-500/50', colorText: 'text-green-400' },
];

const COLUMN_ORDER: ColumnKey[] = ['todo', 'progress', 'done'];

export default function KanbanBoardWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: KanbanBoardWidgetProps) {
  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', text: 'Design landing page', column: 'todo', createdAt: new Date().toISOString() },
    { id: '2', text: 'Set up CI/CD pipeline', column: 'progress', createdAt: new Date().toISOString() },
    { id: '3', text: 'Write project README', column: 'done', createdAt: new Date().toISOString() },
  ]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTaskText, setNewTaskText] = useState<Record<ColumnKey, string>>({ todo: '', progress: '', done: '' });
  const todoRef = useRef<HTMLInputElement | null>(null);
  const progressRef = useRef<HTMLInputElement | null>(null);
  const doneRef = useRef<HTMLInputElement | null>(null);
  const inputRefs: Record<ColumnKey, React.RefObject<HTMLInputElement | null>> = {
    todo: todoRef,
    progress: progressRef,
    done: doneRef,
  };

  useEffect(() => {
    onMenuToggle?.(menuOpen);
  }, [menuOpen, onMenuToggle]);

  // Creates a task in the specified column from input text
  const addTask = (column: ColumnKey) => {
    const text = newTaskText[column].trim();
    if (!text) return;
    const task: Task = {
      id: Date.now().toString(),
      text,
      column,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, task]);
    setNewTaskText((prev) => ({ ...prev, [column]: '' }));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // Moves a task one column left or right within the COLUMN_ORDER
  const moveTask = (id: string, direction: 'left' | 'right') => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const currentIdx = COLUMN_ORDER.indexOf(t.column);
        const nextIdx = direction === 'right' ? currentIdx + 1 : currentIdx - 1;
        if (nextIdx < 0 || nextIdx >= COLUMN_ORDER.length) return t;
        return { ...t, column: COLUMN_ORDER[nextIdx] };
      })
    );
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Columns3 size={18} className="text-white/60" /> {/* CHANGE: Icon color */}
          <span className="font-semibold text-sm tracking-wide">Kanban Board</span> {/* CHANGE: Widget title */}
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={16} className="text-white/50" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1 z-50 w-40 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
                  alignMenu === 'left' ? 'left-0' : 'right-0'
                }`}
              >
                {onDeleteBoard && (
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onDeleteBoard();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-white/5 transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete board
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Columns */}
      <div className="flex flex-1 gap-2 overflow-hidden">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.column === col.key);
          return (
            <div key={col.key} className="flex-1 flex flex-col min-w-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={`w-2 h-2 rounded-full ${col.color}`} />
                <span className={`text-xs font-medium ${col.colorText}`}>{col.label}</span>
                <span className="text-[10px] text-white/30 bg-white/5 rounded-full px-1.5 py-0.5 ml-auto">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards area */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                <AnimatePresence mode="popLayout">
                  {colTasks.length === 0 ? (
                    <motion.div
                      key={`empty-${col.key}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`flex-1 min-h-[60px] border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center`}
                    >
                      <span className="text-[10px] text-white/20">No tasks</span>
                    </motion.div>
                  ) : (
                    colTasks.map((task) => (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`bg-white/5 rounded-xl p-2 group relative border ${col.colorBorder}`}
                      >
                        <div className="flex items-start gap-1.5">
                          <GripVertical size={12} className="text-white/20 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-white/90 leading-relaxed break-words">{task.text}</p>
                            <p className="text-[10px] text-white/25 mt-1">{formatTime(task.createdAt)}</p>
                          </div>
                          <button
                            onClick={() => deleteTask(task.id)}
                            className="p-0.5 rounded hover:bg-white/10 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                          >
                            <Trash2 size={11} className="text-white/40" />
                          </button>
                        </div>
                        {/* Move buttons */}
                        <div className="flex gap-1 mt-1.5 justify-end">
                          {COLUMN_ORDER.indexOf(task.column) > 0 && (
                            <button
                              onClick={() => moveTask(task.id, 'left')}
                              className="p-0.5 rounded hover:bg-white/10 transition-colors"
                            >
                              <ArrowLeft size={11} className="text-white/30" />
                            </button>
                          )}
                          {COLUMN_ORDER.indexOf(task.column) < COLUMN_ORDER.length - 1 && (
                            <button
                              onClick={() => moveTask(task.id, 'right')}
                              className="p-0.5 rounded hover:bg-white/10 transition-colors"
                            >
                              <ArrowRight size={11} className="text-white/30" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>

              {/* Add task input */}
              <div className="mt-1.5 flex gap-1">
                <input
                  ref={inputRefs[col.key]}
                  type="text"
                  value={newTaskText[col.key]}
                  onChange={(e) => setNewTaskText((prev) => ({ ...prev, [col.key]: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addTask(col.key);
                  }}
                  placeholder={`Add task...`}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] text-white/80 placeholder-white/25 outline-none focus:border-white/25 transition-colors min-w-0"
                />
                <button
                  onClick={() => addTask(col.key)}
                  className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition-colors shrink-0"
                >
                  <Plus size={12} className="text-white/40" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
