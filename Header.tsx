import React, { useState, useEffect } from 'react';
import { Search, Plus, Edit2, X, Cloud, CloudSun, Sun, CloudRain, Wind, Droplets, Gauge, Eye, Thermometer, Settings } from 'lucide-react';
import { WeatherData, DashboardSettings } from '../types';

interface HeaderProps {
  focusMinutesToday: number;
  searchEngine: 'google' | 'bing' | 'duckduckgo';
  weather: WeatherData;
  weatherDetails: {
    feelsLike?: number;
    humidity?: number;
    windSpeed?: number;
    pressure?: number;
    visibility?: number;
    description?: string;
  } | null;
  onUpdateWeather: (weather: WeatherData) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  tabs: string[];
  onAddTab: () => void;
  onUpdateSettings: (settings: Partial<DashboardSettings>) => void;
  settings: DashboardSettings;
  onOpenStats?: () => void;
}

export default function Header({
  focusMinutesToday,
  searchEngine,
  weather,
  weatherDetails,
  onUpdateWeather,
  activeTab,
  setActiveTab,
  tabs,
  onAddTab,
  onUpdateSettings,
  settings,
  onOpenStats,
}: HeaderProps) {
  const [timeStr, setTimeStr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [isEditingConfig, setIsEditingConfig] = useState(false);
  const [editCity, setEditCity] = useState(settings.city || weather.city);
  const [editApiKey, setEditApiKey] = useState(settings.weatherApiKey || '');

  // Keep clock updated in the requested format: "FRI, JUL 17 9:19 PM"
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
      const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const date = now.getDate();
      
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12; // key 12 instead of 0
      
      setTimeStr(`${dayName}, ${monthName} ${date}   ${hours}:${minutes} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    // Advanced auto URL detection
    const isUrl = /^https?:\/\//i.test(query) || 
                  /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}(:\d+)?(\/.*)?$/i.test(query);

    if (isUrl) {
      let targetUrl = query;
      if (!/^https?:\/\//i.test(targetUrl)) {
        targetUrl = `https://${targetUrl}`;
      }
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else {
      let searchUrl = '';
      if (searchEngine === 'google') {
        searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      } else if (searchEngine === 'bing') {
        searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
      } else if (searchEngine === 'duckduckgo') {
        searchUrl = `https://duckduckgo.com/?q=${encodeURIComponent(query)}`;
      }
      window.open(searchUrl, '_blank', 'noopener,noreferrer');
    }
    setSearchQuery('');
  };

  const handleConfigSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      city: editCity.trim(),
      weatherApiKey: editApiKey.trim(),
    });
    setIsEditingConfig(false);
  };

  // Select appropriate weather icon
  const getWeatherIcon = () => {
    const temp = weather.temp;
    if (temp > 30) return <Sun className="w-5 h-5 text-amber-400" />;
    if (temp > 20) return <CloudSun className="w-5 h-5 text-gray-300" />;
    if (temp > 10) return <Cloud className="w-5 h-5 text-blue-200" />;
    return <CloudRain className="w-5 h-5 text-blue-400" />;
  };


  return (
    <header className="w-full flex items-center justify-between px-8 py-4 select-none" id="dashboard-header">
      {/* Tabs */}
      <div className="flex items-center space-x-1 bg-[#221c21]/90 backdrop-blur-xl rounded-[20px] p-1.5 shadow-xl border border-white/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 text-[15px] font-bold rounded-[16px] transition-all duration-300 ${
              activeTab === tab
                ? 'bg-primary-accent text-white shadow-md shadow-black/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            {tab}
          </button>
        ))}
        <button
          onClick={onAddTab}
          className="p-2.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 rounded-[16px] transition-all duration-300 mx-1"
          title="Add new space"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Search Bar (togglable via Sidebar > Widgets > Enable Search) */}
      {(settings.showSearchBar ?? true) ? (
        <form
          id="dashboard-header-search-form"
          onSubmit={handleSearchSubmit}
          className="relative flex items-center w-full max-w-lg mx-8"
        >
          <div className="absolute left-4 text-gray-400 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search with ${searchEngine.toUpperCase()}...`}
            className="w-full pl-11 pr-12 py-2.5 bg-black/20 hover:bg-black/25 focus:bg-black/35 text-white placeholder-gray-400 text-sm rounded-full border border-white/5 focus:border-white/15 outline-none transition-all duration-300 backdrop-blur-md"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-12 text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <div className="absolute right-4 flex items-center">
            {searchEngine === 'google' && (
              <span className="text-xs font-bold bg-gradient-to-r from-blue-400 via-red-400 to-amber-400 bg-clip-text text-transparent">G</span>
            )}
            {searchEngine === 'duckduckgo' && <span className="text-xs font-bold text-primary-accent">DDG</span>}
            {searchEngine === 'bing' && <span className="text-xs font-bold text-blue-500">B</span>}
          </div>
        </form>
      ) : (
        <div className="flex-1 mx-8" />
      )}

      {/* Stats, Weather, Clock */}
      <div className="flex items-center space-x-6 text-white font-sans text-xs">
        {/* Weather Indicator */}
        <div className="relative group">
          <div
            onClick={() => {
              setIsPopupOpen(!isPopupOpen);
              setIsEditingConfig(false);
            }}
            className={`flex flex-col items-end cursor-pointer bg-black/10 hover:bg-black/25 px-3 py-1.5 rounded-xl transition-all duration-300 border backdrop-blur-sm ${
              isPopupOpen ? 'border-primary-accent/40 bg-black/25' : 'border-transparent'
            }`}
            title="Click for detailed weather popup"
          >
            <span className="text-[10px] uppercase tracking-widest text-gray-400 flex items-center space-x-1">
              <span>{weather.city}</span>
              <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </span>
            <div className="flex items-center space-x-1.5 mt-0.5">
              {getWeatherIcon()}
              <span className="font-mono text-sm font-semibold">{weather.temp}°C</span>
            </div>
          </div>

          {/* Gorgeous Detailed Weather Popup */}
          {isPopupOpen && (
            <div className="absolute top-16 right-0 w-72 bg-[#161211]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4 text-white shadow-2xl z-50 space-y-3">
              <div className="flex items-center justify-between pb-1 border-b border-white/5">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary-accent">
                  Weather Forecast
                </h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setEditCity(settings.city || weather.city);
                      setEditApiKey(settings.weatherApiKey || '');
                      setIsEditingConfig(!isEditingConfig);
                    }}
                    className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Weather Settings"
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsPopupOpen(false)}
                    className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {isEditingConfig ? (
                <form onSubmit={handleConfigSave} className="space-y-2.5 text-xs text-left">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">City Name</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white outline-none focus:border-white/20"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-gray-400 mb-0.5">OpenWeather API Key</label>
                    <input
                      type="password"
                      value={editApiKey}
                      onChange={(e) => setEditApiKey(e.target.value)}
                      placeholder="Paste API key..."
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="flex justify-end space-x-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsEditingConfig(false)}
                      className="px-2 py-0.5 text-[10px] rounded text-gray-400 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-2.5 py-0.5 text-[10px] bg-white/10 text-white rounded border border-white/10 hover:bg-white/20"
                    >
                      Save
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-left">
                  {/* Main Conditions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white leading-tight">{weather.city}</h3>
                      <p className="text-[11px] text-gray-400 capitalize">{weatherDetails?.description || weather.condition || 'Clear Sky'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getWeatherIcon()}
                      <span className="text-xl font-mono font-bold">{weather.temp}°C</span>
                    </div>
                  </div>

                  {/* Extended Details Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-2 text-gray-300">
                    <div className="flex items-center space-x-1.5 p-1.5 bg-white/5 rounded-lg">
                      <Thermometer className="w-3.5 h-3.5 text-primary-accent" />
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase">Feels Like</span>
                        <span className="font-semibold text-white">{weatherDetails?.feelsLike ?? weather.temp}°C</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 p-1.5 bg-white/5 rounded-lg">
                      <Droplets className="w-3.5 h-3.5 text-blue-300" />
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase">Humidity</span>
                        <span className="font-semibold text-white">{weatherDetails?.humidity ?? 45}%</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 p-1.5 bg-white/5 rounded-lg">
                      <Wind className="w-3.5 h-3.5 text-teal-300" />
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase">Wind</span>
                        <span className="font-semibold text-white">{weatherDetails?.windSpeed ?? 3.4} m/s</span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 p-1.5 bg-white/5 rounded-lg">
                      <Gauge className="w-3.5 h-3.5 text-amber-300" />
                      <div>
                        <span className="block text-[8px] text-gray-500 uppercase">Pressure</span>
                        <span className="font-semibold text-white">{weatherDetails?.pressure ?? 1012} hPa</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 p-1.5 bg-white/5 rounded-lg text-gray-300 font-mono text-[10px]">
                    <Eye className="w-3.5 h-3.5 text-purple-300" />
                    <div className="flex-1 flex justify-between items-center pr-1">
                      <span className="text-[8px] text-gray-500 uppercase">Visibility</span>
                      <span className="font-semibold text-white">{weatherDetails?.visibility ?? 10} km</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Focus Score */}
        <button
          onClick={() => onOpenStats?.()}
          className="flex flex-col items-end bg-black/10 hover:bg-black/20 px-3 py-1.5 rounded-xl border border-transparent backdrop-blur-sm transition-colors cursor-pointer"
          title="View focus stats"
        >
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Focus Today</span>
          <span className="font-mono text-sm font-semibold mt-0.5 text-primary-accent">
            {focusMinutesToday}m
          </span>
        </button>

        {/* Dynamic Live Date & Time */}
        <div className="flex flex-col items-end bg-black/10 px-3 py-1.5 rounded-xl border border-transparent backdrop-blur-sm">
          <span className="text-[10px] uppercase tracking-widest text-gray-400">Current Time</span>
          <span className="font-mono text-sm font-semibold mt-0.5 tracking-wider text-white">
            {timeStr || 'FRI, JUL 17   9:19 PM'}
          </span>
        </div>
      </div>
    </header>
  );
}
