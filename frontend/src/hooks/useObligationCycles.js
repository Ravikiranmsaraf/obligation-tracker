import { useState, useEffect, useCallback } from 'react';
import { cyclesService } from '../services/cyclesService';
import { supabase } from '../lib/supabase';

export function useObligationCycles(userId) {
  const [cycles, setCycles] = useState([]);
  const [allMonthCompleted, setAllMonthCompleted] = useState(false);
  const [monthlyStats, setMonthlyStats] = useState({ completedCount: 0, remainingCount: 0, spentAmount: 0, plannedAmount: 0 });
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { combinedCycles, allMonthCompleted: isCompleted, stats } = 
        await cyclesService.fetchActiveCycles(userId);

      setCycles(combinedCycles || []);
      setAllMonthCompleted(isCompleted);
      if (stats) setMonthlyStats(stats);
    } catch (err) {
      console.error('Error in useObligationCycles:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  // Supabase Realtime & Foreground Window Focus Sync
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:obligation_cycles')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'obligation_cycles', filter: `user_id=eq.${userId}` },
        () => {
          fetchCycles();
        }
      )
      .subscribe();

    const handleFocus = () => {
      fetchCycles();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') fetchCycles();
    });

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, fetchCycles]);

  const markCyclePaid = async (cycleId, amount, note) => {
    try {
      await cyclesService.updateCycleStatus(cycleId, amount, note);
      await fetchCycles();
    } catch (err) {
      console.error('Error marking cycle paid:', err);
      alert(`Failed to update obligation status: ${err.message || 'Unknown error'}`);
    }
  };

  return { 
    cycles, 
    allMonthCompleted, 
    monthlyStats,
    loading, 
    refreshCycles: fetchCycles, 
    markCyclePaid 
  };
}
