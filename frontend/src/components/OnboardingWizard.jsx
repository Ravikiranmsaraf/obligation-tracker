// src/components/OnboardingWizard.jsx
import { useState } from 'react';
import { GEN_Z_THEMES, CATEGORY_ICONS, STANDARD_CATEGORIES } from '../constants/categories';
import { WORLD_CURRENCIES } from '../constants/currencies';
import { obligationsService } from '../services/obligationsService';
import { supabase } from '../lib/supabase';

const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'US / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+971', label: 'United Arab Emirates (+971)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+81', label: 'Japan (+81)' },
];

const MONTHS = [
  { value: 1, label: 'Jan' },
  { value: 2, label: 'Feb' },
  { value: 3, label: 'Mar' },
  { value: 4, label: 'Apr' },
  { value: 5, label: 'May' },
  { value: 6, label: 'Jun' },
  { value: 7, label: 'Jul' },
  { value: 8, label: 'Aug' },
  { value: 9, label: 'Sep' },
  { value: 10, label: 'Oct' },
  { value: 11, label: 'Nov' },
  { value: 12, label: 'Dec' },
];

const PRESETS = [
  { name: 'House Rent', category: 'Bills', defaultDay: 1, defaultMonth: 1, defaultAmount: 15000, frequency: 'monthly', type: 'bill' },
  { name: 'Electricity Bill', category: 'Bills', defaultDay: 5, defaultMonth: 1, defaultAmount: 1500, frequency: 'monthly', type: 'bill' },
  { name: 'OTT Subscription', category: 'Subscriptions', defaultDay: 1, defaultMonth: 1, defaultAmount: 599, frequency: 'monthly', type: 'bill' },
  { name: "Spouse's Birthday 🎂", category: 'Personal', defaultDay: 15, defaultMonth: 3, defaultAmount: 0, frequency: 'yearly', type: 'event' },
  { name: 'Wedding Anniversary 💍', category: 'Personal', defaultDay: 10, defaultMonth: 11, defaultAmount: 0, frequency: 'yearly', type: 'event' },
  { name: 'Health Checkup', category: 'Health', defaultDay: 10, defaultMonth: 6, defaultAmount: 2500, frequency: 'yearly', type: 'bill' },
];

export default function OnboardingWizard({
  user,
  currentThemeKey,
  onSelectTheme,
  currentCurrency,
  onSelectCurrency,
  onNext,
}) {
  const [step, setStep] = useState(1);
  const [addedPresetNames, setAddedPresetNames] = useState(new Set());
  const [addedItems, setAddedItems] = useState([]);
  const [editingPreset, setEditingPreset] = useState(null);

  const [phonePrefix, setPhonePrefix] = useState('+91');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Friend';
  const firstName = rawName.split(' ')[0];

  const activeTheme = GEN_Z_THEMES[currentThemeKey] || GEN_Z_THEMES.light;
  const cardClass = activeTheme?.card || 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const subTextClass = activeTheme?.subText || 'text-slate-500';
  const inputBgClass = activeTheme?.inputBg || 'bg-white border-slate-200 text-slate-900 shadow-sm';
  const primaryBtnClass = activeTheme?.primary || 'bg-slate-900 text-white hover:bg-slate-800';

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  const handleSelectPreset = (preset) => {
    if (addedPresetNames.has(preset.name)) return;
    setEditingPreset({
      name: preset.name,
      category: STANDARD_CATEGORIES.includes(preset.category) ? preset.category : 'Other',
      dueDay: preset.defaultDay,
      dueMonth: preset.defaultMonth,
      dueYear: new Date().getFullYear(),
      amount: preset.defaultAmount,
      frequency: preset.frequency,
      type: preset.type,
      dueTime: '09:00',
    });
  };

  const handleSaveObligation = async (itemData) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const parsedAmount = parseFloat(itemData.amount) || 0;
      const parsedDay = parseInt(itemData.dueDay, 10) || 1;
      const parsedMonth = parseInt(itemData.dueMonth, 10) || (new Date().getMonth() + 1);
      const parsedYear = parseInt(itemData.dueYear, 10) || new Date().getFullYear();

      const safeCategory = STANDARD_CATEGORIES.includes(itemData.category) ? itemData.category : 'Other';

      const payload = {
        name: itemData.name,
        category: safeCategory,
        due_day: itemData.frequency === 'daily' ? null : parsedDay,
        due_month: itemData.frequency === 'daily' || itemData.frequency === 'monthly' ? null : parsedMonth,
        due_year: itemData.frequency === 'one-off' ? parsedYear : null,
        reminder_time: itemData.dueTime || '09:00',
        expected_amount: parsedAmount,
        amount: parsedAmount,
        frequency: itemData.frequency || 'monthly',
        type: itemData.type || (parsedAmount > 0 ? 'bill' : 'event'),
      };

      await obligationsService.saveObligation(user.id, payload);
      setAddedItems((prev) => [...prev, payload]);
      setAddedPresetNames((prev) => new Set(prev).add(itemData.name));
      setEditingPreset(null);
    } catch (err) {
      console.error('Failed to save onboarding reminder:', err);
      alert('Could not add reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeSetup = async (e) => {
    e.preventDefault();
    if (addedItems.length === 0) {
      setError('Please add at least one preset to continue.');
      return;
    }
    setSaving(true);
    setError('');

    const cleanedDigits = phoneNumber.replace(/\D/g, '');
    if (cleanedDigits.length < 7) {
      setError('Please enter a valid phone number.');
      setSaving(false);
      return;
    }

    const fullCleanedPhone = `${phonePrefix.replace('+', '')}${cleanedDigits}`;

    try {
      const { error: profileErr } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          email: user.email,
          phone_number: fullCleanedPhone,
          timezone: detectedTimezone,
          theme_preference: currentThemeKey,
          currency_symbol: currentCurrency,
          updated_at: new Date().toISOString(),
        });

      if (profileErr) throw profileErr;

      await supabase
        .from('whatsapp_sessions')
        .upsert(
          { phone_number: `+${fullCleanedPhone}`, user_id: user.id, step: 'idle', payload: {} },
          { onConflict: 'phone_number' }
        );

      onNext();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-bold opacity-60">
          <span>STEP 1 OF 4</span>
          <span>Appearance</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Welcome, {firstName}! 👋</h2>
          <p className={`text-xs ${subTextClass} mt-1`}>Choose your preferred aesthetic theme.</p>
        </div>
        <div className="space-y-2">
          {themeOptions.map(({ key, label }) => {
            const isSelected = currentThemeKey === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTheme(key)}
                className={`w-full p-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : `${inputBgClass} ${subTextClass} hover:opacity-80`
                }`}
              >
                <span>{label}</span>
                {isSelected && <span>✓</span>}
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setStep(2)}
          className={`w-full ${primaryBtnClass} font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs`}
        >
          Next: Currency ➔
        </button>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-bold opacity-60">
          <span>STEP 2 OF 4</span>
          <span>Currency</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Select Preferred Currency 💱</h2>
          <p className={`text-xs ${subTextClass} mt-1`}>Used for formatting expenses and bill targets.</p>
        </div>
        <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
          {WORLD_CURRENCIES.map(({ symbol, code, name }) => {
            const isSelected = currentCurrency === symbol;
            return (
              <button
                key={code}
                type="button"
                onClick={() => onSelectCurrency(symbol)}
                className={`p-3 rounded-xl border text-xs font-bold text-left flex justify-between items-center transition-all ${
                  isSelected ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600' : `${inputBgClass} ${subTextClass} hover:opacity-80`
                }`}
              >
                <span className="truncate">{symbol} - {name}</span>
                {isSelected && <span>✓</span>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setStep(1)} className={`w-1/3 py-3 font-bold rounded-xl text-xs border ${cardClass}`}>Back</button>
          <button type="button" onClick={() => setStep(3)} className={`w-2/3 ${primaryBtnClass} font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs`}>Next: Presets ➔</button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-bold opacity-60">
          <span>STEP 3 OF 4</span>
          <span>Presets & Reminders</span>
        </div>
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Quick Presets ⚡</h2>
          <p className={`text-xs ${subTextClass} mt-1`}>Tap at least one preset to continue.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const isAlreadyAdded = addedPresetNames.has(preset.name);
            const icon = CATEGORY_ICONS[preset.category] || '📌';
            return (
              <button
                key={preset.name}
                type="button"
                disabled={isAlreadyAdded}
                onClick={() => handleSelectPreset(preset)}
                className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                  isAlreadyAdded ? 'opacity-50 bg-emerald-500/10 border-emerald-500/30 cursor-not-allowed' : `hover:border-emerald-500/50 ${inputBgClass}`
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{icon}</span>
                  <span className="text-xs font-bold line-clamp-1">{preset.name}</span>
                </div>
                <span className={`text-[10px] ${subTextClass} mt-1 capitalize`}>
                  {isAlreadyAdded ? 'Added ✓' : `${preset.frequency} • ${preset.defaultAmount > 0 ? `${currentCurrency}${preset.defaultAmount}` : 'Task'}`}
                </span>
              </button>
            );
          })}
        </div>

        {editingPreset && (
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Configure "{editingPreset.name}"</h3>
              <button type="button" onClick={() => setEditingPreset(null)} className={`text-xs ${subTextClass} hover:opacity-80`}>✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {editingPreset.frequency === 'monthly' && (
                <div className="col-span-2">
                  <label className={`text-[10px] ${subTextClass} font-bold block mb-1`}>Day of Month</label>
                  <input
                    type="number" min="1" max="31"
                    value={editingPreset.dueDay}
                    onChange={(e) => setEditingPreset({ ...editingPreset, dueDay: e.target.value })}
                    className={`w-full p-2 text-xs rounded-xl border ${inputBgClass}`}
                  />
                </div>
              )}
              {editingPreset.frequency === 'yearly' && (
                <>
                  <div>
                    <label className={`text-[10px] ${subTextClass} font-bold block mb-1`}>Month</label>
                    <select
                      value={editingPreset.dueMonth}
                      onChange={(e) => setEditingPreset({ ...editingPreset, dueMonth: e.target.value })}
                      className={`w-full p-2 text-xs rounded-xl border ${inputBgClass}`}
                    >
                      {MONTHS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={`text-[10px] ${subTextClass} font-bold block mb-1`}>Day</label>
                    <input
                      type="number" min="1" max="31"
                      value={editingPreset.dueDay}
                      onChange={(e) => setEditingPreset({ ...editingPreset, dueDay: e.target.value })}
                      className={`w-full p-2 text-xs rounded-xl border ${inputBgClass}`}
                    />
                  </div>
                </>
              )}
              <div className="col-span-2">
                <label className={`text-[10px] ${subTextClass} font-bold block mb-1`}>Reminder Time</label>
                <input
                  type="time"
                  value={editingPreset.dueTime}
                  onChange={(e) => setEditingPreset({ ...editingPreset, dueTime: e.target.value })}
                  className={`w-full p-2 text-xs rounded-xl border ${inputBgClass}`}
                />
              </div>
              {editingPreset.type === 'bill' && (
                <div className="col-span-2">
                  <label className={`text-[10px] ${subTextClass} font-bold block mb-1`}>Expected Amount ({currentCurrency})</label>
                  <input
                    type="number"
                    value={editingPreset.amount}
                    onChange={(e) => setEditingPreset({ ...editingPreset, amount: e.target.value })}
                    className={`w-full p-2 text-xs rounded-xl border ${inputBgClass}`}
                  />
                </div>
              )}
            </div>
            <button
              type="button" disabled={saving}
              onClick={() => handleSaveObligation(editingPreset)}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-2 rounded-xl text-xs transition-all shadow-sm"
            >
              {saving ? 'Adding...' : 'Confirm & Add Preset'}
            </button>
          </div>
        )}

        {addedItems.length > 0 && (
          <div className="space-y-2 pt-2">
            <span className={`text-[11px] font-extrabold ${subTextClass}`}>Configured Reminders ({addedItems.length}):</span>
            <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
              {addedItems.map((item, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 space-y-1 text-xs">
                  <div className="flex justify-between items-center font-bold">
                    <span className="truncate">{item.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">🔔 {item.reminder_time}</span>
                  </div>
                  <div className={`flex flex-wrap gap-2 text-[10px] ${subTextClass}`}>
                    <span className="capitalize bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded">🔁 {item.frequency}</span>
                    <span>📂 {item.category}</span>
                    {item.amount > 0 && <span className="text-emerald-600 font-bold">💰 {currentCurrency}{item.amount}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {addedItems.length === 0 && (
          <p className="text-xs text-amber-500 font-bold text-center">⚠️ Please add at least one preset above to proceed.</p>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => setStep(2)} className={`w-1/3 py-3 font-bold rounded-xl text-xs border ${cardClass}`}>Back</button>
          <button
            type="button"
            disabled={addedItems.length === 0}
            onClick={() => setStep(4)}
            className={`w-2/3 ${primaryBtnClass} font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs disabled:opacity-50`}
          >
            Next: WhatsApp Link ➔
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleFinalizeSetup} className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5 box-border`}>
      <div className="flex justify-between items-center text-xs font-bold opacity-60">
        <span>STEP 4 OF 4</span>
        <span>WhatsApp Link</span>
      </div>
      <div>
        <h2 className="text-xl font-extrabold tracking-tight">Connect WhatsApp 📱</h2>
        <p className={`text-xs ${subTextClass} mt-1`}>Get instant reminder alerts directly on WhatsApp.</p>
      </div>
      <div className="space-y-3 w-full">
        <div className="flex flex-col sm:flex-row gap-2 w-full">
          <select
            value={phonePrefix}
            onChange={(e) => setPhonePrefix(e.target.value)}
            className={`p-3 text-xs rounded-xl border ${inputBgClass} shrink-0`}
          >
            {COUNTRY_CODES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <input
            type="tel" required placeholder="9876543210"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            className={`w-full min-w-0 flex-1 p-3 text-xs rounded-xl border ${inputBgClass} box-border`}
          />
        </div>
        {error && <p className="text-xs text-red-500 font-bold">{error}</p>}
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={() => setStep(3)} className={`w-1/3 py-3 font-bold rounded-xl text-xs border ${cardClass}`}>Back</button>
        <button type="submit" disabled={saving} className={`w-2/3 ${primaryBtnClass} font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-xs`}>
          {saving ? 'Saving...' : 'Finish Setup 🚀'}
        </button>
      </div>
    </form>
  );
}