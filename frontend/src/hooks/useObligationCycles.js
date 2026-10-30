// frontend/src/hooks/useObligationCycles.js
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

      // Fetch completed cycles history for this month's stats calculation
      const completedHistory = await cyclesService.fetchCompletedCyclesWithHistory(userId);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      // Filter completed items for THIS calendar month strictly
      const thisMonthCompleted = (completedHistory || []).filter((item) => {
        if (!item.due_timestamp) return false;
        const d = new Date(item.due_timestamp);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      // Filter active pending items that fall strictly within THIS calendar month
      const thisMonthPending = (combinedCycles || []).filter((item) => {
        if (!item.due_timestamp && !item.due_date) return false;
        const d = new Date(item.due_timestamp || item.due_date);
        return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
      });

      // Strict calendar month counts
      const completedCount = thisMonthCompleted.length;
      const remainingCount = thisMonthPending.length;

      // Spent amount from items actually paid/completed this month
      const spentAmount = thisMonthCompleted.reduce(
        (sum, item) => sum + (Number(item.expected_amount) || 0),
        0
      );

      // Planned amount = Spent so far this month + Pending obligations due strictly this month
      const pendingThisMonthAmount = thisMonthPending.reduce(
        (sum, item) => sum + (Number(item.expected_amount) || 0),
        0
      );

      const plannedAmount = spentAmount + pendingThisMonthAmount;

      setCycles(combinedCycles || []);
      setAllMonthCompleted(isCompleted);
      
      setMonthlyStats({
        completedCount,
        remainingCount,
        spentAmount,
        plannedAmount,
      });
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