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

  const getNextDueDate = (dueDay, frequency = 'monthly') => {
    const today = new Date();
    const currentDay = today.getDate();
    let nextDate;

    if (dueDay > currentDay) {
      nextDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
    } else {
      // Due day already passed this month, schedule for next month
      nextDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
    }

    // Handle months with fewer days (e.g., 31st in a 30-day month)
    if (nextDate.getDate() !== dueDay) {
      nextDate = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0); // Last day of month
    }

    return nextDate;
  };

  const createCycles = async (obligationId, frequency) => {
    const cycles = [];
    const today = new Date();
    
    // Create cycles for next 12 months
    for (let i = 0; i < 12; i++) {
      const dueDate = getNextDueDate(parseInt(formData.due_day), frequency);
      
      // Adjust for next iterations
      const cycleDate = new Date(today);
      cycleDate.setMonth(today.getMonth() + i);
      cycleDate.setDate(parseInt(formData.due_day));
      
      // Handle months with fewer days
      if (cycleDate.getDate() !== parseInt(formData.due_day)) {
        cycleDate.setDate(0); // Last day of previous month
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

    // Insert all cycles
    const { error } = await supabase
      .from('obligation_cycles')
      .insert(cycles);

    if (error) {
      console.error('Error creating cycles:', error);
      throw error;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      // 1. Create obligation
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

      // 2. Create cycles for this obligation
      await createCycles(obligationData.id, formData.frequency);

      // Reset form
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
    if (!confirm('Delete this obligation? This will also delete all future cycles.')) return;

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
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 flex justify-between items-center bg-white border-b">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="text-gray-600 hover:text-gray-800">
            ← Back
          </button>
          <h1 className="text-xl font-semibold">My Obligations</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? 'Cancel' : '+ Add Obligation'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4">Add New Obligation</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Airtel Mobile Bill"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expected Amount (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.expected_amount}
                    onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="599"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Day (1-31)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="31"
                    value={formData.due_day}
                    onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder="10"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Create Obligation'}
              </button>
            </form>
          </div>
        )}

        {obligations.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No obligations yet. Click "+ Add Obligation" to get started.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Name</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Category</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Amount</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Due Day</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-700">Frequency</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {obligations.map((obligation) => (
                  <tr key={obligation.id} className="border-b hover:bg-gray-50">
                    <td className="px-6 py-4">{obligation.name}</td>
                    <td className="px-6 py-4">{obligation.category}</td>
                    <td className="px-6 py-4">₹{obligation.expected_amount}</td>
                    <td className="px-6 py-4">{obligation.due_day}{getDaySuffix(obligation.due_day)}</td>
                    <td className="px-6 py-4 capitalize">{obligation.frequency}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleDelete(obligation.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
