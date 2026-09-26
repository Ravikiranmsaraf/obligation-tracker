import { useState, useRef } from 'react';
import PaymentModal from './PaymentModal';

// Soothing category configs (Icons, badges, & themed background images)
const CATEGORY_CONFIG = {
  Utilities: {
    icon: '⚡',
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    bgImage: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80',
  },
  Subscriptions: {
    icon: '🎧',
    badge: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    bgImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=600&q=80',
  },
  Health: {
    icon: '🩺',
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    bgImage: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80',
  },
  Personal: {
    icon: '🎂',
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    bgImage: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
  },
  Documents: {
    icon: '📑',
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    bgImage: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
  },
  Default: {
    icon: '📌',
    badge: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    bgImage: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=600&q=80',
  },
};

export default function NextActionCard({ cycles = [], remainingCount = 0, onMarkPaid, onSnooze }) {
  const [deck, setDeck] = useState(cycles);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  if (cycles !== deck && (cycles.length !== deck.length || cycles[0]?.id !== deck[0]?.id)) {
    setDeck(cycles);
  }

  const currentCycle = deck[0];

  if (!currentCycle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <h2 className="text-2xl font-semibold mb-2 text-gray-900 dark:text-white">
          You're all caught up! 🎉
        </h2>
        <p className="text-gray-500 dark:text-gray-400">Nothing due right now. Living your best life.</p>
      </div>
    );
  }

  const SWIPE_THRESHOLD_X = 100;
  const SWIPE_THRESHOLD_Y = -80;

  const handleTouchStart = (e) => {
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    setDragOffset({
      x: clientX - startPos.current.x,
      y: clientY - startPos.current.y,
    });
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragOffset.x > SWIPE_THRESHOLD_X) {
      setShowPaymentModal(true);
    } else if (dragOffset.x < -SWIPE_THRESHOLD_X) {
      setShowSnoozeModal(true);
    } else if (dragOffset.y < SWIPE_THRESHOLD_Y) {
      cycleToBack();
    }

    setDragOffset({ x: 0, y: 0 });
  };

  const cycleToBack = () => {
    if (deck.length <= 1) return;
    setDeck((prevDeck) => {
      const [first, ...rest] = prevDeck;
      return [...rest, first];
    });
  };

  const isSwipingRight = dragOffset.x > 40;
  const isSwipingLeft = dragOffset.x < -40;
  const isSwipingUp = dragOffset.y < -40 && Math.abs(dragOffset.x) < 40;

  return (
    <>
      <div className="max-w-md mx-auto mt-4 px-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 text-center select-none">
          {remainingCount} items left • <span className="text-xs opacity-75">Swipe ➔ Settle | ⬅ Snooze | ⬆ Browse</span>
        </div>

        <div className="relative min-h-[380px] flex items-center justify-center">
          {deck.slice(0, 3).map((item, index) => {
            const isFront = index === 0;
            const scale = 1 - index * 0.05;
            const translateY = index * 12;
            const opacity = 1 - index * 0.2;

            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Default;
            const isOverdue = new Date(item.due_date) < new Date();

            const transformStyle = isFront
              ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${dragOffset.x * 0.05}deg)`
              : `translate3d(0px, ${translateY}px, 0px) scale(${scale})`;

            return (
              <div
                key={item.id}
                onMouseDown={isFront ? handleTouchStart : undefined}
                onMouseMove={isFront ? handleTouchMove : undefined}
                onMouseUp={isFront ? handleTouchEnd : undefined}
                onTouchStart={isFront ? handleTouchStart : undefined}
                onTouchMove={isFront ? handleTouchMove : undefined}
                onTouchEnd={isFront ? handleTouchEnd : undefined}
                style={{
                  transform: transformStyle,
                  opacity: opacity,
                  zIndex: 30 - index,
                  transition: isDragging && isFront ? 'none' : 'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
                className={`absolute w-full top-0 overflow-hidden rounded-3xl shadow-xl dark:shadow-none border border-gray-100 dark:border-gray-800 select-none touch-none cursor-grab active:cursor-grabbing bg-white dark:bg-gray-900 ${
                  isFront ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                {/* Background Image Layer with Overlay */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-20 pointer-events-none" 
                  style={{ backgroundImage: `url(${config.bgImage})` }} 
                />

                <div className="relative p-7 z-10">
                  {/* Category Badge & Drag Feedback */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.badge}`}>
                      <span>{config.icon}</span>
                      <span>{item.category}</span>
                    </span>

                    {/* Drag Action Badges */}
                    {isFront && isSwipingRight && (
                      <span className="bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Settld ✅
                      </span>
                    )}
                    {isFront && isSwipingLeft && (
                      <span className="bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Snooze 💤
                      </span>
                    )}
                    {isFront && isSwipingUp && (
                      <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Skip ⬆
                      </span>
                    )}
                  </div>

                  {/* Title & Due Date */}
                  <h2 className="text-2xl font-bold mb-1 text-gray-900 dark:text-white pointer-events-none">
                    {item.obligation_name}
                  </h2>
                  <p className={`text-sm mb-6 font-medium pointer-events-none ${
                    isOverdue ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {isOverdue
                      ? `⚠️ ${Math.ceil((new Date().getTime() - new Date(item.due_date).getTime()) / (1000 * 60 * 60 * 24))} days late`
                      : `Due ${new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
                  </p>

                  {/* Dynamic Amount Section: Hide if non-monetary or 0 */}
                  <div className="min-h-[52px] mb-6 flex items-center">
                    {item.expected_amount && Number(item.expected_amount) > 0 ? (
                      <p className="text-4xl font-extrabold text-gray-900 dark:text-white pointer-events-none">
                        ₹{Number(item.expected_amount).toLocaleString('en-IN')}
                      </p>
                    ) : (
                      <span className="text-sm font-medium text-gray-400 dark:text-gray-500 italic pointer-events-none bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-xl">
                        Event / Appointment
                      </span>
                    )}
                  </div>

                  {/* Interactive Action Buttons */}
                  {isFront && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowSnoozeModal(true)}
                        className="w-1/3 bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium py-3 rounded-2xl transition-colors"
                      >
                        Snooze 💤
                      </button>
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="w-2/3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-2xl transition-colors text-lg shadow-lg shadow-blue-500/20"
                      >
                        Settld ✅
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment / Settle Modal */}
      {showPaymentModal && currentCycle && (
        <PaymentModal
          cycle={currentCycle}
          onClose={() => setShowPaymentModal(false)}
          onConfirm={async (amount, note) => {
            await onMarkPaid(currentCycle.id, amount, note);
            setShowPaymentModal(false);
          }}
        />
      )}

      {/* Snooze Modal */}
      {showSnoozeModal && currentCycle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl p-6 text-center border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Snooze "{currentCycle.obligation_name}"
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Select how many days to push this obligation back:
            </p>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[1, 3, 7].map((days) => (
                <button
                  key={days}
                  onClick={async () => {
                    await onSnooze(currentCycle.id, days);
                    setShowSnoozeModal(false);
                  }}
                  className="bg-blue-50 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-gray-700 text-blue-600 dark:text-blue-400 font-semibold py-3 rounded-2xl transition-colors"
                >
                  +{days} {days === 1 ? 'Day' : 'Days'}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSnoozeModal(false)}
              className="w-full text-gray-500 dark:text-gray-400 text-sm py-2 hover:underline"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}