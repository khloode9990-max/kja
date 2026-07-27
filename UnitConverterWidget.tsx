/**
 * UnitConverterWidget - Converts values between common unit categories
 * (Length, Weight, Temperature, Volume, Speed, Data) with a swap button.
 */
import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: ArrowRightLeft - converter header and swap button, replace with any arrows/swap icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board action, replace with any delete icon
import { ArrowRightLeft, MoreHorizontal, Trash2 } from 'lucide-react';

interface UnitConverterWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

type Category = 'Length' | 'Weight' | 'Temperature' | 'Volume' | 'Speed' | 'Data';

interface UnitDef {
  label: string;
  factor: number;
}

interface CategoryDef {
  units: UnitDef[];
  convert?: (value: number, from: string, to: string) => number;
}

// CHANGE: Edit categories, units, and conversion factors here
const categories: Record<Category, CategoryDef> = {
  Length: {
    units: [
      { label: 'mm', factor: 0.001 },
      { label: 'cm', factor: 0.01 },
      { label: 'm', factor: 1 },
      { label: 'km', factor: 1000 },
      { label: 'in', factor: 0.0254 },
      { label: 'ft', factor: 0.3048 },
      { label: 'yd', factor: 0.9144 },
      { label: 'mi', factor: 1609.344 },
    ],
  },
  Weight: {
    units: [
      { label: 'mg', factor: 0.000001 },
      { label: 'g', factor: 0.001 },
      { label: 'kg', factor: 1 },
      { label: 'lb', factor: 0.453592 },
      { label: 'oz', factor: 0.0283495 },
    ],
  },
  Temperature: {
    units: [
      { label: '°C', factor: 1 },
      { label: '°F', factor: 1 },
      { label: 'K', factor: 1 },
    ],
    convert: (value: number, from: string, to: string): number => {
      let celsius: number;
      if (from === '°C') celsius = value;
      else if (from === '°F') celsius = (value - 32) * (5 / 9);
      else celsius = value - 273.15;

      if (to === '°C') return celsius;
      if (to === '°F') return celsius * (9 / 5) + 32;
      return celsius + 273.15;
    },
  },
  Volume: {
    units: [
      { label: 'ml', factor: 0.001 },
      { label: 'L', factor: 1 },
      { label: 'gal', factor: 3.78541 },
      { label: 'cup', factor: 0.236588 },
      { label: 'fl oz', factor: 0.0295735 },
    ],
  },
  Speed: {
    units: [
      { label: 'km/h', factor: 1 },
      { label: 'mph', factor: 1.60934 },
      { label: 'm/s', factor: 3.6 },
      { label: 'knots', factor: 1.852 },
    ],
  },
  Data: {
    units: [
      { label: 'B', factor: 1 },
      { label: 'KB', factor: 1024 },
      { label: 'MB', factor: 1048576 },
      { label: 'GB', factor: 1073741824 },
      { label: 'TB', factor: 1099511627776 },
    ],
  },
};

const categoryOrder: Category[] = ['Length', 'Weight', 'Temperature', 'Volume', 'Speed', 'Data'];

// Core conversion logic: factor-based or custom function (Temperature)
function convertValue(category: Category, value: number, from: string, to: string): number {
  const cat = categories[category];
  if (cat.convert) return cat.convert(value, from, to);
  const fromUnit = cat.units.find((u) => u.label === from);
  const toUnit = cat.units.find((u) => u.label === to);
  if (!fromUnit || !toUnit) return value;
  const baseValue = value * fromUnit.factor;
  return baseValue / toUnit.factor;
}

export default function UnitConverterWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: UnitConverterWidgetProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<Category>('Length');
  const [fromUnit, setFromUnit] = useState('mm');
  const [toUnit, setToUnit] = useState('m');
  const [inputValue, setInputValue] = useState('1');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);

  const fromDropdownRef = useRef<HTMLDivElement>(null);
  const toDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const units = categories[activeCategory].units;

  useEffect(() => {
    setFromUnit(units[0].label);
    setToUnit(units.length > 1 ? units[1].label : units[0].label);
    setInputValue('1');
  }, [activeCategory]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(e.target as Node)) {
        setShowFromDropdown(false);
      }
      if (toDropdownRef.current && !toDropdownRef.current.contains(e.target as Node)) {
        setShowToDropdown(false);
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        onMenuToggle?.(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onMenuToggle]);

  const numericInput = parseFloat(inputValue) || 0;

  const result = useMemo(() => {
    return convertValue(activeCategory, numericInput, fromUnit, toUnit);
  }, [activeCategory, numericInput, fromUnit, toUnit]);

  const formatResult = (val: number): string => {
    if (Number.isInteger(val)) return val.toString();
    const abs = Math.abs(val);
    if (abs >= 1000000 || (abs < 0.001 && abs > 0)) return val.toExponential(4);
    return parseFloat(val.toPrecision(8)).toString();
  };

  const handleSwap = () => {
    setFromUnit(toUnit);
    setToUnit(fromUnit);
  };

  const toggleMenu = () => {
    const next = !menuOpen;
    setMenuOpen(next);
    onMenuToggle?.(next);
  };

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
            <ArrowRightLeft size={16} className="text-white/80" />
          </div>
          <h3 className="text-sm font-semibold text-white/90">Unit Converter</h3>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            onClick={toggleMenu}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={16} className="text-white/60" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1 z-50 w-44 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
                  alignMenu === 'left' ? 'left-0' : 'right-0'
                }`}
              >
                {onDeleteBoard && (
                  <button
                    onClick={() => {
                      onDeleteBoard();
                      setMenuOpen(false);
                      onMenuToggle?.(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-400 hover:bg-white/5 transition-colors"
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

      {/* Category Tabs */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {categoryOrder.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-2.5 py-1 text-xs rounded-lg transition-all duration-200 ${
              activeCategory === cat
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/40 hover:text-white/70 hover:bg-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Conversion Area */}
      <div className="flex flex-col gap-3 flex-1">
        {/* From */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={fromDropdownRef}>
            <button
              onClick={() => {
                setShowFromDropdown(!showFromDropdown);
                setShowToDropdown(false);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors min-w-[70px] justify-between"
            >
              <span>{fromUnit}</span>
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {showFromDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[80px]"
                >
                  {units.map((u) => (
                    <button
                      key={u.label}
                      onClick={() => {
                        setFromUnit(u.label);
                        setShowFromDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                        fromUnit === u.label ? 'text-white bg-white/10' : 'text-white/70'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/25 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            placeholder="0"
          />
        </div>

        {/* Swap Button */}
        <div className="flex justify-center">
          <motion.button
            onClick={handleSwap}
            whileTap={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 flex items-center justify-center transition-colors"
          >
            <ArrowRightLeft size={14} className="text-white/60 rotate-90" />
          </motion.button>
        </div>

        {/* To */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={toDropdownRef}>
            <button
              onClick={() => {
                setShowToDropdown(!showToDropdown);
                setShowFromDropdown(false);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors min-w-[70px] justify-between"
            >
              <span>{toUnit}</span>
              <svg className="w-3 h-3 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <AnimatePresence>
              {showToDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute top-full left-0 mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[80px]"
                >
                  {units.map((u) => (
                    <button
                      key={u.label}
                      onClick={() => {
                        setToUnit(u.label);
                        setShowToDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 transition-colors ${
                        toUnit === u.label ? 'text-white bg-white/10' : 'text-white/70'
                      }`}
                    >
                      {u.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white/90 min-h-[38px] flex items-center font-mono">
            {formatResult(result)}
          </div>
        </div>
      </div>
    </div>
  );
}
