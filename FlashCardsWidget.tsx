/**
 * FlashCardsWidget - Create, flip, edit, shuffle, and track mastery of
 * flash cards. Supports add/edit forms and a progress bar.
 */
import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: Brain - header icon, replace with any learning/mind icon
// ICON: ChevronLeft - previous card nav, replace with any left arrow icon
// ICON: ChevronRight - next card nav, replace with any right arrow icon
// ICON: Shuffle - randomize card order, replace with any shuffle/random icon
// ICON: Plus - add new card, replace with any "add" icon
// ICON: Edit2 - edit current card, replace with any pencil/edit icon
// ICON: Trash2 - delete card/board, replace with any delete/remove icon
// ICON: RotateCcw - reset progress, replace with any reset/undo icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
import {
  Brain,
  ChevronLeft,
  ChevronRight,
  Shuffle,
  Plus,
  Edit2,
  Trash2,
  RotateCcw,
  MoreHorizontal,
} from 'lucide-react';

interface FlashCard {
  id: string;
  front: string;
  back: string;
  known: boolean;
}

interface FlashCardsWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

const generateId = () => crypto.randomUUID();

export default function FlashCardsWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: FlashCardsWidgetProps) {
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editCardId, setEditCardId] = useState<string | null>(null);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [editFront, setEditFront] = useState('');
  const [editBack, setEditBack] = useState('');

  // Progress tracking: mastered count and percentage
  const totalCards = cards.length;
  const masteredCount = cards.filter((c) => c.known).length;
  const progressPercent = totalCards > 0 ? Math.round((masteredCount / totalCards) * 100) : 0;

  const handleMenuToggle = useCallback(() => {
    setMenuOpen((prev) => {
      const next = !prev;
      onMenuToggle?.(next);
      return next;
    });
  }, [onMenuToggle]);

  const addCard = useCallback(() => {
    if (!newFront.trim() || !newBack.trim()) return;
    setCards((prev) => [
      ...prev,
      { id: generateId(), front: newFront.trim(), back: newBack.trim(), known: false },
    ]);
    setNewFront('');
    setNewBack('');
    setShowAddForm(false);
  }, [newFront, newBack]);

  const deleteCard = useCallback(
    (id: string) => {
      setCards((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (currentIndex >= next.length && next.length > 0) {
          setCurrentIndex(next.length - 1);
        }
        return next;
      });
      setIsFlipped(false);
    },
    [currentIndex]
  );

  const startEdit = useCallback(
    (card: FlashCard) => {
      setEditCardId(card.id);
      setEditFront(card.front);
      setEditBack(card.back);
    },
    []
  );

  const saveEdit = useCallback(() => {
    if (!editCardId || !editFront.trim() || !editBack.trim()) return;
    setCards((prev) =>
      prev.map((c) =>
        c.id === editCardId
          ? { ...c, front: editFront.trim(), back: editBack.trim() }
          : c
      )
    );
    setEditCardId(null);
    setEditFront('');
    setEditBack('');
  }, [editCardId, editFront, editBack]);

  const cancelEdit = useCallback(() => {
    setEditCardId(null);
    setEditFront('');
    setEditBack('');
  }, []);

  const toggleKnown = useCallback((id: string) => {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, known: !c.known } : c)));
  }, []);

  // Fisher-Yates shuffle for randomizing card order
  const shuffleCards = useCallback(() => {
    setCards((prev) => {
      const shuffled = [...prev];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return shuffled;
    });
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const resetProgress = useCallback(() => {
    setCards((prev) => prev.map((c) => ({ ...c, known: false })));
    setCurrentIndex(0);
    setIsFlipped(false);
  }, []);

  const goNext = useCallback(() => {
    if (currentIndex < totalCards - 1) {
      setCurrentIndex((i) => i + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, totalCards]);

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  const currentCard = useMemo(() => cards[currentIndex] ?? null, [cards, currentIndex]);

  return (
    <div className="dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain size={18} className="text-violet-400" />
          <span className="font-semibold text-sm">Flash Cards</span>
          {totalCards > 0 && (
            <span className="text-xs text-white/40 ml-1">
              {masteredCount}/{totalCards} mastered
            </span>
          )}
        </div>
        <div className="relative">
          <button
            onClick={handleMenuToggle}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <MoreHorizontal size={16} className="text-white/50" />
          </button>
          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                transition={{ duration: 0.15 }}
                className={`absolute top-full mt-1 z-50 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl py-1 min-w-[160px] ${
                  alignMenu === 'left' ? 'right-0' : 'left-0'
                }`}
              >
                <button
                  onClick={() => {
                    onDeleteBoard?.();
                    setMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-white/5 transition-colors"
                >
                  <Trash2 size={14} />
                  Delete board
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress bar */}
      {totalCards > 0 && (
        <div className="w-full h-1.5 bg-white/10 rounded-full mb-3 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-full"
            initial={false}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      )}

      {/* Empty state */}
      {totalCards === 0 && !showAddForm && (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
          <Brain size={32} className="text-white/20" />
          <p className="text-sm text-white/40">No flash cards yet</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-500/30 transition-colors"
          >
            <Plus size={14} />
            Add first card
          </button>
        </div>
      )}

      {/* Card display */}
      {totalCards > 0 && currentCard && (
        <>
          <div
            className="flex-1 flex items-center justify-center cursor-pointer mb-3"
            style={{ perspective: '1000px' }}
            onClick={() => setIsFlipped((f) => !f)}
          >
            <div
              className="relative w-full h-[140px] transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Front */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-white text-gray-800 p-4 text-center"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div>
                  {editCardId === currentCard.id ? (
                    <div className="flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <input
                        value={editFront}
                        onChange={(e) => setEditFront(e.target.value)}
                        className="w-full bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="Front"
                        autoFocus
                      />
                      <input
                        value={editBack}
                        onChange={(e) => setEditBack(e.target.value)}
                        className="w-full bg-gray-100 rounded-lg px-3 py-1.5 text-sm text-gray-800 outline-none focus:ring-2 focus:ring-violet-400"
                        placeholder="Back"
                      />
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={saveEdit}
                          className="px-2 py-0.5 bg-violet-500 text-white text-xs rounded-md hover:bg-violet-600 transition-colors"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2 py-0.5 bg-gray-300 text-gray-700 text-xs rounded-md hover:bg-gray-400 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span className="text-sm font-medium leading-relaxed">{currentCard.front}</span>
                  )}
                </div>
              </div>
              {/* Back */}
              <div
                className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100 text-gray-800 p-4 text-center"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
              >
                <span className="text-sm leading-relaxed">{currentCard.back}</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={goPrev}
              disabled={currentIndex === 0}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/50">
                {currentIndex + 1}/{totalCards}
              </span>
              <button
                onClick={() => currentCard && toggleKnown(currentCard.id)}
                className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${
                  currentCard.known
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-white/10 text-white/50 hover:bg-white/15'
                }`}
              >
                {currentCard.known ? 'Know' : "Don't Know"}
              </button>
            </div>
            <button
              onClick={goNext}
              disabled={currentIndex === totalCards - 1}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Card actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => startEdit(currentCard)}
                disabled={editCardId !== null}
                className="p-1 rounded-md hover:bg-white/10 transition-colors disabled:opacity-30"
                title="Edit card"
              >
                <Edit2 size={13} className="text-white/40" />
              </button>
              <button
                onClick={() => deleteCard(currentCard.id)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Delete card"
              >
                <Trash2 size={13} className="text-white/40" />
              </button>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={shuffleCards}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Shuffle"
              >
                <Shuffle size={13} className="text-white/40" />
              </button>
              <button
                onClick={resetProgress}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Reset progress"
              >
                <RotateCcw size={13} className="text-white/40" />
              </button>
              <button
                onClick={() => setShowAddForm((s) => !s)}
                className="p-1 rounded-md hover:bg-white/10 transition-colors"
                title="Add card"
              >
                <Plus size={13} className="text-white/40" />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Show add button when cards exist but add form closed */}
      {totalCards > 0 && !showAddForm && !currentCard && (
        <div className="flex-1 flex items-center justify-center">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-500/20 text-violet-300 rounded-lg text-xs font-medium hover:bg-violet-500/30 transition-colors"
          >
            <Plus size={14} />
            Add card
          </button>
        </div>
      )}

      {/* Add card form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-3 border-t border-white/10 mt-3">
              <p className="text-xs text-white/40 mb-2">New card</p>
              <div className="flex flex-col gap-2">
                <input
                  value={newFront}
                  onChange={(e) => setNewFront(e.target.value)}
                  placeholder="Front text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 transition-colors"
                  autoFocus
                />
                <input
                  value={newBack}
                  onChange={(e) => setNewBack(e.target.value)}
                  placeholder="Back text"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-violet-400/50 transition-colors"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addCard}
                    disabled={!newFront.trim() || !newBack.trim()}
                    className="flex-1 px-3 py-1.5 bg-violet-500 text-white text-xs font-medium rounded-lg hover:bg-violet-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewFront('');
                      setNewBack('');
                    }}
                    className="px-3 py-1.5 bg-white/10 text-white/60 text-xs rounded-lg hover:bg-white/15 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
