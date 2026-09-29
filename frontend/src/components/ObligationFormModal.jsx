import { useState, useEffect } from 'react';
import { useVoiceObligation } from '../hooks/useVoiceObligation';

const CATEGORIES = ['Bills', 'Subscriptions', 'Loans', 'Insurance', 'Personal', 'Events', 'Other'];

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

export default function ObligationFormModal({
  editingItem,
  cardThemeClass,
  currencySymbol,
  onSave,
  onCancel,
  saving
}) {
  const [activeTab, setActiveTab] = useState('form'); // 'form' or 'voice'
  const [formData, setFormData] = useState({
    name: '',
    type: 'bill',
    category: 'Bills',
    expected_amount: '',
    due_day: new Date().getDate(),
    due_month: new Date().getMonth() + 1,
    frequency: 'monthly',
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
    setFormData((prev) => ({
      ...prev,
      ...extractedData,
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
      const isEvent =
        editingItem.type === 'event' ||
        editingItem.category === 'Events' ||
        Number(editingItem.expected_amount) === 0;

      setFormData({
        name: editingItem.name || '',
        type: isEvent ? 'event' : 'bill',
        category: editingItem.category || (isEvent ? 'Events' : 'Bills'),
        expected_amount: isEvent ? '' : (editingItem.expected_amount?.toString() ?? ''),
        due_day: editingItem.due_day || new Date().getDate(),
        due_month: editingItem.due_month || (new Date().getMonth() + 1),
        frequency: editingItem.frequency || (isEvent ? 'yearly' : 'monthly'),
      });
    } else {
      setFormData({
        name: '',
        type: 'bill',
        category: 'Bills',
        expected_amount: '',
        due_day: new Date().getDate(),
        due_month: new Date().getMonth() + 1,
        frequency: 'monthly',
      });
    }
  }, [editingItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className={`${cardThemeClass} rounded-3xl border p-6 mb-6 shadow-2xl transition-all`}>
      {/* Mode Switcher */}
      {!editingItem && (
        <div className="grid grid-cols-2 gap-2 bg-black/50 p-1 rounded-2xl border border-white/10 mb-5">
          <button
            type="button"
            onClick={() => setActiveTab('form')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'form'
                ? 'bg-zinc-800 text-white shadow-md border border-white/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            ✏️ Short Form
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'voice'
                ? 'bg-emerald-400 text-black shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            🎙️ Voice Mode
          </button>
        </div>
      )}

      <h2 className="text-lg font-bold mb-4 text-white">
        {editingItem ? 'Edit Obligation' : activeTab === 'voice' ? 'Add via Voice' : 'Add New Obligation'}
      </h2>

      {activeTab === 'voice' && !editingItem ? (
        <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
          <button
            type="button"
            onClick={isListening ? stopVoice : startVoice}
            disabled={isProcessing}
            className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all transform active:scale-95 ${
              isListening
                ? 'bg-red-500 animate-pulse text-white ring-8 ring-red-500/20'
                : isProcessing
                ? 'bg-yellow-500 animate-spin text-black'
                : 'bg-emerald-400 hover:bg-emerald-300 text-black'
            }`}
          >
            {isListening ? '🛑' : isProcessing ? '⏳' : '🎙️'}
          </button>

          <p className="text-sm font-semibold text-gray-200">
            {isListening
              ? 'Listening... Speak now'
              : isProcessing
              ? 'Analyzing speech...'
              : 'Tap microphone to speak'}
          </p>

          {statusMessage && (
            <p className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-xl max-w-xs">
              {statusMessage}
            </p>
          )}

          <p className="text-xs text-gray-400 max-w-xs pt-2">
            Try saying: <br />
            <span className="italic text-gray-300">"Rent 1500 dollars due on the 5th"</span> or <span className="italic text-gray-300">"Mom's birthday on Oct 12th"</span>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">Type</label>
            <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: 'bill', frequency: 'monthly' }))}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  formData.type === 'bill'
                    ? 'bg-emerald-400 text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                💳 Bill / Financial
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    type: 'event',
                    expected_amount: '',
                    category: prev.category === 'Bills' ? 'Events' : prev.category,
                    frequency: 'yearly',
                  }))
                }
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  formData.type === 'event'
                    ? 'bg-emerald-400 text-black shadow-md'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🎂 Event / Reminder
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder={formData.type === 'event' ? "e.g., Mom's Birthday, Anniversary" : "e.g., House Rent, Netflix"}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">Frequency</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="monthly" className="bg-zinc-900 text-white">Monthly</option>
                <option value="quarterly" className="bg-zinc-900 text-white">Quarterly</option>
                <option value="yearly" className="bg-zinc-900 text-white">Yearly</option>
              </select>
            </div>
          </div>

          {/* Conditional Date & Amount Grid */}
          <div className="grid grid-cols-2 gap-4">
            {formData.type === 'bill' ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">
                    Amount ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.expected_amount}
                    onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                    className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="e.g., 1500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Due Day of Month</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="10"
                  />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Event Month</label>
                  <select
                    value={formData.due_month}
                    onChange={(e) => setFormData({ ...formData, due_month: Number(e.target.value) })}
                    className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  >
                    {MONTHS.map((m) => (
                      <option key={m.value} value={m.value} className="bg-zinc-900 text-white">
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Event Date</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    placeholder="15"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 mt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="w-2/3 bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 text-black font-extrabold px-4 py-3 rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingItem ? 'Update Item' : 'Save Item'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}