// IpInfoWidget — Displays the user's public IP address, geolocation, ISP, timezone, and connection quality.
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wifi, // ICON: Replace with any signal/wifi icon
  Globe, // ICON: Replace with any globe/world icon
  MapPin, // ICON: Replace with any location-pin icon
  Building, // ICON: Replace with any building/ISP icon
  Clock, // ICON: Replace with any clock/timezone icon
  Copy, // ICON: Replace with any clipboard-copy icon
  Check, // ICON: Replace with any success/checkmark icon
  RefreshCw, // ICON: Replace with any refresh/sync icon
  Signal, // ICON: Replace with any signal-bars icon
  MoreHorizontal, // ICON: Replace with any overflow-menu icon
  Trash2 // ICON: Replace with any delete icon
} from 'lucide-react';

interface IpInfo {
  ip: string;
  city: string;
  region: string;
  country_name: string;
  org: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

interface ConnectionInfo {
  effectiveType: string;
  downlink: number;
  rtt: number;
}

interface IpInfoWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function IpInfoWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: IpInfoWidgetProps) {
  // State: IP geolocation data, network info, online status, loading, error
  const [ipInfo, setIpInfo] = useState<IpInfo | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<ConnectionInfo | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Fetches public IP + geolocation from ipapi.co
  const fetchIpInfo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('https://ipapi.co/json/');
      if (!res.ok) throw new Error('Failed to fetch IP info');
      const data: IpInfo = await res.json();
      setIpInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIpInfo();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any).connection;
    if (conn) {
      const updateConnection = () => {
        setConnectionInfo({
          effectiveType: conn.effectiveType,
          downlink: conn.downlink,
          rtt: conn.rtt,
        });
      };
      updateConnection();
      conn.addEventListener('change', updateConnection);
      return () => {
        conn.removeEventListener('change', updateConnection);
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchIpInfo]);

  const handleCopy = async () => {
    if (!ipInfo) return;
    await navigator.clipboard.writeText(ipInfo.ip);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  };

  // Formats downlink speed as Mbps or Kbps
  const formatSpeed = (downlink: number) => {
    if (downlink >= 1) return `${downlink} Mbps`;
    return `${Math.round(downlink * 1000)} Kbps`;
  };

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-400" /> {/* CHANGE: Icon color */}
          <span className="text-sm font-medium text-white/70">Network Status</span> {/* CHANGE: Widget title */}
        </div>
        <div className="flex items-center gap-2">
          {/* Online indicator */}
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.6)]'}`} />
            <span className="text-xs text-white/50">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Refresh */}
          <button
            onClick={fetchIpInfo}
            disabled={loading}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white/50 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={toggleMenu}
              className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4 text-white/50" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-1 z-50 min-w-[160px] bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
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
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete board
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
            <span className="text-sm text-white/40">Fetching network info...</span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Globe className="w-6 h-6 text-red-400/60" />
            <span className="text-sm text-red-400/80">{error}</span>
            <button
              onClick={fetchIpInfo}
              className="text-xs text-white/40 hover:text-white/60 transition-colors underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        ) : ipInfo ? (
          <div className="flex flex-col gap-3">
            {/* IP Address */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-2xl font-bold tracking-tight font-mono">{ipInfo.ip}</span>
              </div>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Copy IP"
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                    >
                      <Copy className="w-4 h-4 text-white/40" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </button>
            </div>

            {/* Location */}
            <div className="flex items-center gap-2 text-white/60">
              <MapPin className="w-3.5 h-3.5 text-emerald-400/70" />
              <span className="text-sm">
                {ipInfo.city}, {ipInfo.region}, {ipInfo.country_name}
              </span>
            </div>

            {/* ISP */}
            <div className="flex items-center gap-2 text-white/60">
              <Building className="w-3.5 h-3.5 text-violet-400/70" />
              <span className="text-sm truncate">{ipInfo.org}</span>
            </div>

            {/* Timezone */}
            <div className="flex items-center gap-2 text-white/60">
              <Clock className="w-3.5 h-3.5 text-amber-400/70" />
              <span className="text-sm">{ipInfo.timezone}</span>
            </div>

            {/* Connection info */}
            {connectionInfo && (
              <div className="mt-1 pt-2 border-t border-white/5 flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Signal className="w-3.5 h-3.5 text-cyan-400/70" />
                  <span className="text-xs text-white/50 uppercase tracking-wide">
                    {connectionInfo.effectiveType}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400/70" />
                  <span className="text-xs text-white/50">
                    {formatSpeed(connectionInfo.downlink)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-white/40">
                    {connectionInfo.rtt}ms RTT
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
