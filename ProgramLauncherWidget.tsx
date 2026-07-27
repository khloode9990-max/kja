import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoreHorizontal, Trash2, Pencil, Search, Gamepad2, Globe, Music, Code, Wrench, MessageSquare, FileText, Shield, AppWindow, RefreshCw, EyeOff, Eye, Settings } from 'lucide-react';
import { isTauri, scanInstalledPrograms, launchProgram, getProgramIcon, type InstalledProgram, type ProgramCategory } from '../lib/tauri-api';

const CATEGORY_ICONS: Record<ProgramCategory, React.ElementType> = {
  game: Gamepad2,
  browser: Globe,
  media: Music,
  dev: Code,
  tool: Wrench,
  communication: MessageSquare,
  office: FileText,
  security: Shield,
  other: AppWindow,
};

const CATEGORY_COLORS: Record<ProgramCategory, string> = {
  game: 'text-red-400 bg-red-500/20',
  browser: 'text-blue-400 bg-blue-500/20',
  media: 'text-purple-400 bg-purple-500/20',
  dev: 'text-emerald-400 bg-emerald-500/20',
  tool: 'text-orange-400 bg-orange-500/20',
  communication: 'text-cyan-400 bg-cyan-500/20',
  office: 'text-yellow-400 bg-yellow-500/20',
  security: 'text-rose-400 bg-rose-500/20',
  other: 'text-gray-400 bg-gray-500/20',
};

const CATEGORY_LABELS: Record<ProgramCategory, string> = {
  game: 'Games',
  browser: 'Browsers',
  media: 'Media',
  dev: 'Dev',
  tool: 'Tools',
  communication: 'Chat',
  office: 'Office',
  security: 'Security',
  other: 'Other',
};

const ICON_CACHE = new Map<string, string>();
const ICON_CACHE_KEY = 'program_icon_cache_v1';
const HIDDEN_APPS_KEY = 'program_hidden_apps';
const HIDDEN_CATEGORIES_KEY = 'program_hidden_categories';

try {
  const raw = localStorage.getItem(ICON_CACHE_KEY);
  if (raw) {
    const entries: [string, string][] = JSON.parse(raw);
    entries.forEach(([k, v]) => ICON_CACHE.set(k, v));
  }
} catch {}

function persistIconCache() {
  try {
    const entries = Array.from(ICON_CACHE.entries()).slice(0, 200);
    localStorage.setItem(ICON_CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

function loadJsonSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveJsonSet(key: string, set: Set<string>) {
  localStorage.setItem(key, JSON.stringify(Array.from(set)));
}

interface ProgramLauncherWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function ProgramLauncherWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: ProgramLauncherWidgetProps) {
  const [programs, setPrograms] = useState<InstalledProgram[]>([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<ProgramCategory | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Programs & Games');
  const [iconMap, setIconMap] = useState<Map<string, string>>(new Map(ICON_CACHE));
  const loadingIconsRef = useRef(false);
  const [hiddenApps, setHiddenApps] = useState<Set<string>>(() => loadJsonSet(HIDDEN_APPS_KEY));
  const [hiddenCategories, setHiddenCategories] = useState<Set<string>>(() => loadJsonSet(HIDDEN_CATEGORIES_KEY));
  const [showSettings, setShowSettings] = useState(false);

  const loadPrograms = async () => {
    if (!isTauri) return;
    setLoading(true);
    try {
      const list = await scanInstalledPrograms();
      setPrograms(list);
    } catch {
      setPrograms([]);
    }
    setLoading(false);
  };

  const loadIcons = useCallback(async (progs: InstalledProgram[]) => {
    if (!isTauri || loadingIconsRef.current || progs.length === 0) return;
    loadingIconsRef.current = true;

    const toLoad = progs.filter(p => !ICON_CACHE.has(p.path) && p.path.endsWith('.exe'));
    const BATCH = 5;

    for (let i = 0; i < Math.min(toLoad.length, 30); i += BATCH) {
      const batch = toLoad.slice(i, i + BATCH);
      const results = await Promise.allSettled(
        batch.map(async (p) => {
          try {
            const dataUrl = await getProgramIcon(p.path);
            if (dataUrl && dataUrl.startsWith('data:image')) {
              ICON_CACHE.set(p.path, dataUrl);
              return { path: p.path, icon: dataUrl };
            }
          } catch {}
          return null;
        })
      );

      const newIcons = results
        .filter((r): r is PromiseFulfilledResult<{ path: string; icon: string }> =>
          r.status === 'fulfilled' && r.value !== null
        )
        .map(r => r.value);

      if (newIcons.length > 0) {
        setIconMap(prev => {
          const next = new Map(prev);
          newIcons.forEach(({ path, icon }) => next.set(path, icon));
          return next;
        });
      }
    }

    persistIconCache();
    loadingIconsRef.current = false;
  }, []);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    if (programs.length > 0) {
      loadIcons(programs);
    }
  }, [programs, loadIcons]);

  const toggleHideApp = useCallback((path: string) => {
    setHiddenApps(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      saveJsonSet(HIDDEN_APPS_KEY, next);
      return next;
    });
  }, []);

  const toggleHideCategory = useCallback((cat: string) => {
    setHiddenCategories(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      saveJsonSet(HIDDEN_CATEGORIES_KEY, next);
      return next;
    });
  }, []);

  const visiblePrograms = useMemo(() => {
    return programs.filter(p => {
      if (hiddenApps.has(p.path)) return false;
      if (hiddenCategories.has(p.category)) return false;
      return true;
    });
  }, [programs, hiddenApps, hiddenCategories]);

  const filtered = useMemo(() => {
    let result = visiblePrograms;
    if (activeCategory !== 'all') {
      result = result.filter(p => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.publisher?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [visiblePrograms, search, activeCategory]);

  const categories = useMemo(() => {
    const cats = new Map<ProgramCategory, number>();
    visiblePrograms.forEach(p => {
      cats.set(p.category, (cats.get(p.category) || 0) + 1);
    });
    return Array.from(cats.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [visiblePrograms]);

  const handleLaunch = async (program: InstalledProgram) => {
    try {
      await launchProgram(program.path);
    } catch {
      // silent fail
    }
  };

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  return (
    <div className={`dashboard-card w-full rounded-2xl p-4 text-white flex flex-col h-[300px] relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        {isEditingTitle ? (
          <form
            onSubmit={(e) => { e.preventDefault(); if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim()); setIsEditingTitle(false); }}
            className="flex-1 mr-2"
          >
            <input type="text" autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim()); setIsEditingTitle(false); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs font-semibold uppercase tracking-wider text-white outline-none" />
          </form>
        ) : (
          <h3 onClick={() => { setTitleDraft(title || 'Programs & Games'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent flex items-center space-x-1.5 cursor-text hover:opacity-80" title="Click to rename">
            <AppWindow className="w-3.5 h-3.5" />
            <span>{title || 'Programs & Games'}</span>
            <span className="text-[9px] text-gray-500 font-normal">({visiblePrograms.length})</span>
          </h3>
        )}
        <div className="flex items-center gap-2 relative">
          <button onClick={loadPrograms} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className={`p-1 hover:bg-white/10 rounded-lg transition-colors ${showSettings ? 'text-white' : 'text-gray-400 hover:text-white'}`} title="Settings">
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}>
                  <button onClick={() => { setTitleDraft(title || 'Programs & Games'); setIsEditingTitle(true); toggleMenu(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-200 hover:text-white transition-colors">
                    <Pencil className="w-4 h-4 text-gray-400" /><span>Rename</span>
                  </button>
                  <button onClick={() => { onDeleteBoard?.(); toggleMenu(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" /><span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Settings panel: hide categories & apps */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="mb-3 overflow-hidden">
            <div className="bg-black/30 rounded-xl border border-white/10 p-3 space-y-2">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Hide Categories</p>
              <div className="flex flex-wrap gap-1">
                {Object.entries(CATEGORY_LABELS).map(([cat, label]) => {
                  const isHidden = hiddenCategories.has(cat);
                  const Icon = CATEGORY_ICONS[cat as ProgramCategory];
                  return (
                    <button key={cat} onClick={() => toggleHideCategory(cat)}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-colors border ${
                        isHidden ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                      }`}>
                      {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {label}
                    </button>
                  );
                })}
              </div>
              {hiddenApps.size > 0 && (
                <>
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium pt-1">Hidden Apps ({hiddenApps.size})</p>
                  <div className="flex flex-wrap gap-1">
                    {programs.filter(p => hiddenApps.has(p.path)).slice(0, 10).map(p => (
                      <button key={p.path} onClick={() => toggleHideApp(p.path)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] bg-red-500/10 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors">
                        <Eye className="w-3 h-3" />
                        {p.name.length > 15 ? p.name.slice(0, 15) + '...' : p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
        <input
          type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search programs..."
          className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-[11px] text-white placeholder-gray-600 outline-none focus:border-white/20 transition-colors"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 mb-3 flex-wrap">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-2 py-0.5 rounded-lg text-[10px] transition-colors ${activeCategory === 'all' ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}
        >All ({visiblePrograms.length})</button>
        {categories.map(([cat, count]) => {
          const Icon = CATEGORY_ICONS[cat];
          return (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? 'all' : cat)}
              className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] transition-colors ${activeCategory === cat ? 'bg-white/15 text-white' : 'text-gray-500 hover:text-gray-300'}`}>
              <Icon className="w-3 h-3" />
              {CATEGORY_LABELS[cat]} ({count})
            </button>
          );
        })}
      </div>

      {/* Programs grid */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <AppWindow className="w-6 h-6 mb-1 opacity-30" />
            <p className="text-[10px]">{search ? 'No matches found' : 'No programs detected'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {filtered.map((program, i) => {
              const colorClass = CATEGORY_COLORS[program.category];
              const realIcon = iconMap.get(program.path);
              const CategoryIcon = CATEGORY_ICONS[program.category];
              const isHidden = hiddenApps.has(program.path);
              return (
                <motion.button
                  key={`${program.name}-${i}`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleLaunch(program)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    toggleHideApp(program.path);
                  }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/10 transition-all text-center group relative ${isHidden ? 'opacity-40' : ''}`}
                  title={`${program.name}${program.publisher ? ` (${program.publisher})` : ''}\nPath: ${program.path}\nRight-click to hide`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden ${realIcon ? '' : colorClass}`}>
                    {realIcon ? (
                      <img src={realIcon} alt="" className="w-full h-full object-contain" loading="lazy" />
                    ) : (
                      <CategoryIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className="text-[9px] text-gray-400 group-hover:text-white transition-colors leading-tight line-clamp-2 w-full">
                    {program.name}
                  </span>
                  {/* Hide button on hover */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleHideApp(program.path); }}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/30"
                    title="Hide this app"
                  >
                    <EyeOff className="w-2.5 h-2.5 text-gray-400 hover:text-red-400" />
                  </button>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
