import React from 'react';
import { getQuickDeferralActions } from '../utils/quickDeferralUtils';

export default function EventModal({ isOpen, onClose, eventItem, activeTheme, onConfirm, onDefer, user }) {
  if (!isOpen || !eventItem) return null;

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';

  const actions = getQuickDeferralActions(eventItem.frequency);

  const formatLocalDueDate = (timestamp, timeZone = 'UTC') => {
    if (!timestamp) return 'Scheduled';
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return timestamp;
      return new Intl.DateTimeFormat('en-US', {
        timeZone,
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(d);
    } catch (e) {
      return timestamp;
    }
  };

  const handleActionClick = async (action) => {
    if (action.type === 'complete') {
      if (onConfirm) await onConfirm('completed');
    } else if (action.type === 'skip') {
      if (onConfirm) await onConfirm('skipped');
    } else if (action.type === 'snooze' && onDefer) {
      await onDefer(eventItem.id, action, user?.id);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Reminder Details</h3>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-80 text-lg`}>✕</button>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Reminder Name</p>
            <p className="font-bold text-sm mt-0.5">{eventItem.name || eventItem.obligation_name}</p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Category</p>
            <p className="font-semibold text-xs mt-0.5 capitalize">{eventItem.category || 'Events'}</p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Due Date & Time</p>
            <p className="font-bold text-emerald-400 text-xs mt-0.5">
              {formatLocalDueDate(eventItem.due_timestamp, eventItem.user_timezone || 'UTC')}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className={`text-[10px] uppercase font-bold tracking-wider ${subTextClass} mb-1`}>Quick Actions</p>
          <div className="grid grid-cols-3 gap-2">
            {actions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`py-2.5 px-1 rounded-xl text-[11px] font-extrabold border transition-all text-center truncate ${
                  action.type === 'complete'
                    ? 'bg-emerald-400 text-black border-emerald-400 hover:bg-emerald-300 col-span-3'
                    : `${activeTheme.card} ${subTextClass} hover:border-emerald-400/50 hover:text-white`
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className={`w-full mt-2 py-2 rounded-xl text-xs font-semibold ${subTextClass} hover:opacity-90`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
