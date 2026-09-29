import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';
import SettingsModal from './components/SettingsModal';
import HelpModal from './components/HelpModal';
import ObligationFormModal from './components/ObligationFormModal';
import { GEN_Z_THEMES } from './constants/categories';
import { useObligationCycles } from './hooks/useObligationCycles';
import { obligationsService } from './services/obligationsService';

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

function LoginPage() {
  const { signInWithGoogle, user } = useAuth();
  if (user) return <Navigate to="/" />;
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">Settld!</h1>
      <p className="text-gray-400 mb-8 text-center">Bills? Handled. No cap.</p>
      <button
        onClick={signInWithGoogle}
        className="bg-lime-400 text-black font-semibold px-6 py-3 rounded-2xl transition-colors w-full max-w-xs hover:bg-lime-300"
      >
        Sign in with Google
      </button>
    </div>
  );
}

function Home({ themeKey, setThemeKey, currencySymbol, setCurrencySymbol }) {
  const { user, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

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

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${activeTheme.bg} text-gray-100`}>
      {/* Landing Header */}
      <div className="px-4 py-4 flex justify-between items-center border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md sticky top-0 z-20">
        <h1 className="text-xl font-extrabold tracking-tight">Settld</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-emerald-400 hover:bg-emerald-500 active:bg-emerald-600 text-black font-extrabold px-3 py-1.5 rounded-xl transition-all text-xs shadow-md"
          >
            {showForm ? 'Cancel' : '+ Add New'}
          </button>
          <button
            onClick={() => setShowHelp(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors text-gray-300"
            title="Category Guide"
          >
            ❓ Help
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors text-gray-300"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        {/* Toggle between Form view and NextActionCard view */}
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
        ) : (
          <NextActionCard
            cycles={cycles}
            allMonthCompleted={allMonthCompleted}
            onMarkPaid={markCyclePaid}
            currencySymbol={currencySymbol}
            themeKey={themeKey}
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

      {/* Help Modal */}
      <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />

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

export default function App() {
  const [themeKey, setThemeKey] = useState(() => localStorage.getItem('themeKey') || 'cyberLime');
  const [currencySymbol, setCurrencySymbol] = useState(() => localStorage.getItem('currencySymbol') || '₹');

  const handleSetThemeKey = (key) => {
    localStorage.setItem('themeKey', key);
    setThemeKey(key);
  };

  const handleSetCurrencySymbol = (symbol) => {
    localStorage.setItem('currencySymbol', symbol);
    setCurrencySymbol(symbol);
  };

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home
                  themeKey={themeKey}
                  setThemeKey={handleSetThemeKey}
                  currencySymbol={currencySymbol}
                  setCurrencySymbol={handleSetCurrencySymbol}
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