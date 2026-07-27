import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, CheckCircle, X, RefreshCw, AlertCircle } from 'lucide-react';
import {
  isTauri,
  onUpdateAvailable,
  onUpdateDownloadProgress,
  onUpdateDownloaded,
  onUpdateNotAvailable,
  onUpdateError,
} from '../lib/tauri-api';
import type { UnlistenFn } from '@tauri-apps/api/event';

interface UpdateInfo {
  version: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

type BannerState = 'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'not-available' | 'error';

export default function AutoUpdateBanner() {
  const [state, setState] = useState<BannerState>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isTauri) return;

    const unlisteners: Promise<UnlistenFn>[] = [];

    try {
      unlisteners.push(
        onUpdateAvailable((info) => {
          setUpdateInfo(info);
          setState('available');
          setDismissed(false);
        })
      );

      unlisteners.push(
        onUpdateDownloadProgress((progress) => {
          setDownloadProgress(progress);
          setState('downloading');
        })
      );

      unlisteners.push(
        onUpdateDownloaded(() => {
          setState('downloaded');
          setDownloadProgress(null);
        })
      );

      unlisteners.push(
        onUpdateNotAvailable(() => {
          setState('not-available');
          setTimeout(() => setState('idle'), 3000);
        })
      );

      unlisteners.push(
        onUpdateError((msg) => {
          setState('error');
          setErrorMsg(msg || 'Update check failed');
          setTimeout(() => setState('idle'), 4000);
        })
      );
    } catch {
      // Updater plugin not available — silently ignore
    }

    return () => {
      unlisteners.forEach((p) => p.then((unlisten) => unlisten()).catch(() => {}));
    };
  }, []);

  if (!isTauri || dismissed || state === 'idle') return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[90%]"
      >
        <div className="relative backdrop-blur-xl bg-black/60 border border-white/10 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={() => { setDismissed(true); setState('idle'); }}
            className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X size={14} className="text-white/50" />
          </button>

          <div className="flex items-center gap-3">
            {state === 'downloaded' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-emerald-400" />
              </div>
            ) : state === 'downloading' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <RefreshCw size={20} className="text-blue-400 animate-spin" />
              </div>
            ) : state === 'error' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <AlertCircle size={20} className="text-red-400" />
              </div>
            ) : state === 'not-available' ? (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-500/20 flex items-center justify-center">
                <CheckCircle size={20} className="text-gray-400" />
              </div>
            ) : (
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                {state === 'checking' ? (
                  <RefreshCw size={20} className="text-purple-400 animate-spin" />
                ) : (
                  <Download size={20} className="text-purple-400" />
                )}
              </div>
            )}

            <div className="flex-1 min-w-0">
              {state === 'checking' && (
                <>
                  <p className="text-sm font-semibold text-white">Checking for Updates</p>
                  <p className="text-xs text-white/50 mt-0.5">Connecting to update server...</p>
                </>
              )}
              {state === 'available' && (
                <>
                  <p className="text-sm font-semibold text-white">Update Available</p>
                  <p className="text-xs text-white/50 mt-0.5">v{updateInfo?.version} — downloading...</p>
                </>
              )}
              {state === 'downloading' && (
                <>
                  <p className="text-sm font-semibold text-white">Downloading Update</p>
                  <div className="mt-1.5 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${downloadProgress?.percent ?? 0}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40 mt-1">
                    {Math.round(downloadProgress?.percent ?? 0)}%
                  </p>
                </>
              )}
              {state === 'downloaded' && (
                <>
                  <p className="text-sm font-semibold text-white">Update Ready</p>
                  <p className="text-xs text-white/50 mt-0.5">v{updateInfo?.version} — restart to apply</p>
                </>
              )}
              {state === 'not-available' && (
                <>
                  <p className="text-sm font-semibold text-white">Up to Date</p>
                  <p className="text-xs text-white/50 mt-0.5">You're running the latest version</p>
                </>
              )}
              {state === 'error' && (
                <>
                  <p className="text-sm font-semibold text-white">Update Check Failed</p>
                  <p className="text-xs text-white/50 mt-0.5">{errorMsg}</p>
                </>
              )}
            </div>

            {state === 'downloaded' && (
              <button
                onClick={() => window.location.reload()}
                className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-colors"
              >
                Restart
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
