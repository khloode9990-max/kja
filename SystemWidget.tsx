import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, MoreHorizontal, Trash2, Cpu, HardDrive, Wifi, WifiOff, Pencil } from 'lucide-react';
import { isTauri, getSystemInfo } from '../lib/tauri-api';

interface SystemWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function SystemWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: SystemWidgetProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [stats, setStats] = useState<{ cpu: number | null; ram: number | null }>({ cpu: null, ram: null });
  const [systemInfo, setSystemInfo] = useState<{ totalMemoryMb: number; usedMemoryMb: number; hostname: string; os: string } | null>(null);
  const [netInfo, setNetInfo] = useState<{ online: boolean; type?: string; downlinkMbps?: number }>({ online: navigator.onLine });

  const fetchSystemInfo = async () => {
    if (!isTauri) return;
    try {
      const info = await getSystemInfo();
      setStats({ cpu: info.cpuUsage, ram: info.ramUsagePercent });
      setSystemInfo({
        totalMemoryMb: info.totalMemoryMb,
        usedMemoryMb: info.usedMemoryMb,
        hostname: info.hostname,
        os: info.os,
      });
    } catch {
      setStats({ cpu: null, ram: null });
    }
  };

  const sampleNetwork = () => {
    const conn = (navigator as any).connection;
    setNetInfo({
      online: navigator.onLine,
      type: conn?.effectiveType,
      downlinkMbps: conn?.downlink,
    });
  };

  useEffect(() => {
    fetchSystemInfo();
    sampleNetwork();
    const timer = setInterval(() => {
      fetchSystemInfo();
      sampleNetwork();
    }, 10000);
    window.addEventListener('online', sampleNetwork);
    window.addEventListener('offline', sampleNetwork);
    return () => {
      clearInterval(timer);
      window.removeEventListener('online', sampleNetwork);
      window.removeEventListener('offline', sampleNetwork);
    };
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'System Status');

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
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
            onClick={() => { setTitleDraft(title || 'System Status'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>{title || 'System Status'}</span>
          </h3>
        )}
        <div className="flex items-center relative">
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
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
                    onClick={() => {
                      setTitleDraft(title || 'System Status');
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

      <div className="space-y-4">
        {/* CPU */}
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="flex items-center text-gray-400 font-mono"><Cpu className="w-3 h-3 mr-1.5 text-emerald-500" /> CPU Usage</span>
            <span className="font-mono text-emerald-300">{stats.cpu !== null ? `${stats.cpu.toFixed(0)}%` : '...'}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${stats.cpu ?? 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* RAM */}
        <div>
          <div className="flex justify-between text-[11px] mb-1.5">
            <span className="flex items-center text-gray-400 font-mono"><HardDrive className="w-3 h-3 mr-1.5 text-blue-500" /> RAM Usage</span>
            <span className="font-mono text-blue-300">{stats.ram !== null ? `${stats.ram.toFixed(0)}%` : '...'}</span>
          </div>
          <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-blue-500"
              initial={{ width: 0 }}
              animate={{ width: `${stats.ram ?? 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          {systemInfo && (
            <p className="text-[9px] text-gray-500 mt-1">{systemInfo.usedMemoryMb}MB / {systemInfo.totalMemoryMb}MB</p>
          )}
        </div>

        {!isTauri && (
          <p className="text-[9px] text-gray-500 -mt-2">System monitoring requires the Tauri desktop app.</p>
        )}

        {/* Network */}
        <div className="bg-white/5 rounded-xl p-3 flex items-center justify-between mt-2 border border-white/5">
          <div className="flex items-center space-x-2">
            {netInfo.online ? <Wifi className="w-4 h-4 text-purple-400" /> : <WifiOff className="w-4 h-4 text-red-400" />}
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-widest text-gray-500">Network</span>
              <span className="text-[11px] font-mono text-gray-300">{netInfo.online ? 'Online' : 'Offline'}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            {netInfo.type && (
              <span className="text-[10px] font-mono text-purple-300 uppercase">{netInfo.type}</span>
            )}
            {netInfo.downlinkMbps !== undefined ? (
              <span className="text-[10px] font-mono text-pink-300">~{netInfo.downlinkMbps} Mbps est.</span>
            ) : (
              <span className="text-[10px] font-mono text-gray-500">Speed unavailable</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
