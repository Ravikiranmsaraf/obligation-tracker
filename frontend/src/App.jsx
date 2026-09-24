import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';
import { initialize, Event } from '@harnessio/ff-javascript-client-sdk';
// --- Harness Feature Flag Configuration ---
// TODO: Replace with your actual Client-side SDK Key from Harness
const HARNESS_CLIENT_SDK_KEY = "4unhpfdr4o1hh4mv2oir44t1931pvti0gmfh";

const HARNESS_TARGET = {
  identifier: 'test-user', // Can be a unique user ID or anonymous session ID
  name: 'Test User',
  attributes: {
    host: 'settld.duckdns.org',
  },
};

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
      <h1 className="text-3xl font-bold mb-2 text-gray-900 dark:text-white">Settld!</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">Bills? Handled. No cap.</p>
      <div className="text-xs text-right text-gray-500">
         <p>Active Theme: <strong>{theme}</strong></p>
          {sdkReady ? <p className="text-green-600">● Harness Connected</p> : <p>○ Connecting...</p>}
      </div>
      <button
        onClick={signInWithGoogle}
        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium px-6 py-3 rounded-2xl transition-colors w-full max-w-xs"
      >
        Sign in with Google
      </button>
    </div>
  );
}

function Home({ theme, sdkReady }) {
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

/ 1. Calculate dynamic classes based on the theme value from Harness
  const mainBgClass = theme === 'dark' ? 'bg-gray-950' : (theme === 'blue-accent' ? 'bg-blue-50' : 'bg-gray-50');
  const titleColorClass = theme === 'dark' ? 'text-white' : 'text-gray-900';
  const statusColorClass = theme === 'dark' ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`min-h-screen pb-24 transition-colors duration-500 ${mainBgClass}`}>
      <div className="px-4 py-4 flex justify-between items-center">
        <h1 className={`text-xl font-bold ${titleColorClass}`}>Settld</h1>
        
        {/* 2. Replaced the manual button with the Harness status and theme indicator */}
        <div className={`text-xs text-right ${statusColorClass}`}>
          <p>Theme: <strong className="capitalize">{theme}</strong></p>
          {sdkReady ? (
            <span className="text-green-600 dark:text-green-400 font-medium">● Harness Live</span>
          ) : (
            <span className="text-gray-400">○ Connecting...</span>
          )}
        </div>
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
          My Reminders_
        </a>
        <button onClick={signOut} className="flex flex-col items-center text-sm text-gray-600 dark:text-gray-300">
          Sign Out
        </button>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('default');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let cf;
    
    // Prevent the SDK from initializing multiple times during development
    if (!window.harnessClient) {
      console.log("Initializing Harness SDK...");
      cf = initialize(HARNESS_CLIENT_SDK_KEY, HARNESS_TARGET);
      window.harnessClient = cf;

      // When the Harness SDK is ready, fetch the active variation
      cf.on(Event.READY, flags => {
        console.log('Harness SDK is ready.', flags);
        setSdkReady(true);
        
        // Fetch 'app_theme1' variation, fallback to 'default' if offline
        const initialTheme = cf.stringVariation('app_theme1', 'default');
        setTheme(initialTheme);
      });

      // Listen for real-time toggle changes from the Harness dashboard
      cf.on(Event.CHANGED, flagInfo => {
        if (flagInfo.flag === 'app_theme1') {
          console.log('Theme flag changed to:', flagInfo.value);
          setTheme(flagInfo.value);
        }
      });

      cf.on(Event.ERROR, (err) => {
        console.error('Harness SDK Error:', err);
      });
    }

    return () => {
      if (window.harnessClient) {
        window.harnessClient.close();
        window.harnessClient = null;
        console.log('Harness SDK connection closed.');
      }
    };
  }, []);

  // Update root element classes dynamically based on the active theme
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light', 'blue-accent');
    document.documentElement.classList.add(theme);
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage theme={theme} />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                {/* Pass theme and connection status down to the Home component */}
                <Home theme={theme} sdkReady={sdkReady} />
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