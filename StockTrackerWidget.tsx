// StockTrackerWidget - Tracks stocks and crypto with live prices, sparklines, portfolio tracking, and persistence.
// Fetches from CoinGecko (crypto) and Yahoo Finance via CORS proxy (stocks), falls back to mock data.
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: TrendingUp - positive price indicator; replace with ArrowUpRight
// ICON: TrendingDown - negative price indicator; replace with ArrowDownRight
// ICON: Plus - add ticker action; replace with CirclePlus
// ICON: Trash2 - remove ticker / delete board; replace with X
// ICON: MoreHorizontal - context menu trigger; replace with EllipsisVertical
// ICON: RefreshCw - refresh prices; replace with RotateCw
// ICON: DollarSign - portfolio value header; replace with Wallet
// ICON: BarChart3 - chart/stats indicator; replace with Activity
// ICON: Search - search/add ticker input; replace with magnifying-glass variant
import { TrendingUp, TrendingDown, Plus, Trash2, MoreHorizontal, RefreshCw, DollarSign, BarChart3, Search } from 'lucide-react';
import { proxyFetch } from '../lib/tauri-api';

interface StockTrackerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface TickerEntry { symbol: string; name: string; type: 'stock' | 'crypto'; coingeckoId?: string; }
interface PriceData { price: number; change24h: number; sparkline: number[]; }

const STORAGE_KEY = 'stock_tracker_data';
type SortKey = 'name' | 'price' | 'change';

// CHANGE: Edit default watchlist to add/remove pre-configured tickers
const DEFAULT_WATCHLIST: TickerEntry[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', type: 'stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock' },
  { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', coingeckoId: 'bitcoin' },
  { symbol: 'ETH', name: 'Ethereum', type: 'crypto', coingeckoId: 'ethereum' },
];

const MOCK_PRICES: Record<string, PriceData> = {
  AAPL: { price: 189.50, change24h: 1.23, sparkline: [185, 186, 188, 187, 189, 190, 189] },
  GOOGL: { price: 141.80, change24h: -0.54, sparkline: [143, 142, 141, 140, 142, 141, 141] },
  MSFT: { price: 378.90, change24h: 0.87, sparkline: [375, 376, 378, 377, 379, 380, 378] },
  TSLA: { price: 248.20, change24h: -2.15, sparkline: [255, 253, 250, 249, 248, 247, 248] },
  BTC: { price: 67500, change24h: 3.42, sparkline: [64000, 65000, 66000, 65500, 67000, 68000, 67500] },
  ETH: { price: 3450, change24h: 1.89, sparkline: [3300, 3350, 3400, 3380, 3420, 3480, 3450] },
};

// CHANGE: Adjustable refresh interval in milliseconds
const REFRESH_INTERVAL = 60000;

const SUGGESTED: TickerEntry[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corp.', type: 'stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock' },
  { symbol: 'SOL', name: 'Solana', type: 'crypto', coingeckoId: 'solana' },
  { symbol: 'META', name: 'Meta Platforms', type: 'stock' },
  { symbol: 'DOGE', name: 'Dogecoin', type: 'crypto', coingeckoId: 'dogecoin' },
  { symbol: 'XRP', name: 'Ripple', type: 'crypto', coingeckoId: 'ripple' },
];

function renderSparkline(points: number[], isPositive: boolean) {
  if (!points || points.length < 2) return null;
  const min = Math.min(...points), max = Math.max(...points), range = max - min || 1;
  const step = 60 / (points.length - 1);
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${20 - ((p - min) / range) * 20}`).join(' ');
  return (
    <svg width={60} height={20} className="opacity-60">
      <path d={d} fill="none" stroke={isPositive ? '#4ade80' : '#f87171'} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function StockTrackerWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: StockTrackerWidgetProps) {
  const [watchlist, setWatchlist] = useState<TickerEntry[]>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).watchlist || DEFAULT_WATCHLIST; } catch {} return DEFAULT_WATCHLIST;
  });
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    try { const s = localStorage.getItem(STORAGE_KEY); if (s) return JSON.parse(s).quantities || {}; } catch {} return {};
  });
  const [priceData, setPriceData] = useState<Record<string, PriceData>>(MOCK_PRICES);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editQtySymbol, setEditQtySymbol] = useState<string | null>(null);
  const [qtyInput, setQtyInput] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('name');

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ watchlist, quantities })); } catch {}
  }, [watchlist, quantities]);

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const newPrices: Record<string, PriceData> = {};
      const cryptos = watchlist.filter(t => t.type === 'crypto' && t.coingeckoId);
      const stocks = watchlist.filter(t => t.type === 'stock');

      if (cryptos.length > 0) {
        try {
          const ids = cryptos.map(c => c.coingeckoId).join(',');
          const raw = await proxyFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
          const json = JSON.parse(raw);
          cryptos.forEach(c => {
            const d = json[c.coingeckoId!];
            if (d) {
              const prev = priceData[c.symbol];
              newPrices[c.symbol] = {
                price: d.usd, change24h: d.usd_24h_change || 0,
                sparkline: prev ? [...prev.sparkline.slice(1), d.usd] : [d.usd * 0.97, d.usd * 0.985, d.usd * 0.99, d.usd * 0.995, d.usd * 1.005, d.usd, d.usd],
              };
            }
          });
        } catch {}
      }

      for (const stock of stocks) {
        try {
          const raw = await proxyFetch(`https://query1.finance.yahoo.com/v8/finance/chart/${stock.symbol}?interval=1d&range=7d`);
          const json = JSON.parse(raw);
          const meta = json.chart?.result?.[0]?.meta;
          if (meta) {
            const price = meta.regularMarketPrice;
            const prevClose = meta.previousClose || meta.chartPreviousClose;
            const change = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;
            const closes = (json.chart.result[0].indicators?.quote?.[0]?.close || []).filter((v: number | null) => v != null).slice(-7);
            if (closes.length > 0) newPrices[stock.symbol] = { price, change24h: change, sparkline: closes };
          }
        } catch {}
      }

      setPriceData(prev => {
        const merged = { ...prev, ...newPrices };
        watchlist.forEach(t => { if (!merged[t.symbol] && MOCK_PRICES[t.symbol]) merged[t.symbol] = MOCK_PRICES[t.symbol]; });
        return merged;
      });
    } catch (e) { console.error('Price fetch error:', e); } finally { setLoading(false); }
  }, [watchlist]);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const toggleMenu = (val: boolean) => { setIsMenuOpen(val); onMenuToggle?.(val); };
  const addTicker = (entry: TickerEntry) => {
    if (!watchlist.find(t => t.symbol === entry.symbol)) setWatchlist(prev => [...prev, entry]);
    setShowAddDialog(false); setSearchQuery('');
  };
  const removeTicker = (symbol: string) => {
    setWatchlist(prev => prev.filter(t => t.symbol !== symbol));
    setQuantities(prev => { const n = { ...prev }; delete n[symbol]; return n; });
  };
  const saveQuantity = () => {
    if (!editQtySymbol) return;
    const val = parseFloat(qtyInput);
    setQuantities(prev => { const n = { ...prev }; if (isNaN(val) || val <= 0) delete n[editQtySymbol]; else n[editQtySymbol] = val; return n; });
    setEditQtySymbol(null); setQtyInput('');
  };

  const totalPortfolio = watchlist.reduce((sum, t) => {
    const qty = quantities[t.symbol], p = priceData[t.symbol]?.price;
    return sum + (qty && p ? qty * p : 0);
  }, 0);

  const sorted = [...watchlist].sort((a, b) => {
    if (sortBy === 'price') return (priceData[b.symbol]?.price || 0) - (priceData[a.symbol]?.price || 0);
    if (sortBy === 'change') return (priceData[b.symbol]?.change24h || 0) - (priceData[a.symbol]?.change24h || 0);
    return a.name.localeCompare(b.name);
  });

  const filtered = SUGGESTED.filter(t =>
    !watchlist.find(w => w.symbol === t.symbol) &&
    (t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col h-auto relative overflow-visible ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <BarChart3 className="w-4 h-4" /> {/* ICON: BarChart3 - header icon */}
          <span>Stock & Crypto Tracker</span>
        </h3>
        <div className="flex items-center space-x-1 relative">
          <button onClick={() => setShowAddDialog(!showAddDialog)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Add ticker">
            <Plus className="w-3.5 h-3.5" /> {/* ICON: Plus - add button */}
          </button>
          <button onClick={fetchPrices} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors" title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> {/* ICON: RefreshCw - refresh button */}
          </button>
          <button onClick={() => toggleMenu(!isMenuOpen)} className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
            <MoreHorizontal className="w-4 h-4" /> {/* ICON: MoreHorizontal - menu trigger */}
          </button>
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div initial={{ opacity: 0, scale: 0.95, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-48 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${alignMenu === 'left' ? 'left-0' : 'right-0'}`}>
                  {(['name', 'price', 'change'] as SortKey[]).map(key => (
                    <button key={key} onClick={() => { setSortBy(key); toggleMenu(false); }}
                      className={`w-full flex items-center px-3 py-2 rounded-xl text-[13px] transition-colors ${sortBy === key ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                      Sort by {key === 'change' ? '24h change' : key} {/* CHANGE: Sort options */}
                    </button>
                  ))}
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={() => { onDeleteBoard?.(); toggleMenu(false); }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" /> {/* ICON: Trash2 - delete board */}
                    <span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Portfolio total */}
      {totalPortfolio > 0 && (
        <div className="flex items-center justify-between mb-2 px-1 py-2 bg-white/5 rounded-xl border border-white/5">
          <span className="text-[10px] uppercase tracking-widest text-gray-500 font-mono flex items-center">
            <DollarSign className="w-3 h-3 mr-1" /> Portfolio {/* ICON: DollarSign - portfolio label */}
          </span>
          <span className="text-sm font-bold text-green-400 font-mono">${totalPortfolio.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-1 px-1">
        <span className="text-[9px] uppercase tracking-widest text-gray-600 font-mono">{watchlist.length} tickers</span>
        <span className="text-[9px] uppercase tracking-widest text-gray-600 font-mono">by {sortBy === 'change' ? '24h' : sortBy}</span>
      </div>

      {/* Add ticker dialog */}
      <AnimatePresence>
        {showAddDialog && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-2 overflow-hidden">
            <div className="p-2 bg-white/5 rounded-xl border border-white/5">
              <div className="flex items-center bg-white/5 rounded-lg px-2 mb-2">
                <Search className="w-3.5 h-3.5 text-gray-500 mr-2" /> {/* ICON: Search - search input icon */}
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search stock or crypto..." autoFocus className="w-full bg-transparent py-1.5 text-xs text-white placeholder-gray-500 outline-none" />
              </div>
              <div className="max-h-32 overflow-y-auto space-y-0.5">
                {filtered.length === 0 && <p className="text-[10px] text-gray-500 text-center py-2">No results. Try AAPL, NVDA, SOL...</p>}
                {filtered.map(t => (
                  <button key={t.symbol} onClick={() => addTicker(t)} className="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors text-left">
                    <div>
                      <span className="text-[12px] font-semibold text-gray-200">{t.symbol}</span>
                      <span className="text-[10px] text-gray-500 ml-2">{t.name}</span>
                    </div>
                    <Plus className="w-3 h-3 text-gray-500" />
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ticker list */}
      <div className="flex flex-col space-y-1.5 mt-1">
        {sorted.length === 0 ? (
          <div className="py-6 text-center">
            <BarChart3 className="w-8 h-8 text-gray-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No tickers added.</p>
            <p className="text-[10px] text-gray-600 mt-1">Click + to track stocks & crypto.</p>
          </div>
        ) : sorted.map(ticker => {
          const data = priceData[ticker.symbol];
          const price = data?.price, change = data?.change24h;
          const isPositive = change != null && change >= 0;
          const qty = quantities[ticker.symbol];
          return (
            <motion.div key={ticker.symbol} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="flex items-center justify-between p-2.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/8 transition-colors group">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${ticker.type === 'crypto' ? 'bg-orange-500/15 text-orange-400' : 'bg-blue-500/15 text-blue-400'}`}>
                  {ticker.symbol.slice(0, 2)}
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[12px] font-semibold text-gray-200 truncate">{ticker.name}</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest">{ticker.symbol}</span>
                    <span className={`text-[8px] px-1 py-0.5 rounded ${ticker.type === 'crypto' ? 'bg-orange-500/10 text-orange-400' : 'bg-blue-500/10 text-blue-400'}`}>{ticker.type}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {data && renderSparkline(data.sparkline, isPositive)}
                <div className="flex flex-col items-end">
                  <span className="font-mono font-bold text-[13px] text-white">
                    {price ? (price >= 1000 ? `$${price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `$${price.toFixed(2)}`) : '---'}
                  </span>
                  {change != null && (
                    <span className={`text-[10px] flex items-center font-mono ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                      {isPositive ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />} {/* ICON: TrendingUp/TrendingDown - change indicators */}
                      {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  )}
                </div>
                {qty != null && qty > 0 && <span className="text-[9px] text-gray-500 font-mono bg-white/5 px-1.5 py-0.5 rounded">×{qty}</span>}
                <div className="flex items-center space-x-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditQtySymbol(editQtySymbol === ticker.symbol ? null : ticker.symbol); setQtyInput(qty?.toString() || ''); }}
                    className="p-0.5 hover:bg-white/10 rounded text-gray-500 hover:text-white transition-colors" title="Set quantity">
                    <DollarSign className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeTicker(ticker.symbol)} className="p-0.5 hover:bg-red-500/10 rounded text-gray-500 hover:text-red-400 transition-colors" title="Remove">
                    <Trash2 className="w-3 h-3" /> {/* ICON: Trash2 - remove ticker */}
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Inline quantity editor */}
      <AnimatePresence>
        {editQtySymbol && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden mt-1.5">
            <div className="flex items-center space-x-2 p-2 bg-white/5 rounded-xl border border-white/5">
              <span className="text-[10px] text-gray-500 uppercase">{editQtySymbol} qty:</span>
              <input type="number" value={qtyInput} onChange={e => setQtyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveQuantity()}
                className="flex-1 bg-white/5 rounded px-2 py-1 text-xs text-white outline-none border border-white/10 focus:border-white/20" placeholder="0" min="0" step="0.1" autoFocus />
              <button onClick={saveQuantity} className="text-[10px] px-2 py-1 bg-white/10 hover:bg-white/15 rounded text-white transition-colors">Save</button>
              <button onClick={() => { setEditQtySymbol(null); setQtyInput(''); }} className="text-[10px] px-2 py-1 text-gray-500 hover:text-white transition-colors">Cancel</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
