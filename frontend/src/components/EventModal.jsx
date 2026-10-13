import React from 'react';

export default function EventModal({ isOpen, onClose, eventItem, activeTheme }) {
  if (!isOpen || !eventItem) return null;

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Event Details</h3>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-80 text-lg`}>
            ✕
          </button>
        </div>

        <div className="space-y-3 mb-6">
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Event Name</p>
            <p className="font-bold text-sm mt-0.5">{eventItem.name || eventItem.obligation_name}</p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Category</p>
            <p className="font-semibold text-xs mt-0.5 capitalize">{eventItem.category || 'Events'}</p>
          </div>
          <div>
            <p className={`text-[11px] uppercase tracking-wider ${subTextClass}`}>Due Date</p>
            <p className="font-bold text-emerald-400 text-xs mt-0.5">{eventItem.target_date || eventItem.due_date || 'Scheduled'}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95"
        >
          Close
        </button>
      </div>
    </div>
  );
}