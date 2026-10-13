import { useState } from 'react';
import { GEN_Z_THEMES } from '../constants/categories';

export default function OnboardingWizard({
  user,
  currentThemeKey,
  onSelectTheme,
  currentCurrency,
  onSelectCurrency,
  onNext,
}) {
  const [step, setStep] = useState(1);

  const activeTheme = GEN_Z_THEMES[currentThemeKey] || GEN_Z_THEMES.light;
  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  return (
    <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl transition-all`}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-emerald-400 mb-1">Welcome to Settld</h1>
        <p className={`text-xs ${subTextClass}`}>Let's personalize your experience in 2 quick steps.</p>
      </div>

      {step === 1 && (
        <div className="space-y-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>Choose Appearance</h2>
          <div className="space-y-2">
            {themeOptions.map(({ key, label }) => {
              const isSelected = currentThemeKey === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => onSelectTheme(key)}
                  className={`w-full p-3 rounded-xl text-left text-xs font-bold border flex justify-between items-center transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : `border-black/10 dark:border-zinc-800 ${inputBgClass}${subTextClass}`
                  }`}
                >
                  <span>{label}</span>
                  {isSelected && <span className="text-emerald-400">✓</span>}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full mt-4 py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl text-xs transition-all shadow-md"
          >
            Next →
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>Select Currency</h2>
          <div className="grid grid-cols-4 gap-2">
            {['₹', '$', '€', '£'].map((symbol) => {
              const isSelected = currentCurrency === symbol;
              return (
                <button
                  key={symbol}
                  type="button"
                  onClick={() => onSelectCurrency(symbol)}
                  className={`py-3 rounded-xl text-sm font-bold border transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : `border-black/10 dark:border-zinc-800 ${inputBgClass}${subTextClass}`
                  }`}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={`w-1/3 py-3 font-semibold rounded-xl text-xs border ${cardClass}`}
            >
              ← Back
            </button>
            <button
              type="button"
              onClick={onNext}
              className="w-2/3 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md"
            >
              Get Started 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}