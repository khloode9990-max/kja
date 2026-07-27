/**
 * PasswordGeneratorWidget - Generates cryptographically random passwords
 * with configurable length and character set options. Shows strength meter.
 */
import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Shield - header icon, replace with any security/lock icon
// ICON: Copy - copy to clipboard button, replace with any clipboard icon
// ICON: RefreshCw - regenerate button, replace with any refresh/sync icon
// ICON: Check - copy success indicator, replace with any checkmark icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board action, replace with any delete icon
import { Shield, Copy, RefreshCw, Check, MoreHorizontal, Trash2 } from 'lucide-react';

interface PasswordGeneratorWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface PasswordOptions {
  uppercase: boolean;
  lowercase: boolean;
  numbers: boolean;
  symbols: boolean;
}

// Strength thresholds based on length + character variety
function getPasswordStrength(password: string): { label: string; level: number; color: string } {
  const len = password.length;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^A-Za-z0-9]/.test(password);

  const variety = [hasUpper, hasLower, hasNumbers, hasSymbols].filter(Boolean).length;

  if (len >= 20 && variety >= 4) return { label: 'Very Strong', level: 4, color: 'bg-green-500' };
  if (len >= 16 && variety >= 3) return { label: 'Strong', level: 3, color: 'bg-yellow-400' };
  if (len >= 10 && variety >= 2) return { label: 'Medium', level: 2, color: 'bg-orange-400' };
  return { label: 'Weak', level: 1, color: 'bg-red-500' };
}

// Generates a random password using crypto.getRandomValues
function generatePassword(length: number, options: PasswordOptions): string {
  const charset: string[] = [];
  if (options.uppercase) charset.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (options.lowercase) charset.push('abcdefghijklmnopqrstuvwxyz');
  if (options.numbers) charset.push('0123456789');
  if (options.symbols) charset.push('!@#$%^&*()_+-=[]{}|;:,.<>?');

  if (charset.length === 0) return '';

  const pool = charset.join('');
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += pool[array[i] % pool.length];
  }
  return password;
}

export default function PasswordGeneratorWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: PasswordGeneratorWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  // CHANGE: Default password length and character options
  const [length, setLength] = useState(16); // CHANGE: default length
  const [options, setOptions] = useState<PasswordOptions>({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: false, // CHANGE: default symbols enabled
  });
  const [password, setPassword] = useState('');
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const doGenerate = useCallback(() => {
    const hasAny = options.uppercase || options.lowercase || options.numbers || options.symbols;
    if (!hasAny) return;
    const pw = generatePassword(length, options);
    setPassword(pw);
    setHistory((prev) => {
      const next = [pw, ...prev.filter((h) => h !== pw)].slice(0, 5);
      return next;
    });
  }, [length, options]);

  useEffect(() => {
    doGenerate();
  }, [doGenerate]);

  useEffect(() => {
    onMenuToggle?.(menuOpen);
  }, [menuOpen, onMenuToggle]);

  const toggleOption = (key: keyof PasswordOptions) => {
    setOptions((prev) => {
      const allOff = Object.values(prev).filter((v) => v).length === 1 && prev[key];
      if (allOff) return prev;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const copyToClipboard = async () => {
    if (!password) return;
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const strength = getPasswordStrength(password);

  const toggleLabels: { key: keyof PasswordOptions; label: string }[] = [
    { key: 'uppercase', label: 'ABC' },
    { key: 'lowercase', label: 'abc' },
    { key: 'numbers', label: '123' },
    { key: 'symbols', label: '#$&' },
  ];

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-400" />
          <span className="text-sm font-semibold tracking-wide">Password Generator</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((p) => !p)}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={16} className="text-gray-400" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-8 z-50 min-w-[160px] rounded-xl bg-gray-900/95 border border-white/10 shadow-2xl backdrop-blur-sm ${
                  alignMenu === 'left' ? 'left-0' : 'right-0'
                }`}
              >
                {onDeleteBoard && (
                  <button
                    onClick={() => {
                      onDeleteBoard();
                      setMenuOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-white/5 rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                    Delete board
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Password display */}
      <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 mb-3 border border-white/5">
        <span
          className="flex-1 font-mono text-sm break-all leading-relaxed select-all"
          style={{ wordBreak: 'break-all' }}
        >
          {password || 'Click generate'}
        </span>
        <button
          onClick={copyToClipboard}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          title="Copy"
        >
          {copied ? (
            <Check size={14} className="text-green-400" />
          ) : (
            <Copy size={14} className="text-gray-400" />
          )}
        </button>
      </div>

      {copied && (
        <motion.span
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="absolute top-[60px] right-6 text-xs text-green-400 font-medium"
        >
          Copied!
        </motion.span>
      )}

      {/* Strength bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider">Strength</span>
          <span className="text-[11px] font-medium text-gray-300">{strength.label}</span>
        </div>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                i <= strength.level ? strength.color : 'bg-white/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Length slider */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-gray-400 uppercase tracking-wider">Length</span>
          <span className="text-sm font-mono text-white/80">{length}</span>
        </div>
        <input
          type="range"
          min={8}
          max={64}
          value={length}
          onChange={(e) => setLength(Number(e.target.value))}
          className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-blue-500
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
            [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110"
        />
      </div>

      {/* Toggle options */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {toggleLabels.map(({ key, label }) => (
          <label
            key={key}
            className={`flex flex-col items-center gap-1 py-1.5 rounded-lg cursor-pointer transition-all text-[11px] ${
              options[key] ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-white/5 text-gray-500 border border-transparent'
            }`}
          >
            <input
              type="checkbox"
              checked={options[key]}
              onChange={() => toggleOption(key)}
              className="sr-only"
            />
            <span className="font-mono text-xs font-semibold">{label}</span>
          </label>
        ))}
      </div>

      {/* Generate button */}
      <button
        onClick={doGenerate}
        className="flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors active:scale-[0.98]"
      >
        <RefreshCw size={14} />
        Generate
      </button>

      {/* History */}
      {history.length > 1 && (
        <div className="mt-3 pt-3 border-t border-white/5">
          <span className="text-[11px] text-gray-500 uppercase tracking-wider block mb-1.5">Recent</span>
          <div className="space-y-1">
            {history.slice(1).map((pw, i) => (
              <div
                key={`${pw}-${i}`}
                className="flex items-center gap-2 text-[11px] text-gray-500 font-mono truncate"
              >
                <span className="truncate flex-1">{pw}</span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(pw);
                  }}
                  className="p-0.5 rounded hover:bg-white/10 transition-colors shrink-0"
                  title="Copy"
                >
                  <Copy size={10} className="text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
