import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Plus, Trash2, Calendar as CalendarIcon, X, Check, MoreHorizontal } from 'lucide-react';
import { CalendarEvent } from '../types';

interface MiniCalendarProps {
  title?: string;
  events: CalendarEvent[];
  onSaveEvents: (events: CalendarEvent[]) => void;
  onRenameBoard?: (newTitle: string) => void;
  onDeleteBoard?: () => void;
  onDeleteWidget?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

export default function MiniCalendar({ title, events, onSaveEvents, onRenameBoard, onDeleteBoard, onDeleteWidget, alignMenu = 'right', onMenuToggle }: MiniCalendarProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(title || '');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventText, setNewEventText] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = (val: boolean) => {
    setIsMenuOpen(val);
    onMenuToggle?.(val);
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();


  // Month Names (Capitalized like "July 2026")
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create dates array
  const dates: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    dates.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dates.push(d);
  }

  const navigatePrev = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const navigateNext = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (dayNum: number) => {
    const today = new Date();
    // In metadata context, the current date is July 17, 2026.
    // We also want to support highlighted default date or real calendar today.
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === dayNum
    );
  };

  const isSelected = (dayNum: number) => {
    return (
      selectedDate.getFullYear() === year &&
      selectedDate.getMonth() === month &&
      selectedDate.getDate() === dayNum
    );
  };

  const getDateString = (dayNum: number) => {
    const mm = (month + 1).toString().padStart(2, '0');
    const dd = dayNum.toString().padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const getEventsForDate = (dayNum: number) => {
    const dStr = getDateString(dayNum);
    return events.filter((e) => e.dateStr === dStr);
  };

  const handleDayClick = (dayNum: number) => {
    setSelectedDate(new Date(year, month, dayNum));
    setIsAddingEvent(false);
  };

  const handleAddEventSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventText.trim()) return;

    const formattedDate = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;

    const newEvent: CalendarEvent = {
      id: crypto.randomUUID(),
      dateStr: formattedDate,
      title: newEventText.trim(),
    };

    onSaveEvents([...events, newEvent]);
    setNewEventText('');
    setIsAddingEvent(false);
  };

  const handleDeleteEvent = (id: string) => {
    onSaveEvents(events.filter((e) => e.id !== id));
  };

  const selectedDateStr = `${selectedDate.getFullYear()}-${(selectedDate.getMonth() + 1)
    .toString()
    .padStart(2, '0')}-${selectedDate.getDate().toString().padStart(2, '0')}`;
  const selectedDayEvents = events.filter((e) => e.dateStr === selectedDateStr);

  return (
    <div className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[260px] h-fit pb-4 overflow-visible relative ${isMenuOpen ? 'z-50' : 'z-10 hover:z-20'}`}>
      {title !== undefined && (
        isEditingTitle ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim());
              setIsEditingTitle(false);
            }}
            className="mb-1.5"
          >
            <input
              type="text"
              autoFocus
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => { if (titleDraft.trim() && onRenameBoard) onRenameBoard(titleDraft.trim()); setIsEditingTitle(false); }}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white outline-none"
            />
          </form>
        ) : (
          <h4
            onClick={() => { setTitleDraft(title); setIsEditingTitle(true); }}
            className="text-[11px] font-bold text-primary-accent uppercase tracking-wide mb-1.5 cursor-text hover:opacity-80"
            title="Click to rename"
          >
            {title}
          </h4>
        )
      )}
      {/* Calendar Grid Section */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold tracking-wide font-display text-gray-200 dashboard-text-weight">
          {monthNames[month]} {year}
        </h3>
        <div className="flex space-x-0.5 relative">
          <button
            onClick={navigatePrev}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={navigateNext}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-300"
            title="Board options"
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Board Options Popup */}
          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${
                    alignMenu === 'left' ? 'left-0' : 'right-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBoard?.();
                      onDeleteWidget?.();
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

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 text-center text-[9px] uppercase font-semibold text-gray-400 mb-1 font-display">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1 gap-x-0.5 text-center font-mono text-[10px]">
        {dates.map((dayNum, idx) => {
          if (dayNum === null) {
            return <div key={`empty-${idx}`} />;
          }

          const hasEvents = getEventsForDate(dayNum).length > 0;
          const isCurrentDay = isToday(dayNum);
          const activeHighlight = isSelected(dayNum) || isCurrentDay;

          return (
            <button
              key={`day-${dayNum}`}
              onClick={() => handleDayClick(dayNum)}
              className={`relative py-1 flex flex-col items-center justify-center rounded-[8px] transition-all hover:bg-white/10 ${
                activeHighlight
                  ? 'bg-primary-accent text-white font-bold shadow-md'
                  : 'text-gray-300'
              }`}
            >
              <span>{dayNum}</span>
              {/* Event Dot */}
              {hasEvents && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${activeHighlight ? 'bg-primary-accent' : 'bg-primary-accent/80'}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Interactive Planner Overlay/Draw section */}
      <div className="mt-2 pt-2 border-t border-white/5 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono flex items-center space-x-1">
            <CalendarIcon className="w-2.5 h-2.5 text-gray-500" />
            <span>
              {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} Planner
            </span>
          </span>
          {!isAddingEvent && (
            <button
              onClick={() => setIsAddingEvent(true)}
              className="text-[9px] text-primary-accent hover:text-white flex items-center space-x-0.5 hover:underline"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Event adding input */}
        {isAddingEvent && (
          <form onSubmit={handleAddEventSubmit} className="flex items-center space-x-1 mb-1.5 flex-shrink-0">
            <input
              type="text"
              value={newEventText}
              onChange={(e) => setNewEventText(e.target.value)}
              placeholder="e.g. Call Sara"
              className="flex-1 bg-white/5 hover:bg-white/10 px-2 py-0.5 text-[11px] rounded border border-white/5 focus:border-white/10 outline-none text-white placeholder-gray-500"
              autoFocus
            />
            <button type="submit" className="p-0.5 text-green-400 hover:bg-white/5 rounded">
              <Check className="w-3 h-3" />
            </button>
            <button type="button" onClick={() => setIsAddingEvent(false)} className="p-0.5 text-red-400 hover:bg-white/5 rounded">
              <X className="w-3 h-3" />
            </button>
          </form>
        )}

        {/* Selected Date's events */}
        <div className="space-y-1 mt-1">
          {selectedDayEvents.length === 0 ? (
            <p className="text-[9px] text-gray-500 font-mono italic py-1 text-center">
              No tasks scheduled.
            </p>
          ) : (
            selectedDayEvents.map((evt) => (
              <div key={evt.id} className="flex items-center justify-between p-1 bg-white/5 rounded text-[10px] hover:bg-white/10 group transition-colors">
                <span className="truncate flex-1 text-gray-200">{evt.title}</span>
                <button
                  onClick={() => handleDeleteEvent(evt.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-400 transition-all rounded"
                  title="Remove event"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
