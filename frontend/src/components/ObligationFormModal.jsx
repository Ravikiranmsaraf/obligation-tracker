import { useState, useEffect } from 'react';
import { useVoiceObligation } from '../hooks/useVoiceObligation';
import { STANDARD_CATEGORIES } from '../constants/categories';
import { STANDARD_FREQUENCIES } from '../constants/frequencies';
import { useSubscription } from '../hooks/useSubscription';
import PaywallModal from './PaywallModal';

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const WEEKDAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export default function ObligationFormModal({
  editingItem,
  activeTheme,
  currencySymbol,
  onSave,
  onCancel,
  saving,
  user
}) {
  const { subscription, toggleMockPro } = useSubscription(user?.id);
  const [showPaywall, setShowPaywall] = useState(false);

  const [activeTab, setActiveTab] = useState(
    editingItem ? 'form' : subscription.isPro ? 'voice' : 'form'
  );

  const defaultCategory = STANDARD_CATEGORIES[0] || 'Other';

  const [formData, setFormData] = useState({
    name: '',
    type: 'bill', // First selection default
    category: defaultCategory,
    expected_amount: '',
    due_day: new Date().getDate(),
    due_month: new Date().getMonth() + 1,
    due_weekday: 1, // Default Monday for weekly
    frequency: 'monthly',
    reminder_time: '09:00',
  });

  const {
    isListening,
    isProcessing,
    statusMessage,
    startVoice,
    stopVoice,
    transcript,
    processTranscript,
  } = useVoiceObligation((extractedData) => {
    const extractedTime = extractedData?.reminder_time || extractedData?.due_time || '09:00';
    setFormData((prev) => ({
      ...prev,
      ...extractedData,
      reminder_time: extractedTime,
    }));
    setActiveTab('form');
  });

  useEffect(() => {
    if (transcript && !isListening) {
      processTranscript(transcript);
    }
  }, [transcript, isListening]);

  useEffect(() => {
    if (editingItem) {
      const isEvent = editingItem.type === 'event' || Number(editingItem.expected_amount) === 0;
      const timeValue = editingItem.reminder_time || editingItem.due_time || '09:00';
      const safeCategory = STANDARD_CATEGORIES.includes(editingItem.category) ? editingItem.category : defaultCategory;

      setFormData({
        name: editingItem.name || '',
        type: isEvent ? 'event' : 'bill',
        category: safeCategory,
        expected_amount: isEvent ? '' : (editingItem.expected_amount?.toString() ?? ''),
        due_day: editingItem.due_day || new Date().getDate(),
        due_month: editingItem.due_month || (new Date().getMonth() + 1),
        due_weekday: editingItem.due_weekday || 1,
        frequency: editingItem.frequency || 'monthly',
        reminder_time: timeValue,
      });
      setActiveTab('form');
    } else {
      setFormData({
        name: '',
        type: 'bill',
        category: defaultCategory,
        expected_amount: '',
        due_day: new Date().getDate(),
        due_month: new Date().getMonth() + 1,
        due_weekday: 1,
        frequency: 'monthly',
        reminder_time: '09:00',
      });
      setActiveTab(subscription.isPro ? 'voice' : 'form');
    }
  }, [editingItem, defaultCategory, subscription.isPro]);

  const handleTabChange = (tabKey) => {
    if (tabKey === 'voice' && !subscription.isPro) {
      setShowPaywall(true);
      return;
    }
    setActiveTab(tabKey);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      expected_amount: formData.type === 'event' ? null : Number(formData.expected_amount) || 0,
    };
    onSave(payload);
  };

  return (
    <div className={`${activeTheme.card} rounded-3xl border p-6 mb-6 shadow-2xl transition-all`}>
      {!editingItem && (
        <div className="grid grid-cols-2 gap-2 bg-black/10 dark:bg-black/50 p-1 rounded-2xl border border-black/10 dark:border-white/10 mb-5">
          <button
            type="button" onClick={() => handleTabChange('voice')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1 ${
              activeTab === 'voice' ? 'bg-emerald-400 text-black shadow-md' : `${activeTheme.subText} hover:opacity-80`
            }`}
          >
            <span>🎙️ Voice Mode</span>
            {!subscription.isPro && <span className="text-[9px] bg-black/20 text-black px-1 rounded">PRO 👑</span>}
          </button>
          <button
            type="button" onClick={() => handleTabChange('form')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'form' ? 'bg-zinc-800 text-white shadow-md border border-white/10' : `${activeTheme.subText} hover:opacity-80`
            }`}
          >
            ✏️ Short Form
          </button>
        </div>
      )}

      <h2 className="text-lg font-bold mb-4">
        {editingItem ? 'Edit Reminder' : activeTab === 'voice' ? 'Add via Voice' : 'Add New Reminder'}
      </h2>

      {activeTab === 'voice' && !editingItem ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <button
            type="button" onClick={isListening ? stopVoice : startVoice} disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all transform active:scale-95 ${
              isListening ? 'bg-red-500 animate-pulse text-white ring-8 ring-red-500/20' : isProcessing ? 'bg-yellow-500 animate-spin text-black' : 'bg-emerald-400 hover:bg-emerald-300 text-black'
            }`}
          >
            {isListening ? '🛑' : isProcessing ? '⏳' : '🎙️'}
          </button>
          <p className="text-sm font-semibold">{isListening ? 'Listening... Speak now' : isProcessing ? 'Analyzing speech...' : 'Tap microphone to speak'}</p>
          {statusMessage && <p className="text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl max-w-xs">{statusMessage}</p>}
          <div className="w-full flex justify-center pt-2">
            <button type="button" onClick={onCancel} className={`font-semibold text-xs px-5 py-2.5 rounded-xl transition-all border ${activeTheme.card}`}>Cancel</button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* 1. TYPE SELECTION FIRST */}
          <div>
            <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1.5`}>Type (Select First)</label>
            <div className="grid grid-cols-2 gap-2 bg-black/5 dark:bg-black/40 p-1 rounded-xl border border-black/10 dark:border-white/10">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'bill' }))}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                  formData.type === 'bill' ? 'bg-emerald-400 text-black shadow-md' : `${activeTheme.subText} hover:opacity-80`
                }`}
              >
                💳 Bill / Financial
              </button>
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'event', expected_amount: '' }))}
                className={`py-2.5 text-xs font-bold rounded-lg transition-all ${
                  formData.type === 'event' ? 'bg-emerald-400 text-black shadow-md' : `${activeTheme.subText} hover:opacity-80`
                }`}
              >
                🎂 Event / Task
              </button>
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>Name</label>
            <input
              type="text" required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
              placeholder={formData.type === 'event' ? "e.g., Bring Milk, Doctor Appointment" : "e.g., Electricity Bill, House Rent"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
              >
                {STANDARD_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
              >
                {STANDARD_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value} className="bg-white dark:bg-zinc-900 text-slate-900 dark:text-white">
                    {freq.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SMART FREQUENCY-DRIVEN ROTATING DATE-TIME SELECTORS */}
          <div className="p-4 rounded-2xl border border-emerald-500/30 bg-black/20 dark:bg-white/5 space-y-3">
            <label className={`block text-xs font-bold uppercase tracking-wider text-emerald-400`}>
              📅 Smart Date & Time Selector ({formData.frequency})
            </label>

            {/* MONTHLY: Date (1-31) + Time */}
            {formData.frequency === 'monthly' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Day of Month</span>
                  <input
                    type="number" min="1" max="31" required
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: Number(e.target.value) })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  />
                </div>
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Time</span>
                  <input
                    type="time" required
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  />
                </div>
              </div>
            )}

            {/* WEEKLY: Sunday..Saturday + Time */}
            {formData.frequency === 'weekly' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Day of Week</span>
                  <select
                    value={formData.due_weekday}
                    onChange={(e) => setFormData({ ...formData, due_weekday: Number(e.target.value) })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  >
                    {WEEKDAYS.map((w) => (
                      <option key={w.value} value={w.value}>{w.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Time</span>
                  <input
                    type="time" required
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  />
                </div>
              </div>
            )}

            {/* YEARLY or QUARTERLY: Month + Date + Time */}
            {(formData.frequency === 'yearly' || formData.frequency === 'quarterly') && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Month</span>
                  <select
                    value={formData.due_month}
                    onChange={(e) => setFormData({ ...formData, due_month: Number(e.target.value) })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Day</span>
                  <input
                    type="number" min="1" max="31" required
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: Number(e.target.value) })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  />
                </div>
                <div>
                  <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Time</span>
                  <input
                    type="time" required
                    value={formData.reminder_time}
                    onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                    className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                  />
                </div>
              </div>
            )}

            {/* DAILY or ONE-OFF */}
            {(formData.frequency === 'daily' || formData.frequency === 'one-off') && (
              <div>
                <span className={`text-[10px] ${activeTheme.subText} font-semibold block mb-1 text-center`}>Time</span>
                <input
                  type="time" required
                  value={formData.reminder_time}
                  onChange={(e) => setFormData({ ...formData, reminder_time: e.target.value })}
                  className={`w-full p-2.5 text-xs rounded-xl text-center font-bold border ${activeTheme.inputBg}`}
                />
              </div>
            )}
          </div>

          {/* CONDITIONAL AMOUNT FIELD: ONLY SHOWN FOR BILLS */}
          {formData.type === 'bill' && (
            <div>
              <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>
                Amount ({currencySymbol})
              </label>
              <input
                type="number" required min="0" step="0.01"
                value={formData.expected_amount}
                onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
                placeholder="e.g., 599"
              />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onCancel}
              className={`w-1/3 font-semibold px-4 py-3 rounded-xl transition-all border ${activeTheme.card}`}
            >
              Cancel
            </button>
            <button
              type="submit" disabled={saving}
              className="w-2/3 bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 text-black font-extrabold px-4 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md"
            >
              {saving ? 'Saving...' : editingItem ? 'Update Reminder' : 'Save Reminder'}
            </button>
          </div>
        </form>
      )}

      <PaywallModal
        isOpen={showPaywall} onClose={() => setShowPaywall(false)}
        user={user} onUpgradeSuccess={toggleMockPro} activeTheme={activeTheme}
      />
    </div>
  );
}