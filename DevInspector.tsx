// =============================================================================
// DevInspector — Interactive developer inspection mode
// =============================================================================
// Toggle with Ctrl+Shift+D or the Command Palette. When active:
//   1. Hovering a widget shows an orange dashed border + type badge
//   2. Clicking a widget opens a bottom panel with source file info
//   3. "Open in Editor" launches the file in VS Code (or system default)
//
// The overlay captures all pointer events while active so widgets are NOT
// interactive — this is intentional. Toggle dev mode off to resume normal use.
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Code, ExternalLink, Copy, Check, X } from 'lucide-react';
import { isTauri, openInEditor } from '../lib/tauri-api';

// ─── Widget Type → Source File Registry ────────────────────────────
// Maps every widget ID (used in the layout arrays) to its component
// name and source file path relative to the project root.
const WIDGET_REGISTRY: Record<string, { component: string; file: string }> = {
  bookmarks:          { component: 'BookmarksPanel',          file: 'src/components/BookmarksPanel.tsx' },
  pomodoro:           { component: 'PomodoroTimer',           file: 'src/components/PomodoroTimer.tsx' },
  notes:              { component: 'WorkNotes',               file: 'src/components/WorkNotes.tsx' },
  calendar:           { component: 'MiniCalendar',            file: 'src/components/MiniCalendar.tsx' },
  aiAssistant:        { component: 'AIAssistantWidget',       file: 'src/components/AIAssistantWidget.tsx' },
  calculator:         { component: 'CalculatorWidget',        file: 'src/components/CalculatorWidget.tsx' },
  worldClock:         { component: 'WorldClockWidget',        file: 'src/components/WorldClockWidget.tsx' },
  quotes:             { component: 'QuoteWidget',             file: 'src/components/QuoteWidget.tsx' },
  crypto:             { component: 'CryptoWidget',            file: 'src/components/CryptoWidget.tsx' },
  system:             { component: 'SystemWidget',            file: 'src/components/SystemWidget.tsx' },
  news:               { component: 'NewsWidget',              file: 'src/components/NewsWidget.tsx' },
  music:              { component: 'MusicWidget',             file: 'src/components/MusicWidget.tsx' },
  habitWidget:        { component: 'HabitWidget',             file: 'src/components/HabitWidget.tsx' },
  ambient:            { component: 'AmbientSoundsWidget',     file: 'src/components/AmbientSoundsWidget.tsx' },
  github:             { component: 'GitHubWidget',            file: 'src/components/GitHubWidget.tsx' },
  dictionary:         { component: 'DictionaryWidget',        file: 'src/components/DictionaryWidget.tsx' },
  todoList:           { component: 'TodoListWidget',          file: 'src/components/TodoListWidget.tsx' },
  weatherW:           { component: 'WeatherWidget',           file: 'src/components/WeatherWidget.tsx' },
  unitConverter:      { component: 'UnitConverterWidget',     file: 'src/components/UnitConverterWidget.tsx' },
  passwordGen:        { component: 'PasswordGeneratorWidget', file: 'src/components/PasswordGeneratorWidget.tsx' },
  stickyNotes:        { component: 'StickyNotesWidget',       file: 'src/components/StickyNotesWidget.tsx' },
  flashCards:         { component: 'FlashCardsWidget',        file: 'src/components/FlashCardsWidget.tsx' },
  translation:        { component: 'TranslationWidget',       file: 'src/components/TranslationWidget.tsx' },
  markdown:           { component: 'MarkdownWidget',          file: 'src/components/MarkdownWidget.tsx' },
  snippets:           { component: 'SnippetManagerWidget',    file: 'src/components/SnippetManagerWidget.tsx' },
  ipInfo:             { component: 'IpInfoWidget',            file: 'src/components/IpInfoWidget.tsx' },
  expenses:           { component: 'ExpenseTrackerWidget',    file: 'src/components/ExpenseTrackerWidget.tsx' },
  kanban:             { component: 'KanbanBoardWidget',       file: 'src/components/KanbanBoardWidget.tsx' },
  dailyPlanner:       { component: 'DailyPlannerWidget',      file: 'src/components/DailyPlannerWidget.tsx' },
  countdownTimer:     { component: 'CountdownTimerWidget',    file: 'src/components/CountdownTimerWidget.tsx' },
  rssReader:          { component: 'RSSReaderWidget',         file: 'src/components/RSSReaderWidget.tsx' },
  clipboardHistory:   { component: 'ClipboardHistoryWidget',  file: 'src/components/ClipboardHistoryWidget.tsx' },
  codeEditor:         { component: 'CodeEditorWidget',        file: 'src/components/CodeEditorWidget.tsx' },
  stockTracker:       { component: 'StockTrackerWidget',      file: 'src/components/StockTrackerWidget.tsx' },
  gmailPreview:       { component: 'GmailPreviewWidget',      file: 'src/components/GmailPreviewWidget.tsx' },
  jsonViewer:         { component: 'JSONViewerWidget',        file: 'src/components/JSONViewerWidget.tsx' },
  notificationCenter: { component: 'NotificationCenterWidget', file: 'src/components/NotificationCenterWidget.tsx' },
  terminal:           { component: 'TerminalWidget',          file: 'src/components/TerminalWidget.tsx' },
  weeklyPlanner:      { component: 'WeeklyPlannerWidget',     file: 'src/components/WeeklyPlannerWidget.tsx' },
  commandCenter:      { component: 'CommandCenterWidget',     file: 'src/components/CommandCenterWidget.tsx' },
  programLauncher:    { component: 'ProgramLauncherWidget',   file: 'src/components/ProgramLauncherWidget.tsx' },
};

// Custom board prefixes use the same component files as their base type.
// This resolves "board:abc123" → BookmarksPanel, "note:xyz" → WorkNotes, etc.
function resolveWidgetInfo(widgetId: string): { component: string; file: string } {
  if (WIDGET_REGISTRY[widgetId]) return WIDGET_REGISTRY[widgetId];
  if (widgetId.startsWith('board:'))     return { component: 'BookmarksPanel', file: 'src/components/BookmarksPanel.tsx' };
  if (widgetId.startsWith('note:'))      return { component: 'WorkNotes',      file: 'src/components/WorkNotes.tsx' };
  if (widgetId.startsWith('calendar:'))  return { component: 'MiniCalendar',   file: 'src/components/MiniCalendar.tsx' };
  if (widgetId.startsWith('pomodoro:'))  return { component: 'PomodoroTimer',  file: 'src/components/PomodoroTimer.tsx' };
  if (widgetId.startsWith('habit:'))     return { component: 'HabitWidget',    file: 'src/components/HabitWidget.tsx' };
  return { component: 'Unknown', file: '' };
}

// ─── Context ──────────────────────────────────────────────────────
interface DevModeState {
  isDevMode: boolean;
  toggleDevMode: () => void;
  selectedWidget: string | null;
  setSelectedWidget: (id: string | null) => void;
}

const DevModeContext = createContext<DevModeState>({
  isDevMode: false,
  toggleDevMode: () => {},
  selectedWidget: null,
  setSelectedWidget: () => {},
});

export function useDevMode() { return useContext(DevModeContext); }

// ─── Provider ─────────────────────────────────────────────────────
export function DevModeProvider({ children }: { children: React.ReactNode }) {
  const [isDevMode, setIsDevMode] = useState(false);
  const [selectedWidget, setSelectedWidget] = useState<string | null>(null);

  const toggleDevMode = useCallback(() => {
    setIsDevMode(v => !v);
    setSelectedWidget(null);
  }, []);

  // Keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        toggleDevMode();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleDevMode]);

  // Listen for Command Palette toggle event
  useEffect(() => {
    const handler = () => toggleDevMode();
    window.addEventListener('toggle-dev-mode', handler);
    return () => window.removeEventListener('toggle-dev-mode', handler);
  }, [toggleDevMode]);

  return (
    <DevModeContext.Provider value={{ isDevMode, toggleDevMode, selectedWidget, setSelectedWidget }}>
      {children}
    </DevModeContext.Provider>
  );
}

// ─── Widget Overlay ───────────────────────────────────────────────
// Renders on top of each widget when dev mode is active. Captures all
// pointer events (click, mousedown) to prevent them from reaching the
// widget underneath. Shows an orange dashed border on hover.
export function DevWidgetOverlay({ widgetId }: { widgetId: string }) {
  const { isDevMode, setSelectedWidget, selectedWidget } = useDevMode();
  const [isHovered, setIsHovered] = useState(false);

  if (!isDevMode) return null;

  const info = resolveWidgetInfo(widgetId);
  const isSelected = selectedWidget === widgetId;

  return (
    <div
      className="absolute inset-0 z-50 rounded-2xl transition-all duration-200"
      style={{
        border: isSelected
          ? '2px solid #f97316'
          : isHovered
            ? '2px dashed #f97316'
            : '2px dashed transparent',
        pointerEvents: 'auto',
        cursor: 'crosshair',
        background: isHovered ? 'rgba(249, 115, 22, 0.03)' : 'transparent',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
      onClick={(e) => { e.stopPropagation(); setSelectedWidget(widgetId); }}
    >
      {/* Hover badge — shows widget type + component name */}
      {isHovered && !isSelected && (
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/85 backdrop-blur-sm rounded-lg px-2.5 py-1 pointer-events-none">
          <Code className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] text-orange-400 font-mono font-bold">{info.component}</span>
          <span className="text-[10px] text-gray-500 font-mono">· {widgetId}</span>
        </div>
      )}
    </div>
  );
}

// ─── Inspector Panel ──────────────────────────────────────────────
// Slides up from the bottom when a widget is selected. Shows the
// component name, file path, and action buttons.
export function DevInspectorPanel() {
  const { isDevMode, selectedWidget, setSelectedWidget } = useDevMode();
  const [copied, setCopied] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!isDevMode || !selectedWidget) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedWidget(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isDevMode, selectedWidget, setSelectedWidget]);

  if (!isDevMode || !selectedWidget) return null;

  const info = resolveWidgetInfo(selectedWidget);

  const handleCopyPath = async () => {
    if (!info.file) return;
    try {
      await navigator.clipboard.writeText(info.file);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleOpenInEditor = async () => {
    if (!isTauri || !info.file) return;
    try {
      await openInEditor(info.file);
    } catch (e) {
      console.warn('[DevInspector] Failed to open in editor:', e);
    }
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[200] animate-slide-up"
      style={{ animation: 'slideUp 0.2s ease-out' }}
    >
      <style>{`
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>
      <div className="bg-[#0f1019]/95 backdrop-blur-md border-t border-orange-500/30 shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 py-4">
          {/* Header row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Code className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white font-mono">{info.component}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 font-mono">{selectedWidget}</span>
                </div>
                <p className="text-[11px] text-gray-500 font-mono mt-0.5">{info.file || 'No source file mapped'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedWidget(null)}
              className="p-1.5 rounded-lg hover:bg-white/10 text-gray-500 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isTauri && info.file && (
              <button
                onClick={handleOpenInEditor}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 rounded-xl text-xs font-medium transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open in Editor
              </button>
            )}
            {info.file && (
              <button
                onClick={handleCopyPath}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl text-xs font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Path'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toggle Button ────────────────────────────────────────────────
// Floating button in the bottom-right corner. Shows dev mode status.
export function DevToggleButton() {
  const { isDevMode, toggleDevMode } = useDevMode();

  return (
    <button
      onClick={toggleDevMode}
      className={`fixed bottom-4 right-4 z-[150] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider transition-all duration-300 shadow-lg ${
        isDevMode
          ? 'bg-orange-500 text-white shadow-orange-500/30'
          : 'bg-white/5 text-gray-600 hover:bg-white/10 hover:text-gray-400 shadow-black/20'
      }`}
      title="Toggle Dev Mode (Ctrl+Shift+D)"
    >
      <Code className="w-3 h-3" />
      DEV {isDevMode ? 'ON' : 'OFF'}
    </button>
  );
}
