import React from 'react';
import { GEN_Z_THEMES } from '../constants/categories';

export default function SettingsModal({
  isOpen,
  onClose,
  currentThemeKey,
  onSelectTheme,
  currencySymbol,
  onSelectCurrency,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 text-gray-100 shadow-xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">App Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-lg">
            ✕
          </button>
        </div>

        {/* Theme Chooser */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            GenZ Theme Aesthetic
          </label>
          <div className="space-y-2">
            {Object.keys(GEN_Z_THEMES).map((key) => (
              <button
                key={key}
                onClick={() => onSelectTheme(key)}
                className={`w-full p-3 rounded-xl text-left text-xs font-bold border flex justify-between items-center ${
                  currentThemeKey === key
                    ? 'border-white bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-gray-400'
                }`}
              >
                {GEN_Z_THEMES[key].name}
                {currentThemeKey === key && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Currency Picker */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Currency Symbol
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['₹', '$', '€', '£'].map((symbol) => (
              <button
                key={symbol}
                onClick={() => onSelectCurrency(symbol)}
                className={`py-2 rounded-xl text-sm font-bold border ${
                  currencySymbol === symbol
                    ? 'border-white bg-zinc-800 text-white'
                    : 'border-zinc-800 bg-zinc-950 text-gray-400'
                }`}
              >
                {symbol}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-white text-black font-bold rounded-xl text-xs hover:bg-gray-200 transition-colors"
        >
          Save & Done
        </button>
      </div>
    </div>
  );
}