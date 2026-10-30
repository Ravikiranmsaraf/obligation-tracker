import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

  // Collapsible dropdown states (Overdue collapsed by default)
  const [isOverdueOpen, setIsOverdueOpen] = useState(false);
  const [isNextWeekOpen, setIsNextWeekOpen] = useState(false);
  const [isThisMonthOpen, setIsThisMonthOpen] = useState(false);

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

  const formatDateHeader = (timestamp, timeZone = 'UTC') => {
    if (!timestamp) return 'Scheduled';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return timestamp;

      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      }).format(d);
    } catch (e) {
      return 'Scheduled';
    }
  };

  // Date boundary calculations
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(todayEnd);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  // Sunday to Saturday week boundaries
  const currentSunday = new Date(now);
  currentSunday.setDate(now.getDate() - now.getDay());
  currentSunday.setHours(0, 0, 0, 0);

  const nextSundayStart = new Date(currentSunday);
  nextSundayStart.setDate(currentSunday.getDate() + 7);
  nextSundayStart.setHours(0, 0, 0, 0);

  const nextSaturdayEnd = new Date(nextSundayStart);
  nextSaturdayEnd.setDate(nextSaturdayEnd.getDate() + 6);
  nextSaturdayEnd.setHours(23, 59, 59, 999);

  const sortByChronologicalAsc = (a, b) => {
    const timeA = new Date(a.due_timestamp || a.due_date || 0).getTime();
    const timeB = new Date(b.due_timestamp || b.due_date || 0).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return (a.name || '').localeCompare(b.name || '');
  };

  // Filter categories
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

  const nextWeekItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d >= nextSundayStart && d <= nextSaturdayEnd;
  }).sort(sortByChronologicalAsc);

  const thisMonthItems = cycles.filter((item) => {
    if (!item.due_timestamp && !item.due_date) return false;
    const d = new Date(item.due_timestamp || item.due_date);
    return d > nextSaturdayEnd && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).sort(sortByChronologicalAsc);

  const renderRow = (item) => {
    const isEvent = item.type === 'event' || Number(item.expected_amount) === 0;
    const tz = item.user_timezone || 'UTC';
    const formattedTime = formatDueTime(item.due_timestamp, tz);

    return (
      <div
        key={item.id}
        onClick={() => setSelectedCycle(item)}
        className={`flex items-center justify-between py-2 px-3.5 rounded-xl border ${
          activeTheme?.card || 'bg-zinc-900 border-zinc-800'
        } hover:border-[#6556e8]/40 transition-all cursor-pointer group shadow-xs gap-3`}
      >
        {/* Left Side: Subtle Time stacked above Full-width Reminder Title */}
        <div className="min-w-0 flex-1">
          {formattedTime && (
            <div className={`text-[9px] font-mono leading-none tracking-wider uppercase font-semibold mb-0.5 ${activeTheme?.subText || 'text-zinc-500'}`}>
              🕒 {formattedTime}
            </div>
          )}
          <h3 className="font-bold text-xs sm:text-sm tracking-tight truncate leading-tight">
            {item.name || item.obligation_name}
          </h3>
        </div>

        {/* Right Side: Monetary Amount (if present) & Checkbox Action */}
        <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isEvent && (
            <span className="text-xs font-extrabold text-emerald-400">
              {currencySymbol}{Number(item.expected_amount || 0).toLocaleString('en-IN')}
            </span>
          )}

          <button
            type="button"
            onClick={() => setSelectedCycle(item)}
            className="w-6 h-6 rounded-lg border-2 border-emerald-400/80 bg-zinc-800/40 hover:bg-emerald-400/20 hover:border-emerald-300 flex items-center justify-center transition-all active:scale-90 shadow-xs"
            title="Mark as done"
          >
            <span className="text-emerald-300 text-[10px] font-bold">✓</span>
          </button>
        </div>
      </div>
    );
  };

  const renderDateGroupedList = (itemList) => {
    const grouped = itemList.reduce((acc, item) => {
      const timestamp = item.due_timestamp || item.due_date;
      const tz = item.user_timezone || 'UTC';
      const dateHeader = formatDateHeader(timestamp, tz);

      if (!acc[dateHeader]) {
        acc[dateHeader] = {
          timestampValue: timestamp ? new Date(timestamp).setHours(0, 0, 0, 0) : 0,
          items: [],
        };
      }
      acc[dateHeader].items.push(item);
      return acc;
    }, {});

    const sortedGroups = Object.entries(grouped).sort((a, b) => a[1].timestampValue - b[1].timestampValue);

    return (
      <div className="space-y-3">
        {sortedGroups.map(([headerLabel, group], idx) => (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center gap-2 px-1 pt-1">
              <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400/80">
                {headerLabel}
              </h3>
              <div className="h-px bg-zinc-700/20 flex-1" />
            </div>
            <div className="space-y-1.5">
              {group.items.map((item) => renderRow(item))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div className="space-y-4 max-w-2xl mx-auto font-sans">
      
      {/* 1. OVERDUE SECTION */}
      {overdueItems.length > 0 && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-3 space-y-2">
          <button
            onClick={() => setIsOverdueOpen(!isOverdueOpen)}
            className="w-full flex items-center justify-between text-left font-bold text-red-400 text-xs tracking-wider uppercase"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span>⚠️ Overdue Items ({overdueItems.length})</span>
            </div>
            <span className="text-[11px]">{isOverdueOpen ? '▲ Hide' : '▼ Show'}</span>
          </button>

          {isOverdueOpen && (
            <div className="space-y-1.5 pt-2 border-t border-red-500/20">
              {renderDateGroupedList(overdueItems)}
            </div>
          )}
        </div>
      )}

      {/* 2. TODAY */}
      {todayItems.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 px-1">
            <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400">
              Today
            </h2>
            <div className="h-px bg-zinc-700/30 flex-1" />
          </div>
          <div className="space-y-1.5">
            {todayItems.map((item) => renderRow(item))}
          </div>
        </div>
      )}

      {/* 3. TOMORROW */}
      {tomorrowItems.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center gap-2 px-1">
            <h2 className={`text-[11px] font-extrabold uppercase tracking-wider ${activeTheme?.subText || 'text-gray-400'}`}>
              Tomorrow
            </h2>
            <div className="h-px bg-zinc-700/30 flex-1" />
          </div>
          <div className="space-y-1.5">
            {tomorrowItems.map((item) => renderRow(item))}
          </div>
        </div>
      )}

      {todayItems.length === 0 && tomorrowItems.length === 0 && overdueItems.length === 0 && (
        <div className="p-8 text-center text-xs text-zinc-500">
          No immediate reminders for today or tomorrow. Enjoy the breathing room! 🌿
        </div>
      )}

      {/* 4. NEXT WEEK */}
      {nextWeekItems.length > 0 && (
        <div className={`rounded-2xl border ${activeTheme?.card || 'bg-zinc-900 border-zinc-800'} p-3.5 space-y-2.5`}>
          <button
            onClick={() => setIsNextWeekOpen(!isNextWeekOpen)}
            className={`w-full flex items-center justify-between text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'}`}
          >
            <span>📅 Next Week ({nextWeekItems.length})</span>
            <span className="text-[11px]">{isNextWeekOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {isNextWeekOpen && (
            <div className="pt-2 space-y-2 border-t border-white/5">
              {renderDateGroupedList(nextWeekItems)}
            </div>
          )}
        </div>
      )}

      {/* 5. THIS MONTH */}
      {thisMonthItems.length > 0 && (
        <div className={`rounded-2xl border ${activeTheme?.card || 'bg-zinc-900 border-zinc-800'} p-3.5 space-y-2.5`}>
          <button
            onClick={() => setIsThisMonthOpen(!isThisMonthOpen)}
            className={`w-full flex items-center justify-between text-left font-bold text-xs tracking-wider uppercase ${activeTheme?.subText || 'text-gray-400'}`}
          >
            <span>🗓️ Rest of This Month ({thisMonthItems.length})</span>
            <span className="text-[11px]">{isThisMonthOpen ? '▲ Collapse' : '▼ Expand'}</span>
          </button>
          {isThisMonthOpen && (
            <div className="pt-2 space-y-2 border-t border-white/5">
              {renderDateGroupedList(thisMonthItems)}
            </div>
          )}
        </div>
      )}

      {/* Quick Safety Net Link */}
      <div className="px-4 pt-2 pb-1 text-center">
        <Link 
          to="/completed?tab=completed" 
          className="text-[11px] font-semibold text-zinc-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
        >
          <span>↩️ Accidentally closed a task? click here to undo ➔ </span>
        </Link>
      </div>

      {/* Next Month Preview Chip */}
      <div className="pt-2 pb-4 flex justify-center">
        <Link to="/completed?tab=next_month" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#6556e8]/10 hover:bg-[#6556e8]/20 border border-[#6556e8]/30 text-[#6556e8] text-xs font-bold transition-all shadow-xs">
          <span>🗓️</span>
          <span>Looking ahead: Next Month</span>
          <span>➔</span>
        </Link>
      </div>

      {/* Action Modals */}
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