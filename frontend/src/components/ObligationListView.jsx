import React, { useState } from 'react';
import PaymentModal from './PaymentModal';
import EventModal from './EventModal';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function ObligationListView({
  cycles = [],
  onMarkPaid,
  currencySymbol = '₹',
  activeTheme,
}) {
  const [selectedCycle, setSelectedCycle] = useState(null);

  // Independent Accordion States
  const [isOverdueOpen, setIsOverdueOpen] = useState(true); // Default to open for visibility
  const [isThisWeekOpen, setIsThisWeekOpen] = useState(false);
  const [isNextWeekOpen, setIsNextWeekOpen] = useState(false);

  if (!cycles || cycles.length === 0) {
    return (
      <div className={`p-8 text-center text-xs ${activeTheme?.subText || 'text-gray-400'}`}>
        All clear for now! 🎉 Take a deep breath and enjoy your day.
      </div>
    );
  }

  const formatDueTime = (timeStr) => {
    if (!timeStr || timeStr === 'No Time') return '';
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return timeStr;
    const suffix = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 === 0 ? 12 : h % 12;
    return `${String(formattedHour).padStart(2, '0')}:${minutes} ${suffix}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // --- DATE BOUNDARY UPDATES ---
  // More explicit date calculations for improved accuracy.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  // This Week Calculation (Strictly Sunday to Saturday)
  const startOfThisWeek = new Date(todayStart);
  startOfThisWeek.setDate(todayStart.getDate() - todayStart.getDay()); // .getDay() is 0 for Sunday, 6 for Saturday

  const endOfThisWeek = new Date(startOfThisWeek);
  endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
  endOfThisWeek.setHours(23, 59, 59, 999);

  // Next Week Calculation (Strictly Sunday to Saturday)
  const startOfNextWeek = new Date(endOfThisWeek);
  startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
  startOfNextWeek.setHours(0, 0, 0, 0);

  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);
  // --- END OF DATE BOUNDARY UPDATES ---

  // --- SORTING FUNCTION UPDATES ---
  // Generic time sort for most sections
  const sortByTime = (a, b) => new Date(a.due_timestamp || a.due_date) - new Date(b.due_timestamp || b.due_date);

  // Advanced sort for Overdue section as requested
  const sortOverdueItems = (a, b) => {
    const dateA = new Date(a.due_date);
    const dateB = new Date(b.due_date);
    if (dateA < dateB) return -1;
    if (dateA > dateB) return 1;

    // Dates are equal, sort by time (handle missing time)
    const timeA = a.reminder_time || a.due_time || '';
    const timeB = b.reminder_time || b.due_time || '';
    if (timeA < timeB) return -1;
    if (timeA > timeB) return 1;

    // Times are equal, sort by name
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;

    // Names are equal, sort by amount (descending)
    return Number(b.expected_amount || 0) - Number(a.expected_amount || 0);
  };
  // --- END OF SORTING FUNCTION UPDATES ---

  // Filter and sort items into buckets
  const overdueItems = cycles.filter(item => {
    if (!item.due_date) return false;
    return new Date(item.due_date) < todayStart;
  }).sort(sortOverdueItems); // Using the new advanced sort

  const todayItems = cycles.filter(item => {
    if (!item.due_date) return false;
    const d = new Date(item.due_date);
    return d.getTime() >= todayStart.getTime() && d.getTime() < tomorrowStart.getTime();
  }).sort(sortByTime);

  const tomorrowItems = cycles.filter(item => {
    if (!item.due_date) return false;
    const d = new Date(item.due_date);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowStart.getDate() + 1);
    return d.getTime() >= tomorrowStart.getTime() && d.getTime() < tomorrowEnd.getTime();
  }).sort(sortByTime);

  const thisWeekItems = cycles.filter(item => {
    if (!item.due_date) return false;
    const d = new Date(item.due_date);
    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setDate(tomorrowStart.getDate() + 1);
    return d.getTime() >= tomorrowEnd.getTime() && d.getTime() <= endOfThisWeek.getTime();
  }).sort(sortByTime);

  const nextWeekItems = cycles.filter(item => {
    if (!item.due_date) return false;
    const d = new Date(item.due_date);
    return d >= startOfNextWeek && d <= endOfNextWeek;
  }).sort(sortByTime);

  const renderRow = (item, showDate = false) => {
    const isEvent = item.type === 'event' || Number(item.expected_amount) === 0;
    const rawTime = item.reminder_time || item.due_time;
    const formattedTime = formatDueTime(rawTime);
    const dateLabel = showDate ? formatDate(item.due_date) : '';

    return (
      <div
        key={item.id}
        className="flex items-center justify-between py-2.5 px-1 border-b border-zinc-800/20 last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors group"
      >
        <div className="flex items-center gap-2.5 min-w-0 pr-2">
          {dateLabel && (
            <span className={`text-xs font-mono font-semibold shrink-0 ${activeTheme?.subText || 'text-gray-400'}`}>
              {dateLabel}
            </span>
          )}
          {dateLabel && <span className={activeTheme?.subText || 'text-gray-400'}>•</span>}

          {formattedTime && (
            <span className={`text-xs font-mono shrink-0 ${activeTheme?.subText || 'text-gray-400'}`}>
              {formattedTime}
            </span>
          )}
          {formattedTime && <span className={activeTheme?.subText || 'text-gray-400'}>•</span>}

          <h3 className="font-medium text-xs sm:text-sm truncate">{item.name}</h3>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <span className="text-xs font-bold">
            {!isEvent
              ? `${currencySymbol}${Number(item.expected_amount || 0).toLocaleString('en-IN')}`
              : 'Event'}
          </span>

          {/* --- CHECKBOX STYLING UPDATE --- */}
          <input
            type="checkbox"
            onChange={() => setSelectedCycle(item)}
            className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 bg-white dark:bg-zinc-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer transition-transform active:scale-90"
            title="Mark as done"
          />
          {/* --- END OF CHECKBOX STYLING UPDATE --- */}
        </div>
      </div>
    );
  };

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 1. OVERDUE SECTION (Now uses advanced sorting) */}
      {overdueItems.length > 0 && (
        <div>
          <button
            onClick={() => setIsOverdueOpen(!isOverdueOpen)}
            className="w-full flex items-center justify-between py-2 text-left font-bold text-red-400 text-xs tracking-wider uppercase hover:opacity-80 transition-opacity"
          >
            <span>⚠️ Overdue ({overdueItems.length})</span>
            <span>{isOverdueOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>

          {isOverdueOpen && (
            <div className="pl-2 space-y-1 mt-1 border-l-2 border-red-500/30">
              {overdueItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {/* Other sections remain unchanged */}
      <div className="space-y-2">
        {todayItems.length > 0 && (
          <div className="space-y-1">
            <h2 className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 px-1 mb-1">
              Today
            </h2>
            {todayItems.map((item) => renderRow(item, false))}
          </div>
        )}

        {tomorrowItems.length > 0 && (
          <div className="pt-3">
            <div className="flex items-center gap-3 my-3">
              <div className="h-px bg-zinc-700/30 flex-1" />
              <span className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme?.subText || 'text-gray-400'}`}>
                Tomorrow
              </span>
              <div className="h-px bg-zinc-700/30 flex-1" />
            </div>
            {tomorrowItems.map((item) => renderRow(item, false))}
          </div>
        )}

        {todayItems.length === 0 && tomorrowItems.length === 0 && overdueItems.length === 0 && (
          <div className="p-8 text-center text-xs text-zinc-500">
            No immediate reminders for today or tomorrow. Enjoy the breathing room! 🌿
          </div>
        )}
      </div>

      {thisWeekItems.length > 0 && (
        <div>
          <button
            onClick={() => setIsThisWeekOpen(!isThisWeekOpen)}
            className={`w-full flex items-center justify-between py-2 text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'} hover:opacity-80 transition-opacity`}
          >
            <span>📅 Rest of This Week ({thisWeekItems.length})</span>
            <span>{isThisWeekOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>

          {isThisWeekOpen && (
            <div className="pl-2 space-y-1 mt-1 border-l-2 border-zinc-700/30">
              {thisWeekItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {/* 4. NEXT WEEK SECTION (Now uses corrected date logic) */}
      {nextWeekItems.length > 0 && (
        <div>
          <button
            onClick={() => setIsNextWeekOpen(!isNextWeekOpen)}
            className={`w-full flex items-center justify-between py-2 text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'} hover:opacity-80 transition-opacity`}
          >
            <span>📅 Next Week ({nextWeekItems.length})</span>
            <span>{isNextWeekOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>

          {isNextWeekOpen && (
            <div className="pl-2 space-y-1 mt-1 border-l-2 border-zinc-700/30">
              {nextWeekItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {/* Standard Payment / Event Modal */}
      {selectedCycle && (
        isMonetary ? (
          <PaymentModal
            isOpen={Boolean(selectedCycle)}
            cycle={selectedCycle}
            activeTheme={activeTheme}
            currencySymbol={currencySymbol}
            onClose={() => setSelectedCycle(null)}
            onConfirmPayment={async (cycleId, paymentData) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(cycleId, paymentData.amount_paid, paymentData.notes);
              setSelectedCycle(null);
            }}
          />
        ) : (
          <EventModal
            isOpen={Boolean(selectedCycle)}
            eventItem={selectedCycle}
            activeTheme={activeTheme}
            onClose={() => setSelectedCycle(null)}
            onConfirm={async (status = 'completed') => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(selectedCycle.id, status, status);
              setSelectedCycle(null);
            }}
          />
        )
      )}
    </div>
  );
}