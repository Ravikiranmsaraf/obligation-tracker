import React from 'react';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/categories';

export default function CategoryBadgeBar({ cycles = [] }) {
  // Count items per category
  const categoryCounts = cycles.reduce((acc, item) => {
    const cat = item.category || 'Other';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const activeCategories = Object.keys(categoryCounts);

  if (activeCategories.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {activeCategories.map((categoryKey) => {
        const count = categoryCounts[categoryKey];
        const icon = CATEGORY_ICONS[categoryKey] || CATEGORY_ICONS.Other;
        const colors = CATEGORY_COLORS[categoryKey] || CATEGORY_COLORS.Other;

        return (
          <div
            key={categoryKey}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${colors.badge} backdrop-blur-sm`}
          >
            <span>{icon}</span>
            <span>{categoryKey}</span>
            <span className="ml-0.5 px-1.5 py-0.2 text-[10px] bg-black/40 rounded-full font-bold">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}