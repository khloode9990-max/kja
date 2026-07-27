/**
 * TranslationWidget - Real-time text translation via MyMemory API with
 * language swap, history panel, and copy-to-clipboard support.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Languages - header icon, replace with any translate/language icon
// ICON: ArrowRightLeft - swap languages button, replace with any swap icon
// ICON: Copy - copy text to clipboard, replace with any clipboard icon
// ICON: Check - copy success indicator, replace with any checkmark icon
// ICON: Clock - history panel trigger, replace with any history/time icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board action, replace with any delete icon
// ICON: AlertCircle - error state indicator, replace with any alert/warning icon
// ICON: RotateCcw - loading spinner and retry button, replace with any refresh icon
import { Languages, ArrowRightLeft, Copy, Check, Clock, MoreHorizontal, Trash2, AlertCircle, RotateCcw } from 'lucide-react';

// CHANGE: Edit available language options (code + display name)
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ko', name: 'Korean' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'it', name: 'Italian' },
  { code: 'tr', name: 'Turkish' },
];

interface HistoryEntry {
  id: number;
  source: string;
  translated: string;
  from: string;
  to: string;
  timestamp: Date;
}

interface TranslationWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function TranslationWidget({ onDeleteBoard, alignMenu = 'left', onMenuToggle }: TranslationWidgetProps) {
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  // CHANGE: Default source and target languages
  const [fromLang, setFromLang] = useState('en');
  const [toLang, setToLang] = useState('ar');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedSource, setCopiedSource] = useState(false);
  const [copiedTranslated, setCopiedTranslated] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const translate = useCallback(async (text: string, from: string, to: string) => {
    if (!text.trim()) {
      setTranslatedText('');
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      if (data.responseStatus === 200 && data.responseData?.translatedText) {
        const translated = data.responseData.translatedText;
        setTranslatedText(translated);
        idCounter.current += 1;
        setHistory((prev) => [
          { id: idCounter.current, source: text, translated, from, to, timestamp: new Date() },
          ...prev,
        ].slice(0, 5));
      } else {
        throw new Error(data.responseDetails || 'Translation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce input before calling translation API (500ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      translate(sourceText, fromLang, toLang);
    }, 500);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [sourceText, fromLang, toLang, translate]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    onMenuToggle?.(menuOpen);
  }, [menuOpen, onMenuToggle]);

  // Swap source/target languages and their text
  const swapLanguages = () => {
    setFromLang(toLang);
    setToLang(fromLang);
    setSourceText(translatedText);
    setTranslatedText(sourceText);
  };

  const copyToClipboard = async (text: string, type: 'source' | 'translated') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'source') {
        setCopiedSource(true);
        setTimeout(() => setCopiedSource(false), 2000);
      } else {
        setCopiedTranslated(true);
        setTimeout(() => setCopiedTranslated(false), 2000);
      }
    } catch { /* silent */ }
  };

  const getLangName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name || code;

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Languages size={18} className="text-purple-400" />
          <span className="font-semibold text-sm">Translation</span>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
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
                className={`absolute top-full mt-1 z-50 w-44 bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
                  alignMenu === 'right' ? 'right-0' : 'left-0'
                }`}
              >
                <button
                  onClick={() => { setShowHistory(!showHistory); setMenuOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <Clock size={14} />
                  Translation History
                </button>
                {onDeleteBoard && (
                  <button
                    onClick={() => { onDeleteBoard(); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
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

      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-white/5 rounded-xl p-3 space-y-2 max-h-[160px] overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Recent Translations</span>
                <button onClick={() => setShowHistory(false)} className="text-white/30 hover:text-white/60 text-[10px]">Close</button>
              </div>
              {history.length === 0 && (
                <p className="text-[11px] text-white/30 text-center py-2">No translations yet</p>
              )}
              {history.map((entry) => (
                <div key={entry.id} className="text-[11px] border-b border-white/5 pb-1.5 last:border-0">
                  <div className="flex items-center gap-1 text-white/30 mb-0.5">
                    <span>{getLangName(entry.from)}</span>
                    <ArrowRightLeft size={8} />
                    <span>{getLangName(entry.to)}</span>
                    <span className="ml-auto">{entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-white/50 truncate">{entry.source}</p>
                  <p className="text-white/80 truncate">{entry.translated}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <select
              value={fromLang}
              onChange={(e) => setFromLang(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-purple-400/50 appearance-none cursor-pointer flex-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-gray-900 text-white">{l.name}</option>
              ))}
            </select>
            <button
              onClick={swapLanguages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-all hover:rotate-180 duration-300"
              title="Swap languages"
            >
              <ArrowRightLeft size={14} className="text-purple-400" />
            </button>
            <select
              value={toLang}
              onChange={(e) => setToLang(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-purple-400/50 appearance-none cursor-pointer flex-1"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-gray-900 text-white">{l.name}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Enter text to translate..."
              className="w-full h-full min-h-[80px] bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/90 placeholder-white/30 resize-none focus:outline-none focus:border-purple-400/50 transition-colors"
            />
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span className="text-[10px] text-white/25">{sourceText.length}</span>
              <button
                onClick={() => copyToClipboard(sourceText, 'source')}
                disabled={!sourceText}
                className="p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30"
                title="Copy source"
              >
                {copiedSource ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-white/40" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Translation</span>
            {loading && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              >
                <RotateCcw size={12} className="text-purple-400" />
              </motion.div>
            )}
          </div>

          <div className="relative flex-1">
            {error ? (
              <div className="w-full h-full min-h-[80px] bg-red-500/5 border border-red-500/20 rounded-xl p-3 flex flex-col items-center justify-center gap-2">
                <AlertCircle size={16} className="text-red-400" />
                <p className="text-xs text-red-300/70 text-center">{error}</p>
                <button
                  onClick={() => translate(sourceText, fromLang, toLang)}
                  className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1"
                >
                  <RotateCcw size={10} /> Retry
                </button>
              </div>
            ) : (
              <div className="w-full h-full min-h-[80px] bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white/90 overflow-auto">
                {translatedText || (
                  <span className="text-white/30">Translation will appear here...</span>
                )}
              </div>
            )}
            <div className="absolute bottom-2 right-2 flex items-center gap-2">
              <span className="text-[10px] text-white/25">{translatedText.length}</span>
              <button
                onClick={() => copyToClipboard(translatedText, 'translated')}
                disabled={!translatedText}
                className="p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30"
                title="Copy translation"
              >
                {copiedTranslated ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-white/40" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
