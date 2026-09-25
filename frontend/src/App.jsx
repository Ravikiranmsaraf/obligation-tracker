import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';
import { SplitFactory } from '@splitsoftware/splitio';
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

  // 1. Define a function to return the correct color based on the theme from Harness
  const getBackgroundColor = () => {
    if (theme === 'dark') return '#030712'; // Tailwind's gray-950 color
    if (theme === 'on' || theme === 'blue-accent') return '#eff6ff'; // Tailwind's blue-100 color
    // The default theme from your flag, or the fallback 'off'/'control'
    return '#f9fafb'; // Default light gray-50 color
  };

  const isDark = theme === 'dark';
  const titleColorClass = isDark ? 'text-white' : 'text-gray-900';
  const statusColorClass = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div 
      style={{ backgroundColor: getBackgroundColor() }}
      className="min-h-screen pb-24 transition-colors duration-500"
    >

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
    let splitClient;

    if (!window.fmeClient) {
      console.log("Initializing Harness FME SDK...");

      // Configure SplitFactory with your FME Client Key
      const factory = SplitFactory({
        core: {
          authorizationKey: "4unhpfdr4o1hh4mv2oir44t1931pvti0gmfh", // Paste your copied Client key here
          key: 'test-user' // Matches the identifier tested via curl
        }
      });

      splitClient = factory.client();
      window.fmeClient = splitClient;

      // Fires as soon as the flag valuations are received from the CDN
      splitClient.on(splitClient.Event.SDK_READY, () => {
        console.log('Harness FME is ready.');
        setSdkReady(true);
        
        // Retrieve the live value for your app_theme1 flag (falls back to 'default')
        const activeTheme = splitClient.getTreatment('app_theme1');
        setTheme(activeTheme);
      });

      // Fires immediately whenever you toggle values on the dashboard
      splitClient.on(splitClient.Event.SDK_UPDATE, () => {
        const activeTheme = splitClient.getTreatment('app_theme1');
        console.log('Harness FME updated theme to:', activeTheme);
        setTheme(activeTheme);
      });
    }

    return () => {
      if (window.fmeClient) {
        window.fmeClient.destroy();
        window.fmeClient = null;
        console.log('Harness FME client destroyed.');
      }
    };
  }, []);

  // Sync class state with the active theme value
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