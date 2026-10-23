import { useState } from 'react';
import { GEN_Z_THEMES, CATEGORY_ICONS, STANDARD_CATEGORIES } from '../constants/categories';
import { WORLD_CURRENCIES } from '../constants/currencies';
import { obligationsService } from '../services/obligationsService';
import { supabase } from '../lib/supabase';

const PRESETS = [
  { name: 'House Rent', category: 'Bills', defaultDay: 1, defaultAmount: 15000, frequency: 'monthly' },
  { name: 'Electricity Bill', category: 'Bills', defaultDay: 2, defaultAmount: 1500, frequency: 'monthly' },
  { name: 'OTT Subscription', category: 'Subscriptions', defaultDay: 5, defaultAmount: 499, frequency: 'monthly' },
  { name: 'Car Insurance Renewal', category: 'Insurance', defaultDay: 15, defaultAmount: 8500, frequency: 'yearly' },
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
  const [addedItems, setAddedItems] = useState([]);
  const [editingPreset, setEditingPreset] = useState(null);

  // Custom Addition State
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customCategory, setCustomCategory] = useState('Bills');
  const [customDay, setCustomDay] = useState('5');
  const [customTime, setCustomTime] = useState('09:00');
  const [customFrequency, setCustomFrequency] = useState('one-off');

  // WhatsApp & Profile State
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';

  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Friend';
  const firstName = rawName.split(' ')[0];

  const activeTheme = GEN_Z_THEMES[currentThemeKey] || GEN_Z_THEMES.light;
  const cardClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800 text-white';
  const subTextClass = activeTheme?.subText || 'text-gray-400';
  const inputBgClass = activeTheme?.inputBg || 'bg-zinc-950';

  const themeOptions = [
    { key: 'light', label: 'Clean Light ☀️' },
    { key: 'cyberLime', label: 'Cyber Dark 🌙' },
    { key: 'system', label: 'System Auto 💻' },
  ];

  const handleSelectPreset = (preset) => {
    setEditingPreset({
      name: preset.name,
      category: preset.category,
      dueDay: preset.defaultDay,
      amount: preset.defaultAmount,
      frequency: preset.frequency,
      dueTime: '09:00',
    });
  };

  const handleSaveObligation = async (itemData) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const parsedAmount = parseFloat(itemData.amount) || 0;
      const parsedDay = parseInt(itemData.dueDay, 10) || 1;
      const now = new Date();

      const payload = {
        name: itemData.name,
        category: itemData.category || 'Bills',
        due_day: parsedDay,
        due_month: now.getMonth() + 1,
        due_year: now.getFullYear(),
        reminder_time: itemData.dueTime || '09:00',
        expected_amount: parsedAmount,
        amount: parsedAmount,
        frequency: itemData.frequency || 'one-off',
        type: parsedAmount > 0 ? 'monetary' : 'event',
      };

      await obligationsService.saveObligation(user.id, payload);
      setAddedItems((prev) => [...prev, payload]);

      setEditingPreset(null);
      setCustomName('');
      setCustomAmount('');
    } catch (err) {
      console.error('Failed to save onboarding obligation:', err);
      alert('Could not add obligation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalizeSetup = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    const cleanedPhone = phoneNumber.replace(/\D/g, '');
    if (cleanedPhone.length < 10) {
      setError('Please enter a valid phone number with country code (e.g. 919876543210).');
      setSaving(false);
      return;
    }

    try {
      // 1. Save preferences, phone, and timezone to profiles table
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

      onNext();
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
      setError(err.message || 'Failed to save setup. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // --- STEP 1: APPEARANCE (THEME) ---
  if (step === 1) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
          <span>STEP 1 OF 4</span>
          <span className="text-emerald-400">Appearance</span>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight">
            Welcome, {firstName}! 👋
          </h2>
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
                  isSelected
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                    : `border-zinc-800 ${inputBgClass} ${subTextClass} hover:border-zinc-700`
                }`}
              >
                <span>{label}</span>
                {isSelected && <span className="text-emerald-400">✓</span>}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setStep(2)}
          className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-400/20 text-sm"
        >
          Next: Currency ➔
        </button>
      </div>
    );
  }

  // --- STEP 2: CURRENCY ---
  if (step === 2) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
          <span>STEP 2 OF 4</span>
          <span className="text-emerald-400">Currency</span>
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight">
            Select Currency 💱
          </h2>
          <p className={`text-xs ${subTextClass} mt-1`}>Select your preferred currency for bills and amounts.</p>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
          {WORLD_CURRENCIES.map(({ code, symbol, name }) => (
            <button
              key={code}
              type="button"
              onClick={() => onSelectCurrency(symbol)}
              className={`w-full p-2.5 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
                currentCurrency === symbol
                  ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                  : `border-zinc-800 ${inputBgClass} ${subTextClass} hover:border-zinc-700`
              }`}
            >
              <span>{code} ({symbol}) - {name}</span>
              {currentCurrency === symbol && <span className="text-emerald-400">✓</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={() => setStep(1)}
            className={`w-1/3 py-3 font-semibold rounded-xl text-xs border ${cardClass}`}
          >
            ← Back
          </button>
          <button
            onClick={() => setStep(3)}
            className="w-2/3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-3 rounded-2xl text-xs transition-all shadow-md"
          >
            Next: WhatsApp ➔
          </button>
        </div>
      </div>
    );
  }

  // --- STEP 3: WHATSAPP PHONE & TIMEZONE CAPTURE ---
  if (step === 3) {
    return (
      <div className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
        <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
          <span>STEP 3 OF 4</span>
          <span className="text-emerald-400">WhatsApp Link</span>
        </div>

        <div>
          <h2 className="text-xl font-black tracking-tight">
            Connect WhatsApp 📱
          </h2>
          <p className={`text-xs ${subTextClass} mt-1`}>
            Enter your WhatsApp number so you can check and complete reminders via chat.
          </p>
        </div>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">{error}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1">WhatsApp Phone Number *</label>
            <input
              type="tel"
              placeholder="e.g. 919876543210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              required
              className={`w-full p-3 rounded-xl text-xs border ${inputBgClass} border-zinc-800 focus:border-emerald-400 outline-none`}
            />
            <p className={`text-[10px] ${subTextClass} mt-1`}>
              Include your country code without '+' or spaces (e.g., 91 for India, 1 for US).
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Detected Timezone</label>
            <input
              type="text"
              disabled
              value={detectedTimezone}
              className={`w-full p-3 rounded-xl text-xs border opacity-70 cursor-not-allowed ${inputBgClass} border-zinc-800`}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`w-1/3 py-3 font-semibold rounded-xl text-xs border ${cardClass}`}
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => {
              const cleaned = phoneNumber.replace(/\D/g, '');
              if (cleaned.length < 10) {
                setError('Please enter a valid phone number with country code before continuing.');
                return;
              }
              setError('');
              setStep(4);
            }}
            className="w-2/3 py-3 bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold rounded-xl text-xs transition-all shadow-md"
          >
            Next: Add Reminders ➔
          </button>
        </div>
      </div>
    );
  }

  // --- STEP 4: REMINDERS SEEDING & FINISH ---
  return (
    <form onSubmit={handleFinalizeSetup} className={`max-w-md w-full ${cardClass} rounded-3xl p-6 border shadow-2xl space-y-5`}>
      <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
        <span>STEP 4 OF 4</span>
        <span className="text-emerald-400">Add Reminders</span>
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight">
          Add at least 1 reminder 📌
        </h2>
        <p className={`text-xs ${subTextClass} mt-1`}>
          Tap a preset or create a custom reminder so your dashboard looks alive instantly.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className={`text-[10px] font-bold uppercase tracking-wider ${subTextClass}`}>
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isAdded = addedItems.some((i) => i.name === preset.name);
            return (
              <button
                key={preset.name}
                type="button"
                disabled={saving || isAdded}
                onClick={() => handleSelectPreset(preset)}
                className={`text-xs px-3 py-2 rounded-xl border flex items-center gap-1.5 transition-all ${
                  isAdded
                    ? 'bg-emerald-950/50 border-emerald-500 text-emerald-400 cursor-default'
                    : 'bg-zinc-800/80 border-zinc-700 text-gray-200 hover:border-emerald-400 hover:bg-zinc-800'
                }`}
              >
                <span>{CATEGORY_ICONS[preset.category] || '⚡'}</span>
                <span>{preset.name}</span>
                {isAdded ? '✓' : '+'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Preset Customization */}
      {editingPreset && (
        <div className={`${inputBgClass} border border-emerald-500/50 rounded-2xl p-3.5 space-y-3`}>
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400">✏ Adjust {editingPreset.name}</span>
            <button type="button" onClick={() => setEditingPreset(null)} className="text-xs text-gray-500 hover:text-white">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Due Day (1-31)</label>
              <input
                type="number"
                min="1"
                max="31"
                value={editingPreset.dueDay}
                onChange={(e) => setEditingPreset({ ...editingPreset, dueDay: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Amount ({currentCurrency})</label>
              <input
                type="number"
                value={editingPreset.amount}
                onChange={(e) => setEditingPreset({ ...editingPreset, amount: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSaveObligation(editingPreset)}
            disabled={saving || !editingPreset.amount || !editingPreset.dueDay}
            className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-2 rounded-xl text-xs"
          >
            {saving ? 'Adding...' : `Confirm & Add`}
          </button>
        </div>
      )}

      {/* Custom Addition Inputs */}
      {!editingPreset && (
        <div className="border-t border-zinc-800 pt-3 space-y-3">
          <label className={`text-[10px] font-bold uppercase tracking-wider ${subTextClass}`}>
            Or Add Custom Reminder
          </label>
          <input
            type="text"
            placeholder="Reminder name (e.g. Electric Bill)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white`}
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white`}
            >
              {STANDARD_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder={`Amount (${currentCurrency})`}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white`}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              placeholder="Day (1-31)"
              min="1"
              max="31"
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white text-center`}
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white text-center`}
            />
            <select
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value)}
              className={`w-full ${inputBgClass} border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white`}
            >
              <option value="one-off">One-off</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>
          <button
            type="button"
            disabled={saving || !customName.trim() || !customAmount}
            onClick={() =>
              handleSaveObligation({
                name: customName,
                category: customCategory,
                dueDay: customDay,
                dueTime: customTime,
                amount: customAmount,
                frequency: customFrequency,
              })
            }
            className="w-full bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold text-xs py-2.5 rounded-xl border border-zinc-700"
          >
            + Add Custom Item
          </button>
        </div>
      )}

      {addedItems.length > 0 && (
        <div className={`${inputBgClass} border border-zinc-800/80 rounded-2xl p-3 space-y-1`}>
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Added ({addedItems.length})</span>
          {addedItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-gray-300">
              <span>• {item.name} ({item.frequency})</span>
              <span className="font-semibold">{currentCurrency}{item.amount}</span>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={() => setStep(3)}
          className={`w-1/3 py-3 font-semibold rounded-xl text-xs border ${cardClass}`}
        >
          ← Back
        </button>
        
        {/* Finish button only enabled/shown when at least 1 reminder is added */}
        {addedItems.length > 0 ? (
          <button
            type="submit"
            disabled={saving}
            className="w-2/3 bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-3 rounded-2xl text-xs transition-all shadow-md"
          >
            {saving ? 'Finishing Up...' : 'Finish Setup 🎉'}
          </button>
        ) : (
          <div className="w-2/3 py-3 bg-zinc-800 text-gray-500 font-semibold rounded-xl text-xs text-center flex items-center justify-center cursor-not-allowed">
            Add 1 reminder to finish
          </div>
        )}
      </div>
    </form>
  );
}