import React, { useState } from 'react';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/categories';
import CategoryCounterBar from './CategoryCounterBar';
import PaymentModal from './PaymentModal';
import EventModal from './EventModal';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function ObligationListView({
  cycles = [],
  onMarkPaid,
  currencySymbol = '₹',
  themeKey = 'cyberLime',
}) {
  const [selectedCycle, setSelectedCycle] = useState(null);

  if (!cycles || cycles.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center text-gray-400 text-sm">
        All clear for now! 🎉 No pending obligations.
      </div>
    );
  }

  const isMonetary = selectedCycle && Number(selectedCycle.expected_amount) > 0;

  return (
    <div>
      {/* Shared Category Counter Bar */}
      <CategoryCounterBar cycles={cycles} themeKey={themeKey} />

      <div className="space-y-3 mt-2">
        {cycles.map((item) => {
          const categoryKey = item.category || 'Other';
          const icon = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.Other;
          const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.Other;
          const isEvent = item.type === 'event' || Number(item.expected_amount) === 0;

          const dueDateObj = item.due_date ? new Date(item.due_date) : new Date();
          const formattedDate = dueDateObj.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });

          return (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-2xl border ${colors.bg} ${colors.border} transition-all hover:scale-[1.01]`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl p-2 rounded-xl bg-black/30">{icon}</span>
                <div>
                  <h3 className="font-bold text-white text-sm">{item.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors.badge}`}>
                      {categoryKey}
                    </span>
                    <span className="text-xs text-gray-400">
                      Due: {formattedDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-black text-sm text-white">
                    {!isEvent
                      ? `${currencySymbol}${Number(item.expected_amount || 0).toLocaleString('en-IN')}`
                      : 'Event 🎂'}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize">{item.frequency || 'monthly'}</p>
                </div>

                <button
                  onClick={() => setSelectedCycle(item)}
                  className="bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md active:scale-95"
                >
                  Done ✓
                </button>
              </div>
            </div>
          );
        })}
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