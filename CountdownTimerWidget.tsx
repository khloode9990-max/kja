// CountdownTimerWidget - Tracks multiple named countdown timers with progress rings and celebration effects.
// Persists timers in localStorage and plays a subtle notification when a timer completes.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Hourglass - header icon; replace with Timer or Clock
// ICON: Plus - add timer button; replace with CirclePlus or PlusCircle
// ICON: Trash2 - delete timer; replace with X or Trash
// ICON: Play - start timer; replace with any play icon
// ICON: Pause - pause timer; replace with any pause icon
// ICON: RotateCcw - reset timer; replace with RefreshCw
// ICON: MoreHorizontal - context menu trigger; replace with EllipsisVertical
// ICON: Timer - timer display accent; replace with Clock or Hourglass
import { Hourglass, Plus, Trash2, Play, Pause, RotateCcw, MoreHorizontal, Timer } from 'lucide-react';

// CHANGE: Edit this array to set default timer colors.
const COLORS = ['#f97316', '#8b5cf6', '#06b6d4', '#10b981', '#ef4444', '#eab308'];

interface TimerData {
  id: string;
  name: string;
  target: string;
  color: string;
  completed?: boolean;
}

interface CountdownTimerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

function getDiff(target: string) {
  const now = Date.now();
  const end = new Date(target).getTime();
  const diff = Math.max(0, end - now);
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    minutes: Math.floor((diff % 3600000) / 60000),
    seconds: Math.floor((diff % 60000) / 1000),
    total: diff,
    isZero: diff === 0,
  };
}

function getProgress(target: string, created: string) {
  const start = new Date(created).getTime();
  const end = new Date(target).getTime();
  const now = Date.now();
  if (end <= start) return 1;
  const elapsed = now - start;
  const total = end - start;
  return Math.min(1, Math.max(0, elapsed / total));
}

function playNotification() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(520, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent fail */ }
}

export default function CountdownTimerWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: CountdownTimerWidgetProps) {
  const [timers, setTimers] = useState<TimerData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [celebratingId, setCelebratingId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const notifiedRef = useRef<Set<string>>(new Set());
  const formRef = useRef<HTMLFormElement>(null);

  const loadTimers = useCallback(() => {
    try {
      const raw = localStorage.getItem('countdown_timers');
      if (raw) setTimers(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadTimers(); }, [loadTimers]);

  // CHANGE: Adjust the interval (ms) to control how often timers update. 1000 = once per second.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Play notification and celebrate when a timer hits zero
  useEffect(() => {
    timers.forEach((t) => {
      const d = getDiff(t.target);
      if (d.isZero && !t.completed && !notifiedRef.current.has(t.id)) {
        notifiedRef.current.add(t.id);
        setCelebratingId(t.id);
        playNotification();
        setTimeout(() => setCelebratingId(null), 3000);
        setTimers((prev) => prev.map((x) => x.id === t.id ? { ...x, completed: true } : x));
      }
    });
  }, [tick, timers]);

  const persist = (next: TimerData[]) => {
    setTimers(next);
    localStorage.setItem('countdown_timers', JSON.stringify(next));
  };

  const addTimer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !target) return;
    const newTimer: TimerData = {
      id: Date.now().toString(),
      name: name.trim(),
      target,
      color: COLORS[timers.length % COLORS.length],
    };
    persist([...timers, newTimer]);
    setName('');
    setTarget('');
    setShowForm(false);
  };

  const deleteTimer = (id: string) => {
    persist(timers.filter((t) => t.id !== id));
    notifiedRef.current.delete(id);
  };

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  };

  const closeMenu = () => {
    setMenuOpen(false);
    onMenuToggle?.(false);
  };

  const R = 28;
  const CIRC = 2 * Math.PI * R;

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] max-h-[420px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5">
          <Hourglass className="w-3.5 h-3.5" />
          <span>Countdown Timers</span>
        </h3>
        <div className="flex items-center space-x-1">
          <button onClick={() => setShowForm(!showForm)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-emerald-400 transition-colors" title="Add timer">
            <Plus className="w-4 h-4" />
          </button>
          <div className="relative">
            <button onClick={toggleMenu} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeMenu} />
                  <motion.div initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }} className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}>
                    <button onClick={() => { onDeleteBoard?.(); closeMenu(); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4" />
                      <span>Delete board</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Inline add form */}
      <AnimatePresence>
        {showForm && (
          <motion.form ref={formRef} onSubmit={addTimer} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden mb-3">
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-white/5 border border-white/5">
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Timer name" className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:border-white/20" />
              <input type="datetime-local" value={target} onChange={(e) => setTarget(e.target.value)} className="w-full px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-white/20 [color-scheme:dark]" />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 py-1.5 rounded-lg bg-[var(--primary-accent)]/20 text-[var(--primary-accent)] text-xs font-semibold hover:bg-[var(--primary-accent)]/30 transition-colors">Add</button>
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-gray-400 text-xs hover:bg-white/10 transition-colors">Cancel</button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Timer list */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {timers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
              <Timer className="w-5 h-5 text-gray-500" />
            </div>
            <p className="text-gray-500 text-xs">No timers yet. Click + to add one.</p>
          </div>
        )}
        {timers.map((timer) => {
          const d = getDiff(timer.target);
          const progress = getProgress(timer.target, timer.id);
          const strokeOffset = CIRC * (1 - progress);
          const isCelebrating = celebratingId === timer.id;

          return (
            <motion.div key={timer.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} className={`relative flex items-center gap-3 p-3 rounded-xl border border-white/5 transition-all hover:border-white/10 ${isCelebrating ? 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/30' : 'bg-white/[0.02]'}`}>
              {/* Progress ring */}
              <div className="relative flex-shrink-0">
                <svg width="64" height="64" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
                  <circle cx="32" cy="32" r={R} fill="none" stroke={timer.color} strokeWidth="4" strokeDasharray={CIRC} strokeDashoffset={strokeOffset} strokeLinecap="round" transform="rotate(-90 32 32)" style={{ transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  {isCelebrating ? (
                    <span className="text-lg">🎉</span>
                  ) : d.isZero ? (
                    <span className="text-[10px] font-bold text-emerald-400">DONE</span>
                  ) : (
                    <span className="text-[10px] font-bold text-white/80">{d.days}d</span>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-white/90">{timer.name}</p>
                {d.isZero ? (
                  <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Timer completed!</p>
                ) : (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5 tracking-wide">
                    {d.days}d : {String(d.hours).padStart(2, '0')}h : {String(d.minutes).padStart(2, '0')}m : {String(d.seconds).padStart(2, '0')}s
                  </p>
                )}
              </div>

              {/* Delete */}
              <button onClick={() => deleteTimer(timer.id)} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors" title="Delete timer">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
