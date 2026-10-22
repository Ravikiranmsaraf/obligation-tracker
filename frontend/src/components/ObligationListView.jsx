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

  // Accordion States
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [isThisWeekOpen, setIsThisWeekOpen] = useState(false);
  const [isNextWeekOpen, setIsNextWeekOpen] = useState(false);
  const [isNextMonthOpen, setIsNextMonthOpen] = useState(false);

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

  // -------------------------------------------------------------
  // ROBUST UTC-NORMALIZED DATE BOUNDARIES
  // -------------------------------------------------------------
  const now = new Date();

  // Today (Local calendar bounds)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  // Tomorrow
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Current Calendar Week (Sunday to Saturday)
  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - now.getDay());
  currentSunday.setHours(0, 0, 0, 0);

  const currentSaturdayEnd = new Date(currentSunday);
  currentSaturdayEnd.setDate(currentSunday.getDate() + 6);
  currentSaturdayEnd.setHours(23, 59, 59, 999);

  // Next Calendar Week
  const nextSundayStart = new Date(currentSunday);
  nextSundayStart.setDate(currentSunday.getDate() + 7);
  nextSundayStart.setHours(0, 0, 0, 0);

  const nextSaturdayEnd = new Date(nextSundayStart);
  nextSaturdayEnd.setDate(nextSundayStart.getDate() + 6);
  nextSaturdayEnd.setHours(23, 59, 59, 999);

  // Robust Next Calendar Month Bounds (UTC aligned to prevent timezone shift drops)
  const currentUtcYear = now.getUTCFullYear();
  const currentUtcMonth = now.getUTCMonth(); // 0-11
  
  let targetYear = currentUtcYear;
  let targetMonth = currentUtcMonth + 1;
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }

  const nextMonthStart = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
  // End of next month is day 0 of the month following next month
  const nextMonthEnd = new Date(Date.UTC(targetYear, targetMonth + 1, 0, 23, 59, 59, 999));

  const sortByTime = (a, b) => new Date(a.due_timestamp || a.due_date) - new Date(b.due_timestamp || b.due_date);

  // -------------------------------------------------------------
  // BUCKETING LOGIC
  // -------------------------------------------------------------

  const overdueItems = cycles
    .filter((item) => item.due_date && new Date(item.due_date) < todayStart)
    .sort(sortByTime);

  const todayItems = cycles
    .filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= todayStart && d <= todayEnd;
    })
    .sort(sortByTime);

  const tomorrowItems = cycles
    .filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= tomorrowStart && d <= tomorrowEnd;
    })
    .sort(sortByTime);

  const thisWeekItems = cycles
    .filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d > tomorrowEnd && d <= currentSaturdayEnd;
    })
    .sort(sortByTime);

  const nextWeekItems = cycles
    .filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= nextSundayStart && d <= nextSaturdayEnd;
    })
    .sort(sortByTime);

  const nextMonthItems = cycles
    .filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= nextMonthStart && d <= nextMonthEnd;
    })
    .sort(sortByTime);

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

          <button
            type="button"
            onClick={() => setSelectedCycle(item)}
            className="w-5 h-5 rounded-md border-2 border-emerald-400/80 bg-zinc-800/40 hover:bg-emerald-400/20 hover:border-emerald-300 flex items-center justify-center transition-all active:scale-90"
            title="Mark as done"
          >
            <span className="opacity-0 hover:opacity-100 text-emerald-300 text-xs font-bold">✓</span>
          </button>
        </div>
      </div>
    );
  };

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 1. OVERDUE SECTION */}
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

      {/* 2. TODAY & TOMORROW SECTION */}
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

      {/* 3. THIS WEEK SECTION */}
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

      {/* 4. NEXT WEEK SECTION */}
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

      {/* 5. NEXT MONTH PREVIEW SECTION */}
      <div>
        <button
          onClick={() => setIsNextMonthOpen(!isNextMonthOpen)}
          className={`w-full flex items-center justify-between py-2 text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'} hover:opacity-80 transition-opacity`}
        >
          <span>🗓️ Next Month Preview ({nextMonthItems.length})</span>
          <span>{isNextMonthOpen ? '▲ Collapse' : '▼ Expand'}</span>
        </button>

        {isNextMonthOpen && (
          <div className="pl-2 space-y-1 mt-1 border-l-2 border-zinc-700/30">
            {nextMonthItems.length > 0 ? (
              nextMonthItems.map((item) => renderRow(item, true))
            ) : (
              <div className="py-2 text-xs text-zinc-500 italic">
                No scheduled reminders for next month yet.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
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