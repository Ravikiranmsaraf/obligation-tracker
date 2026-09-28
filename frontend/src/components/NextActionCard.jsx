import { useState, useEffect } from 'react';
import PaymentModal from './PaymentModal';
import EventModal from './EventModal';
import CycleCard from './CycleCard';
import CelebrationCard from './CelebrationCard';
import CategoryCounterBar from './CategoryCounterBar';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function NextActionCard({
  cycles = [],
  allMonthCompleted = false,
  onMarkPaid,
  currencySymbol = '₹',
  themeKey = 'cyberLime',
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (activeIndex >= cycles.length) {
      setActiveIndex(Math.max(0, cycles.length - 1));
    }
  }, [cycles, activeIndex]);

  const currentCycle = cycles[activeIndex];
  const isMonetary = currentCycle && Number(currentCycle.expected_amount) > 0;
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  // Calculate current month's remaining items specifically
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const currentMonthRemaining = cycles.filter((item) => {
    if (!item.due_date) return false;
    const dueDate = new Date(item.due_date);
    return (
      dueDate.getFullYear() === currentYear &&
      dueDate.getMonth() === currentMonth
    );
  }).length;

  return (
    <div className="w-full max-w-md mx-auto mt-1 px-1">
      <CategoryCounterBar cycles={cycles} themeKey={themeKey} />

      {/* Always display Celebration Card when current month is 100% complete */}
      {allMonthCompleted && <CelebrationCard currentMonthName={monthName} />}

      {cycles.length > 0 ? (
        <>
          {/* Subtitle Header */}
          <div className="text-xs text-gray-400 mb-2 text-center select-none font-medium">
            {currentMonthRemaining} remaining for this month • Showing card {activeIndex + 1} of {cycles.length}
          </div>

          {/* Film Strip Viewport */}
          <div className="relative overflow-hidden py-2 w-full">
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
                  onOpenPaymentModal={() => setShowModal(true)}
                />
              ))}
            </div>
          </div>

          {/* Navigation Controls */}
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
        </>
      ) : (
        !allMonthCompleted && (
          <div className="flex flex-col items-center justify-center min-h-[40vh] text-center px-6">
            <h2 className="text-2xl font-bold mb-2 text-white mt-8">You're all caught up! 🎉</h2>
            <p className="text-gray-400 text-sm">Nothing due right now. Living your best life.</p>
          </div>
        )
      )}

      {/* Conditionally Render Modals */}
      {showModal && currentCycle && (
        isMonetary ? (
          <PaymentModal
            cycle={currentCycle}
            onClose={() => setShowModal(false)}
            onConfirm={async (amount, note) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(currentCycle.id, amount, note);
              setShowModal(false);
            }}
          />
        ) : (
          <EventModal
            cycle={currentCycle}
            onClose={() => setShowModal(false)}
            onConfirm={async (status) => {
              triggerFeedback();
              if (onMarkPaid) await onMarkPaid(currentCycle.id, 0, status);
              setShowModal(false);
            }}
          />
        )
      )}
    </div>
  );
}