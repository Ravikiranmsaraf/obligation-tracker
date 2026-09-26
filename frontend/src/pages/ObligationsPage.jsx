import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useVoiceIO } from '../hooks/useVoiceIO';

import { STANDARD_CATEGORIES, GEN_Z_THEMES } from '../constants/categories';
import { parseVoiceInput, getDaySuffix } from '../utils/regexParser';

import MonthlySummaryHeader from '../components/MonthlySummaryHeader';
import CategoryFilters from '../components/CategoryFilters';
import ObligationCard from '../components/ObligationCard';
import SettingsModal from '../components/SettingsModal';

export default function ObligationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [obligations, setObligations] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form States
  const [showForm, setShowForm] = useState(false);
  const [inputMode, setInputMode] = useState('quick'); // 'quick' | 'voice'
  const [editingId, setEditingId] = useState(null);

  // Filter & Pagination States
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [visibleCount, setVisibleCount] = useState(5);

  // Settings States
  const [showSettings, setShowSettings] = useState(false);
  const [themeKey, setThemeKey] = useState('cyberLime');
  const [currencySymbol, setCurrencySymbol] = useState('₹');

  const activeTheme = GEN_Z_THEMES[themeKey];

  // Voice Hook
  const { isListening, transcript, startListening, stopListening, speak, stopSpeaking, isSpeaking } = useVoiceIO();

  const todayStr = new Date().toISOString().split('T')[0];

  const defaultFormState = {
    name: '',
    type: 'bill',
    category: STANDARD_CATEGORIES[0],
    expected_amount: '',
    startDate: todayStr,
    frequency: 'monthly',
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [saving, setSaving] = useState(false);

  // Smart Voice Parser & Confirmation Readout
  useEffect(() => {
    if (transcript && inputMode === 'voice') {
      const parsed = parseVoiceInput(transcript);
      setFormData(parsed);

      // Smart Voice Confirmation read back to user
      const confirmationText = `Parsed ${parsed.name}. ${
        parsed.expected_amount ? `Amount ${parsed.expected_amount}.` : ''
      } Category ${parsed.category}. Due date set to ${parsed.startDate}.`;

      speak(confirmationText);
    }
  }, [transcript, inputMode]);

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
    } catch (err) {
      console.error('Error fetching obligations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      type: item.expected_amount ? 'bill' : 'reminder',
      category: item.category,
      expected_amount: item.expected_amount || '',
      startDate: todayStr,
      frequency: item.frequency,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const selectedDate = new Date(formData.startDate);
      const dueDay = selectedDate.getDate();

      const payload = {
        user_id: user.id,
        name: formData.name,
        category: formData.category,
        expected_amount: formData.type === 'bill' && formData.expected_amount ? parseFloat(formData.expected_amount) : null,
        due_day: dueDay,
        frequency: formData.frequency,
      };

      if (editingId) {
        // Update existing record
        const { error } = await supabase
          .from('obligations')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        // Insert new record
        const { data, error } = await supabase
          .from('obligations')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
      }

      setFormData(defaultFormState);
      setEditingId(null);
      setShowForm(false);
      await loadObligations();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save obligation.');
    } finally {
      setSaving(false);
    }
  };

  const filteredObligations = obligations.filter((item) =>
    selectedCategory === 'All' ? true : item.category === selectedCategory
  );

  const displayedObligations = filteredObligations.slice(0, visibleCount);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-gray-500">Loading...</div>;
  }

  return (
    <div className={`min-h-screen transition-colors ${activeTheme.bg} text-gray-100`}>
      {/* Top Bar */}
      <div className="p-4 flex justify-between items-center border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-xl">
            ←
          </button>
          <h1 className="font-bold text-base">My Obligations</h1>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-800"
          >
            ⚙️
          </button>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData(defaultFormState);
              setShowForm(!showForm);
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${activeTheme.primary}`}
          >
            {showForm ? 'Cancel' : '+ Add'}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-4">
        {/* Monthly Spend Summary Banner */}
        <MonthlySummaryHeader obligations={obligations} currencySymbol={currencySymbol} theme={activeTheme} />

        {/* Add / Edit Form Drawer */}
        {showForm && (
          <div className={`p-5 rounded-2xl border mb-6 ${activeTheme.card}`}>
            <h3 className="font-bold mb-4 text-sm">
              {editingId ? 'Edit Obligation' : 'Add New Obligation'}
            </h3>

            {/* Input Mode Switch */}
            {!editingId && (
              <div className="flex bg-zinc-950 p-1 rounded-xl mb-4 border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setInputMode('quick')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                    inputMode === 'quick' ? 'bg-zinc-800 text-white' : 'text-gray-500'
                  }`}
                >
                  Quick Form
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('voice')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg ${
                    inputMode === 'voice' ? 'bg-zinc-800 text-white' : 'text-gray-500'
                  }`}
                >
                  Voice / S2T
                </button>
              </div>
            )}

            {inputMode === 'voice' && !editingId && (
              <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-800 mb-4">
                <button
                  type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 ${
                    isListening ? 'bg-red-500 text-white animate-pulse' : activeTheme.primary
                  }`}
                >
                  🎙️ {isListening ? 'Listening...' : 'Tap to Speak Details'}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
              />

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  {STANDARD_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>

                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {formData.type === 'bill' && (
                  <input
                    type="number"
                    placeholder="Amount"
                    value={formData.expected_amount}
                    onChange={(e) => setFormData({ ...formData, expected_amount: e.target.value })}
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                )}
                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-2.5 rounded-xl font-bold text-xs ${activeTheme.primary}`}
              >
                {saving ? 'Saving...' : editingId ? 'Update Obligation' : 'Save Obligation'}
              </button>
            </form>
          </div>
        )}

        {/* Filter Badges */}
        <CategoryFilters
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
          theme={activeTheme}
        />

        {/* Obligations List */}
        {displayedObligations.map((item) => (
          <ObligationCard
            key={item.id}
            obligation={item}
            onEdit={handleEditClick}
            onBrowse={(id) => alert(`Browsing details for #${id}`)}
            speak={speak}
            currencySymbol={currencySymbol}
            theme={activeTheme}
          />
        ))}

        {/* Pagination Card (Top 5 + Load More) */}
        {filteredObligations.length > visibleCount && (
          <button
            onClick={() => setVisibleCount((prev) => prev + 5)}
            className={`w-full py-3.5 mt-2 rounded-2xl border text-xs font-bold transition-all ${activeTheme.card} ${activeTheme.accentText}`}
          >
            Load More (+{filteredObligations.length - visibleCount} remaining)
          </button>
        )}
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        currentThemeKey={themeKey}
        onSelectTheme={setThemeKey}
        currencySymbol={currencySymbol}
        onSelectCurrency={setCurrencySymbol}
      />
    </div>
  );
}