import React from 'react';
import { getQuickDeferralActions } from '../utils/quickDeferralUtils';

export default function EventModal({ isOpen, onClose, eventItem, activeTheme, onConfirm, onDefer, user, isForwardPlanning = false }) {
  if (!isOpen || !eventItem) return null;

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';

  // If forward planning, only keep the complete/mark done action, strip out snooze/skip
  const rawActions = getQuickDeferralActions(eventItem.frequency);
  const actions = isForwardPlanning
    ? rawActions.filter((action) => action.type === 'complete')
    : rawActions;

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
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all space-y-4`}>
        
        <div className="flex justify-between items-center border-b pb-3 border-white/10">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#6556e8]">Scheduled Event / Task</span>
            <h3 className="text-base font-bold tracking-tight mt-0.5">{eventItem.name || eventItem.obligation_name}</h3>
          </div>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-100 text-lg p-1`}>✕</button>
        </div>

        {/* Due Date & Time Display Box */}
        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className={subTextClass}>Due Date</span>
          <span className="font-bold text-emerald-400">
            {formatLocalDueDate(eventItem.due_timestamp, eventItem.user_timezone || 'UTC')}
          </span>
        </div>

        <div className="space-y-2 pt-2">
          {actions.length > 0 && (
            <>
              <p className={`text-[10px] uppercase font-bold tracking-wider ${subTextClass} mb-1`}>Quick Actions</p>
              <div className="grid grid-cols-3 gap-2">
                {actions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => handleActionClick(action)}
                    className={`py-2.5 px-1 rounded-xl text-[11px] font-extrabold border transition-all text-center truncate ${
                      action.type === 'complete'
                        ? 'bg-[#6556e8] text-white border-[#6556e8] hover:bg-[#5344d6] col-span-3'
                        : `${cardClass} ${subTextClass} hover:border-[#6556e8]/50 hover:text-white`
                    }`}
                  >
                    {action.type === 'complete' ? 'Mark Done ✓' : action.label}
                  </button>
                ))}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={onClose}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold ${cardClass} ${subTextClass} hover:opacity-90`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}