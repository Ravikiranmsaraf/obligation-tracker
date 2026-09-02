import { useState } from 'react';
import PaymentModal from './PaymentModal';

export default function NextActionCard({ cycle, remainingCount, onMarkPaid }) {
  const [showModal, setShowModal] = useState(false);

  if (!cycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h2 className="text-2xl font-light mb-2">Nothing needs action right now</h2>
        <p className="text-gray-500">All obligations are up to date</p>
      </div>
    );
  }

  const isOverdue = new Date(cycle.due_date) < new Date();
  const dueText = isOverdue
    ? `Overdue: ${Math.ceil((new Date().getTime() - new Date(cycle.due_date).getTime()) / (1000 * 60 * 60 * 24))} days`
    : `Due: ${new Date(cycle.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;

  return (
    <>
      <div className="max-w-md mx-auto mt-8">
        <div className="text-sm text-gray-500 mb-4 text-center">
          {remainingCount} remaining this month
        </div>
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-2">{cycle.obligation_name}</h2>
          <p className={`text-lg mb-4 ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
            {dueText}
          </p>
          <p className="text-3xl font-bold mb-8">₹{cycle.expected_amount.toLocaleString('en-IN')}</p>
          
          <button
            onClick={() => setShowModal(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 rounded-xl transition-colors"
          >
            Done
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