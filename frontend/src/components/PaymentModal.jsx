import { useState } from 'react';
import { getQuickDeferralActions } from '../utils/quickDeferralUtils';

export default function PaymentModal({
  isOpen,
  onClose,
  cycle,
  currencySymbol = '₹',
  onConfirmPayment,
  onDefer,
  user,
  activeTheme,
  isForwardPlanning = false,
}) {
  if (!isOpen || !cycle) return null;

  const [amountPaid, setAmountPaid] = useState(cycle.expected_amount || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  const actions = isForwardPlanning
    ? []
    : getQuickDeferralActions(cycle.frequency).filter((action) => action.type !== 'complete');

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

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onConfirmPayment(cycle.id, Number(amountPaid), notes.trim());
      onClose();
    } catch (err) {
      console.error('Error recording payment:', err);
      alert('Failed to record payment.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickActionClick = async (action) => {
    if (action.type === 'skip') {
      setLoading(true);
      try {
        await onConfirmPayment(cycle.id, 'skipped', 'Quick action: Skipped');
        onClose();
      } catch (err) {
        console.error('Error skipping cycle:', err);
      } finally {
        setLoading(false);
      }
    } else if (onDefer && typeof onDefer === 'function') {
      setLoading(true);
      try {
        await onDefer(cycle.id, action, user?.id);
        onClose();
      } catch (err) {
        console.error('Error deferring cycle:', err);
        alert('Failed to snooze reminder.');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelOccurrence = async () => {
    if (!confirm('Cancel this bill occurrence? It will be removed from your active list.')) return;
    setLoading(true);
    try {
      await onConfirmPayment(cycle.id, 'cancelled', 'Cancelled by user');
      onClose();
    } catch (err) {
      console.error('Error cancelling bill:', err);
      alert('Failed to cancel bill occurrence.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all space-y-4`}>
        
        <div className="flex justify-between items-center border-b pb-3 border-white/10">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">Payment Obligation</span>
            <h3 className="text-base font-bold tracking-tight mt-0.5">{cycle.obligation_name || cycle.name}</h3>
          </div>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-100 text-lg p-1`}>✕</button>
        </div>

        <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-3 flex items-center justify-between text-xs">
          <span className={subTextClass}>Due Date</span>
          <span className="font-bold text-emerald-400">
            {formatLocalDueDate(cycle.due_timestamp, cycle.user_timezone || 'UTC')}
          </span>
        </div>

        {!isForwardPlanning && actions.length > 0 && (
          <div>
            <p className={`text-[10px] uppercase font-bold tracking-wider ${subTextClass} mb-1.5`}>Quick Actions</p>
            <div className={`grid gap-2 ${actions.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  disabled={loading}
                  onClick={() => handleQuickActionClick(action)}
                  className={`py-2.5 px-1 rounded-xl text-[11px] font-extrabold border transition-all text-center truncate ${cardClass} ${subTextClass} hover:border-emerald-400/50 hover:text-white`}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handlePaymentSubmit} className="space-y-3">
          <div>
            <label className={`block text-xs font-semibold ${subTextClass} mb-1`}>Amount Paid ({currencySymbol})</label>
            <input
              type="number"
              step="0.01"
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm font-extrabold text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${inputBgClass}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold ${subTextClass} mb-1`}>Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Paid via UPI / GPay"
              className={`w-full rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${inputBgClass}`}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`w-1/3 font-semibold px-4 py-3 rounded-xl transition-all border text-xs ${cardClass}`}
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 text-black font-extrabold px-4 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md text-xs"
              >
                {loading ? 'Processing...' : 'Confirm Paid ✓'}
              </button>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleCancelOccurrence}
              className="w-full py-2 text-red-400 hover:text-red-300 font-semibold text-[11px] transition-all"
            >
              Cancel this occurrence ✕
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}