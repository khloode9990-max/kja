import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Send, MoreHorizontal, Trash2, Loader2, Bot, GripHorizontal, KeyRound, ExternalLink, Pencil } from 'lucide-react';
import Markdown from 'react-markdown';
import { extensionStorage } from '../lib/storage';
import { DashboardSettings } from '../types';

interface AIAssistantWidgetProps {
  settings: DashboardSettings;
  onUpdateSettings: (s: Partial<DashboardSettings>) => void;
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AIAssistantWidget({ title, onRenameBoard, settings, onUpdateSettings, onDeleteBoard, alignMenu = 'right', onMenuToggle }: AIAssistantWidgetProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Hello! How can I help you focus and be productive today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [keyDraft, setKeyDraft] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Resizing state
  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  useEffect(() => {
    extensionStorage.get('aiWidgetHeight', 400).then(h => {
      if (h) setHeight(h);
    });
    extensionStorage.get('aiWidgetMessages', null).then(msgs => {
      if (msgs && msgs.length > 0) setMessages(msgs);
    });
  }, []);

  const saveMessages = (msgs: Message[]) => {
    setMessages(msgs);
    extensionStorage.set('aiWidgetMessages', msgs);
  };

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Gemini AI');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const apiKey = settings.geminiApiKey?.trim();
    if (!apiKey) return; // gated by the key-setup screen below; shouldn't reach here without one

    const userMsg = input.trim();
    setInput('');

    const newMessages: Message[] = [...messages, { role: 'user', text: userMsg }];
    saveMessages(newMessages);
    setIsLoading(true);

    try {
      // Talk to Gemini directly from the client. There is no backend in a Chrome
      // extension, so this replaces the old /api/chat call (which pointed at an
      // Express dev server that never actually ships with the packaged extension).
      const contents = [
        ...messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts: [{ text: userMsg }] },
      ];

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error?.message || 'Failed to fetch response');
      }

      const text = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') || '(No response)';
      saveMessages([...newMessages, { role: 'model', text }]);
    } catch (err: any) {
      console.error(err);
      saveMessages([...newMessages, { role: 'model', text: `Error: ${err.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    saveMessages([{ role: 'model', text: 'Hello! How can I help you focus and be productive today?' }]);
    toggleMenu(false);
  };

  // Resize Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.userSelect = 'none';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const delta = e.clientY - startYRef.current;
      const newHeight = Math.max(300, Math.min(800, startHeightRef.current + delta));
      setHeight(newHeight);
    };
    const handleMouseUp = () => {
      if (isResizing) {
        setIsResizing(false);
        document.body.style.userSelect = '';
        extensionStorage.set('aiWidgetHeight', height);
      }
    };
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, height]);

  return (
    <div 
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white transition-all duration-300 shadow-xl flex flex-col relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'} ${isResizing ? 'ring-2 ring-orange-500/50' : 'hover:border-white/15 border border-transparent'}`}
      style={{ height: `${height}px` }}
    >
      {/* Header */}
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
            onClick={() => { setTitleDraft(title || 'Gemini AI'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{title || 'Gemini AI'}</span>
          </h3>
        )}
        <div className="flex items-center space-x-1 relative">
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Board options"
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
                    onClick={handleClear}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                    <span>Clear Chat</span>
                  </button>
                  {settings.geminiApiKey?.trim() && (
                    <button
                      onClick={() => {
                        onUpdateSettings({ geminiApiKey: '' });
                        setKeyDraft('');
                        toggleMenu(false);
                      }}
                      className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-gray-400" />
                      <span>Change API key</span>
                    </button>
                  )}
                  <div className="h-[1px] bg-white/5 my-1" />
                  <button
                    onClick={() => {
                      setTitleDraft(title || 'Gemini AI');
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

      {!settings.geminiApiKey?.trim() ? (
        /* API Key Setup Gate — shown instead of a chat that would just fail silently */
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4 space-y-3">
          <KeyRound className="w-8 h-8 text-primary-accent opacity-70" />
          <div>
            <p className="text-[13px] font-semibold text-gray-200">Add a Gemini API key to chat</p>
            <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
              This runs entirely in your browser — there's no server, so a free Gemini key is needed to talk to the model directly.
            </p>
          </div>
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-primary-accent hover:underline flex items-center gap-1"
          >
            Get a free API key <ExternalLink className="w-3 h-3" />
          </a>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (keyDraft.trim()) onUpdateSettings({ geminiApiKey: keyDraft.trim() });
            }}
            className="w-full flex items-center gap-1.5 mt-1"
          >
            <input
              type="password"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              placeholder="Paste your API key..."
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-[12px] text-white outline-none focus:border-white/20 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={!keyDraft.trim()}
              className="px-3 py-2 bg-primary-accent/20 text-primary-accent hover:bg-primary-accent hover:text-white rounded-lg text-[12px] font-medium transition-colors disabled:opacity-50"
            >
              Save
            </button>
          </form>
        </div>
      ) : (
        <>
      {/* Chat History */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 scrollbar-thin mb-3 pb-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed font-sans ${
              msg.role === 'user' 
                ? 'bg-primary-accent/30 text-orange-50 border border-primary-accent/20 shadow-inner' 
                : 'bg-[#2a2835]/60 text-gray-200 border border-white/5 shadow-md'
            }`}>
              {msg.role === 'model' && (
                <div className="flex items-center space-x-1.5 mb-1 opacity-70">
                  <Bot className="w-3.5 h-3.5 text-primary-accent" />
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-primary-accent">Gemini</span>
                </div>
              )}
              {msg.role === 'model' ? (
                <div className="markdown-body prose prose-invert prose-sm max-w-none">
                  <Markdown>{msg.text}</Markdown>
                </div>
              ) : (
                msg.text
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[#2a2835]/60 border border-white/5 flex items-center space-x-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary-accent" />
              <span className="text-[12px] text-gray-400 font-medium tracking-wide animate-pulse">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-end bg-black/20 rounded-xl border border-white/10 focus-within:border-primary-accent/50 focus-within:ring-1 focus-within:ring-orange-500/50 transition-all">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder="Ask Gemini..."
          className="w-full bg-transparent px-4 py-3 pr-12 text-[13px] outline-none text-white placeholder-gray-500 resize-none max-h-32 min-h-[44px] scrollbar-thin"
          rows={Math.min(4, input.split('\n').length)}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="absolute right-2 bottom-2 p-2 bg-primary-accent/20 text-primary-accent hover:text-white hover:bg-primary-accent rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
        </>
      )}

      {/* Resize Handle */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-4 cursor-ns-resize flex justify-center items-center opacity-0 hover:opacity-100 transition-opacity"
        onMouseDown={handleMouseDown}
      >
        <GripHorizontal className="w-5 h-5 text-gray-500" />
      </div>
    </div>
  );
}
