import { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';
import CycleCard from './CycleCard';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function NextActionCard({
  cycles = [],
  onMarkPaid,
  currencySymbol = '₹',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    if (activeIndex >= cycles.length) {
      setActiveIndex(Math.max(0, cycles.length - 1));
    }
  }, [cycles, activeIndex]);

  const currentCycle = cycles[activeIndex];

  if (!currentCycle || cycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6">
        <h2 className="text-2xl font-bold mb-2 text-white">You're all caught up! 🎉</h2>
        <p className="text-gray-400 text-sm">Nothing due right now. Living your best life.</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-md mx-auto mt-2 px-1">
        <div className="text-xs text-gray-400 mb-2 text-center select-none font-medium">
          {cycles.length} items remaining • Card {activeIndex + 1} of {cycles.length}
        </div>

        {/* Film Strip Viewport */}
        <div className="relative overflow-hidden py-4 w-full">
          <div
            className="flex transition-transform duration-300 ease-out"
            style={{
              transform: `translateX(${-activeIndex * 80 + 10}%)`,
            }}
          >
            {cycles.map((item, index) => (
              <CycleCard
                key={item.id}
                item={item}
                isActive={index === activeIndex}
                onClick={() => setActiveIndex(index)}
                currencySymbol={currencySymbol}
                onOpenPaymentModal={() => setShowPaymentModal(true)}
              />
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-between items-center px-4 mt-1">
          <button
            disabled={activeIndex === 0}
            onClick={() => setActiveIndex((prev) => Math.max(0, prev - 1))}
            className="px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-xs font-bold text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-all"
          >
            ← Previous
          </button>
          <button
            disabled={activeIndex === cycles.length - 1}
            onClick={() => setActiveIndex((prev) => Math.min(cycles.length - 1, prev + 1))}
            className="px-4 py-2 bg-black/50 border border-white/10 rounded-xl text-xs font-bold text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/70 transition-all"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && currentCycle && (
        <PaymentModal
          cycle={currentCycle}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={async (amount, note) => {
            triggerFeedback();
            if (onMarkPaid) await onMarkPaid(currentCycle.id, amount, note);
            setShowPaymentModal(false);
          }}
        />
      )}
    </>
  );
}