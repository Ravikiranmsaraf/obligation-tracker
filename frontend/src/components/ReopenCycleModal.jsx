import React, { useState } from 'react';

export default function ReopenCycleModal({
  isOpen,
  onClose,
  cycle,
  activeTheme,
  currencySymbol = '₹',
  onReopen,
}) {
  if (!isOpen || !cycle) return null;

  // Default next due time: current time + 1 hour
  const defaultFutureDate = new Date();
  defaultFutureDate.setHours(defaultFutureDate.getHours() + 1);
  const defaultIsoString = defaultFutureDate.toISOString().slice(0, 16); // format for datetime-local input

  const [newDueTimestamp, setNewDueTimestamp] = useState(defaultIsoString);
  const [submitting, setSubmitting] = useState(false);

  const isMonetary = Number(cycle.expected_amount || 0) > 0;

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onReopen(cycle.id, new Date(newDueTimestamp).toISOString());
      onClose();
    } catch (err) {
      console.error('Error reopening item:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className={`w-full max-w-sm ${activeTheme.card} border rounded-3xl p-5 shadow-2xl space-y-4`}>
        <div className="flex items-center justify-between border-b pb-3 border-white/5">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight">↩️ Reopen Reminder</h3>
            <p className={`text-[10px] ${activeTheme.subText} mt-0.5`}>
              Accidentally closed? Let's bring it back.
            </p>
          </div>
          <button onClick={onClose} className="text-sm opacity-60 hover:opacity-100 p-1">✕</button>
        </div>

        <div className="p-3 rounded-2xl bg-black/20 dark:bg-white/5 border border-white/5 space-y-1">
          <h4 className="font-bold text-xs">{cycle.name || cycle.obligation_name}</h4>
          <p className={`text-[10px] ${activeTheme.subText} capitalize`}>
            {cycle.category || 'General'} • {isMonetary ? `${currencySymbol}${Number(cycle.expected_amount).toLocaleString('en-IN')}` : 'Event'}
          </p>
        </div>

        <form onSubmit={handleReopenSubmit} className="space-y-3">
          <div className="space-y-1">
            <label className={`text-[10px] font-bold uppercase tracking-wider ${activeTheme.subText}`}>
              Reschedule Due Time (Default: +1 Hour)
            </label>
            <input
              type="datetime-local"
              value={newDueTimestamp}
              onChange={(e) => setNewDueTimestamp(e.target.value)}
              className={`w-full px-3 py-2 rounded-xl text-xs bg-black/30 border border-white/10 focus:outline-none focus:border-[#6556e8]`}
              required
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 py-2.5 rounded-xl border border-white/10 text-xs font-bold ${activeTheme.subText} hover:bg-white/5 transition-colors`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {submitting ? 'Reopening...' : 'Mark Pending ↩️'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}