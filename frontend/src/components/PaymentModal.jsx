import { useState } from 'react';

export default function PaymentModal({
  isOpen,
  onClose,
  cycle,
  currencySymbol = '₹',
  onConfirmPayment,
  activeTheme,
}) {
  if (!isOpen || !cycle) return null;

  const [amountPaid, setAmountPaid] = useState(cycle.expected_amount || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

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

  const handleCancelOccurrence = async () => {
    if (!confirm('Cancel this bill occurrence? It will be removed from your active list.')) return;
    setLoading(true);
    try {
      // Pass 'cancelled' status directly
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Record Bill Payment</h3>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-80 text-lg`}>
            ✕
          </button>
        </div>

        <p className={`text-xs ${subTextClass} mb-4`}>
          Marking payment for <span className="font-bold text-emerald-400">{cycle.obligation_name || cycle.name}</span>
        </p>

        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold ${subTextClass} mb-1`}>
              Amount Paid ({currencySymbol})
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${inputBgClass}`}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold ${subTextClass} mb-1`}>Notes (Optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Paid via UPI / GPay"
              className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${inputBgClass}`}
            />
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className={`w-1/3 font-semibold px-4 py-3 rounded-xl transition-all border ${cardClass}`}
              >
                Back
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
              className="w-full py-2.5 text-red-400 hover:text-red-300 font-semibold text-xs transition-all"
            >
              Cancel this occurrence ✕
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}