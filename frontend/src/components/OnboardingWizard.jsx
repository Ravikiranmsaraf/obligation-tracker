import { useState } from 'react';
import { GEN_Z_THEMES, CATEGORY_ICONS, STANDARD_CATEGORIES } from '../constants/categories';
import { obligationsService } from '../services/obligationsService';

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

  const [saving, setSaving] = useState(false);

  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Friend';
  const firstName = rawName.split(' ')[0];

  const currencies = [
    { symbol: '₹', label: 'INR (₹)' },
    { symbol: '$', label: 'USD ($)' },
    { symbol: '€', label: 'EUR (€)' },
    { symbol: '£', label: 'GBP (£)' },
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

  if (step === 1) {
    return (
      <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
          <span>STEP 1 OF 2</span>
          <span className="text-emerald-400">Personalize</span>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Welcome, {firstName}! 👋
          </h2>
          <p className="text-sm text-gray-400 mt-1">Let's configure Settld to match your style.</p>
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Preferred Currency
          </label>
          <div className="grid grid-cols-4 gap-2">
            {currencies.map((curr) => (
              <button
                key={curr.symbol}
                type="button"
                onClick={() => onSelectCurrency(curr.symbol)}
                className={`py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  currentCurrency === curr.symbol
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-950 text-gray-400 hover:border-zinc-700'
                }`}
              >
                {curr.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Aesthetic Theme
          </label>
          <div className="space-y-2">
            {Object.keys(GEN_Z_THEMES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTheme(key)}
                className={`w-full p-3 rounded-xl border text-xs font-bold flex justify-between items-center transition-all ${
                  currentThemeKey === key
                    ? 'border-emerald-400 bg-emerald-400/10 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-950 text-gray-400 hover:border-zinc-700'
                }`}
              >
                <span>{GEN_Z_THEMES[key].name}</span>
                {currentThemeKey === key && <span>✓</span>}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setStep(2)}
          className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-400/20 text-sm"
        >
          Next: Add Your Reminders ➔
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
      <div className="flex justify-between items-center text-xs font-semibold text-gray-400">
        <span>STEP 2 OF 2</span>
        <span className="text-emerald-400">Add Reminders</span>
      </div>

      <div>
        <h2 className="text-xl font-black tracking-tight text-white">
          Add at least 1 reminder 📌
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Tap a preset or create a custom reminder with your preferred category and frequency.
        </p>
      </div>

      {/* Quick Presets */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Quick Presets
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => {
            const isAdded = addedItems.some((i) => i.name === preset.name);
            return (
              <button
                key={preset.name}
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
        <div className="bg-zinc-950 border border-emerald-500/50 rounded-2xl p-3.5 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400">✏️️ Adjust {editingPreset.name}</span>
            <button onClick={() => setEditingPreset(null)} className="text-xs text-gray-500 hover:text-white">✕ Cancel</button>
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

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Due Time (24h)</label>
              <input
                type="time"
                value={editingPreset.dueTime}
                onChange={(e) => setEditingPreset({ ...editingPreset, dueTime: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Frequency</label>
              <select
                value={editingPreset.frequency}
                onChange={(e) => setEditingPreset({ ...editingPreset, frequency: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white"
              >
                <option value="one-off">One-off</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
          </div>

          <button
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
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Or Add Custom Reminder
          </label>
          <input
            type="text"
            placeholder="Reminder name (e.g. Electric Bill)"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={customCategory}
              onChange={(e) => setCustomCategory(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
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
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
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
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white text-center"
            />
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white text-center"
            />
            <select
              value={customFrequency}
              onChange={(e) => setCustomFrequency(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white"
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
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Added ({addedItems.length})</span>
          {addedItems.map((item, idx) => (
            <div key={idx} className="flex justify-between text-xs text-gray-300">
              <span>• {item.name} ({item.frequency})</span>
              <span className="font-semibold">{currentCurrency}{item.amount}</span>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onNext}
        disabled={addedItems.length === 0 || saving}
        className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-gray-500 text-black font-extrabold py-3.5 rounded-2xl text-sm transition-all"
      >
        Finish Setup 🎉
      </button>
    </div>
  );
}