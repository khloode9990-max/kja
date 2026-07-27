import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bitcoin, MoreHorizontal, Trash2, TrendingUp, TrendingDown, RefreshCcw, Pencil } from 'lucide-react';

interface CryptoWidgetProps {
  title?: string;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const COINS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' }
];

export default function CryptoWidget({ title, onRenameBoard, onDeleteBoard, alignMenu = 'right', onMenuToggle }: CryptoWidgetProps) {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const ids = COINS.map(c => c.id).join(',');
      const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const int = setInterval(fetchData, 60000);
    return () => clearInterval(int);
  }, []);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || 'Crypto Markets');

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
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
            onClick={() => { setTitleDraft(title || 'Crypto Markets'); setIsEditingTitle(true); }}
            className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            <Bitcoin className="w-4 h-4" />
            <span>{title || 'Crypto Markets'}</span>
          </h3>
        )}
        <div className="flex items-center space-x-1 relative">
          <button onClick={fetchData} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <RefreshCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
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
                      setTitleDraft(title || 'Crypto Markets');
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

      <div className="flex flex-col space-y-2 mt-1">
        {COINS.map(coin => {
          const coinData = data[coin.id] || {};
          const price = coinData.usd;
          const change = coinData.usd_24h_change;
          const isUp = change >= 0;

          return (
            <div key={coin.id} className="flex items-center justify-between p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-gray-300">
                  {coin.symbol}
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-200">{coin.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">{coin.symbol}</span>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono font-bold text-white">
                  {price ? `$${price.toLocaleString()}` : '---'}
                </span>
                {change !== undefined && (
                  <span className={`text-[10px] flex items-center font-mono mt-0.5 ${isUp ? 'text-green-400' : 'text-red-400'}`}>
                    {isUp ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                    {Math.abs(change).toFixed(2)}%
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
