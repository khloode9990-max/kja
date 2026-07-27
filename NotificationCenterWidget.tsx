/**
 * NotificationCenterWidget - A notification center with custom reminders,
 * browser notifications, scheduled alerts, and auto-cleanup.
 */
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Bell - header icon, replace with BellRing or similar
// ICON: BellOff - no-permission indicator, replace with ShieldOff
// ICON: Trash2 - delete notification, replace with X or Minus
// ICON: MoreHorizontal - overflow menu trigger, replace with EllipsisVertical
// ICON: Check - mark as read, replace with Eye
// ICON: CheckCheck - mark all as read, replace with CheckCheck
// ICON: Clock - scheduled notification indicator, replace with Timer
// ICON: AlertCircle - error type badge, replace with OctagonAlert
// ICON: Info - info type badge, replace with CircleHelp
// ICON: Settings - sound toggle, replace with Volume2
// ICON: Plus - add notification button, replace with CirclePlus
import { Bell, BellOff, Trash2, MoreHorizontal, Check, CheckCheck, Clock, AlertCircle, Info, Settings, Plus } from 'lucide-react';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  timestamp: number;
  read: boolean;
  scheduledAt?: number;
}

interface NotificationCenterWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: Customize notification type colors
const TYPE_STYLES: Record<NotificationItem['type'], { bg: string; border: string; text: string; label: string }> = {
  info: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', label: 'Info' },       // ICON: Info
  warning: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', label: 'Warning' }, // ICON: AlertTriangle
  success: { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-400', label: 'Success' }, // ICON: CheckCircle
  error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', label: 'Error' },         // ICON: AlertCircle
};

// CHANGE: Auto-cleanup threshold in milliseconds (7 days)
const AUTO_CLEANUP_MS = 7 * 24 * 60 * 60 * 1000;

const STORAGE_KEY = 'notification_center_items';

export default function NotificationCenterWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: NotificationCenterWidgetProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newType, setNewType] = useState<NotificationItem['type']>('info');
  const [newScheduled, setNewScheduled] = useState('');

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setNotifications(JSON.parse(stored));
    } catch { /* ignore parse errors */ }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  // Auto-cleanup read notifications older than 7 days
  const cleanupOld = useCallback(() => {
    const now = Date.now();
    setNotifications((prev) =>
      prev.filter((n) => !(n.read && now - n.timestamp > AUTO_CLEANUP_MS))
    );
  }, []);

  useEffect(() => {
    cleanupOld();
    const interval = setInterval(cleanupOld, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [cleanupOld]);

  // Check browser notification permission
  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermissionGranted(result === 'granted');
    }
  };

  // Fire browser notification for a given item
  const fireBrowserNotification = (item: NotificationItem) => {
    if (!permissionGranted || !('Notification' in window)) return;
    const style = TYPE_STYLES[item.type];
    new Notification(item.title, { body: item.message, icon: undefined, badge: undefined, tag: item.id });
    // CHANGE: Add custom sound playback
    if (soundEnabled) {
      try { new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ==').play().catch(() => {}); } catch { /* noop */ }
    }
  };

  // Schedule a notification
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    notifications.forEach((n) => {
      if (n.scheduledAt && n.scheduledAt > Date.now() && !n.read) {
        const delay = n.scheduledAt - Date.now();
        const timer = setTimeout(() => {
          fireBrowserNotification(n);
          setNotifications((prev) => prev.map((p) => p.id === n.id ? { ...p, scheduledAt: undefined } : p));
        }, delay);
        timers.push(timer);
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [notifications, permissionGranted, soundEnabled]);

  const addNotification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: NotificationItem = {
      id: crypto.randomUUID(),
      title: newTitle.trim(),
      message: newMessage.trim(),
      type: newType,
      timestamp: Date.now(),
      read: false,
      scheduledAt: newScheduled ? new Date(newScheduled).getTime() : undefined,
    };
    setNotifications((prev) => [item, ...prev]);
    if (!item.scheduledAt) fireBrowserNotification(item);
    setNewTitle('');
    setNewMessage('');
    setNewType('info');
    setNewScheduled('');
    setIsAdding(false);
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAll = () => setNotifications([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return `${Math.floor(diff / 86400000)}d ago`;
  };

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <Bell className="w-3.5 h-3.5" /> {/* ICON: Bell */}
          <span>Notification Center</span> {/* CHANGE: Widget title */}
        </h3>
        <div className="flex items-center space-x-1 relative">
          {unreadCount > 0 && (
            <span className="text-[10px] bg-red-500/80 text-white rounded-full px-1.5 py-0.5 font-bold">{unreadCount}</span>
          )}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            <Settings className="w-4 h-4" /> {/* ICON: Settings */}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" /> {/* ICON: Plus */}
          </button>
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" /> {/* ICON: MoreHorizontal */}
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-48 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}
                >
                  {!permissionGranted && 'Notification' in window && (
                    <button onClick={() => { requestPermission(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors">
                      <Bell className="w-4 h-4" /> {/* ICON: Bell */}
                      <span>Enable Browser Notifications</span>
                    </button>
                  )}
                  <button onClick={() => { markAllRead(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/10 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors">
                    <CheckCheck className="w-4 h-4" /> {/* ICON: CheckCheck */}
                    <span>Mark All as Read</span>
                  </button>
                  <button onClick={() => { clearAll(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4" /> {/* ICON: Trash2 */}
                    <span>Clear All Notifications</span>
                  </button>
                  <button onClick={() => { if (onDeleteBoard) onDeleteBoard(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4" /> {/* ICON: Trash2 */}
                    <span>Delete Board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Permission banner */}
      {!permissionGranted && 'Notification' in window && (
        <button onClick={requestPermission} className="w-full mb-3 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[12px] text-gray-400 hover:text-white hover:bg-white/10 transition-all flex items-center space-x-2">
          <BellOff className="w-3.5 h-3.5" /> {/* ICON: BellOff */}
          <span>Click to enable browser notifications</span>
        </button>
      )}

      {/* Add form */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={addNotification}
            className="mb-3 space-y-2 overflow-hidden"
          >
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Notification title..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-primary-accent/50 transition-colors" />
            <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Message (optional)..." className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white placeholder-gray-500 focus:outline-none focus:border-primary-accent/50 transition-colors" />
            <div className="flex items-center space-x-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value as NotificationItem['type'])} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary-accent/50 transition-colors appearance-none">
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
              <input type="datetime-local" value={newScheduled} onChange={(e) => setNewScheduled(e.target.value)} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[13px] text-white focus:outline-none focus:border-primary-accent/50 transition-colors [color-scheme:dark]" />
            </div>
            <div className="flex items-center space-x-2">
              <button type="submit" className="flex-1 bg-primary-accent/20 hover:bg-primary-accent/30 border border-primary-accent/30 text-primary-accent rounded-xl px-3 py-2 text-[13px] font-medium transition-colors">
                {newScheduled ? 'Schedule' : 'Add'} {/* CHANGE: Button text for scheduled vs instant */}
              </button>
              <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white rounded-xl text-[13px] transition-colors">
                Cancel
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Notification list */}
      <div className="flex flex-col space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
        <AnimatePresence>
          {notifications.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-8 text-gray-500">
              <Bell className="w-8 h-8 mb-2 opacity-30" /> {/* ICON: Bell */}
              <p className="text-[13px]">No notifications</p>
              <p className="text-[11px] text-gray-600 mt-1">Click + to add one</p>
            </motion.div>
          )}
          {notifications.map((n) => {
            const style = TYPE_STYLES[n.type];
            return (
              <motion.div
                key={n.id}
                layout
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`relative p-3 rounded-xl border transition-all ${style.bg} ${style.border} ${n.read ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-[11px] font-semibold uppercase tracking-wide ${style.text}`}>{style.label}</span>
                      {n.scheduledAt && n.scheduledAt > Date.now() && (
                        <span className="flex items-center text-[10px] text-gray-500">
                          <Clock className="w-3 h-3 mr-0.5" /> {/* ICON: Clock */}
                          Scheduled
                        </span>
                      )}
                      {!n.read && <span className="w-1.5 h-1.5 bg-primary-accent rounded-full" />}
                    </div>
                    <p className="text-[13px] font-medium text-white truncate">{n.title}</p>
                    {n.message && <p className="text-[11px] text-gray-400 mt-0.5 truncate">{n.message}</p>}
                    <p className="text-[10px] text-gray-600 mt-1">{formatTime(n.timestamp)}</p>
                  </div>
                  <div className="flex items-center space-x-1 ml-2 shrink-0">
                    {!n.read && (
                      <button onClick={() => markRead(n.id)} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-green-400 transition-colors" title="Mark as read">
                        <Check className="w-3.5 h-3.5" /> {/* ICON: Check */}
                      </button>
                    )}
                    <button onClick={() => deleteNotification(n.id)} className="p-1 hover:bg-white/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" /> {/* ICON: Trash2 */}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
