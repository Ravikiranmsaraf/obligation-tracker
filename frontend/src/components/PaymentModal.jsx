import { useState } from 'react';

export default function PaymentModal({ cycle, onClose, onConfirm }) {
  const [amount, setAmount] = useState(cycle?.expected_amount || '');
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(amount, note);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 w-full max-w-sm text-white shadow-2xl">
        <h3 className="text-lg font-bold mb-2">Mark as Settled</h3>
        <p className="text-xs text-gray-400 mb-4">{cycle?.obligation_name}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Amount Paid</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Note (Optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Paid via UPI"
              className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 bg-white/10 hover:bg-white/20 text-white font-semibold py-2.5 rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-1/2 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold py-2.5 rounded-xl text-xs"
            >
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}