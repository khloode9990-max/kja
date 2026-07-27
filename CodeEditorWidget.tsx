// CodeEditorWidget — Lightweight code editor with syntax highlighting, tabs, and persistence.
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code, // ICON: Replace with any code/brackets icon (e.g. Braces, Terminal)
  Copy, // ICON: Replace with any clipboard-copy icon
  Check, // ICON: Replace with any success/checkmark icon
  MoreHorizontal, // ICON: Replace with any overflow-menu icon (e.g. Ellipsis)
  Trash2, // ICON: Replace with any delete icon (e.g. Trash)
  Download, // ICON: Replace with any download/save icon
  FileCode, // ICON: Replace with any file-code icon (e.g. FileText)
  Braces, // ICON: Replace with any bracket/brace icon
  Terminal, // ICON: Replace with any terminal/console icon
} from 'lucide-react';

interface CodeTab { id: string; name: string; language: string; content: string; }
interface CodeEditorWidgetProps { onDeleteBoard?: () => void; alignMenu?: 'left' | 'right'; onMenuToggle?: (isOpen: boolean) => void; }

// CHANGE: Add/remove languages and adjust their display colors here
const LANGUAGES: { value: string; label: string; color: string; ext: string }[] = [
  { value: 'javascript', label: 'JavaScript', color: '#f0db4f', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6', ext: 'ts' },
  { value: 'python', label: 'Python', color: '#3776ab', ext: 'py' },
  { value: 'html', label: 'HTML', color: '#e34c26', ext: 'html' },
  { value: 'css', label: 'CSS', color: '#264de4', ext: 'css' },
  { value: 'json', label: 'JSON', color: '#292929', ext: 'json' },
  { value: 'markdown', label: 'Markdown', color: '#83b0d4', ext: 'md' },
];
const TAB_SIZES = [2, 4, 8] as const;
const BRACKET_PAIRS: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
const BRACKET_CLOSE = new Set([')', ']', '}']);
const BRACKET_OPEN = new Set(['(', '[', '{']);
const JS_KW = 'const let var function return if else for while do switch case break continue class new this import from export default async await try catch throw finally typeof instanceof in of void delete yield null undefined true false NaN Infinity';
const PY_KW = 'def class return if elif else for while break continue pass import from as with try except finally raise lambda yield and or not is in True False None print range len';
const KW_MAP: Record<string, string> = {
  javascript: JS_KW, typescript: JS_KW + ' interface type enum extends implements abstract readonly',
  python: PY_KW, html: 'div span p a h1 h2 h3 h4 h5 h6 ul ol li table tr td th form input button img src href class id style type name value action method',
  css: 'color background margin padding border font size width height display position flex grid align justify',
  json: 'true false null', markdown: '',
};
const generateId = () => crypto.randomUUID();

function highlightCode(code: string, language: string): string {
  if (!code) return '';
  let h = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  if (['javascript', 'typescript', 'java', 'c', 'c++', 'css'].includes(language))
    h = h.replace(/(\/\/.*$)/gm, '<span style="color:#6a9955">$1</span>');
  if (language === 'python' || language === 'markdown')
    h = h.replace(/(#.*$)/gm, '<span style="color:#6a9955">$1</span>');
  h = h.replace(/(\/\*[\s\S]*?\*\/)/g, '<span style="color:#6a9955">$1</span>');
  h = h.replace(/("(?:[^"\\]|\\.)*")/g, '<span style="color:#ce9178">$1</span>');
  h = h.replace(/('(?:[^'\\]|\\.)*')/g, '<span style="color:#ce9178">$1</span>');
  h = h.replace(/(`(?:[^`\\]|\\.)*`)/g, '<span style="color:#ce9178">$1</span>');
  h = h.replace(/\b(\d+\.?\d*)\b/g, '<span style="color:#b5cea8">$1</span>');
  const kw = (KW_MAP[language] || '').split(/\s+/).filter(Boolean);
  if (kw.length) h = h.replace(new RegExp(`\\b(${kw.join('|')})\\b`, 'g'), '<span style="color:#569cd6">$1</span>');
  return h;
}

function Dropdown({ show, align, children }: { show: boolean; align?: string; children: React.ReactNode }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -4 }} transition={{ duration: 0.15 }}
          className={`absolute top-full mt-1 z-50 min-w-[140px] rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl p-1 ${align === 'left' ? 'right-0' : 'left-0'}`}
        >{children}</motion.div>
      )}
    </AnimatePresence>
  );
}

export default function CodeEditorWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: CodeEditorWidgetProps) {
  const STORAGE_KEY = 'code_editor_tabs';
  const DEFAULT_TAB: CodeTab = { id: generateId(), name: 'untitled', language: 'javascript', content: '// Welcome to Code Editor\nfunction hello() {\n  console.log("Hello, World!");\n}\n' };

  const [tabs, setTabs] = useState<CodeTab[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) { const p = JSON.parse(s); if (Array.isArray(p) && p.length) return p; } } catch { /* */ }
    return [DEFAULT_TAB];
  });
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id ?? DEFAULT_TAB.id);
  const [menuOpen, setMenuOpen] = useState(false);
  const [tabSize, setTabSize] = useState<2 | 4 | 8>(4);
  const [wordWrap, setWordWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showTabSizeMenu, setShowTabSizeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs)); } catch { /* */ } }, [tabs]);

  const handleScroll = useCallback(() => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenuOpen(false); onMenuToggle?.(false); }
      setShowLangMenu(false); setShowTabSizeMenu(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [onMenuToggle]);

  const updateContent = useCallback((v: string) => setTabs((p) => p.map((t) => t.id === activeTabId ? { ...t, content: v } : t)), [activeTabId]);
  const updateLanguage = useCallback((l: string) => { setTabs((p) => p.map((t) => t.id === activeTabId ? { ...t, language: l } : t)); setShowLangMenu(false); }, [activeTabId]);
  const updateName = useCallback((n: string) => setTabs((p) => p.map((t) => t.id === activeTabId ? { ...t, name: n } : t)), [activeTabId]);

  const handleCursorMove = useCallback(() => {
    const ta = textareaRef.current; if (!ta) return;
    const pos = ta.selectionStart;
    if (pos === 0) return;
    const char = ta.value[pos - 1];
    if (BRACKET_OPEN.has(char)) {
      let d = 1;
      for (let i = pos; i < ta.value.length; i++) { if (ta.value[i] === char) d++; else if (ta.value[i] === BRACKET_PAIRS[char]) d--; if (d === 0) return; }
    } else if (BRACKET_CLOSE.has(char)) {
      let d = 1; const open = Object.keys(BRACKET_PAIRS).find((k) => BRACKET_PAIRS[k] === char);
      for (let i = pos - 2; i >= 0; i--) { if (ta.value[i] === char) d++; else if (ta.value[i] === open) d--; if (d === 0) return; }
    }
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Tab') return;
    e.preventDefault();
    const ta = e.currentTarget, s = ta.selectionStart, en = ta.selectionEnd;
    const nv = ta.value.substring(0, s) + ' '.repeat(tabSize) + ta.value.substring(en);
    updateContent(nv);
    requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = s + tabSize; });
  }, [tabSize, updateContent]);

  const addTab = useCallback(() => {
    const t: CodeTab = { id: generateId(), name: 'untitled', language: 'javascript', content: '' };
    setTabs((p) => [...p, t]); setActiveTabId(t.id);
  }, []);

  const deleteTab = useCallback((id: string) => {
    setTabs((p) => {
      const next = p.filter((t) => t.id !== id);
      if (!next.length) { const f: CodeTab = { id: generateId(), name: 'untitled', language: 'javascript', content: '' }; setActiveTabId(f.id); return [f]; }
      if (id === activeTabId) setActiveTabId(next[next.length - 1].id);
      return next;
    });
  }, [activeTabId]);

  const copyCode = useCallback(async () => {
    if (!activeTab) return;
    try { await navigator.clipboard.writeText(activeTab.content); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* */ }
  }, [activeTab]);

  const downloadCode = useCallback(() => {
    if (!activeTab) return;
    const ext = LANGUAGES.find((l) => l.value === activeTab.language)?.ext ?? 'txt';
    const blob = new Blob([activeTab.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${activeTab.name}.${ext}`; a.click(); URL.revokeObjectURL(url);
  }, [activeTab]);

  const getLangColor = (l: string) => LANGUAGES.find((x) => x.value === l)?.color ?? '#888';
  const getLangLabel = (l: string) => LANGUAGES.find((x) => x.value === l)?.label ?? l;
  const lines = activeTab?.content.split('\n') ?? [''];
  const highlighted = highlightCode(activeTab?.content ?? '', activeTab?.language ?? 'javascript');

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileCode size={16} className="text-cyan-400" /> {/* CHANGE: Icon color */}
          <h3 className="text-sm font-semibold text-white/90">Code Editor</h3> {/* CHANGE: Widget title */}
          <span className="text-[10px] bg-white/10 rounded-full px-1.5 py-0.5 text-white/50">{tabs.length}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="relative">
            <button onClick={() => { setShowTabSizeMenu((p) => !p); setShowLangMenu(false); }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Tab size">
              <Braces size={14} className="text-white/50" />
            </button>
            <Dropdown show={showTabSizeMenu} align="right">
              {TAB_SIZES.map((s) => (
                <button key={s} onClick={() => { setTabSize(s); setShowTabSizeMenu(false); }}
                  className={`flex items-center w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${tabSize === s ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/60 hover:bg-white/10'}`}>{s}</button>
              ))}
            </Dropdown>
          </div>
          <button onClick={() => setWordWrap((p) => !p)}
            className={`p-1 rounded-lg transition-colors ${wordWrap ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-white/10 text-white/50'}`} title="Word wrap">
            <Terminal size={14} />
          </button>
          <div className="relative" ref={menuRef}>
            <button onClick={() => { const n = !menuOpen; setMenuOpen(n); onMenuToggle?.(n); }}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"><MoreHorizontal size={14} /></button>
            <Dropdown show={menuOpen} align={alignMenu}>
              {onDeleteBoard && (
                <button onClick={() => { setMenuOpen(false); onMenuToggle?.(false); onDeleteBoard(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                  <Trash2 size={12} />Delete board
                </button>
              )}
            </Dropdown>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <div key={tab.id} onClick={() => setActiveTabId(tab.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] cursor-pointer transition-all shrink-0 border ${tab.id === activeTabId ? 'bg-white/10 text-white/90 border-white/15' : 'text-white/40 hover:bg-white/5 border-transparent hover:border-white/5'}`}>
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getLangColor(tab.language) }} />
            <input value={tab.name} onChange={(e) => updateName(e.target.value)} onClick={(e) => e.stopPropagation()}
              className="bg-transparent border-none outline-none text-[11px] text-inherit w-16 truncate" spellCheck={false} />
            {tabs.length > 1 && (
              <button onClick={(e) => { e.stopPropagation(); deleteTab(tab.id); }}
                className="p-0.5 rounded hover:bg-white/10 transition-colors -mr-0.5">
                <Trash2 size={9} className="text-white/30 hover:text-red-400" />
              </button>
            )}
          </div>
        ))}
        <button onClick={addTab} className="p-1 rounded-lg hover:bg-white/10 transition-colors text-white/30 hover:text-white/60 shrink-0" title="New tab">
          <span className="text-sm leading-none">+</span>
        </button>
      </div>

      {/* Language selector + actions */}
      <div className="flex items-center justify-between mb-2">
        <div className="relative">
          <button onClick={() => { setShowLangMenu((p) => !p); setShowTabSizeMenu(false); }}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] hover:bg-white/10 transition-colors border border-white/10">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: getLangColor(activeTab?.language ?? '') }} />
            <span className="text-white/70">{getLangLabel(activeTab?.language ?? '')}</span>
          </button>
          <Dropdown show={showLangMenu}>
            {LANGUAGES.map((lang) => (
              <button key={lang.value} onClick={() => updateLanguage(lang.value)}
                className={`flex items-center gap-2 w-full px-3 py-1.5 text-xs rounded-lg transition-colors ${activeTab?.language === lang.value ? 'text-cyan-400 bg-cyan-500/10' : 'text-white/60 hover:bg-white/10'}`}>
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />{lang.label}
              </button>
            ))}
          </Dropdown>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyCode} className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Copy">
            {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} className="text-white/50" />}
          </button>
          <button onClick={downloadCode} className="p-1 rounded-lg hover:bg-white/10 transition-colors" title="Download">
            <Download size={13} className="text-white/50" />
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex-1 flex bg-[#0d1117] rounded-xl border border-white/5 overflow-hidden relative min-h-[180px]">
        <div className="flex-shrink-0 w-10 bg-[#0a0e14] border-r border-white/5 select-none overflow-hidden pt-3 pb-3">
          {lines.map((_, i) => (
            <div key={i} className="text-[11px] text-white/20 text-right pr-2 font-mono leading-[1.5]">{i + 1}</div>
          ))}
        </div>
        <div className="flex-1 relative">
          <pre ref={highlightRef}
            className="absolute inset-0 p-3 m-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words font-mono text-[12px] leading-[1.5] text-white/80 z-[1]"
            style={{ tabSize }} aria-hidden="true">
            <code dangerouslySetInnerHTML={{ __html: highlighted }} />
          </pre>
          <textarea ref={textareaRef} value={activeTab?.content ?? ''}
            onChange={(e) => updateContent(e.target.value)} onScroll={handleScroll}
            onKeyDown={handleKeyDown} onKeyUp={handleCursorMove} onClick={handleCursorMove}
            className="w-full h-full p-3 bg-transparent text-transparent caret-white outline-none resize-none font-mono text-[12px] leading-[1.5] z-[2] relative"
            style={{ tabSize, whiteSpace: wordWrap ? 'pre-wrap' : 'pre', wordBreak: wordWrap ? 'break-all' : undefined }}
            spellCheck={false} autoComplete="off" autoCapitalize="off" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-2 text-[10px] text-white/30">
        <span>Lines {lines.length} · {tabSize}px tabs</span>
        <span>{getLangLabel(activeTab?.language ?? '')}</span>
      </div>
    </div>
  );
}
