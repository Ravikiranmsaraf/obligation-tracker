import { useState, useEffect } from 'react';

const CATEGORIES = ['Bills', 'Subscriptions', 'Loans', 'Insurance', 'Personal', 'Events', 'Other'];

export default function ObligationFormModal({
  editingItem,
  cardThemeClass,
  currencySymbol,
  onSave,
  onCancel,
  saving
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'bill',
    category: 'Bills',
    expected_amount: '',
    due_day: new Date().getDate(),
    frequency: 'monthly',
  });

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
        frequency: editingItem.frequency || 'monthly',
      });
    } else {
      setFormData({
        name: '',
        type: 'bill',
        category: 'Bills',
        expected_amount: '',
        due_day: new Date().getDate(),
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
      <h2 className="text-lg font-bold mb-4 text-white">
        {editingItem ? 'Edit Obligation' : 'Add New Obligation'}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-300 mb-1.5">Type</label>
          <div className="grid grid-cols-2 gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, type: 'bill' }))}
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

        <div className={`grid ${formData.type === 'bill' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
          {formData.type === 'bill' && (
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Amount ({currencySymbol})
              </label>
              <input
                type="number"
                required={formData.type === 'bill'}
                min="0"
                step="0.01"
                value={formData.expected_amount}
                onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                className="w-full border border-white/20 bg-black/40 text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                placeholder="e.g., 1500"
              />
            </div>
          )}

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
    </div>
  );
}