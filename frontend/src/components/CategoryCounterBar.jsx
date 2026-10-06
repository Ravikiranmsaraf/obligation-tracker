import { useMemo } from 'react';
import { STANDARD_CATEGORIES, CATEGORY_ICONS, GEN_Z_THEMES } from '../constants/categories';

export default function CategoryCounterBar({ cycles = [], themeKey = 'cyberLime' }) {
  const activeTheme = GEN_Z_THEMES[themeKey] || GEN_Z_THEMES.cyberLime;

  const currentCounts = useMemo(() => {
    const counts = STANDARD_CATEGORIES.reduce((acc, cat) => {
      acc[cat] = 0;
      return acc;
    }, {});

    cycles.forEach((item) => {
      const cat = item.category || 'Other';
      if (counts[cat] !== undefined) {
        counts[cat] += 1;
      } else {
        counts['Other'] = (counts['Other'] || 0) + 1;
      }
    });

    return counts;
  }, [cycles]);

  return (
    <div className="flex justify-between items-center gap-1.5 my-3 px-2 py-2.5 bg-black/40 backdrop-blur-md border-y border-white/10 overflow-x-auto no-scrollbar shadow-inner">
      {STANDARD_CATEGORIES.map((category) => {
        const icon = CATEGORY_ICONS[category] || '📌';
        const count = currentCounts[category] || 0;
        const hasPending = count > 0;

        return (
          <div
            key={category}
            className="relative flex flex-col items-center shrink-0 min-w-[52px]"
          >
            {/* Glossy Icon Container */}
            <div
              className={`w-10 h-10 rounded-full border flex items-center justify-center text-base shadow-lg relative transition-all duration-300 overflow-hidden ${
                hasPending
                  ? `${activeTheme.card} bg-gradient-to-b from-white/20 via-white/5 to-black/60 shadow-md ring-1 ring-white/20`
                  : 'bg-gradient-to-b from-zinc-800/40 to-zinc-950/80 border-white/5 opacity-50'
              }`}
            >
              {/* Top Gloss Reflection */}
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent rounded-t-full pointer-events-none" />

              <span className="drop-shadow-md z-10">{icon}</span>

              {/* Glossy Badge Counter */}
              <span
                className={`absolute top-0 right-0 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-md transition-all z-20 ${
                  hasPending
                    ? `${activeTheme.primary} shadow-sm ring-1 ring-black/50`
                    : 'bg-zinc-800 text-gray-400 border border-zinc-700'
                }`}
              >
                {count}
              </span>
            </div>

            <span className={`text-[9px] mt-1 font-semibold truncate max-w-[58px] text-center ${hasPending ? 'text-gray-200' : 'text-gray-500'}`}>
              {category}
            </span>
          </div>
        );
      })}
    </div>
  );
}