import { useState, useRef } from 'react';
import { triggerFeedback } from '../utils/feedbackUtils';

export default function ActionSlider({ onComplete }) {
  const [settleX, setSettleX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const sliderMaxTrack = 160;

  const handleStart = (e) => {
    e.stopPropagation();
    startPos.current = e.touches ? e.touches[0].clientX : e.clientX;
    setIsDragging(true);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const deltaX = clientX - startPos.current;
    setSettleX(Math.max(0, Math.min(deltaX, sliderMaxTrack)));
  };

  const handleEnd = (e) => {
    if (!isDragging) return;
    e.stopPropagation();
    setIsDragging(false);
    if (settleX >= sliderMaxTrack - 20) {
      triggerFeedback();
      onComplete();
    }
    setSettleX(0);
  };

  return (
    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
      <div
        className="relative w-full h-11 bg-black/70 border border-white/20 rounded-2xl flex items-center px-2 overflow-hidden backdrop-blur-md select-none"
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <div
          className="absolute left-0 top-0 bottom-0 bg-emerald-500/30 transition-all pointer-events-none"
          style={{ width: `${settleX + 24}px` }}
        />
        <span className="w-full text-center text-xs font-bold uppercase tracking-wider text-emerald-300 pointer-events-none pl-4">
          Slide to Settle ➔
        </span>
        <div
          onMouseDown={handleStart}
          onTouchStart={handleStart}
          style={{
            transform: `translateX(${settleX}px)`,
            transition: isDragging ? 'none' : 'transform 0.2s ease-out',
          }}
          className="absolute left-1.5 w-8 h-8 bg-emerald-400 text-black rounded-xl shadow-lg flex items-center justify-center cursor-grab font-black text-base active:cursor-grabbing"
        >
          ✓
        </div>
      </div>
    </div>
  );
}