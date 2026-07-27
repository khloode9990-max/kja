import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, SkipForward, Settings, X, BarChart3, MoreHorizontal, Trash2 } from 'lucide-react';
import { PomodoroMode, PomodoroSettings } from '../types';

interface PomodoroTimerProps {
  title?: string;
  settings: PomodoroSettings;
  onUpdateSettings: (s: PomodoroSettings) => void;
  onFocusComplete: (minutes: number) => void;
  onOpenStats?: () => void;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  onDeleteWidget?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function PomodoroTimer({
  title,
  settings,
  onUpdateSettings,
  onFocusComplete,
  onOpenStats,
  onRenameBoard,
  onDeleteBoard,
  onDeleteWidget,
  alignMenu = 'right',
  onMenuToggle,
}: PomodoroTimerProps) {
  const [mode, setMode] = useState<PomodoroMode>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focusTime * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || '');
  const [completedFocusCount, setCompletedFocusCount] = useState(0);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  
  // Custom temp settings
  const [customFocus, setCustomFocus] = useState(settings.focusTime);
  const [customShort, setCustomShort] = useState(settings.shortBreakTime);
  const [customLong, setCustomLong] = useState(settings.longBreakTime);
  const [customLongBreakInterval, setCustomLongBreakInterval] = useState(settings.longBreakInterval || 4);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const completedFocusCountRef = useRef(completedFocusCount);
  const longBreakIntervalRef = useRef(settings.longBreakInterval || 4);
  completedFocusCountRef.current = completedFocusCount;
  longBreakIntervalRef.current = settings.longBreakInterval || 4;

  // Sync time when settings change or mode changes
  useEffect(() => {
    let minutes = settings.focusTime;
    if (mode === 'shortBreak') minutes = settings.shortBreakTime;
    if (mode === 'longBreak') minutes = settings.longBreakTime;
    
    setTimeLeft(minutes * 60);
    setIsRunning(false);
  }, [mode, settings]);

  // Timer countdown mechanism
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerExpiry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode]);

  // Synthesize a beautiful lo-fi bell sound
  const playChime = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Chime note 1 (E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 1.2);

      // Chime note 2 (B5) shortly after
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(987.77, ctx.currentTime); // B5
        gain2.gain.setValueAtTime(0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 1.5);
      }, 150);

    } catch (e) {
      console.warn('Audio synthesis failed:', e);
    }
  };

  const handleTimerExpiry = () => {
    setIsRunning(false);
    playChime();
    
    // Accumulate focus minutes if completing a focus session
    if (mode === 'focus') {
      onFocusComplete(settings.focusTime);
      const newCount = completedFocusCountRef.current + 1;
      setCompletedFocusCount(newCount);
      const interval = longBreakIntervalRef.current;
      // Long break every Nth completed focus session, short break otherwise
      setMode(newCount % interval === 0 ? 'longBreak' : 'shortBreak');
    } else {
      // Auto-switch back to focus
      setMode('focus');
    }
  };

  const handlePlayPause = () => {
    setIsRunning(!isRunning);
  };

  const handleReset = () => {
    setIsRunning(false);
    let minutes = settings.focusTime;
    if (mode === 'shortBreak') minutes = settings.shortBreakTime;
    if (mode === 'longBreak') minutes = settings.longBreakTime;
    setTimeLeft(minutes * 60);
  };

  const handleSkip = () => {
    setIsRunning(false);
    if (mode === 'focus') {
      const interval = longBreakIntervalRef.current;
      // Skipping doesn't count as a completed session, so peek at what the NEXT
      // completed session would trigger without incrementing the counter.
      setMode((completedFocusCountRef.current + 1) % interval === 0 ? 'longBreak' : 'shortBreak');
    } else {
      setMode('focus');
    }
  };

  const saveCustomSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      focusTime: customFocus,
      shortBreakTime: customShort,
      longBreakTime: customLong,
      longBreakInterval: customLongBreakInterval,
    });
    setIsEditingSettings(false);
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate percentage for a beautiful progress ring or indicator
  const getProgressPercent = () => {
    let totalSecs = settings.focusTime * 60;
    if (mode === 'shortBreak') totalSecs = settings.shortBreakTime * 60;
    if (mode === 'longBreak') totalSecs = settings.longBreakTime * 60;
    return ((totalSecs - timeLeft) / totalSecs) * 100;
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col relative overflow-visible h-[200px] ${isMenuOpen || isEditingSettings ? 'z-50' : 'z-10 hover:z-20'}`}>
      
      {/* Title & Settings Header */}
      <div className="flex items-center justify-between mb-2 pb-1 border-b border-white/5">
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
            onClick={() => { if (onRenameBoard) { setTitleDraft(title || 'Pomodoro'); setIsEditingTitle(true); } }}
            className={`text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight ${onRenameBoard ? 'cursor-text hover:text-white' : ''}`}
            title={onRenameBoard ? 'Click to rename' : undefined}
          >
            {title || 'Pomodoro'}
          </h3>
        )}
        <div className="flex items-center space-x-1.5 relative">
          {onOpenStats && (
            <button
              onClick={onOpenStats}
              className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
              title="Focus Statistics"
            >
              <BarChart3 className="w-3.5 h-3.5 text-primary-accent" />
            </button>
          )}
          <button
            onClick={() => {
              setCustomFocus(settings.focusTime);
              setCustomShort(settings.shortBreakTime);
              setCustomLong(settings.longBreakTime);
              setCustomLongBreakInterval(settings.longBreakInterval || 4);
              setIsEditingSettings(!isEditingSettings);
            }}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Timer Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Board options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Board Options Popup */}
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

      {isEditingSettings && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsEditingSettings(false)} />
          <motion.form
            initial={{ opacity: 0, scale: 0.96, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -6 }}
            onSubmit={saveCustomSettings}
            className="absolute top-10 left-1/2 -translate-x-1/2 w-64 bg-[#1a1514]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-4 z-50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-300 font-medium">Focus (min)</label>
              <input
                type="number"
                min="1"
                max="180"
                value={customFocus}
                onChange={(e) => setCustomFocus(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-1.5 text-[12px] text-center text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-300 font-medium">Short break (min)</label>
              <input
                type="number"
                min="1"
                max="60"
                value={customShort}
                onChange={(e) => setCustomShort(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-1.5 text-[12px] text-center text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-300 font-medium">Long break (min)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={customLong}
                onChange={(e) => setCustomLong(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-1.5 text-[12px] text-center text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-[12px] text-gray-300 font-medium">Long break after</label>
              <input
                type="number"
                min="2"
                max="12"
                value={customLongBreakInterval}
                onChange={(e) => setCustomLongBreakInterval(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-16 bg-white/5 border border-white/10 rounded-lg p-1.5 text-[12px] text-center text-white outline-none focus:border-white/20"
              />
            </div>
            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setIsEditingSettings(false)}
                className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[12px] font-medium border border-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded-xl bg-primary-accent hover:opacity-90 text-white text-[12px] font-semibold transition-opacity"
              >
                Save
              </button>
            </div>
          </motion.form>
        </>
      )}

      {(
        /* Normal Timer View */
        <div className="flex flex-col items-center justify-between flex-1">
          {/* Mode Selector Tabs (Focus, Short Break, Long Break) */}
          <div className="flex bg-black/35 p-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold w-full max-w-[210px] mt-1">
            <button
              onClick={() => setMode('focus')}
              className={`flex-1 py-0.5 rounded-full text-center transition-all ${
                mode === 'focus' ? 'bg-white/15 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Focus
            </button>
            <button
              onClick={() => setMode('shortBreak')}
              className={`flex-1 py-0.5 rounded-full text-center transition-all ${
                mode === 'shortBreak' ? 'bg-white/15 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Short
            </button>
            <button
              onClick={() => setMode('longBreak')}
              className={`flex-1 py-0.5 rounded-full text-center transition-all ${
                mode === 'longBreak' ? 'bg-white/15 text-white shadow-sm font-bold' : 'text-gray-400 hover:text-white'
              }`}
            >
              Long
            </button>
          </div>

          {/* Countdown Display */}
          <div className="relative flex flex-col items-center justify-center select-text">
            <div className={`text-3xl font-bold tracking-widest font-mono text-center transition-all duration-500 ${isRunning ? 'text-primary-accent drop-shadow-[0_0_8px_var(--primary-color)]' : 'text-gray-200'}`}>
              {formatTime(timeLeft)}
            </div>

            {/* Bullets */}
            <div className="flex space-x-1 mt-1">
              {[0, 1, 2, 3].map((dotIndex) => {
                const isActive = mode === 'focus' && isRunning && dotIndex === 0;
                return (
                  <div
                    key={dotIndex}
                    className={`w-1 h-1 rounded-full transition-all duration-500 ${
                      isActive 
                        ? 'bg-primary-accent scale-125 animate-pulse-subtle' 
                        : dotIndex === 0 && mode === 'focus'
                        ? 'bg-primary-accent/80'
                        : 'bg-white/15'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex items-center space-x-4 mb-1">
            <button
              onClick={handleReset}
              className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handlePlayPause}
              className={`p-3 active:scale-95 text-white rounded-full transition-all duration-300 shadow-md ${isRunning ? 'bg-white/10 hover:bg-white/20' : 'bg-primary-accent hover:bg-primary-accent/80'}`}
              title={isRunning ? 'Pause' : 'Play'}
            >
              {isRunning ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
            </button>

            <button
              onClick={handleSkip}
              className="p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-300"
              title="Next State"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
