// src/components/OnboardingWizard.jsx
import { useState } from 'react';
import { GEN_Z_THEMES } from '../constants/categories';
import { WORLD_CURRENCIES } from '../constants/currencies';
import { supabase } from '../lib/supabase';

export default function OnboardingWizard({
  user,
  currentThemeKey,
  onSelectTheme,
  currentCurrency,
  onSelectCurrency,
  onComplete,
}) {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-detect timezone silently
  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const activeTheme = GEN_Z_THEMES[currentThemeKey] || GEN_Z_THEMES.light;
  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  const handleFinish = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number with country code (e.g. 919876543210).');
      setLoading(false);
      return;
    }

    try {
      // 1. Update profiles table with phone, timezone, theme, and currency
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          phone_number: cleanedPhone,
          timezone: detectedTimezone,
          theme_preference: currentThemeKey,
          currency_symbol: currentCurrency,
          updated_at: new Date().toISOString(),
        });

      if (profileErr) throw profileErr;

      // 2. Pre-create or link whatsapp_session so bot recognizes them instantly
      await supabase
        .from('whatsapp_sessions')
        .upsert({
          phone_number: `+${cleanedPhone}`,
          user_id: user.id,
          step: 'idle',
          payload: {}
        }, { onConflict: 'phone_number' });

      onComplete();
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl transition-all`}>
      <div className="text-center mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-emerald-400 mb-1">Welcome to Settld</h1>
        <p className={`text-xs ${subTextClass}`}>Let's personalize your workspace & connect WhatsApp.</p>
      </div>

      {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}

      {step === 1 && (
        <div className="space-y-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>1. Choose Appearance</h2>
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
                      : `border-black/10 dark:border-zinc-800 ${inputBgClass} ${subTextClass}`
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
          <h2 className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>2. Select Currency</h2>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {WORLD_CURRENCIES.map(({ code, symbol, name }) => {
              const isSelected = currentCurrency === symbol;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => onSelectCurrency(symbol)}
                  className={`w-full p-2.5 rounded-xl text-left text-xs font-bold border flex justify-between items-center transition-all ${
                    isSelected
                      ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                      : `border-black/10 dark:border-zinc-800 ${inputBgClass} ${subTextClass}`
                  }`}
                >
                  <span>{code} ({symbol}) - {name}</span>
                  {isSelected && <span className="text-emerald-400">✓</span>}
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
              onClick={() => setStep(3)}
              className="w-2/3 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md"
            >
              Next →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleFinish} className="space-y-4">
          <h2 className={`text-xs font-bold uppercase tracking-wider ${subTextClass}`}>3. WhatsApp & Timezone</h2>
          
          <div>
            <label className="block text-xs font-bold mb-1">WhatsApp Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className={`w-full p-3 rounded-xl text-xs border ${inputBgClass} border-black/10 dark:border-zinc-800 focus:border-emerald-400 outline-none`}
            />
            <p className={`text-[10px] ${subTextClass} mt-1`}>
              Required for WhatsApp integration to view and complete reminders on the go. Include country code without '+' or spaces.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Detected Timezone</label>
            <input
              type="text"
              disabled
              value={detectedTimezone}
              className={`w-full p-3 rounded-xl text-xs border opacity-70 cursor-not-allowed ${inputBgClass} border-black/10 dark:border-zinc-800`}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={loading}
              className={`w-1/3 py-3 font-semibold rounded-xl text-xs border ${cardClass}`}
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-2/3 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md disabled:opacity-50"
            >
              {loading ? 'Saving Setup...' : 'Get Started 🚀'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}