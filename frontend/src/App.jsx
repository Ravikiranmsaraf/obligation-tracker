import { useState, useEffect, useCallback } from 'react';
import { supabase } from './lib/supabase';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import NextActionCard from './components/NextActionCard';
import ObligationsPage from './pages/ObligationsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-semibold mb-8">Obligation Tracker</h1>
      <button onClick={signInWithGoogle} className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-xl transition-colors">
        Sign in with Google
      </button>
    </div>
  );
}

function Home() {
  const { user, signOut } = useAuth();
  const [cycle, setCycle] = useState(null);
  const [remainingCount, setRemainingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadNextAction = useCallback(async () => {
    try {
      // Fetch next pending cycle
      const { data: cycles } = await supabase
        .from('obligation_cycles')
        .select(`
          id,
          due_date,
          expected_amount,
          status,
          obligation:obligations (
            name
          )
        `)
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

      // Count remaining
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

  const testEcho = async () => {
    try {
      // const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/echo`, {
      const res = await fetch(`/api/echo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Hello from React!' }),
      });
      const data = await res.json();
      alert(data.youSaid);
    } catch (error) {
      console.error('Error calling backend:', error);
      alert('Failed to reach backend');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Obligation Tracker</h1>
        <div className="flex gap-4">
          <a href="/obligations" className="text-blue-600 hover:text-blue-800">My Obligations</a>
          <button onClick={testEcho} className="text-gray-600 hover:text-gray-800">
            Test Echo
          </button>
          <button
            onClick={signOut}
            className="text-gray-600 hover:text-gray-800"
          >
            Sign Out
          </button>
        </div>
      </div>

      <NextActionCard
        cycle={cycle}
        remainingCount={remainingCount}
        onMarkPaid={handleMarkPaid}
      />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/obligations" element={<ProtectedRoute><ObligationsPage /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;