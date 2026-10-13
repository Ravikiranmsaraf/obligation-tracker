import React, { useState } from 'react';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/categories';
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
  const [activeFilter, setActiveFilter] = useState('Today');

  if (!cycles || cycles.length === 0) {
    return (
      <div className={`border rounded-3xl p-8 text-center text-sm ${activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-gray-400'}`}>
        All clear for now! 🎉 No pending obligations.
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

  // Date calculation helpers
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  // This Week (Sunday - Saturday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Next Week (Sunday - Saturday of next week)
  const startOfNextWeek = new Date(startOfWeek);
  startOfNextWeek.setDate(startOfWeek.getDate() + 7);
  const endOfNextWeek = new Date(startOfNextWeek);
  endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
  endOfNextWeek.setHours(23, 59, 59, 999);

  // This Month (from today till the last day of the month)
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

  // Calculate counts for each filter
  const counts = {
    Due: cycles.filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d < todayStart;
    }).length,
    Today: cycles.filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= todayStart && d <= todayEnd;
    }).length,
    'This week': cycles.filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= startOfWeek && d <= endOfWeek;
    }).length,
    'Next week': cycles.filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= startOfNextWeek && d <= endOfNextWeek;
    }).length,
    'This Month': cycles.filter((item) => {
      if (!item.due_date) return false;
      const d = new Date(item.due_date);
      return d >= todayStart && d <= endOfCurrentMonth;
    }).length,
    All: cycles.length,
  };

  // Filter cycles based on selected chip
  const filteredCycles = cycles.filter((item) => {
    if (!item.due_date) return activeFilter === 'All';
    const d = new Date(item.due_date);

    switch (activeFilter) {
      case 'Due':
        return d < todayStart;
      case 'Today':
        return d >= todayStart && d <= todayEnd;
      case 'This week':
        return d >= startOfWeek && d <= endOfWeek;
      case 'Next week':
        return d >= startOfNextWeek && d <= endOfNextWeek;
      case 'This Month':
        return d >= todayStart && d <= endOfCurrentMonth;
      case 'All':
      default:
        return true;
    }
  });

  const filters = ['Due', 'Today', 'This week', 'Next week', 'This Month', 'All'];
  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div>
      {/* Interactive Theme-Aware Filter Chips Bar */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none">
        {filters.map((filterName) => {
          const isActive = activeFilter === filterName;
          return (
            <button
              key={filterName}
              onClick={() => setActiveFilter(filterName)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                isActive ? activeTheme.chipActive : activeTheme.chipInactive
              }`}
            >
              <span>{filterName}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isActive ? activeTheme.chipCountActive : activeTheme.chipCountInactive
                }`}
              >
                {counts[filterName] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filtered List */}
      <div className="space-y-3">
        {filteredCycles.length === 0 ? (
          <div className={`border rounded-3xl p-8 text-center text-sm ${activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-gray-400'}`}>
            No obligations found for "{activeFilter}". 🎉
          </div>
        ) : (
          filteredCycles.map((item) => {
            const categoryKey = item.category || 'Other';
            const icon = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.Other;
            const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.Other;
            const isEvent = item.type === 'event' || Number(item.expected_amount) === 0;

            const dueDateObj = item.due_date ? new Date(item.due_date) : new Date();
            const formattedDate = dueDateObj.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });

            const rawTime = item.reminder_time || item.due_time;
            const formattedTime = formatDueTime(rawTime);

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-4 rounded-2xl border ${activeTheme.card} transition-all hover:scale-[1.01]`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl p-2.5 rounded-xl bg-black/10 dark:bg-black/30">{icon}</span>
                  <div>
                    <h3 className="font-bold text-sm">{item.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${activeTheme.badge}`}>
                        {categoryKey}
                      </span>
                      <span className={`text-xs ${activeTheme.subText}`}>
                        Due {formattedDate} {formattedTime ? `at ${formattedTime}` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-black text-sm">
                      {!isEvent
                        ? `${currencySymbol}${Number(item.expected_amount || 0).toLocaleString('en-IN')}`
                        : 'Event 🎂'}
                    </p>
                    <p className={`text-[10px] ${activeTheme.subText} capitalize`}>{item.frequency || 'monthly'}</p>
                  </div>

                  <button
                    onClick={() => setSelectedCycle(item)}
                    className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold px-3.5 py-1.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                  >
                    Done ✓
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Standard Payment / Event Modal */}
      {selectedCycle && (
        isMonetary ? (
          <PaymentModal
            cycle={selectedCycle}
            onClose={() => setSelectedCycle(null)}
            onConfirm={async (amount, note) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(selectedCycle.id, amount, note);
              setSelectedCycle(null);
            }}
          />
        ) : (
          <EventModal
            cycle={selectedCycle}
            onClose={() => setSelectedCycle(null)}
            onConfirm={async (status) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(selectedCycle.id, 0, status);
              setSelectedCycle(null);
            }}
          />
        )
      )}
    </div>
  );
}