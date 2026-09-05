import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';

function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('settld-theme') === 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('settld-theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  return [isDark, setIsDark];
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-950 text-gray-500 dark:text-gray-400">
        Loading...
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" />;
  }
  return <>{children}</>;
}

function LoginPage() {
  const { signInWithGoogle, user } = useAuth();
  if (user) {
    return <Navigate to="/" />;
  }
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6 bg-white dark:bg-gray-950">
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Settld</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">Bills? Handled. No cap.</p>
      <button
        onClick={signInWithGoogle}
        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-6 py-3 rounded-2xl transition-colors w-full max-w-xs"
      >
        Sign in with Google
      </button>
    </div>
  );
}

function Home({ isDark, setIsDark }) {
  const { user, signOut } = useAuth();
  const [cycle, setCycle] = useState(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pingStatus, setPingStatus] = useState(null); // null | 'ok' | 'error'

  const loadNextAction = useCallback(async () => {
    try {
      const { data: cycles } = await supabase
        .from('obligation_cycles')
        .select('id, due_date, expected_amount, status, obligation:obligations(name)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(1)
        .single();

      if (cycles) {
        setCycle({
          id: cycles.id,
          obligation_name: cycles.obligation.name,
          due_date: cycles.due_date,
          expected_amount: cycles.expected_amount,
          status: cycles.status,
        });
      }

      const { count } = await supabase
        .from('obligation_cycles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      setRemainingCount(count || 0);
    } catch (error) {
      console.error('Error loading next action:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadNextAction();
  }, [loadNextAction, user]);

  const handleMarkPaid = async (cycleId, amount, note) => {
    try {
      const { error } = await supabase
        .from('obligation_cycles')
        .update({
          status: 'paid',
          actual_amount: amount,
          paid_at: new Date().toISOString(),
          payment_note: note,
        })
        .eq('id', cycleId)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadNextAction();
    } catch (error) {
      console.error('Error marking paid:', error);
      alert('Failed to mark as paid. Please try again.');
    }
  };

  const pingServer = async () => {
    setPingStatus(null);
    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'ping' }),
      });
      const data = await res.json();
      setPingStatus(data.youSaid === 'ping' ? 'ok' : 'error');
    } catch (error) {
      console.error('Error pinging backend:', error);
      setPingStatus('error');
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-24">
      <div className="px-4 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Settld</h1>
        <button
          onClick={() => setIsDark(!isDark)}
          className="text-sm w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200"
          aria-label="Toggle dark mode"
        >
          {isDark ? 'Light' : 'Dark'}
        </button>
      </div>

      <NextActionCard cycle={cycle} remainingCount={remainingCount} onMarkPaid={handleMarkPaid} />

      {/* Backend connectivity check — small, dev-facing, visible on purpose */}
      <div className="max-w-md mx-auto mt-6 px-4 flex items-center justify-center gap-2">
        <button
          onClick={pingServer}
          className="text-xs text-gray-500 dark:text-gray-400 underline underline-offset-2"
        >
          Ping Server
        </button>
        {pingStatus === 'ok' && <span className="text-xs text-green-600 dark:text-green-400">● backend reachable</span>}
        {pingStatus === 'error' && <span className="text-xs text-red-500 dark:text-red-400">● backend unreachable</span>}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-around py-3 px-4">
        <a href="/obligations" className="flex flex-col items-center text-sm text-gray-600 dark:text-gray-300">
          My Reminders
        </a>
        <button onClick={signOut} className="flex flex-col items-center text-sm text-gray-600 dark:text-gray-300">
          Sign Out
        </button>
      </div>
    </div>
  );
}

function App() {
  const [isDark, setIsDark] = useDarkMode();

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home isDark={isDark} setIsDark={setIsDark} />
              </ProtectedRoute>
            }
          />
          <Route path="/obligations" element={<ProtectedRoute><ObligationsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;