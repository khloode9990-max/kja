// SnippetManagerWidget — Save, search, copy, and manage reusable code snippets organized by language.
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Code, // ICON: Replace with any code/brackets icon (e.g. Braces, Terminal)
  Plus, // ICON: Replace with any add icon (e.g. CirclePlus)
  Copy, // ICON: Replace with any clipboard-copy icon
  Check, // ICON: Replace with any success/checkmark icon
  Trash2, // ICON: Replace with any delete icon (e.g. Trash)
  Search, // ICON: Replace with any magnifying glass icon
  ChevronDown, // ICON: Replace with any expand/chevron-down icon
  ChevronRight, // ICON: Replace with any collapse/chevron-right icon
  MoreHorizontal, // ICON: Replace with any overflow-menu icon (e.g. Ellipsis)
  X, // ICON: Replace with any close/cancel icon
} from 'lucide-react';

interface Snippet {
  id: string;
  title: string;
  language: string;
  code: string;
  createdAt: number;
}

interface SnippetManagerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Add/remove languages and adjust their display colors here
const LANGUAGES: { value: string; label: string; color: string }[] = [
  { value: 'javascript', label: 'JavaScript', color: '#f0db4f' },
  { value: 'typescript', label: 'TypeScript', color: '#3178c6' },
  { value: 'python', label: 'Python', color: '#3776ab' },
  { value: 'html', label: 'HTML', color: '#e34c26' },
  { value: 'css', label: 'CSS', color: '#264de4' },
  { value: 'json', label: 'JSON', color: '#292929' },
  { value: 'bash', label: 'Bash', color: '#4eaa25' },
  { value: 'sql', label: 'SQL', color: '#e38c00' },
  { value: 'rust', label: 'Rust', color: '#dea584' },
  { value: 'go', label: 'Go', color: '#00add8' },
  { value: 'java', label: 'Java', color: '#b07219' },
  { value: 'c++', label: 'C++', color: '#f34b7d' },
];

// Generates a short random ID for new snippets
const generateId = () => crypto.randomUUID();

export default function SnippetManagerWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: SnippetManagerWidgetProps) {
  // Widget state: snippet list, UI toggles, search, and form fields
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  // CHANGE: Default language for new snippets
  const [newSnippet, setNewSnippet] = useState({ title: '', language: 'javascript', code: '' });

  const menuRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // Filter snippets by title against the search query
  const filteredSnippets = snippets.filter(
    (s) => s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleMenu = useCallback(() => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  }, [menuOpen, onMenuToggle]);

  // Creates a new snippet from form data and prepends it to the list
  const handleAddSnippet = useCallback(() => {
    if (!newSnippet.title.trim() || !newSnippet.code.trim()) return;
    const snippet: Snippet = {
      id: generateId(),
      title: newSnippet.title.trim(),
      language: newSnippet.language,
      code: newSnippet.code,
      createdAt: Date.now(),
    };
    setSnippets((prev) => [snippet, ...prev]);
    setNewSnippet({ title: '', language: 'javascript', code: '' });
    setShowForm(false);
  }, [newSnippet]);

  const handleDeleteSnippet = useCallback((id: string) => {
    setSnippets((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // Copies code to clipboard and shows a brief confirmation
  const handleCopy = useCallback(async (id: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  // Returns display color for a language, falls back to gray
  const getLangColor = (lang: string) =>
    LANGUAGES.find((l) => l.value === lang)?.color ?? '#888';

  const getLangLabel = (lang: string) =>
    LANGUAGES.find((l) => l.value === lang)?.label ?? lang;

  // Close dropdown menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onMenuToggle?.(false);
      }
      if (formRef.current && !formRef.current.contains(e.target as Node)) {
        setShowForm(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onMenuToggle]);

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
            <Code size={16} className="text-emerald-400" /> {/* CHANGE: Icon color */}
          <h3 className="text-sm font-semibold text-white/90">Snippets</h3> {/* CHANGE: Widget title */}
          <span className="text-[10px] bg-white/10 rounded-full px-1.5 py-0.5 text-white/50">
            {snippets.length}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowForm((p) => !p)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title="Add snippet"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
          </button>
          <div className="relative" ref={menuRef}>
            <button
              onClick={toggleMenu}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-1 z-50 min-w-[160px] rounded-xl border border-white/10 bg-[#1a1a2e]/95 backdrop-blur-xl shadow-2xl p-1 ${
                    alignMenu === 'left' ? 'right-0' : 'left-0'
                  }`}
                >
                  {onDeleteBoard && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onMenuToggle?.(false);
                        onDeleteBoard();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete board
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Search */}
      {snippets.length > 0 && (
        <div className="relative mb-3">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search snippets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            ref={formRef}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 space-y-2">
              <input
                type="text"
                placeholder="Snippet title"
                value={newSnippet.title}
                onChange={(e) => setNewSnippet((p) => ({ ...p, title: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
              />
              <select
                value={newSnippet.language}
                onChange={(e) => setNewSnippet((p) => ({ ...p, language: e.target.value }))}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-white/20 transition-colors appearance-none cursor-pointer"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value} className="bg-[#1a1a2e]">
                    {l.label}
                  </option>
                ))}
              </select>
              <textarea
                placeholder="Paste your code here..."
                value={newSnippet.code}
                onChange={(e) => setNewSnippet((p) => ({ ...p, code: e.target.value }))}
                rows={5}
                className="w-full bg-[#0d1117] border border-white/10 rounded-lg px-3 py-2 text-xs text-white/90 placeholder-white/30 font-mono focus:outline-none focus:border-white/20 transition-colors resize-none"
              />
              <button
                onClick={handleAddSnippet}
                disabled={!newSnippet.title.trim() || !newSnippet.code.trim()}
                className="w-full py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 text-emerald-300 text-xs font-medium rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Snippet
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snippet List */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0 pr-1 custom-scrollbar">
        <AnimatePresence>
          {filteredSnippets.map((snippet) => {
            const isExpanded = expandedId === snippet.id;
            const isCopied = copiedId === snippet.id;

            return (
              <motion.div
                key={snippet.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.2 }}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-white/15 transition-all"
              >
                {/* Snippet Header */}
                <div
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none hover:bg-white/5 transition-colors"
                  onClick={() => toggleExpand(snippet.id)}
                >
                  {isExpanded ? (
                    <ChevronDown size={13} className="text-white/40 shrink-0" />
                  ) : (
                    <ChevronRight size={13} className="text-white/40 shrink-0" />
                  )}
                  <span className="text-xs font-medium text-white/85 truncate flex-1">
                    {snippet.title}
                  </span>
                  <span
                    className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: `${getLangColor(snippet.language)}18`,
                      color: getLangColor(snippet.language),
                      border: `1px solid ${getLangColor(snippet.language)}30`,
                    }}
                  >
                    {getLangLabel(snippet.language)}
                  </span>
                </div>

                {/* Expanded Content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-3 pb-3">
                        <div className="relative">
                          <pre className="bg-[#0d1117] rounded-lg p-3 text-[11px] leading-relaxed text-white/80 font-mono overflow-x-auto whitespace-pre-wrap break-all border border-white/5">
                            {snippet.code}
                          </pre>
                          <div className="absolute top-1.5 right-1.5 flex gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(snippet.id, snippet.code);
                              }}
                              className="p-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
                              title="Copy code"
                            >
                              {isCopied ? (
                                <Check size={11} className="text-emerald-400" />
                              ) : (
                                <Copy size={11} className="text-white/60" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSnippet(snippet.id);
                              }}
                              className="p-1 rounded-md bg-white/10 hover:bg-red-500/20 transition-colors"
                              title="Delete snippet"
                            >
                              <Trash2 size={11} className="text-white/60 hover:text-red-400" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {snippets.length === 0 && !showForm && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-3">
            <Code size={18} className="text-white/20" />
          </div>
          <p className="text-xs text-white/40 mb-1">No snippets yet</p>
          <p className="text-[10px] text-white/25 mb-3">Save your frequently used code snippets</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-[10px] text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
          >
            <Plus size={10} />
            Add your first snippet
          </button>
        </div>
      )}

      {/* No search results */}
      {snippets.length > 0 && filteredSnippets.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
          <Search size={16} className="text-white/15 mb-2" />
          <p className="text-xs text-white/35">No snippets matching &quot;{searchQuery}&quot;</p>
        </div>
      )}
    </div>
  );
}
