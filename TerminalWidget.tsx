// TerminalWidget — Simulated terminal with command history, tab completion, and persistence.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Terminal, // ICON: Replace with any terminal/console icon
  Trash2, // ICON: Replace with any delete/trash icon
  MoreHorizontal, // ICON: Replace with any overflow-menu icon
  Copy, // ICON: Replace with any clipboard-copy icon
  Check, // ICON: Replace with any success/checkmark icon
  Download, // ICON: Replace with any download/save icon
} from 'lucide-react';

interface TerminalWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface TermLine {
  id: number;
  type: 'input' | 'output';
  text: string;
}

// CHANGE: Add or remove commands from the commands list below
const COMMANDS = [
  'help', 'date', 'echo', 'clear', 'whoami', 'pwd', 'ls', 'cat',
  'calc', 'weather', 'theme', 'colors', 'joke', 'time', 'uptime',
];

const FILES: Record<string, string> = {
  'readme.txt': 'Welcome to the dashboard terminal!\nType "help" to see available commands.',
  'notes.md': '# Notes\n- Build widgets\n- Ship features\n- Monitor uptime',
  'config.json': '{\n  "theme": "dark",\n  "accent": "#6366f1",\n  "fontSize": 14\n}',
  'todo.txt': '1. Finish terminal widget\n2. Add more themes\n3. Deploy v2.0',
};

const DEV_JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs.",
  "There are 10 types of people: those who understand binary and those who don't.",
  "A SQL query walks into a bar, sees two tables, and asks: 'Can I join you?'",
  "Why do Java developers wear glasses? Because they can't C#.",
  "What's a programmer's favorite hangout place? Foo Bar.",
  "Why did the developer go broke? Because he used up all his cache.",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem.",
  "Why was the JavaScript developer sad? Because he didn't Node how to Express himself.",
  "What do you call a fake noodle? An impasta. (not dev related but works)",
  "Why do programmers hate nature? It has too many bugs.",
];

// CHANGE: Adjust startup message or uptime epoch here
const UPTIME_EPOCH = Date.now();
const STORAGE_KEY = 'terminal_history';
const MAX_HISTORY_LINES = 200;
const MAX_CMD_HISTORY = 50;

// CSP-safe math evaluator (no eval or new Function)
function safeCalcEval(expr: string): number {
  let pos = 0;
  const s = expr.replace(/\s+/g, '');

  function peek(): string { return pos < s.length ? s[pos] : ''; }
  function consume(): string { return s[pos++]; }

  function parseExpr(): number {
    let val = parseTerm();
    while (peek() === '+' || peek() === '-') {
      const op = consume();
      const right = parseTerm();
      val = op === '+' ? val + right : val - right;
    }
    return val;
  }

  function parseTerm(): number {
    let val = parseUnary();
    while (peek() === '*' || peek() === '/' || peek() === '%') {
      const op = consume();
      const right = parseUnary();
      if (op === '*') val *= right;
      else if (op === '/') val /= right;
      else val %= right;
    }
    return val;
  }

  function parseUnary(): number {
    if (peek() === '-') { consume(); return -parsePrimary(); }
    if (peek() === '+') { consume(); return parsePrimary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    if (peek() === '(') {
      consume();
      const val = parseExpr();
      if (peek() === ')') consume();
      return val;
    }
    let numStr = '';
    while (pos < s.length && /[0-9.]/.test(s[pos])) { numStr += consume(); }
    return parseFloat(numStr);
  }

  const result = parseExpr();
  if (pos < s.length) throw new Error('Unexpected character');
  return result;
}

export default function TerminalWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: TerminalWidgetProps) {
  const [lines, setLines] = useState<TermLine[]>(() => {
    const welcome: TermLine = { id: 0, type: 'output', text: 'Dashboard Terminal v1.0\nType "help" for available commands.\n' };
    return [welcome];
  });
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw).slice(-MAX_CMD_HISTORY);
    } catch { /* */ }
    return [];
  });
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uptime, setUptime] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const idCounter = useRef(lines.length);

  // Persist command history
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cmdHistory.slice(-MAX_CMD_HISTORY))); } catch { /* */ }
  }, [cmdHistory]);

  // Uptime ticker
  useEffect(() => {
    const t = setInterval(() => setUptime(Date.now() - UPTIME_EPOCH), 1000);
    return () => clearInterval(t);
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const nextId = useCallback(() => { idCounter.current += 1; return idCounter.current; }, []);

  const toggleMenu = useCallback((val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  }, [onMenuToggle]);

  // CHANGE: Add new command handlers in this switch
  const executeCommand = useCallback((raw: string): string[] => {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');

    switch (cmd) {
      case 'help':
        return [
          'Available commands:',
          ...COMMANDS.map(c => `  ${c === 'echo' || c === 'cat' || c === 'calc' ? `${c} <arg>` : c}`),
          '',
          'Tips: Use Tab to auto-complete, Up/Down arrows for history.',
        ];
      case 'date': return [new Date().toString()];
      case 'echo': return [args || ''];
      case 'clear': return ['__CLEAR__'];
      case 'whoami': return ['dashboard-user'];
      case 'pwd': return ['/home/dashboard'];
      case 'ls': return ['readme.txt  notes.md  config.json  todo.txt'];
      case 'cat': {
        if (!args) return ['Usage: cat <filename>'];
        const file = args.toLowerCase();
        if (FILES[file]) return [FILES[file]];
        return [`cat: ${args}: No such file or directory`];
      }
      case 'calc': {
        if (!args) return ['Usage: calc <expression> (e.g. calc 2+2)'];
        try {
          // Safe math evaluation — only allows digits, operators, parens, dots, spaces
          if (!/^[\d+\-*/().%\s]+$/.test(args)) return ['calc: invalid expression (only math operators allowed)'];
          // Simple recursive descent parser (no eval, CSP-safe)
          const calcResult = safeCalcEval(args);
          return [String(calcResult)];
        } catch { return ['calc: error evaluating expression']; }
      }
      case 'weather': return ['Sunny, 72°F (cached)', 'Humidity: 45%', 'Wind: 8 mph NW'];
      case 'theme': return ['Current theme: Dark', 'Background: #0d0d1a', 'Accent: #6366f1', 'Text: #e2e8f0'];
      case 'colors': return ['Primary: #6366f1', 'Secondary: #8b5cf6', 'Success: #22c55e', 'Warning: #f59e0b', 'Danger: #ef4444', 'Info: #3b82f6'];
      case 'joke': return [DEV_JOKES[Math.floor(Math.random() * DEV_JOKES.length)]];
      case 'time': return [new Date().toLocaleTimeString()];
      case 'uptime': {
        const s = Math.floor(uptime / 1000);
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return [`${h}h ${m}m ${sec}s`];
      }
      default: return [`Command not found: ${cmd}. Type "help" for available commands.`];
    }
  }, [uptime]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    const newLines: TermLine[] = [{ id: nextId(), type: 'input', text: trimmed }];

    if (trimmed) {
      const result = executeCommand(trimmed);
      if (result.includes('__CLEAR__')) {
        setLines([{ id: nextId(), type: 'output', text: 'Terminal cleared. Type "help" for available commands.\n' }]);
        setInput('');
        setCmdHistory(prev => [...prev, trimmed].slice(-MAX_CMD_HISTORY));
        setHistoryIdx(-1);
        return;
      }
      result.forEach(r => newLines.push({ id: nextId(), type: 'output', text: r }));
    }

    setLines(prev => [...prev, ...newLines].slice(-MAX_HISTORY_LINES));
    if (trimmed) setCmdHistory(prev => [...prev, trimmed].slice(-MAX_CMD_HISTORY));
    setInput('');
    setHistoryIdx(-1);
  }, [input, executeCommand, nextId]);

  // CHANGE: Tab completion logic — matches against COMMANDS list
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); return; }
    if (e.key === 'Tab') {
      e.preventDefault();
      const lower = input.toLowerCase().trim();
      if (!lower) return;
      const match = COMMANDS.find(c => c.startsWith(lower) && c !== lower);
      if (match) setInput(match + (['echo', 'cat', 'calc'].includes(match) ? ' ' : ''));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length === 0) return;
      const newIdx = historyIdx === -1 ? cmdHistory.length - 1 : Math.max(0, historyIdx - 1);
      setHistoryIdx(newIdx);
      setInput(cmdHistory[newIdx]);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx === -1) return;
      const newIdx = historyIdx + 1;
      if (newIdx >= cmdHistory.length) { setHistoryIdx(-1); setInput(''); }
      else { setHistoryIdx(newIdx); setInput(cmdHistory[newIdx]); }
    }
  }, [input, cmdHistory, historyIdx, handleSubmit]);

  const copyOutput = useCallback(async () => {
    const output = lines.map(l => l.text).join('\n');
    try { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  }, [lines]);

  const handleClear = useCallback(() => {
    setLines([{ id: nextId(), type: 'output', text: 'Terminal cleared. Type "help" for available commands.\n' }]);
    toggleMenu(false);
  }, [nextId, toggleMenu]);

  const handleExport = useCallback(() => {
    const output = lines.map(l => `${l.type === 'input' ? '$ ' : ''}${l.text}`).join('\n');
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'terminal-output.txt'; a.click(); URL.revokeObjectURL(url);
    toggleMenu(false);
  }, [lines, toggleMenu]);

  const focusInput = useCallback(() => inputRef.current?.focus(), []);

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[320px] relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-gray-300 font-display dashboard-text-weight flex items-center space-x-1.5">
          <Terminal className="w-3.5 h-3.5" /> {/* CHANGE: Icon color */}
          <span>Terminal</span> {/* CHANGE: Widget title */}
        </h3>
        <div className="flex items-center relative space-x-1">
          <button onClick={copyOutput} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300" title="Copy output">
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
          <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-10 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}>
                  <button onClick={handleClear} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4 text-gray-400" />
                    <span>Clear terminal</span>
                  </button>
                  <button onClick={handleExport} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors">
                    <Download className="w-4 h-4 text-gray-400" />
                    <span>Export output</span>
                  </button>
                  {onDeleteBoard && (
                    <button onClick={() => { onDeleteBoard(); toggleMenu(false); }}
                      className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Delete board</span>
                    </button>
                  )}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Terminal body */}
      <div className="flex-1 bg-black/80 rounded-xl border border-white/5 p-3 overflow-y-auto font-mono text-[12px] leading-relaxed min-h-[220px] cursor-text scrollbar-thin"
        onClick={focusInput}>
        {lines.map(line => (
          <div key={line.id} className={`whitespace-pre-wrap ${line.type === 'input' ? 'text-green-400' : 'text-green-300/80'}`}>
            {line.type === 'input' && <span className="text-green-500 mr-1">$</span>}
            {line.text}
          </div>
        ))}
        {/* Current input line */}
        <div className="flex items-center text-green-400">
          <span className="text-green-500 mr-1">$</span>
          <span className="mr-1 whitespace-pre">{input}</span>
          <span className="inline-block w-[7px] h-[14px] bg-green-400 animate-pulse" />
          <input ref={inputRef} value={input} onChange={e => { setInput(e.target.value); setHistoryIdx(-1); }}
            onKeyDown={handleKeyDown} className="flex-1 bg-transparent outline-none text-green-400 font-mono text-[12px] caret-transparent"
            autoFocus spellCheck={false} autoComplete="off" />
        </div>
        <div ref={bottomRef} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
        <span>{cmdHistory.length} commands in history</span>
        <span>Tab: complete · ↑↓: history</span>
      </div>
    </div>
  );
}
