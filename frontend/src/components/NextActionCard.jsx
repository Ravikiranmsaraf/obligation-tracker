import { useState, useRef } from 'react';
import PaymentModal from './PaymentModal';

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

  // Card Swipe State
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Uber Slider Drag State
  const [sliderX, setSliderX] = useState(0);
  const [isSliderDragging, setIsSliderDragging] = useState(false);
  const sliderStartPos = useRef(0);
  const sliderMaxTrack = 220; // Width of slide track

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

  // Card Gestures (Left = Snooze, Up = Skip)
  const handleTouchStart = (e) => {
    if (isSliderDragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startPos.current = { x: clientX, y: clientY };
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || isSliderDragging) return;
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

    // Swipe Left -> Snooze
    if (dragOffset.x < -80 && Math.abs(dragOffset.y) < 60) {
      setShowSnoozeModal(true);
    } 
    // Swipe Up -> Skip to Back
    else if (dragOffset.y < -60 && Math.abs(dragOffset.x) < 80) {
      cycleToBack();
    }

    setDragOffset({ x: 0, y: 0 });
  };

  // Uber Slider Drag Handlers
  const handleSliderStart = (e) => {
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    sliderStartPos.current = clientX;
    setIsSliderDragging(true);
  };

  const handleSliderMove = (e) => {
    if (!isSliderDragging) return;
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - sliderStartPos.current;
    const clampedX = Math.max(0, Math.min(deltaX, sliderMaxTrack));
    setSliderX(clampedX);
  };

  const handleSliderEnd = (e) => {
    if (!isSliderDragging) return;
    e.stopPropagation();
    setIsSliderDragging(false);

    if (sliderX >= sliderMaxTrack - 20) {
      setShowPaymentModal(true);
    }
    setSliderX(0);
  };

  const cycleToBack = () => {
    if (deck.length <= 1) return;
    setDeck((prevDeck) => {
      const [first, ...rest] = prevDeck;
      return [...rest, first];
    });
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-4 px-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-4 text-center select-none font-medium">
          {remainingCount} items remaining • <span className="text-gray-400 dark:text-gray-500">Slide ➔ to Settle | Swipe ⬅ Snooze | Swipe ⬆ Skip</span>
        </div>

        <div className="relative min-h-[420px] flex items-center justify-center">
          {deck.slice(0, 3).map((item, index) => {
            const isFront = index === 0;
            const scale = 1 - index * 0.05;
            const translateY = index * 12;
            const opacity = 1 - index * 0.2;

            const config = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.Default;
            const isOverdue = new Date(item.due_date) < new Date();

            const transformStyle = isFront
              ? `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0px) rotate(${dragOffset.x * 0.04}deg)`
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
                className={`absolute w-full top-0 overflow-hidden rounded-3xl shadow-xl dark:shadow-none border border-gray-100 dark:border-gray-800 select-none touch-none bg-white dark:bg-gray-900 ${
                  isFront ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                {/* Background Image Layer */}
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-15 dark:opacity-20 pointer-events-none" 
                  style={{ backgroundImage: `url(${config.bgImage})` }} 
                />

                <div className="relative p-7 z-10">
                  {/* Category Badge & Gesture Feedback */}
                  <div className="flex justify-between items-center mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${config.badge}`}>
                      <span>{config.icon}</span>
                      <span>{item.category}</span>
                    </span>

                    {/* Drag Action Feedback */}
                    {isFront && dragOffset.x < -40 && (
                      <span className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
                        Snooze 💤
                      </span>
                    )}
                    {isFront && dragOffset.y < -40 && Math.abs(dragOffset.x) < 40 && (
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

                  {/* Dynamic Amount Section */}
                  <div className="min-h-[48px] mb-6 flex items-center">
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

                  {/* Uber-style "Slide to Settle" Track */}
                  {isFront && (
                    <div 
                      className="relative w-full h-14 bg-gray-100 dark:bg-gray-800/90 rounded-2xl flex items-center px-2 select-none overflow-hidden"
                      onMouseMove={handleSliderMove}
                      onMouseUp={handleSliderEnd}
                      onTouchMove={handleSliderMove}
                      onTouchEnd={handleSliderEnd}
                    >
                      {/* Animated Track Fill */}
                      <div 
                        className="absolute left-0 top-0 bottom-0 bg-emerald-500/20 transition-all pointer-events-none"
                        style={{ width: `${sliderX + 28}px` }}
                      />

                      <span className="w-full text-center text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 pointer-events-none pl-6">
                        Slide to Settle ➔
                      </span>

                      {/* Sliding Handle */}
                      <div
                        onMouseDown={handleSliderStart}
                        onTouchStart={handleSliderStart}
                        style={{
                          transform: `translateX(${sliderX}px)`,
                          transition: isSliderDragging ? 'none' : 'transform 0.2s ease-out',
                        }}
                        className="absolute left-2 w-10 h-10 bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white rounded-xl shadow-md flex items-center justify-center cursor-grab active:cursor-grabbing font-bold text-lg"
                      >
                        ✓
                      </div>
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
            if (onMarkPaid) {
              await onMarkPaid(currentCycle.id, amount, note);
            }
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
                    if (onSnooze) {
                      await onSnooze(currentCycle.id, days);
                    }
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