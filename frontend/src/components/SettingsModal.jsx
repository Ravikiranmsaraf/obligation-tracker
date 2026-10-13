import React from 'react';

export default function SettingsModal({
  isOpen,
  onClose,
  currentThemeKey,
  onSelectTheme,
  currencySymbol,
  onSelectCurrency,
  onSignOut,
  user,
  activeTheme,
}) {
  if (!isOpen) return null;

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  // Pre-define theme token fallbacks to avoid inline parsing errors
  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className={`${cardClass} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all`}>
        <div className="flex justify-between items-center mb-5">
          <h3 className="text-lg font-bold">Profile & Settings</h3>
          <button onClick={onClose} className={`${subTextClass} hover:opacity-80 text-lg`}>
            ✕
          </button>
        </div>

        {/* User Profile Info */}
        {user && (
          <div className="mb-5 p-3 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-400 text-black font-extrabold flex items-center justify-center text-sm shadow-sm">
              {(user?.user_metadata?.full_name || user?.email || 'U')[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="font-bold text-xs truncate">{user?.user_metadata?.full_name || 'User'}</p>
              <p className={`text-[11px] truncate ${subTextClass}`}>{user?.email}</p>
            </div>
          </div>
        )}

        {/* Appearance & Theme Chooser */}
        <div className="mb-5">
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${subTextClass}`}>
            Appearance & Theme
          </label>
          <div className="space-y-2">
            {themeOptions.map(({ key, label }) => {
              const isSelected = currentThemeKey === key;
              const themeButtonClass = isSelected
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                : `border-black/10 dark:border-zinc-800 ${inputBgClass} ${subTextClass} hover:opacity-80`;

              return (
                <button
                  key={key}
                  onClick={() => onSelectTheme(key)}
                  className={`w-full p-3 rounded-xl text-left text-xs font-bold border flex justify-between items-center transition-all ${themeButtonClass}`}
                >
                  <span>{label}</span>
                  {isSelected && <span className="text-emerald-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Currency Picker */}
        <div className="mb-6">
          <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${subTextClass}`}>
            Currency Symbol
          </label>
          <div className="grid grid-cols-4 gap-2">
            {['₹', '$', '€', '£'].map((symbol) => {
              const isSelected = currencySymbol === symbol;
              const currencyButtonClass = isSelected
                ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                : `border-black/10 dark:border-zinc-800 ${inputBgClass} ${subTextClass} hover:opacity-80`;

              return (
                <button
                  key={symbol}
                  onClick={() => onSelectCurrency(symbol)}
                  className={`py-2 rounded-xl text-sm font-bold border transition-all ${currencyButtonClass}`}
                >
                  {symbol}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sign Out Action */}
        <div className="pt-2 border-t border-black/10 dark:border-white/10 mb-4">
          <button
            onClick={onSignOut}
            className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl text-xs transition-all border border-red-500/20 shadow-sm"
          >
            Sign Out 🚪
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95"
        >
          Save & Done
        </button>
      </div>
    </div>
  );
}