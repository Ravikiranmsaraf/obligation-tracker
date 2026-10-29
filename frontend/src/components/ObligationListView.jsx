import React, { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';
import EventModal from './EventModal';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function ObligationListView({
  cycles = [],
  onMarkPaid,
  currencySymbol = '₹',
  activeTheme,
  user,
  onDefer,
}) {
  const [selectedCycle, setSelectedCycle] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reminderIdFromUrl = params.get('reminderId');
    if (reminderIdFromUrl && cycles.length > 0 && !selectedCycle) {
      const match = cycles.find((c) => c.id === reminderIdFromUrl);
      if (match) {
        setSelectedCycle(match);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, [cycles, selectedCycle]);

  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [isThisWeekOpen, setIsThisWeekOpen] = useState(false);
  const [isNextWeekOpen, setIsNextWeekOpen] = useState(false);

  if (!cycles || cycles.length === 0) {
    return (
      <div className={`p-8 text-center text-xs ${activeTheme?.subText || 'text-gray-400'}`}>
        All clear for now! 🎉 Take a deep breath and enjoy your day.
      </div>
    );
  }

  const formatDueTime = (timestamp, timeZone = 'UTC') => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(d);
    } catch (e) {
      return '';
    }
  };

  const formatDate = (timestamp, timeZone = 'UTC') => {
    if (!timestamp) return '';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return '';
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch (e) {
      return '';
    }
  };

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - now.getDay());
  currentSunday.setHours(0, 0, 0, 0);

  const currentSaturdayEnd = new Date(currentSunday);
  currentSaturdayEnd.setDate(currentSunday.getDate() + 6);
  currentSaturdayEnd.setHours(23, 59, 59, 999);

  const nextSundayStart = new Date(currentSunday);
  nextSundayStart.setDate(currentSunday.getDate() + 7);
  nextSundayStart.setHours(0, 0, 0, 0);

  const nextSaturdayEnd = new Date(nextSundayStart);
  nextSaturdayEnd.setDate(nextSundayStart.getDate() + 6);
  nextSaturdayEnd.setHours(23, 59, 59, 999);

  const sortByChronologicalAsc = (a, b) => {
    const timeA = new Date(a.due_timestamp || a.due_date || 0).getTime();
    const timeB = new Date(b.due_timestamp || b.due_date || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.name || '').localeCompare(b.name || '');
  };

  const overdueItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    return new Date(item.due_timestamp || item.due_date) < todayStart;
  }).sort(sortByChronologicalAsc);

  const todayItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d >= todayStart && d <= todayEnd;
  }).sort(sortByChronologicalAsc);

  const tomorrowItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d >= tomorrowStart && d <= tomorrowEnd;
  }).sort(sortByChronologicalAsc);

  const thisWeekItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d > tomorrowEnd && d <= currentSaturdayEnd;
  }).sort(sortByChronologicalAsc);

  const nextWeekItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d >= nextSundayStart && d <= nextSaturdayEnd;
  }).sort(sortByChronologicalAsc);

  const renderRow = (item, showDate = false) => {
    const isEvent = item.type === 'event' || Number(item.expected_amount) === 0;
    const tz = item.user_timezone || 'UTC';
    const formattedTime = formatDueTime(item.due_timestamp, tz);
    const dateLabel = showDate ? formatDate(item.due_timestamp, tz) : '';

    return (
      <div
        key={item.id}
        onClick={() => setSelectedCycle(item)}
        className={`flex items-center justify-between py-3.5 px-4 rounded-2xl border ${activeTheme?.card || 'bg-zinc-900 border-zinc-800'} hover:border-[#6556e8]/40 transition-all cursor-pointer group shadow-xs gap-3`}
      >
        {/* Left Side: Time + Full Un-truncated Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
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

          <h3 className="font-bold text-xs sm:text-sm tracking-tight leading-snug break-words">
            {item.name || item.obligation_name}
          </h3>
        </div>

        {/* Right Side: Amount or Category Badge */}
        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span className="text-xs font-extrabold text-emerald-400">
            {!isEvent
              ? `${currencySymbol}${Number(item.expected_amount || 0).toLocaleString('en-IN')}`
              : 'Event'}
          </span>

          <button
            type="button"
            onClick={() => setSelectedCycle(item)}
            className="w-7 h-7 rounded-xl border-2 border-emerald-400/80 bg-zinc-800/40 hover:bg-emerald-400/20 hover:border-emerald-300 flex items-center justify-center transition-all active:scale-90 shadow-xs"
            title="Mark as done"
          >
            <span className="text-emerald-300 text-xs font-bold">✓</span>
          </button>
        </div>
      </div>
    );
  };

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto font-sans">
      {overdueItems.length > 0 && (
        <div>
          <button
            onClick={() => setIsOverdueOpen(!isOverdueOpen)}
            className="w-full flex items-center justify-between py-2 text-left font-bold text-red-400 text-xs tracking-wider uppercase hover:opacity-85 transition-opacity"
          >
            <span>⚠️ Overdue ({overdueItems.length})</span>
            <span>{isOverdueOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {isOverdueOpen && (
            <div className="pl-2 space-y-2 mt-1 border-l-2 border-red-500/30">
              {overdueItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {todayItems.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 px-1">
              Today
            </h2>
            {todayItems.map((item) => renderRow(item, false))}
          </div>
        )}

        {tomorrowItems.length > 0 && (
          <div className="pt-2 space-y-2">
            <div className="flex items-center gap-3 my-2">
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
            className={`w-full flex items-center justify-between py-2 text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'} hover:opacity-85 transition-opacity`}
          >
            <span>📅 Rest of This Week ({thisWeekItems.length})</span>
            <span>{isThisWeekOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {isThisWeekOpen && (
            <div className="pl-2 space-y-2 mt-1 border-l-2 border-zinc-700/30">
              {thisWeekItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {nextWeekItems.length > 0 && (
        <div>
          <button
            onClick={() => setIsNextWeekOpen(!isNextWeekOpen)}
            className={`w-full flex items-center justify-between py-2 text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'} hover:opacity-85 transition-opacity`}
          >
            <span>📅 Next Week ({nextWeekItems.length})</span>
            <span>{isNextWeekOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {isNextWeekOpen && (
            <div className="pl-2 space-y-2 mt-1 border-l-2 border-zinc-700/30">
              {nextWeekItems.map((item) => renderRow(item, true))}
            </div>
          )}
        </div>
      )}

      {/* Step 5: Next Month Planning Chip at Base of List */}
      <div className="pt-4 pb-6 flex justify-center">
        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6556e8]/10 hover:bg-[#6556e8]/20 border border-[#6556e8]/30 text-[#6556e8] text-xs font-bold transition-all shadow-xs">
          <span>🗓️</span>
          <span>Looking ahead: 4 items scheduled for next month</span>
          <span>➔</span>
        </button>
      </div>

      {selectedCycle && (
        isMonetary ? (
          <PaymentModal
            isOpen={Boolean(selectedCycle)}
            cycle={selectedCycle}
            activeTheme={activeTheme}
            currencySymbol={currencySymbol}
            user={user}
            onClose={() => setSelectedCycle(null)}
            onConfirmPayment={async (cycleId, paymentData) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(cycleId, paymentData.amount_paid, paymentData.notes);
              setSelectedCycle(null);
            }}
            onDefer={async (cycleId, action, userId) => {
              triggerFeedback();
              if (onDefer) await onDefer(cycleId, action, userId);
              setSelectedCycle(null);
            }}
          />
        ) : (
          <EventModal
            isOpen={Boolean(selectedCycle)}
            eventItem={selectedCycle}
            activeTheme={activeTheme}
            user={user}
            onClose={() => setSelectedCycle(null)}
            onConfirm={async (status = 'completed') => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(selectedCycle.id, status, status);
              setSelectedCycle(null);
            }}
            onDefer={async (cycleId, action, userId) => {
              triggerFeedback();
              if (onDefer) await onDefer(cycleId, action, userId);
              setSelectedCycle(null);
            }}
          />
        )
      )}
    </div>
  );
}