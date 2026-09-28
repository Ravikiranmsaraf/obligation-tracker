import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GEN_Z_THEMES, CATEGORY_ICONS } from '../constants/categories';
import { getDaySuffix } from '../utils/dateUtils';
import { obligationsService } from '../services/obligationsService';
import ObligationFormModal from '../components/ObligationFormModal';

export default function ObligationsPage({ themeKey, currencySymbol = '₹' }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);

  const activeThemeKey = themeKey || localStorage.getItem('themeKey') || 'cyberLime';
  const activeTheme = GEN_Z_THEMES[activeThemeKey] || GEN_Z_THEMES.cyberLime;

  const bgClass = activeTheme?.bg || 'bg-zinc-950';
  const cardThemeClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800';

  const loadObligations = async () => {
    try {
      const data = await obligationsService.fetchObligations(user.id);
      setObligations(data);
    } catch (error) {
      console.error('Error loading obligations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadObligations();
  }, [user]);

  const handleOpenCreateForm = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingItem(null);
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      await obligationsService.saveObligation(user.id, formData, editingItem?.id);
      handleCancelForm();
      await loadObligations();
    } catch (error) {
      console.error('Error saving obligation:', error);
      alert('Failed to save obligation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this obligation? This also clears its future cycles.')) return;
    try {
      await obligationsService.deleteObligation(user.id, id);
      await loadObligations();
    } catch (error) {
      console.error('Error deleting obligation:', error);
      alert('Failed to delete obligation.');
    }
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${bgClass} text-gray-400`}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bgClass} text-white transition-colors duration-300 pb-12`}>
      <div className="p-4 flex justify-between items-center border-b border-white/10 backdrop-blur-md bg-black/30 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-200 text-lg w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-all active:scale-95"
            title="Back to Home"
          >
            ←
          </button>
          <h1 className="text-lg font-bold text-white">My Reminders</h1>
        </div>
        <button
          onClick={showForm ? handleCancelForm : handleOpenCreateForm}
          className="bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 text-black font-extrabold px-4 py-2 rounded-xl transition-all text-sm shadow-md"
        >
          {showForm ? 'Cancel' : '+ Add New'}
        </button>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {showForm && (
          <ObligationFormModal
            editingItem={editingItem}
            cardThemeClass={cardThemeClass}
            currencySymbol={currencySymbol}
            onSave={handleSave}
            onCancel={handleCancelForm}
            saving={saving}
          />
        )}

        {obligations.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className="text-gray-400 text-sm">
              Nothing here yet. Tap "+ Add New" to set up your first reminder.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="md:hidden space-y-3">
              {obligations.map((obligation) => {
                const isEvent =
                  obligation.type === 'event' ||
                  Number(obligation.expected_amount) === 0;
                const categoryIcon = CATEGORY_ICONS[obligation.category] || CATEGORY_ICONS.Other || '📌';

                return (
                  <div
                    key={obligation.id}
                    className={`${cardThemeClass} rounded-2xl border p-4 flex justify-between items-center shadow-md`}
                  >
                    <div>
                      <p className="font-bold text-white text-base">{obligation.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {categoryIcon} {obligation.category || 'Other'} · {obligation.due_day}{getDaySuffix(obligation.due_day)} day · <span className="capitalize">{obligation.frequency}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-white text-base">
                        {!isEvent && obligation.expected_amount > 0 ? `${currencySymbol}${obligation.expected_amount.toLocaleString('en-IN')}` : 'Event 🎂'}
                      </p>
                      <div className="flex justify-end gap-3 mt-1">
                        <button
                          onClick={() => handleOpenEditForm(obligation)}
                          className="text-emerald-400 hover:text-emerald-300 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(obligation.id)}
                          className="text-red-400 hover:text-red-300 text-xs font-semibold"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div className={`hidden md:block ${cardThemeClass} rounded-3xl border overflow-hidden shadow-xl`}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-white/5 border-b border-white/10 text-xs font-bold text-gray-300 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Due Day</th>
                    <th className="px-6 py-4">Frequency</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-sm">
                  {obligations.map((obligation) => {
                    const isEvent =
                      obligation.type === 'event' ||
                      Number(obligation.expected_amount) === 0;
                    const categoryIcon = CATEGORY_ICONS[obligation.category] || CATEGORY_ICONS.Other || '📌';

                    return (
                      <tr key={obligation.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">{obligation.name}</td>
                        <td className="px-6 py-4 text-gray-300 flex items-center gap-1.5">
                          <span>{categoryIcon}</span>
                          <span>{obligation.category || 'Other'}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-white">
                          {!isEvent && obligation.expected_amount > 0 ? `${currencySymbol}${obligation.expected_amount.toLocaleString('en-IN')}` : 'Event 🎂'}
                        </td>
                        <td className="px-6 py-4 text-gray-300">{obligation.due_day}{getDaySuffix(obligation.due_day)}</td>
                        <td className="px-6 py-4 capitalize text-gray-300">{obligation.frequency}</td>
                        <td className="px-6 py-4 text-right space-x-3">
                          <button
                            onClick={() => handleOpenEditForm(obligation)}
                            className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(obligation.id)}
                            className="text-red-400 hover:text-red-300 font-semibold text-xs"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}