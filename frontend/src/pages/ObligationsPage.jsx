import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ObligationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: 'Bills',
    expected_amount: '',
    due_day: new Date().getDate(),
    frequency: 'monthly',
  });
  const [saving, setSaving] = useState(false);

  const categories = ['Bills', 'Subscriptions', 'Loans', 'Insurance', 'Other'];

  useEffect(() => {
    if (!user) return;
    loadObligations();
  }, [user]);

  const loadObligations = async () => {
    try {
      const { data, error } = await supabase
        .from('obligations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('due_day', { ascending: true });

      if (error) throw error;
      setObligations(data || []);
    } catch (error) {
      console.error('Error loading obligations:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCycles = async (obligationId, frequency) => {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const cycleDate = new Date(today);
      cycleDate.setMonth(today.getMonth() + i);
      cycleDate.setDate(parseInt(formData.due_day));

      if (cycleDate.getDate() !== parseInt(formData.due_day)) {
        cycleDate.setDate(0);
      }

      const cycleMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1);

      cycles.push({
        obligation_id: obligationId,
        user_id: user.id,
        cycle_month: cycleMonth.toISOString(),
        due_date: cycleDate.toISOString(),
        expected_amount: parseFloat(formData.expected_amount),
        status: 'pending',
      });
    }

    const { error } = await supabase.from('obligation_cycles').insert(cycles);
    if (error) {
      console.error('Error creating cycles:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: obligationData, error: insertError } = await supabase
        .from('obligations')
        .insert({
          user_id: user.id,
          name: formData.name,
          category: formData.category,
          expected_amount: parseFloat(formData.expected_amount),
          due_day: parseInt(formData.due_day),
          frequency: formData.frequency,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await createCycles(obligationData.id, formData.frequency);

      setFormData({
        name: '',
        category: 'Bills',
        expected_amount: '',
        due_day: new Date().getDate(),
        frequency: 'monthly',
      });
      setShowForm(false);
      await loadObligations();
    } catch (error) {
      console.error('Error creating obligation:', error);
      alert('Failed to create obligation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this obligation? This also clears its future cycles.')) return;

    try {
      const { error } = await supabase
        .from('obligations')
        .update({ is_active: false })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadObligations();
    } catch (error) {
      console.error('Error deleting obligation:', error);
      alert('Failed to delete obligation.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="p-4 flex justify-between items-center bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-600 dark:text-gray-300 text-xl w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ←
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">My Reminders</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">New bill</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Airtel Mobile Bill"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.expected_amount}
                    onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="599"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due day</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add it'}
              </button>
            </form>
          </div>
        )}

        {obligations.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-gray-500 dark:text-gray-400">
              Nothing here yet. Tap "+ Add" to track your first bill.
            </p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {obligations.map((obligation) => (
                <div
                  key={obligation.id}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 p-4 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{obligation.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {obligation.category} · {obligation.due_day}{getDaySuffix(obligation.due_day)} · {obligation.frequency}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 dark:text-white">₹{obligation.expected_amount}</p>
                    <button
                      onClick={() => handleDelete(obligation.id)}
                      className="text-red-500 dark:text-red-400 text-sm mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Category</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Amount</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Due Day</th>
                    <th className="text-left px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</th>
                    <th className="text-right px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {obligations.map((obligation) => (
                    <tr key={obligation.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 text-gray-900 dark:text-white">{obligation.name}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{obligation.category}</td>
                      <td className="px-6 py-4 text-gray-900 dark:text-white">₹{obligation.expected_amount}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{obligation.due_day}{getDaySuffix(obligation.due_day)}</td>
                      <td className="px-6 py-4 capitalize text-gray-700 dark:text-gray-300">{obligation.frequency}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleDelete(obligation.id)}
                          className="text-red-500 dark:text-red-400 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function getDaySuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}