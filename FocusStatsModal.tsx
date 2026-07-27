import React, { useState } from 'react';
import { X } from 'lucide-react';

interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  timestamp: number;
}

interface FocusStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: FocusSession[];
  onClearHistory: () => void;
}

export default function FocusStatsModal({
  isOpen,
  onClose,
  history,
  onClearHistory,
}: FocusStatsModalProps) {
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [hoveredBar, setHoveredBar] = useState<{ label: string; value: number } | null>(null);

  if (!isOpen) return null;

  // --- CHART DATA GENERATION ---
  const getChartData = () => {
    if (timeRange === 'week') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      // Generate last 7 days ending today
      const result = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayName = days[d.getDay()];
        
        const dayMinutes = history
          .filter((s) => s.date === dateStr)
          .reduce((acc, curr) => acc + curr.minutes, 0);
          
        result.push({
          label: dayName,
          value: dayMinutes,
          fullLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          isCurrent: i === 0,
        });
      }
      return result;
    } else {
      // By months (last 6 months)
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const result = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthLabel = months[d.getMonth()];
        const yearLabel = d.getFullYear().toString().substring(2);
        
        // Filter sessions in this month and year
        const monthMinutes = history
          .filter((s) => {
            const sDate = new Date(s.timestamp);
            return sDate.getMonth() === d.getMonth() && sDate.getFullYear() === d.getFullYear();
          })
          .reduce((acc, curr) => acc + curr.minutes, 0);
          
        result.push({
          label: `${monthLabel} '${yearLabel}`,
          value: monthMinutes,
          fullLabel: `${d.toLocaleString('en-US', { month: 'long' })} ${d.getFullYear()}`,
          isCurrent: i === 0,
        });
      }
      return result;
    }
  };

  const chartData = getChartData();
  const maxValue = Math.max(...chartData.map((d) => d.value), 45); // ensure minimum scale height

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 pt-24 px-4" onClick={onClose}>
      <div 
        className="w-full max-w-sm bg-[#12100f]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl text-white relative"
        id="focus-stats-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-bold text-white">Focus statistics</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toggle */}
        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5 w-fit mb-5">
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-all font-medium ${
              timeRange === 'week' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            This week
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1.5 text-[12px] rounded-md transition-all font-medium ${
              timeRange === 'month' ? 'bg-white/15 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            By months
          </button>
        </div>

        {/* Bar Chart */}
        <div className="h-40 flex items-end justify-between px-1 relative">
          {chartData.map((d, i) => {
            const percentage = maxValue > 0 ? (d.value / maxValue) * 100 : 0;
            const isHovered = hoveredBar?.label === d.label;
            return (
              <div
                key={i}
                className="flex flex-col items-center flex-1 h-full justify-end"
                onMouseEnter={() => setHoveredBar({ label: d.label, value: d.value })}
                onMouseLeave={() => setHoveredBar(null)}
              >
                {isHovered && d.value > 0 && (
                  <span className="text-[10px] text-gray-300 font-mono mb-1">{d.value}m</span>
                )}
                <div className="w-6 md:w-8 flex-1 flex items-end">
                  <div
                    className="w-full bg-[#3a3a3a] hover:bg-[#4a4a4a] rounded-sm transition-all duration-500"
                    style={{ height: d.value > 0 ? `${Math.max(percentage, 4)}%` : '2px' }}
                  />
                </div>
                <span className={`text-[10px] font-mono mt-2 ${d.isCurrent ? 'text-white font-bold' : 'text-gray-500'}`}>
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Clear history link, tucked away since it's destructive */}
        <button
          onClick={() => {
            if (window.confirm('Delete all your completed focus logs? This cannot be undone.')) {
              onClearHistory();
            }
          }}
          className="mt-4 text-[10px] text-gray-600 hover:text-red-400 transition-colors font-mono"
        >
          Clear statistics history
        </button>
      </div>
    </div>
  );
}
