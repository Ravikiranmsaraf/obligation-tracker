import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { GEN_Z_THEMES, CATEGORY_ICONS } from '../constants/categories';
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

  // Pause Modal State
  const [pauseItem, setPauseItem] = useState(null);
  const [pauseStartDate, setPauseStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [pauseEndDate, setPauseEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [pausing, setPausing] = useState(false);

  // Real-time system preference listener for 'system' theme option
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemPrefersDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const getEffectiveThemeKey = (key) => {
    const resolvedKey = key || localStorage.getItem('settld_theme') || 'system';
    if (resolvedKey === 'system') {
      return systemPrefersDark ? 'cyberLime' : 'light';
    }
    return resolvedKey;
  };

  const activeThemeKey = getEffectiveThemeKey(themeKey);
  const activeTheme = GEN_Z_THEMES[activeThemeKey] || GEN_Z_THEMES.light;

  const loadObligations = async () => {
    try {
      const data = await obligationsService.fetchObligations(user.id);
      setObligations(data);
    } catch (error) {
      console.error('Error loading reminders:', error);
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
      console.error('Error saving reminder:', error);
      alert('Failed to save reminder. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this reminder? This also clears its future cycles.')) return;
    try {
      await obligationsService.deleteObligation(user.id, id);
      await loadObligations();
    } catch (error) {
      console.error('Error deleting reminder:', error);
      alert('Failed to delete reminder.');
    }
  };

  const handleOpenPauseModal = (item) => {
    setPauseItem(item);
    setPauseStartDate(new Date().toISOString().split('T')[0]);
    setPauseEndDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  };

  const handleConfirmPause = async (e) => {
    e.preventDefault();
    if (!pauseItem) return;
    setPausing(true);
    try {
      await obligationsService.pauseObligation(user.id, pauseItem.id, pauseStartDate, pauseEndDate);
      setPauseItem(null);
      await loadObligations();
    } catch (error) {
      console.error('Error pausing reminder:', error);
      alert('Failed to pause reminder.');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async (item) => {
    try {
      await obligationsService.resumeObligation(user.id, item.id);
      await loadObligations();
    } catch (error) {
      console.error('Error resuming reminder:', error);
      alert('Failed to resume reminder.');
    }
  };

  const formatObligationDateTime = (obligation) => {
    let d = null;

    if (obligation.target_date) {
      d = new Date(obligation.target_date);
    } else if (obligation.due_day) {
      const day = obligation.due_day;
      const month = obligation.due_month || (new Date().getMonth() + 1);
      const year = obligation.due_year || new Date().getFullYear();
      d = new Date(year, month - 1, day);
    }

    if (!d || isNaN(d.getTime())) return '-';

    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    const formattedDate = `${mm}-${dd}-${yyyy}`;

    const timeStr = obligation.reminder_time || obligation.due_time;
    if (!timeStr) return formattedDate;

    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    if (isNaN(h)) return `${formattedDate} @ ${timeStr}`;

    const suffix = h >= 12 ? 'PM' : 'AM';
    const formattedHour = h % 12 === 0 ? 12 : h % 12;
    const formattedTime = `${String(formattedHour).padStart(2, '0')}:${minutes || '00'} ${suffix}`;

    return `${formattedDate} @ ${formattedTime}`;
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center min-h-screen ${activeTheme.bg} ${activeTheme.subText}`}>
        Loading...
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${activeTheme.bg} ${activeTheme.text} transition-colors duration-300 pb-12`}>
      {/* Header */}
      <div className={`p-4 flex justify-between items-center border-b ${activeTheme.card} backdrop-blur-md sticky top-0 z-20`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className={`text-lg w-9 h-9 flex items-center justify-center rounded-full transition-all active:scale-95 border ${activeTheme.card}`}
            title="Back to Home"
          >
            ←
          </button>
          <div>
            <h1 className="text-lg font-bold">Master List</h1>
            <p className={`text-[11px] ${activeTheme.subText}`}>Manage your master reminder list</p>
          </div>
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
            activeTheme={activeTheme}
            currencySymbol={currencySymbol}
            onSave={handleSave}
            onCancel={handleCancelForm}
            saving={saving}
          />
        )}

        {obligations.length === 0 ? (
          <div className="text-center py-20 px-6">
            <p className={`${activeTheme.subText} text-sm`}>
              Nothing here yet. Tap "+ Add New" to set up your first reminder.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile: reminder cards */}
            <div className="md:hidden space-y-3">
              {obligations.map((obligation) => {
                const isEvent =
                  obligation.type === 'event' ||
                  Number(obligation.expected_amount) === 0;

                const categoryIcon =
                  CATEGORY_ICONS[obligation.category] ||
                  CATEGORY_ICONS.Other ||
                  '📌';

                const isPaused = obligation.is_paused;

                return (
                  <div
                    key={obligation.id}
                    className={`${activeTheme.card} rounded-2xl border p-4 shadow-lg ${isPaused ? 'opacity-75' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{categoryIcon}</span>
                          <h3 className="font-bold truncate">
                            {obligation.name || 'Unnamed Item'}
                          </h3>
                        </div>

                        <p className={`mt-1 text-xs ${activeTheme.subText} capitalize`}>
                          {obligation.category || 'Other'} •{' '}
                          {obligation.frequency || 'monthly'}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 px-2 py-1 rounded-lg text-xs font-bold ${
                          isEvent
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {isEvent
                          ? 'Event'
                          : `${currencySymbol}${Number(
                              obligation.expected_amount
                            ).toLocaleString('en-IN')}`}
                      </span>
                    </div>

                    <div className="mt-3 text-sm">
                      <p className={`${activeTheme.subText} text-xs uppercase tracking-wide`}>
                        Due
                      </p>
                      <p className="font-bold text-emerald-400">
                        {formatObligationDateTime(obligation)}
                      </p>
                    </div>

                    {isPaused && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-2 text-xs text-amber-300">
                        ⏸️ Paused from {obligation.paused_start_date} to {obligation.paused_end_date}
                      </div>
                    )}

                    <div className="mt-4 flex items-center justify-between">
                      {obligation.frequency !== 'one-off' && (
                        isPaused ? (
                          <button
                            onClick={() => handleResume(obligation)}
                            className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
                          >
                            Resume ▶️
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenPauseModal(obligation)}
                            className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
                          >
                            Pause ⏸️
                          </button>
                        )
                      )}

                      <div className="flex gap-4 ml-auto">
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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Tablet / desktop: table */}
            <div
              className={`hidden md:block ${activeTheme.card} rounded-3xl border overflow-x-auto shadow-xl`}
            >
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className={`border-b text-xs font-bold uppercase tracking-wider ${activeTheme.subText} bg-black/5 dark:bg-white/5`}>
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-emerald-400">
                      Due Date & Time
                    </th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Frequency</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-zinc-800/20 text-sm">
                  {obligations.map((obligation) => {
                    const isEvent =
                      obligation.type === 'event' ||
                      Number(obligation.expected_amount) === 0;

                    const categoryIcon =
                      CATEGORY_ICONS[obligation.category] ||
                      CATEGORY_ICONS.Other ||
                      '📌';

                    const isPaused = obligation.is_paused;

                    return (
                      <tr
                        key={obligation.id}
                        className={`hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${isPaused ? 'opacity-75' : ''}`}
                      >
                        <td className="px-6 py-4 font-semibold">
                          <div>{obligation.name || 'Unnamed Item'}</div>
                          {isPaused && (
                            <span className="inline-block mt-1 bg-amber-500/10 text-amber-300 text-[10px] px-2 py-0.5 rounded border border-amber-500/20">
                              Paused ({obligation.paused_start_date} to {obligation.paused_end_date})
                            </span>
                          )}
                        </td>

                        <td className={`px-6 py-4 ${activeTheme.subText}`}>
                          <span className="inline-flex items-center gap-1.5">
                            <span>{categoryIcon}</span>
                            <span>{obligation.category || 'Other'}</span>
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-emerald-400">
                          {formatObligationDateTime(obligation)}
                        </td>

                        <td className="px-6 py-4 font-bold">
                          {!isEvent && obligation.expected_amount > 0
                            ? `${currencySymbol}${Number(
                                obligation.expected_amount
                              ).toLocaleString('en-IN')}`
                            : 'Event 🎂'}
                        </td>

                        <td className={`px-6 py-4 capitalize ${activeTheme.subText}`}>
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              obligation.frequency === 'one-off'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-black/10 dark:bg-white/10'
                            }`}
                          >
                            {obligation.frequency || 'monthly'}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right space-x-3 whitespace-nowrap">
                          {obligation.frequency !== 'one-off' && (
                            isPaused ? (
                              <button
                                onClick={() => handleResume(obligation)}
                                className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
                              >
                                Resume
                              </button>
                            ) : (
                              <button
                                onClick={() => handleOpenPauseModal(obligation)}
                                className="text-amber-400 hover:text-amber-300 font-semibold text-xs"
                              >
                                Pause
                              </button>
                            )
                          )}

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

      {/* Pause Date-Range Modal */}
      {pauseItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${activeTheme.card} rounded-3xl max-w-sm w-full p-6 shadow-2xl border transition-all`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Pause Reminder</h3>
              <button onClick={() => setPauseItem(null)} className={`${activeTheme.subText} hover:opacity-80 text-lg`}>
                ✕
              </button>
            </div>

            <p className={`text-xs ${activeTheme.subText} mb-4`}>
              Pause notifications and hide occurrence list for <span className="font-bold text-amber-400">{pauseItem.name}</span> during these dates:
            </p>

            <form onSubmit={handleConfirmPause} className="space-y-4">
              <div>
                <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>Start Date</label>
                <input
                  type="date"
                  required
                  value={pauseStartDate}
                  onChange={(e) => setPauseStartDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
                />
              </div>

              <div>
                <label className={`block text-xs font-semibold ${activeTheme.subText} mb-1`}>End Date</label>
                <input
                  type="date"
                  required
                  value={pauseEndDate}
                  onChange={(e) => setPauseEndDate(e.target.value)}
                  className={`w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 border ${activeTheme.inputBg}`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPauseItem(null)}
                  className={`w-1/3 font-semibold px-4 py-3 rounded-xl transition-all border ${activeTheme.card}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pausing}
                  className="w-2/3 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-black font-extrabold px-4 py-3 rounded-xl transition-all disabled:opacity-50 shadow-md text-xs"
                >
                  {pausing ? 'Pausing...' : 'Confirm Pause ⏸️'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}