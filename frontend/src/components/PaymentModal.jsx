import { useState } from 'react';

export default function PaymentModal({ cycle, onClose, onConfirm }) {
  // Check if item has a monetary amount
  const hasAmount = cycle?.expected_amount != null && Number(cycle.expected_amount) > 0;

  const [amount, setAmount] = useState(hasAmount ? cycle.expected_amount.toString() : '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const parsedAmount = hasAmount && amount ? parseFloat(amount) : null;
      await onConfirm(parsedAmount, note.trim() || undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-6 border border-gray-100 dark:border-gray-800 shadow-2xl">
        <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
          {hasAmount ? `Settle ${cycle.obligation_name}?` : `Complete "${cycle.obligation_name}"?`}
        </h3>
        
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">
          {hasAmount 
            ? 'Confirm transaction details below to mark this item paid.' 
            : 'Mark this life event or appointment as completed.'}
        </p>

        <form onSubmit={handleSubmit}>
          {/* Conditional Amount Input (Only for Bills) */}
          {hasAmount && (
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                Amount Paid
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                  ₹
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-semibold"
                  step="0.01"
                  required
                />
              </div>
            </div>
          )}

          {/* Optional Note / Reference Input */}
          <div className="mb-6">
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
              {hasAmount ? 'Reference / Payment Note (optional)' : 'Completion Note (optional)'}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={hasAmount ? 'UPI Ref ID, Txn ID, etc.' : 'e.g. Attended at 4 PM'}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 text-sm shadow-md shadow-emerald-500/20"
            >
              {loading ? 'Settling...' : 'Confirm ✅'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}