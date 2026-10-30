import React from 'react';

export default function TapToSpeakPillBar({
  onVoiceClick,
  onOpenForm,
  isPro = false,
  activeTheme,
}) {
  return (
    <div className="w-full">
      {/* Hero Background Pill Bar (Single Line Search-Bar Pattern) */}
      <div
        onClick={onOpenForm}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-full border shadow-lg transition-all cursor-pointer group bg-gradient-to-r from-[#6556e8]/10 via-zinc-900/40 to-emerald-500/10 ${
          activeTheme?.card || 'bg-zinc-900 border-zinc-800'
        } hover:border-[#6556e8]/50`}
      >
        {/* Left Side: Microphone Icon (Voice Trigger) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onVoiceClick(e);
          }}
          className="w-8 h-8 rounded-full bg-gradient-to-r from-[#6556e8] to-[#5344d6] hover:from-[#5344d6] hover:to-[#4233c5] text-white flex items-center justify-center transition-all active:scale-90 shadow-xs shrink-0"
          title="Tap to speak reminder"
        >
          <span className="text-xs">🎙️</span>
        </button>

        {/* Center: Centered Placeholder text */}
        <div className="flex-1 text-center px-2 min-w-0">
          <span
            className={`text-xs sm:text-sm font-semibold tracking-tight truncate select-none ${
              activeTheme?.subText || 'text-zinc-400'
            } group-hover:text-emerald-400 transition-colors`}
          >
            Tap to add reminder...
          </span>
        </div>

        {/* Right Side: Text Input / Keyboard Icon + Pro Badge */}
        <div className="flex items-center gap-2 shrink-0">
          {!isPro && (
            <span className="text-[9px] bg-[#6556e8]/20 text-[#6556e8] px-1.5 py-0.5 rounded font-extrabold tracking-wider">
              PRO
            </span>
          )}
          <div
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-300 hover:text-emerald-400 border border-white/10 flex items-center justify-center text-xs transition-all"
            title="Type reminder"
          >
            ✏️
          </div>
        </div>
      </div>
    </div>
  );
}