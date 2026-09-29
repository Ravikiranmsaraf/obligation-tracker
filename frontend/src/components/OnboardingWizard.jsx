import { useState } from 'react';
import { GEN_Z_THEMES, CATEGORY_ICONS } from '../constants/categories';
import { obligationsService } from '../services/obligationsService';

const PRESETS = [
  { name: 'House Rent', category: 'Housing', defaultDay: 1, defaultAmount: 15000 },
  { name: 'Electricity Bill', category: 'Utilities', defaultDay: 10, defaultAmount: 1500 },
  { name: 'Broadband WiFi', category: 'Utilities', defaultDay: 15, defaultAmount: 999 },
  { name: 'Mobile Recharge', category: 'Utilities', defaultDay: 5, defaultAmount: 699 },
  { name: 'OTT Subscriptions', category: 'Subscriptions', defaultDay: 20, defaultAmount: 499 },
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
  
  // Step 1 State
  const [birthday, setBirthday] = useState(() => localStorage.getItem('userBirthday') || '');

  // Active Editing Preset State
  const [editingPreset, setEditingPreset] = useState(null); // { name, category, dueDay, amount }
  
  // Custom Addition State
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customDay, setCustomDay] = useState('5');
  
  const [saving, setSaving] = useState(false);

  const rawName = user?.user_metadata?.full_name || user?.user_metadata?.name || 'Friend';
  const firstName = rawName.split(' ')[0];

  const currencies = [
    { symbol: '₹', label: 'INR (₹)' },
    { symbol: '$', label: 'USD ($)' },
    { symbol: '€', label: 'EUR (€)' },
    { symbol: '£', label: 'GBP (£)' },
  ];

  // Open inline editor for a preset
  const handleSelectPreset = (preset) => {
    setEditingPreset({
      name: preset.name,
      category: preset.category,
      dueDay: preset.defaultDay,
      amount: preset.defaultAmount,
    });
  };

  // Save Birthday to LocalStorage
  const handleSaveBirthday = (val) => {
    setBirthday(val);
    if (val) {
      localStorage.setItem('userBirthday', val);
    }
  };

  // Commit item to Supabase & local state
  const handleSaveObligation = async (itemData) => {
    if (!user?.id) return;
    setSaving(true);
    try {
      // FIX: Ensure expected_amount is explicitly mapped
      const parsedAmount = parseFloat(itemData.amount) || 0;

      const payload = {
        name: itemData.name,
        category: itemData.category || 'Utilities',
        due_day: parseInt(itemData.dueDay, 10),
        expected_amount: parsedAmount, // <--- Correct column name for obligations table
        amount: parsedAmount,          // Included for UI state display
        frequency: 'monthly',
      };

      await obligationsService.saveObligation(user.id, payload);
      setAddedItems((prev) => [...prev, payload]);
      
      // Reset forms
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

  // Calculate total monthly commitment
  const totalMonthlyCommitment = addedItems.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  // STEP 1: Personalization (Currency, Theme, Birthday)
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
          <p className="text-sm text-gray-400 mt-1">
            Let's get Settld configured to match your style.
          </p>
        </div>

        {/* Currency Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Select Currency
          </label>
          <div className="grid grid-cols-4 gap-2">
            {currencies.map((c) => (
              <button
                key={c.symbol}
                type="button"
                onClick={() => onSelectCurrency(c.symbol)}
                className={`py-2.5 rounded-2xl font-extrabold text-sm border transition-all ${
                  currentCurrency === c.symbol
                    ? 'bg-emerald-400 text-black border-emerald-400 shadow-lg shadow-emerald-400/20'
                    : 'bg-zinc-800 text-gray-300 border-zinc-700 hover:border-zinc-500'
                }`}
              >
                {c.symbol}
              </button>
            ))}
          </div>
        </div>

        {/* User Birthday Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
              Your Birthday 🎂 <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
          </div>
          <input
            type="date"
            value={birthday}
            onChange={(e) => handleSaveBirthday(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        {/* Theme Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-300">
            Choose Theme
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(GEN_Z_THEMES).map(([key, theme]) => (
              <button
                key={key}
                type="button"
                onClick={() => onSelectTheme(key)}
                className={`p-2.5 rounded-2xl border text-left flex items-center justify-between transition-all ${
                  currentThemeKey === key
                    ? 'border-emerald-400 bg-zinc-800 shadow-md'
                    : 'border-zinc-800 bg-zinc-950/50 hover:border-zinc-700'
                }`}
              >
                <span className="text-xs font-bold text-gray-200">{theme.name}</span>
                <div className={`w-3 h-3 rounded-full ${theme.card.split(' ')[0]}`} />
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

  // STEP 2: Reminders Addition with Preset Editing
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
          Tap a preset to customize amount & due date, or add a custom item.
        </p>
      </div>

      {/* Quick Presets Selection */}
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

      {/* Preset Customization Popover / Drawer */}
      {editingPreset && (
        <div className="bg-zinc-950 border border-emerald-500/50 rounded-2xl p-3.5 space-y-3 animate-in fade-in duration-200">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              ✏️ Adjust {editingPreset.name}
            </span>
            <button
              onClick={() => setEditingPreset(null)}
              className="text-xs text-gray-500 hover:text-white"
            >
              ✕ Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">Due Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={editingPreset.dueDay}
                onChange={(e) =>
                  setEditingPreset({ ...editingPreset, dueDay: e.target.value })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 block mb-1">
                Amount ({currentCurrency})
              </label>
              <input
                type="number"
                value={editingPreset.amount}
                onChange={(e) =>
                  setEditingPreset({ ...editingPreset, amount: e.target.value })
                }
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          <button
            onClick={() => handleSaveObligation(editingPreset)}
            disabled={saving || !editingPreset.amount || !editingPreset.dueDay}
            className="w-full bg-emerald-400 hover:bg-emerald-300 text-black font-extrabold py-2 rounded-xl text-xs transition-all"
          >
            {saving ? 'Adding...' : `Confirm & Add ${editingPreset.name}`}
          </button>
        </div>
      )}

      {/* Custom Addition Inputs */}
      {!editingPreset && (
        <div className="border-t border-zinc-800 pt-3 space-y-3">
          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Or Add Custom Reminder
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Bill name (e.g. Gym)"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
            <input
              type="number"
              placeholder={`Amount (${currentCurrency})`}
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs text-gray-400 whitespace-nowrap">Due Day:</span>
            <input
              type="number"
              min="1"
              max="31"
              value={customDay}
              onChange={(e) => setCustomDay(e.target.value)}
              className="w-16 bg-zinc-950 border border-zinc-800 rounded-xl px-2 py-1.5 text-xs text-white text-center focus:outline-none focus:border-emerald-400"
            />
            <button
              type="button"
              disabled={saving || !customName.trim() || !customAmount}
              onClick={() =>
                handleSaveObligation({
                  name: customName,
                  category: 'Utilities',
                  dueDay: customDay,
                  amount: customAmount,
                })
              }
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-emerald-400 font-bold text-xs py-2 rounded-xl border border-zinc-700"
            >
              + Add Item
            </button>
          </div>
        </div>
      )}

      {/* Added List Summary & Commitment Counter */}
      {addedItems.length > 0 && (
        <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-2xl p-3 space-y-2">
          <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
            <span className="text-emerald-400">Added Reminders ({addedItems.length})</span>
            <span className="text-gray-400">
              Total: {currentCurrency}{totalMonthlyCommitment.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {addedItems.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs text-gray-300">
                <span>• {item.name} (Due {item.due_day}th)</span>
                <span className="font-semibold">{currentCurrency}{item.amount}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Finish Button */}
      <button
        onClick={onNext}
        disabled={addedItems.length === 0 || saving}
        className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:bg-zinc-800 disabled:text-gray-500 disabled:cursor-not-allowed text-black font-extrabold py-3.5 rounded-2xl transition-all shadow-lg shadow-emerald-400/20 text-sm mt-2"
      >
        {addedItems.length === 0
          ? 'Add at least 1 reminder to finish'
          : `Finish Setup (${addedItems.length} Added) 🎉`}
      </button>
    </div>
  );
}