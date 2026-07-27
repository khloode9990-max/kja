import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Image,
  LayoutGrid,
  CheckSquare,
  RotateCcw,
  Settings as SettingsIcon,
  X,
  Upload,
  Plus,
  Trash2,
  BookmarkPlus,
  Volume2,
  Video,
  Loader2,
  Check,
  AlertCircle,
  Edit2,
  Calendar,
  Clock,
  Cloud,
  MessageSquare,
  Calculator,
  Quote,
  DollarSign,
  Newspaper,
  Activity,
  Music,
  Github,
  Book,
  Bookmark as BookmarkIcon,
  ListFilter,
  ExternalLink,
  Film,
  ImagePlus,
  AppWindow,
  Terminal,
  Code,
  Sparkles,
  CreditCard,
  Globe,
  Lock,
  Rss,
  Clipboard,
  TrendingUp,
  Braces,
  Bell,
  FileText,
} from 'lucide-react';
import { DashboardSettings, HabitItem, WeatherData, Bookmark } from '../types';
import { saveWallpaperBlob, getWallpaperBlob, deleteWallpaperBlob } from '../lib/wallpaperDb';
import { extractThemeColors } from '../lib/colorExtractor';
// @ts-ignore
import defaultBg from '../assets/images/anime_sunset_dashboard_bg_1784312656978.jpg';

interface SidebarMenuProps {
  settings: DashboardSettings;
  onUpdateSettings: (s: Partial<DashboardSettings>) => void;
  habits: HabitItem[];
  onAddHabit: (text: string) => void;
  onToggleHabit: (id: string) => void;
  onDeleteHabit: (id: string) => void;
  onResetDashboard: () => void;
  weather: WeatherData;
  onUpdateWeather: (w: WeatherData) => void;
  focusMinutesToday: number;
  onClearFocusMinutes: () => void;
  onOpenStats?: () => void;
  deletedBookmarks?: Bookmark[];
  onRestoreBookmark?: (id: string) => void;
  onEmptyTrash?: () => void;
  onImportBookmarks?: (imported: Bookmark[]) => void;
  onCreateBoard?: (name: string) => void;
  onCreateNoteBoard?: (name: string) => void;
  onCreateCalendar?: (name: string) => void;
  onCreatePomodoro?: (name: string) => void;
  onCreateHabitBoard?: (name: string) => void;
  onAddWidgetToLayout?: (widgetId: string) => void;
  onRemoveWidgetFromLayout?: (widgetId: string) => void;
  isWidgetInLayout?: (widgetId: string) => boolean;
}

// Reusable accessible toggle switch — replaces the previous copy-pasted div-based
// toggles (18 of them) which weren't real form controls (no keyboard support, no
// aria-checked state) and had inconsistent thumb math.
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full flex items-center px-0.5 shrink-0 transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-primary-accent/60 ${
        checked ? 'bg-primary-accent' : 'bg-white/10'
      }`}
    >
      <span
        className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function WidgetToggleRow({
  icon: Icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-[#2a2835]/50 border border-white/5 transition-colors hover:border-white/10">
      <span className="font-medium text-gray-200 flex items-center">
        <Icon className="w-4 h-4 mr-3 text-gray-400" /> {label}
      </span>
      <Toggle checked={checked} onChange={onChange} label={`Toggle ${label} widget`} />
    </div>
  );
}

export default function SidebarMenu({
  settings,
  onUpdateSettings,
  habits,
  onAddHabit,
  onToggleHabit,
  onDeleteHabit,
  onResetDashboard,
  weather,
  onUpdateWeather,
  focusMinutesToday,
  onClearFocusMinutes,
  onOpenStats,
  deletedBookmarks = [],
  onRestoreBookmark,
  onEmptyTrash,
  onImportBookmarks,
  onCreateBoard,
  onCreateNoteBoard,
  onCreateCalendar,
  onCreatePomodoro,
  onCreateHabitBoard,
  onAddWidgetToLayout,
  onRemoveWidgetFromLayout,
  isWidgetInLayout,
}: SidebarMenuProps) {
  const [activePanel, setActivePanel] = useState<'gallery' | 'widgets' | 'habits' | 'settings' | 'importBookmarks' | 'trash' | null>(null);
  const [customBgUrl, setCustomBgUrl] = useState('');
  const [newHabitText, setNewHabitText] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [addingBoardType, setAddingBoardType] = useState<'board' | 'note' | 'calendar' | 'pomodoro' | 'habit' | null>(null);
  const [boardNameDraft, setBoardNameDraft] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [widgetFilter, setWidgetFilter] = useState('');
  const [wallpaperSearchQuery, setWallpaperSearchQuery] = useState('');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [myUploads, setMyUploads] = useState<{ key: 'custom_image' | 'custom_video'; url: string; isVideo: boolean }[]>([]);
  const [isMatchingTheme, setIsMatchingTheme] = useState(false);
  const [isRegionAdvancedOpen, setIsRegionAdvancedOpen] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');

  const handleAutoDetectLocation = () => {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`);
          const data = await res.json();
          const place = data?.results?.[0];
          if (place?.name) {
            onUpdateSettings({ city: place.name });
          } else {
            setLocationError('Could not resolve a city name for your location.');
          }
        } catch {
          setLocationError('Failed to reach the location lookup service.');
        } finally {
          setIsDetectingLocation(false);
        }
      },
      () => {
        setLocationError('Location permission denied.');
        setIsDetectingLocation(false);
      },
      { timeout: 10000 }
    );
  };

  // Load thumbnails for anything the user has previously uploaded (stored in IndexedDB)
  // so the "My Uploads" section in the Wallpaper panel actually shows something real,
  // instead of always being empty.
  useEffect(() => {
    if (activePanel !== 'gallery') return;
    let cancelled = false;
    const objectUrls: string[] = [];

    (async () => {
      const results: { key: 'custom_image' | 'custom_video'; url: string; isVideo: boolean }[] = [];
      const imageBlob = await getWallpaperBlob('custom_image');
      if (imageBlob) {
        const url = URL.createObjectURL(imageBlob);
        objectUrls.push(url);
        results.push({ key: 'custom_image', url, isVideo: false });
      }
      const videoBlob = await getWallpaperBlob('custom_video');
      if (videoBlob) {
        const url = URL.createObjectURL(videoBlob);
        objectUrls.push(url);
        results.push({ key: 'custom_video', url, isVideo: true });
      }
      if (!cancelled) setMyUploads(results);
    })();

    return () => {
      cancelled = true;
      objectUrls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [activePanel, uploadStatus]);

  const handleWallpaperFile = async (file: File) => {
    setUploadStatus('processing');
    setUploadError('');
    try {
      if (file.type.startsWith('video/')) {
        if (file.size > 150 * 1024 * 1024) {
          throw new Error('Video is too large. Max 150MB allowed.');
        }
        await saveWallpaperBlob('custom_video', file);
        onUpdateSettings({ bgVideoUrl: 'indexeddb:custom_video', bgType: 'video' });
      } else {
        if (file.size > 20 * 1024 * 1024) {
          throw new Error('Image is too large. Max 20MB allowed.');
        }
        await saveWallpaperBlob('custom_image', file);
        onUpdateSettings({ backgroundImageUrl: 'indexeddb:custom_image', bgType: 'upload' });

        // Match the theme to the uploaded image too (extractor needs a loadable URL,
        // so we use a short-lived object URL rather than the indexeddb: reference).
        if (settings.autoThemeMatch ?? true) {
          const objectUrl = URL.createObjectURL(file);
          setIsMatchingTheme(true);
          const colors = await extractThemeColors(objectUrl);
          setIsMatchingTheme(false);
          URL.revokeObjectURL(objectUrl);
          if (colors) {
            onUpdateSettings({ primaryColor: colors.primaryColor, boardBgColor: colors.boardBgColor });
          }
        }
      }
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 4000);
    } catch (err: any) {
      console.error('Failed to store uploaded wallpaper file in IndexedDB:', err);
      const errMsg = err?.message || 'Failed to save file. Try a smaller file.';
      setUploadStatus('error');
      setUploadError(errMsg);

      // Fallback to base64 reader if IndexedDB storage failed for some reason
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result;
        if (typeof base64 === 'string') {
          if (file.type.startsWith('video/')) {
            onUpdateSettings({ bgVideoUrl: base64, bgType: 'video' });
          } else {
            onUpdateSettings({ backgroundImageUrl: base64, bgType: 'upload' });
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Let other parts of the app (e.g. the Cmd+K command palette) open a specific
  // panel programmatically instead of silently no-oping.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as typeof activePanel;
      if (detail) setActivePanel(detail);
    };
    window.addEventListener('dashboard:open-panel', handler);
    return () => window.removeEventListener('dashboard:open-panel', handler);
  }, []);

  // Close the open drawer when clicking outside of it (previously only the
  // "add widget" mini-dropdown supported this; the main drawer had no way to
  // dismiss itself except re-clicking its own trigger icon).
  useEffect(() => {
    if (!activePanel) return;
    const handleClickOutside = (e: MouseEvent) => {
      const root = document.getElementById('sidebar-menu-root');
      if (root && !root.contains(e.target as Node)) {
        setActivePanel(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activePanel]);

  // Default atmospheric background presets — expanded to a fuller grid to match
  // the reference "Wallpaper" picker (was only 4 tiles before).
  const wallpaperPresets = [
    { name: 'Atmospheric Retro Sunset', url: defaultBg },
    { name: 'Cyberpunk Rain Alley', url: 'https://images.unsplash.com/photo-1515621061946-eff1c2a352bd?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Cozy Pixel Cabin', url: 'https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Minimal Starry Peak', url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Neon City Nights', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Misty Mountain Fields', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Golden Wheat Sunset', url: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=80&w=1920&auto=format&fit=crop' },
    { name: 'Deep Space Nebula', url: 'https://images.unsplash.com/photo-1462331940025-496dfbfc7564?q=80&w=1920&auto=format&fit=crop' },
  ];

  const applyBackgroundAndColors = async (url: string, bgType: 'gallery' | 'upload') => {
    onUpdateSettings({ backgroundImageUrl: url, bgType });
    if (!url.startsWith('indexeddb:') && (settings.autoThemeMatch ?? true)) {
      setIsMatchingTheme(true);
      const colors = await extractThemeColors(url);
      setIsMatchingTheme(false);
      if (colors) {
        onUpdateSettings({
          primaryColor: colors.primaryColor,
          boardBgColor: colors.boardBgColor
        });
      }
    }
  };

  const handleCustomBgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const url = customBgUrl.trim();
    if (url) {
      const isVideo = url.toLowerCase().endsWith('.mp4') || url.toLowerCase().endsWith('.webm') || url.toLowerCase().includes('.mp4?') || url.toLowerCase().includes('.webm?');
      if (isVideo) {
        onUpdateSettings({ bgVideoUrl: url, bgType: 'video' });
      } else {
        applyBackgroundAndColors(url, 'upload');
      }
      setCustomBgUrl('');
    }
  };

  const handleHabitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newHabitText.trim()) {
      onAddHabit(newHabitText.trim());
      setNewHabitText('');
    }
  };

  const togglePanel = (panel: 'gallery' | 'widgets' | 'habits' | 'settings' | 'importBookmarks' | 'trash') => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
    }
  };

  return (
    <div className="relative h-fit flex items-center" id="sidebar-menu-root">
      {/* Dynamic Slide-out Drawer Panel */}
      <AnimatePresence>
        {activePanel && activePanel !== 'gallery' && activePanel !== 'settings' && (
          <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 50, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-16 top-1/2 -translate-y-1/2 w-80 bg-[#161211]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 text-white shadow-2xl z-50 flex flex-col max-h-[85vh] overflow-y-auto"
          >
            {/* Panel Header */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-200 flex items-center space-x-1.5 font-sans">
                <span>
                  {activePanel === 'widgets' && 'Widgets'}
                  {activePanel === 'habits' && 'Habits Tracker'}
                  {activePanel === 'importBookmarks' && 'Import from Chrome Bookmarks'}
                  {activePanel === 'trash' && 'Trash'}
                </span>
              </h4>
              <button
                onClick={() => setActivePanel(null)}
                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Panel Body: Widgets */}
            {activePanel === 'widgets' && (
              <div className="space-y-3 font-sans text-xs pr-1">
                {/* Filter */}
                <div className="relative">
                  <ListFilter className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                  <input type="text" value={widgetFilter} onChange={(e) => setWidgetFilter(e.target.value)}
                    placeholder="Filter widgets..."
                    className="w-full bg-white/5 hover:bg-white/10 focus:bg-white/10 pl-8 pr-3 py-2 text-xs rounded-lg border border-white/5 focus:border-white/15 outline-none text-white placeholder-gray-500 transition-colors" />
                </div>

                {/* Multi-instance boards (Add button + name prompt) */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 font-mono px-1">Boards</p>
                  {(() => {
                    const addTypes = {
                      board: { label: 'Board', icon: BookmarkIcon, placeholder: 'Board name', create: onCreateBoard },
                      note: { label: 'Note Board', icon: Edit2, placeholder: 'Note name', create: onCreateNoteBoard },
                      calendar: { label: 'Calendar', icon: Calendar, placeholder: 'Calendar name', create: onCreateCalendar },
                      pomodoro: { label: 'Pomodoro', icon: Clock, placeholder: 'Pomodoro name', create: onCreatePomodoro },
                    } as const;
                    return (Object.keys(addTypes) as (keyof typeof addTypes)[]).filter(type => {
                      const label = addTypes[type].label;
                      return label.toLowerCase().includes(widgetFilter.toLowerCase());
                    }).map((type) => {
                      const meta = addTypes[type];
                      const Icon = meta.icon;
                      return (
                        <div key={type} className="rounded-xl bg-[#2a2835]/50 border border-white/5">
                          {addingBoardType === type ? (
                            <form onSubmit={(e) => { e.preventDefault(); if (!boardNameDraft.trim()) return; meta.create?.(boardNameDraft); setAddingBoardType(null); setBoardNameDraft(''); }}
                              className="p-2.5 space-y-2">
                              <input type="text" autoFocus value={boardNameDraft} onChange={(e) => setBoardNameDraft(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Escape') { setAddingBoardType(null); setBoardNameDraft(''); } }}
                                placeholder={meta.placeholder}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-[12px] text-white outline-none focus:border-white/20 placeholder-gray-500" />
                              <div className="flex gap-1.5">
                                <button type="button" onClick={() => { setAddingBoardType(null); setBoardNameDraft(''); }}
                                  className="flex-1 py-1.5 rounded-lg text-[11px] text-gray-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                                <button type="submit" disabled={!boardNameDraft.trim()}
                                  className="flex-1 py-1.5 rounded-lg text-[11px] bg-primary-accent/20 text-primary-accent hover:bg-primary-accent hover:text-white transition-colors disabled:opacity-40">Add</button>
                              </div>
                            </form>
                          ) : (
                            <div className="flex items-center justify-between p-3">
                              <span className="font-medium text-gray-200 flex items-center"><Icon className="w-4 h-4 mr-3 text-gray-400" />{meta.label}</span>
                              <button onClick={() => { setAddingBoardType(type); setBoardNameDraft(''); }}
                                className="px-3 py-1.5 bg-primary-accent/20 hover:bg-primary-accent text-primary-accent hover:text-white rounded-lg transition-colors text-[11px] font-medium flex items-center gap-1">
                                <Plus className="w-3 h-3" /> Add
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Single-instance widgets with Add button */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 font-mono px-1">Widgets</p>
                  {(() => {
                    const addWidgets: { id: string; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
                      { id: 'bookmarks', icon: BookmarkIcon, label: 'Bookmarks' },
                      { id: 'calculator', icon: Calculator, label: 'Calculator' },
                      { id: 'programLauncher', icon: AppWindow, label: 'Program Launcher' },
                      { id: 'pomodoro', icon: Clock, label: 'Pomodoro' },
                      { id: 'crypto', icon: DollarSign, label: 'Crypto' },
                      { id: 'weatherW', icon: Cloud, label: 'Weather' },
                      { id: 'notes', icon: Edit2, label: 'Work Notes' },
                      { id: 'todoList', icon: CheckSquare, label: 'Todo List' },
                      { id: 'kanban', icon: LayoutGrid, label: 'Kanban Board' },
                      { id: 'calendar', icon: Calendar, label: 'Calendar' },
                      { id: 'stickyNotes', icon: Edit2, label: 'Sticky Notes' },
                      { id: 'countdownTimer', icon: Clock, label: 'Countdown Timer' },
                      { id: 'gmailPreview', icon: MessageSquare, label: 'Gmail Preview' },
                      { id: 'notificationCenter', icon: Bell, label: 'Notifications' },
                      { id: 'weeklyPlanner', icon: Calendar, label: 'Weekly Planner' },
                    ];
                    const settingsKeyMap: Record<string, string> = {
                      bookmarks: 'showBookmarks', calculator: 'showCalculator',
                      programLauncher: 'showProgramLauncher', pomodoro: 'showPomodoro',
                      crypto: 'showCrypto', weatherW: 'showWeather',
                      notes: 'showNotes', todoList: 'showTodoList',
                      kanban: 'showKanban', calendar: 'showCalendar',
                      stickyNotes: 'showStickyNotes', countdownTimer: 'showCountdownTimer',
                      gmailPreview: 'showGmailPreview', notificationCenter: 'showNotificationCenter',
                      weeklyPlanner: 'showWeeklyPlanner',
                    };
                    const filtered = addWidgets.filter(w => w.label.toLowerCase().includes(widgetFilter.toLowerCase()));
                    if (filtered.length === 0) return null;
                    return filtered.map(w => {
                      const Icon = w.icon;
                      const inLayout = isWidgetInLayout?.(w.id) ?? false;
                      return (
                        <div key={w.id} className="flex items-center justify-between p-3 rounded-xl bg-[#2a2835]/50 border border-white/5">
                          <span className="font-medium text-gray-200 flex items-center"><Icon className="w-4 h-4 mr-3 text-gray-400" />{w.label}</span>
                          <button onClick={() => {
                            if (inLayout) {
                              onRemoveWidgetFromLayout?.(w.id);
                              const key = settingsKeyMap[w.id];
                              if (key) onUpdateSettings({ [key]: false });
                            } else {
                              onAddWidgetToLayout?.(w.id);
                              const key = settingsKeyMap[w.id];
                              if (key) onUpdateSettings({ [key]: true });
                            }
                          }}
                            className={`px-3 py-1.5 rounded-lg transition-colors text-[11px] font-medium flex items-center gap-1 ${inLayout ? 'bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white' : 'bg-primary-accent/20 text-primary-accent hover:bg-primary-accent hover:text-white'}`}>
                            {inLayout ? <><X className="w-3 h-3" /> Remove</> : <><Plus className="w-3 h-3" /> Add</>}
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>

                {/* Toggle-only widgets */}
                <div className="space-y-1.5">
                  <p className="text-[9px] uppercase tracking-widest text-gray-500 font-mono px-1">Toggle</p>
                  {(() => {
                    const toggleWidgets: { id: keyof DashboardSettings; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
                      { id: 'showSystem', icon: Activity, label: 'System Monitor' },
                      { id: 'showCommandCenter', icon: MessageSquare, label: 'AI Command Center' },
                      { id: 'showQuotes', icon: Quote, label: 'Quotes' },
                      { id: 'showMusic', icon: Music, label: 'Music Player' },
                      { id: 'showHabitWidget', icon: CheckSquare, label: 'Habit Tracker' },
                      { id: 'showDailyPlanner', icon: Calendar, label: 'Daily Planner' },
                      { id: 'showNews', icon: Newspaper, label: 'Tech News' },
                      { id: 'showGitHub', icon: Github, label: 'GitHub Trending' },
                      { id: 'showTerminal', icon: Terminal, label: 'Terminal' },
                      { id: 'showCodeEditor', icon: Code, label: 'Code Editor' },
                      { id: 'showWorldClock', icon: Clock, label: 'World Clock' },
                      { id: 'showAiAssistant', icon: Sparkles, label: 'AI Assistant' },
                      { id: 'showAmbient', icon: Volume2, label: 'Ambient Sounds' },
                      { id: 'showDictionary', icon: Book, label: 'Dictionary' },
                      { id: 'showFlashCards', icon: CreditCard, label: 'Flash Cards' },
                      { id: 'showTranslation', icon: Globe, label: 'Translation' },
                      { id: 'showMarkdown', icon: FileText, label: 'Markdown' },
                      { id: 'showSnippets', icon: Code, label: 'Code Snippets' },
                      { id: 'showUnitConverter', icon: Calculator, label: 'Unit Converter' },
                      { id: 'showPasswordGenerator', icon: Lock, label: 'Password Generator' },
                      { id: 'showIpInfo', icon: Globe, label: 'IP Info' },
                      { id: 'showExpenses', icon: DollarSign, label: 'Expenses' },
                      { id: 'showRSSReader', icon: Rss, label: 'RSS Reader' },
                      { id: 'showClipboardHistory', icon: Clipboard, label: 'Clipboard History' },
                      { id: 'showStockTracker', icon: TrendingUp, label: 'Stock Tracker' },
                      { id: 'showJSONViewer', icon: Braces, label: 'JSON Viewer' },
                    ];
                    const filtered = toggleWidgets.filter(w => w.label.toLowerCase().includes(widgetFilter.toLowerCase()));
                    if (filtered.length === 0) return <p className="text-[10px] text-gray-500 font-mono py-4 text-center italic">No widgets match "{widgetFilter}"</p>;
                    return filtered.map(w => (
                      <WidgetToggleRow key={w.id} icon={w.icon} label={w.label}
                        checked={!!settings[w.id]}
                        onChange={() => {
                          const isOn = !!settings[w.id];
                          onUpdateSettings({ [w.id]: !isOn } as Partial<DashboardSettings>);
                          // Map showXxx settings to layout widget IDs
                          const idMap: Record<string, string> = {
                            showSystem: 'system', showCommandCenter: 'commandCenter', showQuotes: 'quotes',
                            showMusic: 'music', showHabitWidget: 'habitWidget', showDailyPlanner: 'dailyPlanner',
                            showNews: 'news', showGitHub: 'github', showTerminal: 'terminal', showCodeEditor: 'codeEditor',
                            showWorldClock: 'worldClock', showAiAssistant: 'aiAssistant', showAmbient: 'ambient',
                            showDictionary: 'dictionary', showFlashCards: 'flashCards', showTranslation: 'translation',
                            showMarkdown: 'markdown', showSnippets: 'snippets', showUnitConverter: 'unitConverter',
                            showPasswordGenerator: 'passwordGen', showIpInfo: 'ipInfo', showExpenses: 'expenses',
                            showRSSReader: 'rssReader', showClipboardHistory: 'clipboardHistory',
                            showStockTracker: 'stockTracker', showJSONViewer: 'jsonViewer',
                          };
                          const widgetId = idMap[w.id];
                          if (widgetId) {
                            if (!isOn) onAddWidgetToLayout?.(widgetId);
                            else onRemoveWidgetFromLayout?.(widgetId);
                          }
                        }} />
                    ));
                  })()}
                </div>

                {/* Search bar toggle */}
                <div className="pt-3 border-t border-white/5">
                  <WidgetToggleRow icon={Search} label="Show header search bar"
                    checked={settings.showSearchBar ?? true}
                    onChange={() => onUpdateSettings({ showSearchBar: !(settings.showSearchBar ?? true) })} />
                </div>
              </div>
            )}

            {/* Panel Body: Habits */}
            {activePanel === 'habits' && (
              <div className="space-y-4">
                <form onSubmit={handleHabitSubmit} className="flex space-x-1.5">
                  <input
                    type="text"
                    value={newHabitText}
                    onChange={(e) => setNewHabitText(e.target.value)}
                    placeholder="New habit or task..."
                    className="flex-1 bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs rounded-lg border border-white/5 focus:border-white/15 outline-none text-white placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    className="p-1.5 bg-[#401f19]/80 text-primary-accent border border-primary-accent/40 rounded-lg hover:bg-[#502421] transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>

                <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                  {habits.length === 0 ? (
                    <p className="text-[10px] text-gray-500 font-mono py-6 text-center italic">
                      No habits set.
                    </p>
                  ) : (
                    habits.map((hb) => (
                      <div
                        key={hb.id}
                        className="flex items-center justify-between p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                      >
                        <button
                          onClick={() => onToggleHabit(hb.id)}
                          className="flex items-center space-x-2.5 flex-1 text-left"
                        >
                          <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            hb.completed ? 'bg-primary-accent border-primary-accent text-white' : 'border-white/20'
                          }`}>
                            {hb.completed && <span className="text-[9px] font-bold">✓</span>}
                          </div>
                          <span className={`text-xs ${hb.completed ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                            {hb.text}
                          </span>
                        </button>
                        <button
                          onClick={() => onDeleteHabit(hb.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Panel Body: Import Bookmarks */}
            {activePanel === 'importBookmarks' && (
              <div className="space-y-4 font-sans text-xs">
                <p className="text-[10px] text-gray-500">
                  Export bookmarks from any browser (Chrome, Firefox, Edge) as an HTML file, then import here.
                </p>

                {importStatus === 'success' && (
                  <div className="flex items-center space-x-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
                    <Check className="w-3.5 h-3.5" />
                    <span>{importMessage}</span>
                  </div>
                )}
                {importStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{importMessage}</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                  <div>
                    <span className="font-medium text-gray-200 block">Import from bookmarks file</span>
                    <span className="text-[10px] text-gray-500 font-mono">Pick an exported .html bookmarks file</span>
                  </div>
                  <label className="px-3 py-1.5 bg-primary-accent/20 hover:bg-primary-accent text-primary-accent hover:text-white rounded-lg cursor-pointer transition-colors text-[11px] font-medium flex items-center gap-1.5">
                    {importStatus === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
                    Choose file
                    <input 
                      type="file" 
                      accept=".html" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file || !onImportBookmarks) return;
                        setImportStatus('processing');
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          const text = evt.target?.result as string;
                          try {
                            const doc = new DOMParser().parseFromString(text, 'text/html');
                            const anchors = Array.from(doc.querySelectorAll('a[href]'));
                            let idCount = Date.now();
                            const imported = anchors
                              .map((a) => ({
                                id: `imported-${idCount++}`,
                                url: a.getAttribute('href') || '',
                                label: a.textContent?.trim() || a.getAttribute('href') || 'Untitled',
                                category: 'general' as const,
                              }))
                              .filter((b) => b.url);
                            if (imported.length > 0) {
                              onImportBookmarks(imported);
                              setImportStatus('success');
                              setImportMessage(`Imported ${imported.length} bookmarks!`);
                              setTimeout(() => setActivePanel(null), 1200);
                            } else {
                              setImportStatus('error');
                              setImportMessage('No bookmarks found in that file.');
                            }
                          } catch {
                            setImportStatus('error');
                            setImportMessage('Could not read that file.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5 text-[10px] text-gray-500 space-y-1">
                  <p className="font-medium text-gray-400">How to export bookmarks:</p>
                  <p>Chrome: <span className="text-gray-400">chrome://bookmarks → ⋮ → Export bookmarks</span></p>
                  <p>Firefox: <span className="text-gray-400">Library → Bookmarks → Import/Export → Export</span></p>
                  <p>Edge: <span className="text-gray-400">edge://favorites → ⋯ → Export favorites</span></p>
                </div>
              </div>
            )}

            {/* Panel Body: Trash */}
            {activePanel === 'trash' && (
              <div className="space-y-4 font-sans text-xs">
                {deletedBookmarks && deletedBookmarks.length > 0 ? (
                  <>
                    <div className="flex justify-end mb-2">
                      <button 
                        onClick={() => onEmptyTrash && onEmptyTrash()}
                        className="text-red-400 hover:text-red-300 text-[10px] uppercase tracking-widest font-mono"
                      >
                        Empty trash
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                      {deletedBookmarks.map(b => (
                        <div key={b.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 border border-white/10">
                          <div className="overflow-hidden pr-2">
                            <span className="font-medium text-gray-200 block truncate">{b.label}</span>
                            <span className="text-[10px] text-gray-500 truncate block">{b.url}</span>
                          </div>
                          <button 
                            onClick={() => onRestoreBookmark && onRestoreBookmark(b.id)}
                            className="px-2 py-1 bg-primary-accent/20 text-primary-accent hover:bg-primary-accent/30 rounded text-[10px] transition-colors whitespace-nowrap"
                          >
                            Restore
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="py-10 text-center text-gray-500 flex flex-col items-center">
                    <Trash2 className="w-8 h-8 mb-3 opacity-20" />
                    <p>Trash is empty</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dedicated Wallpaper Modal — larger centered layout matching the reference picker
          (title/close, drag-drop upload zone, full presets grid, real "My Uploads"
          thumbnails pulled from IndexedDB, and a "Find Wallpapers" web search row) */}
      <AnimatePresence>
        {activePanel === 'gallery' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setActivePanel(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(560px,92vw)] max-h-[86vh] overflow-y-auto scrollbar-thin bg-[#161211]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-white shadow-2xl z-[9999]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-white">Wallpaper</h3>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5" title="Automatically update Primary & Board color to match the chosen wallpaper">
                    <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono">Auto-match colors</span>
                    <Toggle
                      checked={settings.autoThemeMatch ?? true}
                      onChange={() => onUpdateSettings({ autoThemeMatch: !(settings.autoThemeMatch ?? true) })}
                      label="Auto-match colors to wallpaper"
                    />
                  </div>
                  <button
                    onClick={() => setActivePanel(null)}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Drag & drop upload zone */}
              <label
                htmlFor="bg-file-upload"
                onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                onDragLeave={() => setIsDraggingFile(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingFile(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleWallpaperFile(file);
                }}
                className={`flex flex-col items-center justify-center space-y-2 w-full py-8 border border-dashed rounded-2xl cursor-pointer transition-all text-center ${
                  isDraggingFile
                    ? 'border-primary-accent bg-primary-accent/10'
                    : 'border-white/15 hover:border-white/25 bg-white/[0.03] hover:bg-white/5'
                }`}
              >
                <ImagePlus className="w-6 h-6 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Upload image or video</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono">JPG · PNG · MP4</span>
              </label>
              <input
                type="file"
                id="bg-file-upload"
                accept="image/*,video/*,video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleWallpaperFile(file);
                }}
              />

              {/* Status Feedback */}
              {uploadStatus === 'processing' && (
                <div className="flex items-center space-x-2 text-[11px] text-primary-accent bg-primary-accent/10 border border-primary-accent/20 px-3 py-2 rounded-xl mt-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing & storing file...</span>
                </div>
              )}
              {uploadStatus === 'success' && (
                <div className="flex items-center space-x-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl mt-3">
                  <Check className="w-3.5 h-3.5" />
                  <span>Wallpaper uploaded & active!</span>
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="flex items-start space-x-2 text-[11px] text-red-300 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-xl mt-3">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span className="leading-tight">{uploadError}</span>
                </div>
              )}
              {isMatchingTheme && (
                <div className="flex items-center space-x-2 text-[11px] text-gray-300 bg-white/5 border border-white/10 px-3 py-2 rounded-xl mt-3">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Matching Primary &amp; Board color to this wallpaper...</span>
                </div>
              )}

              {/* Presets grid */}
              <div className="mt-6">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold mb-2">
                  Presets
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {wallpaperPresets.map((wp) => (
                    <button
                      key={wp.name}
                      onClick={() => applyBackgroundAndColors(wp.url, 'gallery')}
                      title={wp.name}
                      className={`group relative aspect-square rounded-xl overflow-hidden border transition-all ${
                        settings.backgroundImageUrl === wp.url
                          ? 'border-primary-accent ring-2 ring-primary-accent/35'
                          : 'border-white/5 hover:border-white/25'
                      }`}
                    >
                      <img
                        src={wp.url}
                        alt={wp.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      {settings.backgroundImageUrl === wp.url && (
                        <div className="absolute top-1 right-1 bg-primary-accent rounded-full p-0.5">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* My Uploads — shows whatever the user actually has stored, instead of
                  always appearing empty like the old panel did */}
              <div className="mt-6">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold mb-2">
                  My Uploads
                </span>
                {myUploads.length === 0 ? (
                  <p className="text-[11px] text-gray-500 italic py-2">No custom uploads yet — drop a file above.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {myUploads.map((u) => {
                      const isActive = u.isVideo ? settings.bgVideoUrl === `indexeddb:${u.key}` : settings.backgroundImageUrl === `indexeddb:${u.key}`;
                      return (
                        <div key={u.key} className={`group relative aspect-square rounded-xl overflow-hidden border ${isActive ? 'border-primary-accent ring-2 ring-primary-accent/35' : 'border-white/5 hover:border-white/25'}`}>
                          <button
                            onClick={async () => {
                              if (u.isVideo) {
                                onUpdateSettings({ bgVideoUrl: `indexeddb:${u.key}`, bgType: 'video' });
                              } else {
                                onUpdateSettings({ backgroundImageUrl: `indexeddb:${u.key}`, bgType: 'upload' });
                                if (settings.autoThemeMatch ?? true) {
                                  setIsMatchingTheme(true);
                                  const colors = await extractThemeColors(u.url);
                                  setIsMatchingTheme(false);
                                  if (colors) onUpdateSettings({ primaryColor: colors.primaryColor, boardBgColor: colors.boardBgColor });
                                }
                              }
                            }}
                            className="absolute inset-0 w-full h-full"
                          >
                            {u.isVideo ? (
                              <video src={u.url} className="w-full h-full object-cover" muted />
                            ) : (
                              <img src={u.url} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            )}
                          </button>
                          {u.isVideo && (
                            <div className="absolute bottom-1 left-1 bg-black/60 rounded p-0.5 pointer-events-none">
                              <Film className="w-3 h-3 text-white" />
                            </div>
                          )}
                          <button
                            onClick={async () => {
                              await deleteWallpaperBlob(u.key);
                              if (u.isVideo && settings.bgVideoUrl === `indexeddb:${u.key}`) onUpdateSettings({ bgVideoUrl: '' });
                              if (!u.isVideo && settings.backgroundImageUrl === `indexeddb:${u.key}`) onUpdateSettings({ backgroundImageUrl: defaultBg, bgType: 'gallery' });
                              setMyUploads((prev) => prev.filter((x) => x.key !== u.key));
                            }}
                            className="absolute top-1 right-1 p-1 bg-black/60 hover:bg-red-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete upload"
                          >
                            <Trash2 className="w-3 h-3 text-white" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Custom URL entry (kept for pasting direct image/video links) */}
              <div className="mt-6">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold mb-2">
                  Custom Image or Video URL
                </span>
                <form onSubmit={handleCustomBgSubmit} className="flex space-x-1.5">
                  <input
                    type="url"
                    value={customBgUrl}
                    onChange={(e) => setCustomBgUrl(e.target.value)}
                    placeholder="https://..."
                    className="flex-1 bg-white/5 hover:bg-white/10 px-3 py-2 text-xs rounded-lg border border-white/5 focus:border-white/15 outline-none text-white placeholder-gray-500"
                  />
                  <button
                    type="submit"
                    className="px-3 bg-white/10 text-white border border-white/10 rounded-lg hover:bg-white/20 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* Find Wallpapers — opens an external image search in a new tab */}
              <div className="mt-6">
                <span className="block text-[10px] text-gray-400 uppercase tracking-widest font-mono font-bold mb-2">
                  Find Wallpapers
                </span>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const q = wallpaperSearchQuery.trim() || 'aesthetic desktop wallpaper';
                    window.open(`https://unsplash.com/s/photos/${encodeURIComponent(q)}`, '_blank', 'noopener,noreferrer');
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={wallpaperSearchQuery}
                    onChange={(e) => setWallpaperSearchQuery(e.target.value)}
                    placeholder="Search the web for wallpapers"
                    className="w-full bg-white/5 hover:bg-white/10 pl-3 pr-9 py-2 text-xs rounded-lg border border-white/5 focus:border-white/15 outline-none text-white placeholder-gray-500 transition-colors"
                  />
                  <button type="submit" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors" title="Search">
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>

              {/* Live Video Controls — only relevant once a video background is active */}
              {settings.bgType === 'video' && (
                <div className="mt-6 p-3 bg-white/5 rounded-xl border border-white/10 space-y-2.5 text-left">
                  <div className="flex items-center space-x-2 text-primary-accent">
                    <Video className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-mono uppercase tracking-wider font-bold">Video Wallpaper Options</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-gray-300">Play Video Audio</span>
                    <Toggle
                      checked={!(settings.videoMuted ?? false)}
                      onChange={() => onUpdateSettings({ videoMuted: !(settings.videoMuted ?? false) })}
                      label="Play video audio"
                    />
                  </div>

                  {!(settings.videoMuted ?? false) && (
                    <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                      <div className="flex justify-between text-[9px] text-gray-400 font-mono">
                        <span>Video Volume</span>
                        <span>{settings.videoVolume ?? 50}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.videoVolume ?? 50}
                        onChange={(e) => onUpdateSettings({ videoVolume: parseInt(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Dedicated Dashboard Settings Modal — one large centered panel covering every
          section (Appearance, Board Text, Boards, General, Quick Save, Language,
          Region, Sidebar, Support) instead of a cramped side drawer. */}
      <AnimatePresence>
        {activePanel === 'settings' && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
              onClick={() => setActivePanel(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 240 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(550px,92vw)] max-h-[86vh] overflow-y-auto scrollbar-thin bg-[#161211]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 text-white shadow-2xl z-[9999] font-sans text-xs"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5 sticky -top-6 bg-[#161211]/95 backdrop-blur-2xl pt-1 pb-3 -mx-6 px-6 border-b border-white/5 z-10">
                <h3 className="text-base font-bold text-white">Settings</h3>
                <button
                  onClick={() => setActivePanel(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 1. APPEARANCE */}
              <div className="space-y-4 border-b border-white/5 pb-4">
                <span className="text-[12px] text-gray-400 font-bold block mb-2 font-sans tracking-wide">
                  APPEARANCE
                </span>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-gray-300 block">Primary color</label>
                    <input
                      type="color"
                      value={settings.primaryColor || '#ec5e43'}
                      onChange={(e) => onUpdateSettings({ primaryColor: e.target.value })}
                      className="w-full h-10 rounded-[14px] cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[14px] shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[13px] font-medium text-gray-300 block">Board color</label>
                    <input
                      type="color"
                      value={settings.boardBgColor || '#161211'}
                      onChange={(e) => onUpdateSettings({ boardBgColor: e.target.value })}
                      className="w-full h-10 rounded-[14px] cursor-pointer bg-transparent border-0 p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-[14px] shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[13px] font-medium text-gray-300">
                    <span>Opacity</span>
                    <span className="text-gray-500">{settings.glassOpacity ?? 20}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="95"
                    value={settings.glassOpacity ?? 20}
                    onChange={(e) => onUpdateSettings({ glassOpacity: parseInt(e.target.value) })}
                    style={{ background: `linear-gradient(to right, ${settings.primaryColor || '#ec5e43'} ${(settings.glassOpacity ?? 20)}%, rgba(255,255,255,0.1) ${(settings.glassOpacity ?? 20)}%)` }}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[13px] font-medium text-gray-300">
                    <span>Blur</span>
                    <span className="text-gray-500">{settings.glassBlur ?? 10}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="30"
                    value={settings.glassBlur ?? 10}
                    onChange={(e) => onUpdateSettings({ glassBlur: parseInt(e.target.value) })}
                    style={{ background: `linear-gradient(to right, ${settings.primaryColor || '#ec5e43'} ${((settings.glassBlur ?? 10)/30)*100}%, rgba(255,255,255,0.1) ${((settings.glassBlur ?? 10)/30)*100}%)` }}
                    className="w-full h-1 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-md"
                  />
                </div>

                <div className="flex space-x-3 pt-1">
                  <button onClick={() => setActivePanel(null)} className="px-5 py-2 bg-[#2a2835]/50 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-200 border border-white/5 transition-colors shadow-sm">Cancel</button>
                  <button onClick={() => onUpdateSettings({ primaryColor: '#ec5e43', boardBgColor: '#161211', glassOpacity: 20, glassBlur: 10 })} className="px-5 py-2 bg-[#2a2835]/50 hover:bg-white/10 rounded-xl text-sm font-medium text-gray-200 border border-white/5 transition-colors shadow-sm">Reset</button>
                </div>
              </div>

              {/* 2. BOARD TEXT */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">BOARD TEXT</span>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Size</span>
                  <div className="flex bg-white/5 p-0.5 rounded-lg">
                    {(['S', 'M', 'L'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => onUpdateSettings({ fontSize: size })}
                        className={`px-3 py-1 text-[11px] rounded transition-all font-semibold ${
                          (settings.fontSize || 'M') === size ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Weight</span>
                  <div className="flex bg-white/5 p-0.5 rounded-lg">
                    {(['normal', 'bold'] as const).map((weight) => (
                      <button
                        key={weight}
                        onClick={() => onUpdateSettings({ fontWeight: weight })}
                        className={`px-3 py-1 text-[11px] rounded transition-all font-semibold capitalize ${
                          (settings.fontWeight || 'normal') === weight ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {weight === 'normal' ? 'Normal' : 'Bold'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. BOARDS */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">BOARDS</span>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Number of columns</span>
                  <select
                    value={String(settings.boardCols ?? 3)}
                    onChange={(e) => onUpdateSettings({ boardCols: e.target.value === 'auto' ? 3 : parseInt(e.target.value) })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/20"
                  >
                    <option value="auto" className="bg-[#161211] text-white">Auto</option>
                    <option value="3" className="bg-[#161211] text-white">3</option>
                    <option value="4" className="bg-[#161211] text-white">4</option>
                    <option value="5" className="bg-[#161211] text-white">5</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[13px] font-medium text-gray-300">
                    <span>Board width</span>
                    <span className="text-gray-500">{settings.boardWidth ?? 1400}px</span>
                  </div>
                  <input
                    type="range"
                    min="1000"
                    max="1800"
                    step="50"
                    value={settings.boardWidth ?? 1400}
                    onChange={(e) => onUpdateSettings({ boardWidth: parseInt(e.target.value) })}
                    className="w-full accent-orange-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              {/* 4. GENERAL */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">GENERAL</span>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Open links in new tab</span>
                  <Toggle
                    checked={settings.openLinksInNewTab ?? true}
                    onChange={() => onUpdateSettings({ openLinksInNewTab: !(settings.openLinksInNewTab ?? true) })}
                    label="Open links in new tab"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Hide extra bookmarks</span>
                  <Toggle
                    checked={settings.hideExtraBookmarks ?? false}
                    onChange={() => onUpdateSettings({ hideExtraBookmarks: !(settings.hideExtraBookmarks ?? false) })}
                    label="Hide extra bookmarks"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Show descriptions</span>
                  <Toggle
                    checked={settings.showBookmarkDescriptions ?? true}
                    onChange={() => onUpdateSettings({ showBookmarkDescriptions: !(settings.showBookmarkDescriptions ?? true) })}
                    label="Show bookmark descriptions"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[13px] font-medium text-gray-300">Default search engine</span>
                  <select
                    value={settings.searchEngine}
                    onChange={(e) => onUpdateSettings({ searchEngine: e.target.value as any })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/20"
                  >
                    <option value="google" className="bg-[#161211] text-white">Google</option>
                    <option value="duckduckgo" className="bg-[#161211] text-white">DuckDuckGo</option>
                    <option value="bing" className="bg-[#161211] text-white">Bing</option>
                  </select>
                </div>
              </div>

              {/* 5. QUICK SAVE */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">QUICK SAVE</span>
                <p className="text-[11px] text-gray-500 -mt-1">Press the shortcut on any tab to save it straight to a board.</p>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Save to board</span>
                  <select
                    value={settings.quickSaveBoard || 'bookmarks'}
                    onChange={(e) => onUpdateSettings({ quickSaveBoard: e.target.value })}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white outline-none focus:border-white/20"
                  >
                    <option value="bookmarks" className="bg-[#161211] text-white">Bookmarks</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Quick Save</span>
                  <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-[11px] font-mono text-gray-300">Ctrl+Shift+S</kbd>
                </div>
              </div>

              {/* 6. LANGUAGE */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">LANGUAGE</span>
                <div className="flex bg-white/5 p-0.5 rounded-lg w-full">
                  {([
                    { id: 'auto', label: 'Auto' },
                    { id: 'en', label: 'English' },
                    { id: 'ru', label: 'Русский' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => onUpdateSettings({ language: opt.id })}
                      className={`flex-1 px-3 py-1.5 text-[12px] rounded-md transition-all font-medium ${
                        (settings.language || 'auto') === opt.id ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-gray-500">Русский interface strings are partial in this release — most labels currently fall back to English.</p>
              </div>

              {/* 7. REGION */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">REGION</span>
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleAutoDetectLocation}
                    disabled={isDetectingLocation}
                    className="px-3 py-1.5 bg-[#2a2835]/50 hover:bg-white/10 rounded-lg text-[12px] font-medium text-gray-200 border border-white/5 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isDetectingLocation && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>Auto-detect</span>
                  </button>
                  <button
                    onClick={() => setIsRegionAdvancedOpen((v) => !v)}
                    className="px-3 py-1.5 text-[12px] font-medium text-gray-300 hover:text-white transition-colors"
                  >
                    Advanced &rsaquo;
                  </button>
                </div>
                {locationError && <p className="text-[10px] text-red-300">{locationError}</p>}
                {isRegionAdvancedOpen && (
                  <div className="space-y-2 pt-2 border-t border-white/5">
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">City</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/20 placeholder-gray-500"
                        value={settings.city || ''}
                        onChange={(e) => onUpdateSettings({ city: e.target.value })}
                        placeholder="Jeddah"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-gray-400 uppercase font-mono mb-1">Weather API key (optional)</label>
                      <input
                        type="text"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/20 placeholder-gray-500"
                        value={settings.weatherApiKey || ''}
                        onChange={(e) => onUpdateSettings({ weatherApiKey: e.target.value })}
                        placeholder="Uses free tier by default"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 8. SIDEBAR */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">SIDEBAR</span>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Always show all buttons</span>
                  <Toggle
                    checked={settings.sidebarAlwaysShowButtons ?? true}
                    onChange={() => onUpdateSettings({ sidebarAlwaysShowButtons: !(settings.sidebarAlwaysShowButtons ?? true) })}
                    label="Always show all sidebar buttons"
                  />
                </div>
                <p className="text-[10px] text-gray-500">When off, the icon dock fades until you hover near it.</p>
              </div>

              {/* 9. SUPPORT */}
              <div className="space-y-3 border-b border-white/5 py-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide">SUPPORT</span>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-gray-300">Version</span>
                  <span className="text-[12px] text-gray-500 font-mono">1.4.0</span>
                </div>
              </div>

              {/* 10. DATA */}
              <div className="space-y-2 pt-4">
                <span className="text-[12px] text-gray-400 font-bold block font-sans tracking-wide mb-1">DATA</span>
                <div className="pt-1 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-gray-200 block text-[13px]">Focus Stats</span>
                    <span className="text-[10px] text-gray-500 font-mono">Completed: {focusMinutesToday}m</span>
                  </div>
                  <div className="flex space-x-1.5">
                    {onOpenStats && (
                      <button
                        onClick={onOpenStats}
                        className="px-2.5 py-1.5 text-[10px] uppercase border border-primary-accent/60 bg-primary-accent/20 text-primary-accent rounded-lg hover:bg-primary-accent/30 transition-colors font-bold"
                      >
                        View Charts
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm('Reset today\'s focus minutes?')) {
                          onClearFocusMinutes();
                        }
                      }}
                      className="px-2.5 py-1.5 text-[10px] uppercase border border-red-950 bg-red-950/10 text-red-300 rounded-lg hover:bg-red-950/20 transition-colors"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <p className="text-[10px] text-gray-500 font-mono leading-relaxed mb-1.5">
                    Reset bookmarks, calendar logs, and customized configurations to original presets.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to reset all dashboard settings to presets?')) {
                        onResetDashboard();
                        setActivePanel(null);
                      }
                    }}
                    className="w-full py-2 bg-red-950/45 text-red-200 border border-red-900/30 rounded-lg hover:bg-red-900/30 flex items-center justify-center space-x-1.5 transition-colors uppercase text-[10px] tracking-wider font-bold"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset All Data</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Vertical Icon Menu Column */}
      <div
        className={`flex flex-col items-center z-40 transition-opacity duration-300 ${
          (settings.sidebarAlwaysShowButtons ?? true) || !!activePanel
            ? 'opacity-100'
            : 'opacity-25 hover:opacity-100 focus-within:opacity-100'
        }`}
      >
        <div className="flex flex-col items-center bg-black/30 backdrop-blur-md rounded-full border border-white/5 p-2 space-y-4 shadow-2xl">
          <DockButton
            onClick={() => {
              // Toggles search input focus or blurs
              const headerSearch = document.querySelector('#dashboard-header input') as HTMLInputElement;
              if (headerSearch) {
                headerSearch.focus();
              }
            }}
            active={false}
            label="Focus Search Bar"
            icon={Search}
          />

          <DockButton
            onClick={() => togglePanel('gallery')}
            active={activePanel === 'gallery'}
            label="Wallpaper"
            icon={Image}
          />

          <DockButton
            onClick={() => togglePanel('widgets')}
            active={activePanel === 'widgets'}
            label="Widgets"
            icon={LayoutGrid}
          />

          <DockButton
            onClick={() => togglePanel('habits')}
            active={activePanel === 'habits'}
            label="Habits"
            icon={CheckSquare}
          />

          <DockButton
            onClick={() => togglePanel('importBookmarks')}
            active={activePanel === 'importBookmarks'}
            label="Import Bookmarks"
            icon={BookmarkPlus}
          />

          <DockButton
            onClick={() => togglePanel('trash')}
            active={activePanel === 'trash'}
            label="Trash"
            icon={Trash2}
            badge={deletedBookmarks.length > 0 ? deletedBookmarks.length : undefined}
          />
        </div>

        <button
          onClick={() => togglePanel('settings')}
          className={`group relative mt-4 p-3 rounded-full transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 ${
            activePanel === 'settings' ? 'bg-primary-accent text-white' : 'bg-primary-accent/80 text-gray-200 hover:bg-primary-accent'
          }`}
          title="Settings"
          aria-label="Dashboard Settings"
        >
          <SettingsIcon className="w-4 h-4" />
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#161211] border border-white/10 text-white text-[10px] font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
            Settings
          </span>
        </button>
      </div>
    </div>
  );
}

// Single dock icon-button: active highlight, hover tooltip label, optional badge count.
function DockButton({
  onClick,
  active,
  label,
  icon: Icon,
  badge,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={`group relative p-3 rounded-full transition-all duration-300 hover:scale-105 active:scale-95 ${
        active ? 'bg-primary-accent/30 text-primary-accent' : 'text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      <Icon className="w-4 h-4" />
      {!!badge && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[15px] h-[15px] px-0.5 flex items-center justify-center rounded-full bg-red-500 text-white text-[8px] font-bold leading-none">
          {badge > 9 ? '9+' : badge}
        </span>
      )}
      <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[#161211] border border-white/10 text-white text-[10px] font-medium px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-xl">
        {label}
      </span>
    </button>
  );
}
