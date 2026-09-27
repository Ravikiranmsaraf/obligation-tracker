import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';
import SettingsModal from './components/SettingsModal';
import { GEN_Z_THEMES } from './constants/categories';
import { useObligationCycles } from './hooks/useObligationCycles';

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
  const activeTheme = GEN_Z_THEMES[themeKey] || GEN_Z_THEMES.cyberLime;

  const { cycles, loading, markCyclePaid } = useObligationCycles(user?.id);

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${activeTheme.bg} text-gray-100`}>
      <div className="px-4 py-4 flex justify-between items-center border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-md">
        <h1 className="text-xl font-extrabold tracking-tight">Settld</h1>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
        >
          ⚙️ Settings
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[50vh] text-gray-400 text-sm">
          Loading upcoming items...
        </div>
      ) : (
        <NextActionCard
          cycles={cycles}
          onMarkPaid={markCyclePaid}
          currencySymbol={currencySymbol}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 bg-zinc-950 border-t border-zinc-800 flex justify-around py-3 px-4 z-40">
        <Link to="/obligations" className="flex flex-col items-center text-sm font-medium text-gray-300 hover:text-white">
          My Reminders
        </Link>
        <button onClick={signOut} className="flex flex-col items-center text-sm font-medium text-gray-400 hover:text-white">
          Sign Out
        </button>
      </div>

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