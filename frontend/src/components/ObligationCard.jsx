import React, { useState } from 'react';
import { getDaySuffix } from '../utils/regexParser';

export default function ObligationCard({ obligation, onEdit, onBrowse, speak, currencySymbol, theme }) {
  const [touchStartX, setTouchStartX] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);

  const handleTouchStart = (e) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e) => {
    const diffX = touchStartX - e.touches[0].clientX;
    if (diffX > 0) {
      setSwipeOffset(Math.min(diffX, 90)); // Cap maximum drag visually
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset >= 75) {
      onBrowse(obligation.id);
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl mb-3">
      {/* Swipe Action Background Layer */}
      <div className="absolute inset-y-0 right-0 w-24 bg-blue-600 text-white font-bold text-xs flex items-center justify-center rounded-r-2xl">
        🔍 Browse
      </div>

      {/* Foreground Card */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(-${swipeOffset}px)`,
          transition: swipeOffset === 0 ? 'transform 0.2s ease-out' : 'none',
          touchAction: 'pan-y',
        }}
        className={`relative z-10 p-4 rounded-2xl border flex justify-between items-center transition-colors ${theme.card}`}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-100">{obligation.name}</p>
            <span className={`text-[10px] px-2 py-0.5 rounded-md border font-medium ${theme.badge}`}>
              {obligation.category}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Due {obligation.due_day}{getDaySuffix(obligation.due_day)} · {obligation.frequency}
            {obligation.expected_amount && (
              <span className={`ml-1 font-semibold ${theme.accentText}`}>
                · {currencySymbol}{obligation.expected_amount}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Button */}
          <button
            onClick={() => onEdit(obligation)}
            className="p-2 text-xs font-semibold rounded-xl bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
            title="Edit Obligation"
          >
            ✏️ Edit
          </button>

          {/* Text-to-Speech Button */}
          <button
            onClick={() =>
              speak(
                `${obligation.name}, category ${obligation.category}, due on the ${obligation.due_day}${getDaySuffix(
                  obligation.due_day
                )}.`
              )
            }
            className="p-2 text-base hover:scale-110 transition-transform"
            title="Read Aloud"
          >
            🔊
          </button>
        </div>
      </div>
    </div>
  );
}