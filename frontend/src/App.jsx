import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationListView from './components/ObligationListView';
import ObligationsPage from './pages/ObligationsPage';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import ObligationFormModal from './components/ObligationFormModal';
import OnboardingWizard from './components/OnboardingWizard';
import { GEN_Z_THEMES } from './constants/categories';
import { useObligationCycles } from './hooks/useObligationCycles';
import { obligationsService } from './services/obligationsService';
import { useOnboarding } from './hooks/useOnboarding';
import { useNotifications } from './hooks/useNotifications';
import { supabase } from './lib/supabase';

// Inline Login Screen
function InlineLoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('Login error:', err.message);
      alert('Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-sm w-full space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-emerald-400">Settld</h1>
          <p className="text-gray-400 text-sm mt-2">Track your monthly obligations with ease.</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full bg-white hover:bg-gray-100 text-zinc-900 font-bold py-3 px-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 border border-gray-200"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {loading ? 'Connecting...' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-gray-400">
        Loading...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" />;
  return <>{children}</>;
}

function Home({ themeKey, setThemeKey, currencySymbol, setCurrencySymbol }) {
  const { user, signOut } = useAuth();
  useNotifications(user);

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  // View Preference State ('cards' | 'list')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('viewMode') || 'cards');

  const handleToggleViewMode = (mode) => {
    setViewMode(mode);
    localStorage.setItem('viewMode', mode);
  };

  const { needsOnboarding, loading: onboardingLoading, completeOnboarding } = useOnboarding(user?.id);

  const activeTheme = GEN_Z_THEMES[themeKey] || GEN_Z_THEMES.cyberLime;
  const cardThemeClass = activeTheme?.card || 'bg-zinc-900 border-zinc-800';

  const { cycles, allMonthCompleted, loading, markCyclePaid, refreshCycles } = useObligationCycles(user?.id);

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      await obligationsService.saveObligation(user.id, formData);
      setShowForm(false);
      await refreshCycles();
    } catch (error) {
      console.error('Error saving obligation:', error);
      alert('Failed to save obligation. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleFinishOnboarding = async () => {
    completeOnboarding();
    await refreshCycles();
  };

  if (onboardingLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-gray-400 text-sm">
        Setting up your workspace...
      </div>
    );
  }

  if (needsOnboarding) {
    return (
      <div className={`min-h-screen ${activeTheme.bg} text-gray-100 flex items-center justify-center p-4`}>
        <OnboardingWizard
          user={user}
          currentThemeKey={themeKey}
          onSelectTheme={setThemeKey}
          currentCurrency={currencySymbol}
          onSelectCurrency={setCurrencySymbol}
          onNext={handleFinishOnboarding}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${activeTheme.bg} text-gray-100`}>
      {/* Header */}
      <div className="px-4 py-4 flex justify-between items-center border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-xl font-extrabold tracking-tight">Settld</h1>

        <div className="flex items-center gap-2">
          {/* View Switcher Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-xl flex gap-1">
            <button
              onClick={() => handleToggleViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'cards' ? 'bg-emerald-400 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="Card View"
            >
              🎴 Cards
            </button>
            <button
              onClick={() => handleToggleViewMode('list')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-emerald-400 text-black shadow' : 'text-gray-400 hover:text-white'
              }`}
              title="List View"
            >
              📜 List
            </button>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-400 hover:bg-emerald-500 text-black font-extrabold px-3 py-1.5 rounded-xl transition-all text-xs shadow-md"
          >
            {showForm ? 'Cancel' : '+ Add New'}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs hover:bg-zinc-800 transition-colors text-gray-300"
          >
            ⚙️
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {showForm ? (
          <ObligationFormModal
            editingItem={null}
            cardThemeClass={cardThemeClass}
            currencySymbol={currencySymbol}
            onSave={handleSave}
            onCancel={() => setShowForm(false)}
            saving={saving}
          />
        ) : loading ? (
          <div className="flex items-center justify-center min-h-[50vh] text-gray-400 text-sm">
            Loading upcoming items...
          </div>
        ) : viewMode === 'cards' ? (
          <NextActionCard
            cycles={cycles}
            allMonthCompleted={allMonthCompleted}
            onMarkPaid={markCyclePaid}
            currencySymbol={currencySymbol}
            themeKey={themeKey}
          />
        ) : (
          <ObligationListView
            cycles={cycles}
            onMarkPaid={markCyclePaid}
            currencySymbol={currencySymbol}
          />
        )}
      </div>

      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex justify-around py-3 px-4 z-40">
        <Link to="/obligations" className="flex flex-col items-center text-sm font-medium text-gray-300 hover:text-white">
          My Reminders
        </Link>
        <button onClick={signOut} className="flex flex-col items-center text-sm font-medium text-gray-400 hover:text-white">
          Sign Out
        </button>
      </div>

      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />
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

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('themeKey') || 'cyberLime');
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem('currencySymbol') || '₹');

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<InlineLoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home
                  themeKey={themeKey}
                  setThemeKey={(key) => {
                    localStorage.setItem('themeKey', key);
                    setThemeKey(key);
                  }}
                  currencySymbol={currencySymbol}
                  setCurrencySymbol={(symbol) => {
                    localStorage.setItem('currencySymbol', symbol);
                    setCurrencySymbol(symbol);
                  }}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/obligations"
            element={
              <ProtectedRoute>
                <ObligationsPage themeKey={themeKey} currencySymbol={currencySymbol} />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}