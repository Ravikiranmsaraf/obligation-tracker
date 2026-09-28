import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useObligationCycles(userId) {
  const [cycles, setCycles] = useState([]);
  const [allMonthCompleted, setAllMonthCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);

    try {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString();
      const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

      // 1. Fetch current month cycles
      const { data: currentMonthData, error: currentErr } = await supabase
        .from('obligation_cycles')
        .select('*')
        .eq('user_id', userId)
        .neq('status', 'paid')
        .neq('status', 'completed')
        .neq('status', 'skipped')
        .gte('due_date', startOfCurrentMonth)
        .lte('due_date', endOfCurrentMonth)
        .order('due_date', { ascending: true });

      if (currentErr) throw currentErr;

      // 2. Fetch parent obligations to map categories reliably
      const { data: parentObligations, error: parentErr } = await supabase
        .from('obligations')
        .select('id, category, name')
        .eq('user_id', userId);

      if (parentErr) console.error('Error fetching parent obligations:', parentErr);

      const obligationMap = new Map((parentObligations || []).map((o) => [o.id, o]));

      const mapCategory = (cycle) => {
        const parent = obligationMap.get(cycle.obligation_id);
        return cycle.category || parent?.category || 'Other';
      };

      let combinedCycles = (currentMonthData || []).map((c) => ({
        ...c,
        category: mapCategory(c),
      }));

      // Check month completion
      setAllMonthCompleted(combinedCycles.length === 0);

      // 3. Top-up to 10 from next month if needed
      if (combinedCycles.length < 10) {
        const needCount = 10 - combinedCycles.length;
        const startOfNextMonth = new Date(currentYear, currentMonth + 1, 1).toISOString();

        const { data: upcomingData, error: upcomingErr } = await supabase
          .from('obligation_cycles')
          .select('*')
          .eq('user_id', userId)
          .neq('status', 'paid')
          .neq('status', 'completed')
          .neq('status', 'skipped')
          .gte('due_date', startOfNextMonth)
          .order('due_date', { ascending: true })
          .limit(needCount);

        if (upcomingErr) console.error('Error fetching upcoming cycles:', upcomingErr);
        else if (upcomingData) {
          const upcomingMapped = upcomingData.map((c) => ({
            ...c,
            category: mapCategory(c),
          }));
          combinedCycles = [...combinedCycles, ...upcomingMapped];
        }
      }

      setCycles(combinedCycles);
    } catch (err) {
      console.error('Error in useObligationCycles:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCycles();
  }, [fetchCycles]);

  const markCyclePaid = async (cycleId, amount, note) => {
    try {
      const isEvent = note === 'completed' || note === 'skipped';
      const status = isEvent ? note : 'paid';

      const updateData = { status };

      if (note && !isEvent) {
        updateData.notes = note;
      }

      const { error } = await supabase
        .from('obligation_cycles')
        .update(updateData)
        .eq('id', cycleId);

      if (error) throw error;
      await fetchCycles();
    } catch (err) {
      console.error('Error marking cycle paid:', err);
      alert(`Failed to update obligation status: ${err.message || 'Unknown error'}`);
    }
  };

  return { cycles, allMonthCompleted, loading, refreshCycles: fetchCycles, markCyclePaid };
}