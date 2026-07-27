// GmailPreviewWidget — Real Gmail inbox preview using OAuth token.
// In Electron, user pastes a Gmail API OAuth token into the widget settings.
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, // ICON: Replace with any mail icon
  RefreshCw, // ICON: Replace with any refresh icon
  ExternalLink, // ICON: Replace with any link icon
  Star, // ICON: Replace with any star icon
  Trash2, // ICON: Replace with any delete icon
  MoreHorizontal, // ICON: Replace with any menu icon
  Inbox, // ICON: Replace with any inbox icon
  Send, // ICON: Replace with any send icon
  Loader2, // ICON: Replace with any spinner icon
  AlertCircle, // ICON: Replace with any alert icon
  LogIn, // ICON: Replace with any login icon
} from 'lucide-react';

interface GmailPreviewWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface GmailMessage {
  id: string;
  sender: string;
  senderEmail: string;
  subject: string;
  preview: string;
  time: string;
  read: boolean;
  starred: boolean;
  tab: 'inbox' | 'sent';
  snippet: string;
}

const GMAIL_SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';
const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1';
const REFRESH_INTERVAL = 2 * 60 * 1000;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function extractSender(headers: any[]): { name: string; email: string } {
  const from = headers.find((h: any) => h.name === 'From')?.value || '';
  const match = from.match(/^(.+?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, ''), email: match[2] };
  return { name: from, email: from };
}

function isMessageRead(labels: string[]): boolean {
  return !labels.includes('UNREAD');
}

function isMessageStarred(labels: string[]): boolean {
  return labels.includes('STARRED');
}

function isMessageSent(labels: string[]): boolean {
  return labels.includes('SENT') || labels.includes('TRASH');
}

// Gmail OAuth token storage key
const GMAIL_TOKEN_KEY = 'gmail_oauth_token';

export default function GmailPreviewWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: GmailPreviewWidgetProps) {
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'starred' | 'sent'>('inbox');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const tokenRef = useRef<string | null>(null);

  // Get auth token from localStorage
  const getAuthToken = useCallback((): Promise<string | null> => {
    return new Promise((resolve) => {
      const stored = localStorage.getItem(GMAIL_TOKEN_KEY);
      if (stored) {
        setAuthError('');
        resolve(stored);
      } else {
        setAuthError('Gmail OAuth token not configured. Paste your token below.');
        setShowTokenInput(true);
        resolve(null);
      }
    });
  }, []);

  // Fetch message list from Gmail API
  const fetchMessageList = useCallback(async (token: string, labelIds: string[] = ['INBOX'], maxResults = 25): Promise<string[]> => {
    const params = new URLSearchParams({ maxResults: String(maxResults) });
    if (labelIds.length > 0) params.set('labelIds', labelIds.join(','));
    const res = await fetch(`${GMAIL_API}/users/me/messages/list?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
    const data = await res.json();
    return (data.messages || []).map((m: any) => m.id);
  }, []);

  // Fetch single message details
  const fetchMessage = useCallback(async (token: string, msgId: string): Promise<GmailMessage | null> => {
    try {
      const res = await fetch(`${GMAIL_API}/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const { name, email } = extractSender(data.payload?.headers || []);
      const subject = data.payload?.headers?.find((h: any) => h.name === 'Subject')?.value || '(no subject)';
      const dateStr = data.payload?.headers?.find((h: any) => h.name === 'Date')?.value || '';
      const labels = data.labelIds || [];
      return {
        id: data.id,
        sender: name,
        senderEmail: email,
        subject,
        preview: data.snippet || '',
        time: dateStr ? relativeTime(dateStr) : '',
        read: isMessageRead(labels),
        starred: isMessageStarred(labels),
        tab: isMessageSent(labels) ? 'sent' : 'inbox',
        snippet: data.snippet || '',
      };
    } catch {
      return null;
    }
  }, []);

  // Refresh all messages
  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = tokenRef.current || await getAuthToken();
      if (!token) { setLoading(false); return; }
      tokenRef.current = token;

      // Fetch inbox messages
      const inboxIds = await fetchMessageList(token, ['INBOX'], 20);
      const inboxMsgs = (await Promise.all(inboxIds.map(id => fetchMessage(token, id)))).filter(Boolean) as GmailMessage[];

      // Fetch sent messages
      const sentIds = await fetchMessageList(token, ['SENT'], 10);
      const sentMsgs = (await Promise.all(sentIds.map(id => fetchMessage(token, id)))).filter(Boolean) as GmailMessage[];

      setMessages([...inboxMsgs, ...sentMsgs]);
      setIsAuthenticated(true);
    } catch (e: any) {
      if (e.message?.includes('401') || e.message?.includes('403')) {
        tokenRef.current = null;
        setAuthError('Token expired — click Refresh to re-authenticate');
      } else {
        setError(e.message || 'Failed to fetch emails');
      }
    }
    setLoading(false);
  }, [getAuthToken, fetchMessageList, fetchMessage]);

  // Initial fetch + auto-refresh
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  const toggleStar = (id: string) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, starred: !m.starred } : m));
  };

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  const unreadCount = messages.filter(m => !m.read && m.tab === 'inbox').length;
  const starredCount = messages.filter(m => m.starred).length;
  const filtered = activeTab === 'starred'
    ? messages.filter(m => m.starred)
    : messages.filter(m => m.tab === activeTab);

  // Not authenticated — show setup instructions
  if (!isAuthenticated && showTokenInput) {
    return (
      <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-5 text-white relative overflow-visible z-10">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="w-4 h-4 text-primary-accent" />
          <h3 className="text-sm font-semibold text-primary-accent font-display">Gmail</h3>
        </div>
        <div className="flex flex-col items-center text-center py-4 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-[11px] text-gray-400 max-w-[260px] leading-relaxed">
            Paste your Gmail API OAuth 2.0 token below. Get one from Google Cloud Console with <code>gmail.readonly</code> scope.
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="Paste OAuth token..."
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={() => {
              if (tokenInput.trim()) {
                localStorage.setItem(GMAIL_TOKEN_KEY, tokenInput.trim());
                tokenRef.current = tokenInput.trim();
                setTokenInput('');
                setShowTokenInput(false);
                setAuthError('');
                refresh();
              }
            }}
            disabled={!tokenInput.trim()}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-[11px] font-medium disabled:opacity-40 transition-colors"
          >
            Save Token & Connect
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !error) {
    return (
      <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-5 text-white relative overflow-visible z-10">
        <div className="flex items-center space-x-2 mb-4">
          <Mail className="w-4 h-4 text-primary-accent" />
          <h3 className="text-sm font-semibold text-primary-accent font-display">Gmail</h3>
        </div>
        <div className="flex flex-col items-center text-center py-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
            <Mail className="w-6 h-6 text-blue-400" />
          </div>
          <p className="text-[11px] text-gray-400 max-w-[240px] leading-relaxed">
            Gmail access requires an OAuth token. Click Refresh to configure.
          </p>
          <button
            onClick={() => setShowTokenInput(true)}
            className="px-4 py-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl text-[11px] font-medium transition-colors"
          >
            Setup Gmail
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <Mail className="w-3.5 h-3.5" /> {/* CHANGE: Icon color */}
          <span>Gmail</span> {/* CHANGE: Widget title */}
          {unreadCount > 0 && (
            <span className="bg-red-500/80 text-white px-1.5 py-0.5 rounded-full text-[8px] font-bold ml-1">{unreadCount}</span>
          )}
        </h3>
        <div className="flex items-center space-x-1">
          <button onClick={refresh} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center relative">
            <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
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
                    className={`absolute top-8 w-48 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}
                  >
                    <button
                      onClick={() => { tokenRef.current = null; refresh(); toggleMenu(false); }}
                      className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-white/5 rounded-xl text-[13px] text-gray-300 hover:text-white transition-colors"
                    >
                      <LogIn className="w-4 h-4" />
                      <span>Re-authenticate</span>
                    </button>
                    <button onClick={() => { if (onDeleteBoard) onDeleteBoard(); toggleMenu(false); }} className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                      <span>Delete board</span>
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Auth error banner */}
      {(authError || error) && (
        <div className="mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 flex items-center space-x-2">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span className="truncate">{authError || error}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-1 overflow-x-auto pb-2 mb-2 scrollbar-thin">
        {([
          { key: 'inbox' as const, label: 'Inbox', icon: Inbox, count: unreadCount },
          { key: 'starred' as const, label: 'Starred', icon: Star, count: starredCount },
          { key: 'sent' as const, label: 'Sent', icon: Send, count: null },
        ]).map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-2.5 py-1 rounded-lg text-[10px] font-mono whitespace-nowrap transition-colors flex items-center space-x-1 ${activeTab === tab.key ? 'bg-primary-accent/20 text-primary-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            <tab.icon className="w-3 h-3" />
            <span>{tab.label}</span>
            {tab.count !== null && tab.count > 0 && <span className="bg-primary-accent/30 text-primary-accent px-1 rounded text-[8px]">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="flex flex-col space-y-0.5 max-h-80 overflow-y-auto scrollbar-thin">
        {loading && messages.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mb-2" />
            <span className="text-[10px] font-mono uppercase tracking-widest">Loading Gmail...</span>
          </div>
        ) : !isAuthenticated && !error ? (
          <div className="py-6 flex flex-col items-center justify-center text-gray-500">
            <Mail className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-[10px] font-mono">Connecting to Gmail...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-gray-500">
            <AlertCircle className="w-6 h-6 mb-2 opacity-50" />
            <span className="text-[10px] font-mono">No messages</span>
          </div>
        ) : (
          filtered.map((msg) => (
            <a
              key={msg.id}
              href={`https://mail.google.com/mail/u/0/#inbox/${msg.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col p-2.5 rounded-xl hover:bg-white/5 transition-colors group border border-transparent hover:border-white/5 ${!msg.read ? 'bg-white/[0.02]' : 'opacity-70'}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 flex-1 min-w-0">
                  <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); toggleStar(msg.id); }} className={`shrink-0 transition-colors ${msg.starred ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-400/60'}`}>
                    <Star className="w-3 h-3" fill={msg.starred ? 'currentColor' : 'none'} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] truncate ${!msg.read ? 'font-semibold text-white' : 'text-gray-300'}`}>{msg.sender}</span>
                      <span className="text-[9px] text-gray-500 font-mono shrink-0 ml-2">{msg.time}</span>
                    </div>
                    <p className={`text-[11px] truncate ${!msg.read ? 'text-gray-200 font-medium' : 'text-gray-400'}`}>{msg.subject}</p>
                  </div>
                </div>
                <ExternalLink className="w-3 h-3 text-primary-accent shrink-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className="text-[10px] text-gray-500 mt-1 line-clamp-1 pl-5">{msg.snippet}</p>
            </a>
          ))
        )}
      </div>
    </div>
  );
}
