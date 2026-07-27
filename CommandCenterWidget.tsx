import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Terminal, Send, Check, X, Volume2, Power, Monitor, Search } from 'lucide-react';
import { isTauri } from '../lib/tauri-api';
import { parseCommand, executeCommand, type CommandResult } from '../lib/command-parser';

interface Message {
  id: string;
  input: string;
  displayText: string;
  result?: CommandResult;
  timestamp: number;
}

interface CommandCenterWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const QUICK_COMMANDS = [
  { icon: Volume2, label: 'Mute', command: 'mute' },
  { icon: Power, label: 'Shutdown', command: 'shutdown' },
  { icon: Monitor, label: 'Lock', command: 'lock' },
  { icon: Search, label: 'Google', command: 'search ' },
];

export default function CommandCenterWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: CommandCenterWidgetProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !isTauri) return;

    const raw = input.trim();
    const parsed = parseCommand(raw);
    const msg: Message = {
      id: Date.now().toString(),
      input: raw,
      displayText: parsed.displayText,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, msg]);
    setInput('');
    setIsProcessing(true);

    const result = await executeCommand(parsed.command);

    setMessages(prev =>
      prev.map(m => m.id === msg.id ? { ...m, result } : m)
    );
    setIsProcessing(false);
  };

  const handleQuickCommand = (command: string) => {
    setInput(command);
    inputRef.current?.focus();
  };

  if (!isTauri) {
    return (
      <div className="dashboard-card w-full rounded-2xl p-4 text-white">
        <p className="text-xs text-gray-500">Command Center requires the Tauri desktop app.</p>
      </div>
    );
  }

  return (
    <div className="dashboard-card w-full rounded-2xl p-4 text-white flex flex-col h-[280px]">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/5">
        <Terminal className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-semibold tracking-wider uppercase text-primary-accent">
          {title || 'Command Center'}
        </span>
      </div>

      {/* Quick commands */}
      <div className="flex gap-1.5 mb-3 flex-wrap">
        {QUICK_COMMANDS.map((qc) => (
          <button
            key={qc.label}
            onClick={() => handleQuickCommand(qc.command)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-[10px] text-gray-400 hover:text-white transition-colors"
          >
            <qc.icon className="w-3 h-3" />
            {qc.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-3 pr-1 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <Terminal className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-[10px]">Type a command like "play valorant" or "volume 50"</p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-1"
            >
              <div className="flex items-start gap-2">
                <span className="text-emerald-400 text-[11px] font-mono mt-0.5">&gt;</span>
                <span className="text-[11px] font-mono text-gray-300 break-all">{msg.input}</span>
              </div>
              <div className="flex items-start gap-2 ml-4">
                {msg.result === undefined ? (
                  <span className="text-[11px] text-yellow-400 animate-pulse">processing...</span>
                ) : msg.result.success ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400">
                    <Check className="w-3 h-3" />
                    {msg.result.message}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-red-400">
                    <X className="w-3 h-3" />
                    {msg.result.message}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isTauri ? 'Type a command...' : 'Desktop app required'}
          disabled={!isTauri || isProcessing}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!isTauri || isProcessing || !input.trim()}
          className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 transition-colors disabled:opacity-30"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
