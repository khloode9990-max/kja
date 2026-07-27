// ExpenseTrackerWidget — Track expenses by category with totals, breakdown bars, and per-category filtering.
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import {
  DollarSign, // ICON: Replace with any currency icon
  Plus, // ICON: Replace with any add icon
  Trash2, // ICON: Replace with any delete icon
  ShoppingCart, // ICON: Replace with any shopping/bag icon
  Utensils, // ICON: Replace with any food/dining icon
  Car, // ICON: Replace with any transport icon
  FileText, // ICON: Replace with any document/bills icon
  Heart, // ICON: Replace with any health/heart icon
  Music, // ICON: Replace with any entertainment/music icon
  Tag, // ICON: Replace with any tag/label icon
  MoreHorizontal, // ICON: Replace with any overflow-menu icon
  X, // ICON: Replace with any close/cancel icon
  Check, // ICON: Replace with any success/checkmark icon
} from 'lucide-react'

interface Expense {
  id: string
  amount: number
  description: string
  category: string
  date: string
}

interface ExpenseTrackerWidgetProps {
  onDeleteBoard?: () => void
  alignMenu?: 'left' | 'right'
  onMenuToggle?: (isOpen: boolean) => void
}

// CHANGE: Add/remove categories, swap icons, or change colors here
const CATEGORIES = [
  { name: 'Food', icon: Utensils, color: '#f97316' },
  { name: 'Transport', icon: Car, color: '#3b82f6' },
  { name: 'Shopping', icon: ShoppingCart, color: '#ec4899' },
  { name: 'Bills', icon: FileText, color: '#eab308' },
  { name: 'Entertainment', icon: Music, color: '#a855f7' },
  { name: 'Health', icon: Heart, color: '#22c55e' },
  { name: 'Other', icon: Tag, color: '#6b7280' },
]

// Looks up category metadata; falls back to 'Other' if not found
function getCategoryMeta(name: string) {
  return CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1]
}

// CHANGE: Adjust currency symbol or formatting here
function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`
}

// Returns the current month in YYYY-MM format for filtering
function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ExpenseTrackerWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: ExpenseTrackerWidgetProps) {
  // Expense list and UI toggle state
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [menuOpen, setMenuOpen] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)

  // Add-expense form fields
  const [formAmount, setFormAmount] = useState('')
  const [formDescription, setFormDescription] = useState('')
  // CHANGE: Default category pre-selected in the form
  const [formCategory, setFormCategory] = useState('Food')
  const [formDate, setFormDate] = useState(new Date().toISOString().split('T')[0])

  const menuRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
      if (formRef.current && !formRef.current.contains(e.target as Node) && showAddForm) {
        setShowAddForm(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showAddForm])

  useEffect(() => {
    onMenuToggle?.(menuOpen)
  }, [menuOpen, onMenuToggle])

  // Creates an expense from form data and prepends it to the list
  function addExpense() {
    const amount = parseFloat(formAmount)
    if (!amount || amount <= 0 || !formDescription.trim()) return

    const newExpense: Expense = {
      id: crypto.randomUUID(),
      amount,
      description: formDescription.trim(),
      category: formCategory,
      date: formDate,
    }

    setExpenses((prev) => [newExpense, ...prev])
    setFormAmount('')
    setFormDescription('')
    setFormDate(new Date().toISOString().split('T')[0])
    setShowAddForm(false)
  }

  function deleteExpense(id: string) {
    setExpenses((prev) => prev.filter((e) => e.id !== id))
  }

  const filteredExpenses = filterCategory
    ? expenses.filter((e) => e.category === filterCategory)
    : expenses

  // Sum of all expenses
  const totalSpending = expenses.reduce((sum, e) => sum + e.amount, 0)

  const currentMonth = getCurrentMonth()
  const thisMonthSpending = expenses
    .filter((e) => e.date.startsWith(currentMonth))
    .reduce((sum, e) => sum + e.amount, 0)

  // Computes per-category totals for the breakdown bars
  const categoryBreakdown = CATEGORIES.map((cat) => {
    const total = expenses
      .filter((e) => e.category === cat.name)
      .reduce((sum, e) => sum + e.amount, 0)
    return { ...cat, total }
  }).filter((c) => c.total > 0)

  const maxCategoryAmount = Math.max(...categoryBreakdown.map((c) => c.total), 1)

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <DollarSign size={16} className="text-emerald-400" />
          </div>
          <h3 className="font-semibold text-sm">Expense Tracker</h3>
        </div>

        <div className="flex items-center gap-1">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowAddForm((v) => !v)}
            className="w-8 h-8 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 flex items-center justify-center transition-colors"
          >
            {showAddForm ? <X size={14} className="text-emerald-400" /> : <Plus size={14} className="text-emerald-400" />}
          </motion.button>

          <div ref={menuRef} className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setMenuOpen((v) => !v)}
              className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <MoreHorizontal size={14} className="text-gray-400" />
            </motion.button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.15 }}
                  className={`absolute top-full mt-1 z-50 min-w-[160px] bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden ${
                    alignMenu === 'left' ? 'right-0' : 'left-0'
                  }`}
                >
                  {onDeleteBoard && (
                    <button
                      onClick={() => {
                        setMenuOpen(false)
                        onDeleteBoard()
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
      </div>

      {/* Add Expense Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            ref={formRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden mb-3"
          >
            <div className="bg-white/5 rounded-xl p-3 space-y-3 border border-white/5">
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Amount</label>
                  <div className="relative">
                    <DollarSign size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="number"
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-7 pr-2 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50 transition-colors [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="What did you spend on?"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => {
                    const Icon = cat.icon
                    return (
                      <button
                        key={cat.name}
                        onClick={() => setFormCategory(cat.name)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium transition-all ${
                          formCategory === cat.name
                            ? 'ring-1 ring-white/30'
                            : 'bg-white/5 hover:bg-white/10'
                        }`}
                        style={{
                          backgroundColor:
                            formCategory === cat.name ? `${cat.color}25` : undefined,
                          color: formCategory === cat.name ? cat.color : '#9ca3af',
                        }}
                      >
                        <Icon size={11} />
                        {cat.name}
                      </button>
                    )
                  })}
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={addExpense}
                disabled={!formAmount || parseFloat(formAmount) <= 0 || !formDescription.trim()}
                className="w-full py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                <Check size={14} />
                Add Expense
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">Total</div>
          <div className="text-lg font-bold text-emerald-400">{formatCurrency(totalSpending)}</div>
        </div>
        <div className="bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <div className="text-[10px] text-gray-400 uppercase tracking-wider">This Month</div>
          <div className="text-lg font-bold text-white">{formatCurrency(thisMonthSpending)}</div>
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {categoryBreakdown.map((cat) => {
            const Icon = cat.icon
            const pct = (cat.total / maxCategoryAmount) * 100
            return (
              <div key={cat.name} className="flex items-center gap-2">
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cat.color}20` }}
                >
                  <Icon size={10} style={{ color: cat.color }} />
                </div>
                <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                </div>
                <span className="text-[11px] text-gray-400 w-16 text-right tabular-nums">
                  {formatCurrency(cat.total)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* Category Filter */}
      <div className="flex items-center gap-1 mb-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setFilterCategory(null)}
          className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
            filterCategory === null
              ? 'bg-white/15 text-white'
              : 'bg-white/5 text-gray-500 hover:text-gray-300'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.name}
            onClick={() => setFilterCategory(filterCategory === cat.name ? null : cat.name)}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all ${
              filterCategory === cat.name ? 'text-white' : 'bg-white/5 text-gray-500 hover:text-gray-300'
            }`}
            style={{
              backgroundColor:
                filterCategory === cat.name ? `${cat.color}30` : undefined,
            }}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Expense List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <AnimatePresence initial={false}>
          {filteredExpenses.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-8 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center mb-2">
                <DollarSign size={18} className="text-gray-600" />
              </div>
              <p className="text-xs text-gray-500">
                {filterCategory
                  ? `No ${filterCategory.toLowerCase()} expenses yet`
                  : 'No expenses yet'}
              </p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                Click the + button to add one
              </p>
            </motion.div>
          ) : (
            filteredExpenses.map((expense) => {
              const cat = getCategoryMeta(expense.category)
              const Icon = cat.icon
              return (
                <motion.div
                  key={expense.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2.5 bg-white/[0.03] hover:bg-white/[0.06] rounded-xl px-3 py-2.5 border border-white/5 transition-colors group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${cat.color}15` }}
                  >
                    <Icon size={14} style={{ color: cat.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">
                      {expense.description}
                    </div>
                    <div className="text-[11px] text-gray-500">
                      {cat.name} · {expense.date}
                    </div>
                  </div>

                  <div className="text-sm font-semibold text-emerald-400 tabular-nums whitespace-nowrap">
                    {formatCurrency(expense.amount)}
                  </div>

                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => deleteExpense(expense.id)}
                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-red-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={12} className="text-gray-400 group-hover:text-red-400 transition-colors" />
                  </motion.button>
                </motion.div>
              )
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
