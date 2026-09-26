import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';
import { SplitFactory } from '@splitsoftware/splitio';

const HARNESS_CLIENT_SDK_KEY = "4unhpfdr4o1hh4mv2oir44t1931pvti0gmfh";

const HARNESS_TARGET = {
  identifier: 'test-user',
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
  const [cycles, setCycles] = useState([]);
  const [remainingCount, setRemainingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [pingStatus, setPingStatus] = useState(null);

const loadNextAction = useCallback(async () => {
  try {
    const { data: cyclesData } = await supabase
      .from('obligation_cycles')
      .select('id, due_date, expected_amount, status, obligation:obligations(name, category, type)')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(5);

    if (cyclesData) {
      const formattedCycles = cyclesData.map(c => ({
        id: c.id,
        obligation_name: c.obligation ? c.obligation.name : 'Obligation',
        category: c.obligation ? c.obligation.category : 'Default',
        type: c.obligation ? c.obligation.type : 'bill',
        due_date: c.due_date,
        expected_amount: c.expected_amount,
        status: c.status,
      }));
      setCycles(formattedCycles);
    } else {
      setCycles([]);
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

  const handleSnooze = async (cycleId, days) => {
    try {
      // Fetch current due_date first to offset from it
      const current = cycles.find(c => c.id === cycleId);
      if (!current) return;

      const newDueDate = new Date(current.due_date);
      newDueDate.setDate(newDueDate.getDate() + days);

      const { error } = await supabase
        .from('obligation_cycles')
        .update({
          due_date: newDueDate.toISOString(),
        })
        .eq('id', cycleId)
        .eq('user_id', user.id);

      if (error) throw error;
      await loadNextAction();
    } catch (error) {
      console.error('Error snoozing obligation:', error);
      alert('Failed to snooze. Please try again.');
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

  const getBackgroundColor = () => {
    if (theme === 'dark') return '#030712';
    if (theme === 'on' || theme === 'blue-accent') return '#eff6ff';
    return '#f9fafb';
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
        
        <div className={`text-xs text-right ${statusColorClass}`}>
          <p>Theme: <strong className="capitalize">{theme}</strong></p>
          {sdkReady ? (
            <span className="text-green-600 dark:text-green-400 font-medium">● Harness Live</span>
          ) : (
            <span className="text-gray-400">○ Connecting...</span>
          )}
        </div>
      </div>

      <NextActionCard 
        cycles={cycles} 
        remainingCount={remainingCount} 
        onMarkPaid={handleMarkPaid}
        onSnooze={handleSnooze}
      />

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
  const [theme, setTheme] = useState('default');
  const [sdkReady, setSdkReady] = useState(false);

  useEffect(() => {
    let splitClient;

    if (!window.fmeClient) {
      console.log("Initializing Harness FME SDK...");

      const factory = SplitFactory({
        core: {
          authorizationKey: "4unhpfdr4o1hh4mv2oir44t1931pvti0gmfh",
          key: 'test-user'
        }
      });

      splitClient = factory.client();
      window.fmeClient = splitClient;

      splitClient.on(splitClient.Event.SDK_READY, () => {
        console.log('Harness FME is ready.');
        setSdkReady(true);
        const activeTheme = splitClient.getTreatment('app_theme1');
        setTheme(activeTheme);
      });

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