import React from 'react';
import { STANDARD_CATEGORIES } from '../constants/categories';

export default function CategoryFilters({ selectedCategory, onSelectCategory, theme }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
      <button
        onClick={() => onSelectCategory('All')}
        className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
          selectedCategory === 'All'
            ? theme.primary
            : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
        }`}
      >
        All
      </button>
      {STANDARD_CATEGORIES.map((cat) => (
        <button
          key={cat}
          onClick={() => onSelectCategory(cat)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            selectedCategory === cat
              ? theme.primary
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
          }`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}