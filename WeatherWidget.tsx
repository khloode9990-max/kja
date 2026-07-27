/**
 * WeatherWidget - Fetches real-time weather from Open-Meteo API based on
 * browser geolocation or city name. Shows temperature, humidity, wind, and condition.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Cloud - fog/cloudy weather, replace with any cloud icon
// ICON: Sun - clear sky weather, replace with any sun icon
// ICON: CloudRain - drizzle/rain weather, replace with any rain icon
// ICON: CloudSnow - snow weather, replace with any snowflake icon
// ICON: CloudLightning - thunderstorm weather, replace with any lightning icon
// ICON: Wind - wind speed stat, replace with any wind/air icon
// ICON: Droplets - humidity stat, replace with any droplet/moisture icon
// ICON: Thermometer - temperature stat, replace with any thermometer icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical or Settings
// ICON: Trash2 - delete board action, replace with any delete icon
// ICON: RefreshCw - manual refresh button, replace with any refresh/sync icon
// ICON: MapPin - location label, replace with any location/pin icon
import {
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Wind,
  Droplets,
  Thermometer,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  MapPin,
} from 'lucide-react';

interface WeatherWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
}

interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
}

// CHANGE: Default fallback city (used when browser geolocation is denied)
const JEDDAH: GeoLocation = { name: 'Jeddah', latitude: 21.5433, longitude: 39.1728, country: 'SA' };

// Maps WMO weather code to display label and icon
function getWeatherInfo(code: number): { label: string; icon: React.ReactNode } {
  const cls = 'w-5 h-5';
  if (code === 0) return { label: 'Clear', icon: <Sun className={cls} /> };
  if (code <= 3) return { label: 'Partly Cloudy', icon: <Cloud className={cls} /> };
  if (code >= 45 && code <= 48) return { label: 'Fog', icon: <Cloud className={cls} /> };
  if (code >= 51 && code <= 57) return { label: 'Drizzle', icon: <CloudRain className={cls} /> };
  if (code >= 61 && code <= 67) return { label: 'Rain', icon: <CloudRain className={cls} /> };
  if (code >= 71 && code <= 77) return { label: 'Snow', icon: <CloudSnow className={cls} /> };
  if (code >= 80 && code <= 82) return { label: 'Rain Showers', icon: <CloudRain className={cls} /> };
  if (code >= 95 && code <= 99) return { label: 'Thunderstorm', icon: <CloudLightning className={cls} /> };
  return { label: 'Unknown', icon: <Cloud className={cls} /> };
}

function formatLocationName(geo: GeoLocation): string {
  return geo.country ? `${geo.name}, ${geo.country}` : geo.name;
}

export default function WeatherWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: WeatherWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [location, setLocation] = useState<GeoLocation>(JEDDAH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchWeather = useCallback(async (geo: GeoLocation, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${geo.latitude}&longitude=${geo.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );
      if (!res.ok) throw new Error('Failed to fetch weather');
      const data = await res.json();
      setWeather({
        temperature: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        windSpeed: data.current.wind_speed_10m,
        humidity: data.current.relative_humidity_2m,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Weather unavailable');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWeather(location, true);
  }, [fetchWeather, location]);

  const resolveAndFetch = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`
      );
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const geo: GeoLocation = {
          name: result.name,
          latitude: result.latitude,
          longitude: result.longitude,
          country: result.country_code,
        };
        setLocation(geo);
        await fetchWeather(geo);
      } else {
        setError(`City "${city}" not found`);
        setLoading(false);
      }
    } catch {
      setError('Geocoding failed');
      setLoading(false);
    }
  }, [fetchWeather]);

  useEffect(() => {
    const tryGeolocation = async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const geo: GeoLocation = {
              name: 'Current Location',
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            };
            setLocation(geo);
            await fetchWeather(geo);
          },
          () => {
            resolveAndFetch(JEDDAH.name);
          },
          { timeout: 5000 }
        );
      } else {
        resolveAndFetch(JEDDAH.name);
      }
    };
    tryGeolocation();
  }, [fetchWeather, resolveAndFetch]);

  // CHANGE: Auto-refresh interval (currently 10 minutes in ms)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      fetchWeather(location, true);
    }, 10 * 60 * 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchWeather, location]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onMenuToggle?.(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen, onMenuToggle]);

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  };

  const weatherInfo = weather ? getWeatherInfo(weather.weatherCode) : null;

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5 text-sm text-white/60">
          <MapPin className="w-3.5 h-3.5" />
          <span className="truncate max-w-[160px]">{formatLocationName(location)}</span>
        </div>
        <div className="relative" ref={menuRef}>
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
                className={`absolute top-full mt-1 z-50 min-w-[160px] rounded-xl bg-[#1a1a2e] border border-white/10 shadow-2xl py-1 ${
                  alignMenu === 'left' ? 'left-0' : 'right-0'
                }`}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    onMenuToggle?.(false);
                    handleRefresh();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-white/5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Refresh
                </button>
                {onDeleteBoard && (
                  <>
                    <div className="my-1 border-t border-white/5" />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onMenuToggle?.(false);
                        onDeleteBoard();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete board
                    </button>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-2">
        {loading && !weather && (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="text-white/40"
          >
            <RefreshCw className="w-6 h-6" />
          </motion.div>
        )}

        {error && (
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button
              onClick={handleRefresh}
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
            >
              Tap to retry
            </button>
          </div>
        )}

        {weather && weatherInfo && (
          <>
            {/* Temperature + Icon */}
            <div className="flex items-center gap-3">
              <span className="text-white/70">{weatherInfo.icon}</span>
              <span className="text-4xl font-light tracking-tight">
                {Math.round(weather.temperature)}°
              </span>
            </div>

            {/* Condition */}
            <p className="text-sm text-white/50">{weatherInfo.label}</p>

            {/* Stats */}
            <div className="flex items-center gap-4 mt-2 text-xs text-white/40">
              <div className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5" />
                <span>{Math.round(weather.temperature)}°C</span>
              </div>
              <div className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5" />
                <span>{weather.humidity}%</span>
              </div>
              <div className="flex items-center gap-1">
                <Wind className="w-3.5 h-3.5" />
                <span>{Math.round(weather.windSpeed)} km/h</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Refresh indicator */}
      {!loading && weather && (
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="absolute bottom-3 right-3 p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-40"
        >
          <RefreshCw
            className={`w-3 h-3 text-white/30 ${refreshing ? 'animate-spin' : ''}`}
          />
        </button>
      )}
    </div>
  );
}
