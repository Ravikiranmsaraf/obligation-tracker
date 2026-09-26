import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useVoiceIO } from '../hooks/useVoiceIO';

export const STANDARD_CATEGORIES = [
  'Utilities',
  'Subscriptions',
  'Housing',
  'Health',
  'Personal',
  'Documents',
  'Other',
];

export default function ObligationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Voice I/O Hook
  const { isListening, transcript, startListening, stopListening, speak, stopSpeaking, isSpeaking } = useVoiceIO();

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    name: '',
    type: 'bill',
    category: STANDARD_CATEGORIES[0],
    expected_amount: '',
    startDate: todayStr,
    frequency: 'monthly',
  });
  const [saving, setSaving] = useState(false);

  // Update form name when voice recognition returns transcript
  useEffect(() => {
    if (transcript) {
      setFormData((prev) => ({ ...prev, name: transcript }));
    }
  }, [transcript]);

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

  const createCycles = async (obligationId, startDateStr) => {
    const cycles = [];
    const baseDate = new Date(startDateStr);
    const targetDay = baseDate.getDate();

    for (let i = 0; i < 12; i++) {
      const cycleDate = new Date(baseDate);
      cycleDate.setMonth(baseDate.getMonth() + i);
      
      if (cycleDate.getDate() !== targetDay) {
        cycleDate.setDate(0);
      }

      const cycleMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1);

      cycles.push({
        obligation_id: obligationId,
        user_id: user.id,
        cycle_month: cycleMonth.toISOString(),
        due_date: cycleDate.toISOString(),
        expected_amount: formData.type === 'bill' && formData.expected_amount ? parseFloat(formData.expected_amount) : null,
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
      const selectedDate = new Date(formData.startDate);
      const dueDay = selectedDate.getDate();

      const { data: obligationData, error: insertError } = await supabase
        .from('obligations')
        .insert({
          user_id: user.id,
          name: formData.name,
          category: formData.category,
          expected_amount: formData.type === 'bill' && formData.expected_amount ? parseFloat(formData.expected_amount) : null,
          due_day: dueDay,
          frequency: formData.frequency,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await createCycles(obligationData.id, formData.startDate);

      setFormData({
        name: '',
        type: 'bill',
        category: STANDARD_CATEGORIES[0],
        expected_amount: '',
        startDate: todayStr,
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

  const handleReadAloud = () => {
    if (isSpeaking) {
      stopSpeaking();
      return;
    }
    if (obligations.length === 0) {
      speak('You have no active reminders.');
      return;
    }

    const textToRead = obligations
      .map((item) => `${item.name}, category ${item.category}, due on the ${item.due_day}${getDaySuffix(item.due_day)}.`)
      .join(' ');

    speak(`You have ${obligations.length} reminders. ${textToRead}`);
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
        
        <div className="flex gap-2">
          <button
            onClick={handleReadAloud}
            className={`p-2 rounded-xl text-sm font-medium transition-colors border ${
              isSpeaking
                ? 'bg-amber-500 text-white border-amber-500 animate-pulse'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700'
            }`}
            title="Read reminders out loud"
          >
            {isSpeaking ? '⏹️ Stop' : '🔊 Listen'}
          </button>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {showForm && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm dark:border dark:border-gray-800 p-5 mb-6">
            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              New {formData.type === 'bill' ? 'Bill' : 'Reminder'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div>
                <label className="block text-xs font-semibold mb-1 text-gray-700 dark:text-gray-300">Type</label>
                <div className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'bill' })}
                    className={`py-2 text-sm font-medium rounded-lg transition-all ${
                      formData.type === 'bill'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Bill / Payment 💳
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, type: 'reminder', expected_amount: '' })}
                    className={`py-2 text-sm font-medium rounded-lg transition-all ${
                      formData.type === 'reminder'
                        ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    Non-Bill Reminder 📅
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl pl-3 pr-24 py-2 focus:ring-2 focus:ring-blue-500"
                    placeholder={formData.type === 'bill' ? 'e.g., Airtel Mobile Bill' : "e.g., Mom's Birthday or Dentist"}
                  />
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    className={`absolute right-2 px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                      isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {isListening ? '🎙️ Listening...' : '🎙️ Speak'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  >
                    {STANDARD_CATEGORIES.map((cat) => (
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

              <div className={`grid ${formData.type === 'bill' ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
                {formData.type === 'bill' && (
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
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">First Due Date</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2 focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-4 py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Add Reminder'}
              </button>
            </form>
          </div>
        )}

        {obligations.length === 0 ? (
          <div className="text-center py-16 px-6">
            <p className="text-gray-500 dark:text-gray-400">
              Nothing here yet. Tap "+ Add" to track your first reminder or bill.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
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
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => speak(`${obligation.name} is due on the ${obligation.due_day}${getDaySuffix(obligation.due_day)}`)}
                    className="text-lg hover:scale-110 transition-transform"
                    title="Read item"
                  >
                    🔊
                  </button>
                  <button
                    onClick={() => handleDelete(obligation.id)}
                    className="text-red-500 dark:text-red-400 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
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