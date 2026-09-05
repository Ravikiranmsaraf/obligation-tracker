import { useState } from 'react';
import PaymentModal from './PaymentModal';

export default function NextActionCard({ cycle, remainingCount, onMarkPaid }) {
  const [showModal, setShowModal] = useState(false);

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
          You're all caught up
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Nothing due. Living your best life.</p>
      </div>
    );
  }

  const isOverdue = new Date(cycle.due_date) < new Date();
  const dueText = isOverdue
    ? `${Math.ceil((new Date().getTime() - new Date(cycle.due_date).getTime()) / (1000 * 60 * 60 * 24))} days late`
    : `Due ${new Date(cycle.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <>
      <div className="max-w-md mx-auto mt-6 px-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center">
          {remainingCount} left this month
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-lg dark:shadow-none dark:border dark:border-gray-800 p-8">
          <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
            {cycle.obligation_name}
          </h2>
          <p className={`text-lg mb-4 font-medium ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'}`}>
            {isOverdue ? `⚠️ ${dueText}` : dueText}
          </p>
          <p className="text-4xl font-bold mb-8 text-gray-900 dark:text-white">
            ₹{cycle.expected_amount.toLocaleString('en-IN')}
          </p>

          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-4 rounded-2xl transition-colors text-lg"
          >
            Settld ✅
          </button>
        </div>
      </div>

      {showModal && (
        <PaymentModal
          cycle={cycle}
          onClose={() => setShowModal(false)}
          onConfirm={async (amount, note) => {
            await onMarkPaid(cycle.id, amount, note);
            setShowModal(false);
          }}
        />
      )}
    </>
  );
}