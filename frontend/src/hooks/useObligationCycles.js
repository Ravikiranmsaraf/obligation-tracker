import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useObligationCycles(userId) {
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPendingCycles = useCallback(async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('obligation_cycles')
        .select(`
          id,
          due_date,
          expected_amount,
          status,
          obligation_id,
          obligations (
            name,
            category,
            type
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Map joined obligation fields into standard shape
      const formatted = (data || []).map((cycle) => ({
        id: cycle.id,
        due_date: cycle.due_date,
        expected_amount: cycle.expected_amount,
        status: cycle.status,
        obligation_name: cycle.obligations?.name || 'Unnamed Obligation',
        category: cycle.obligations?.category || 'Default',
        type: cycle.obligations?.type || 'bill',
      }));

      setCycles(formatted);
    } catch (err) {
      console.error('Error fetching obligation cycles:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const markCyclePaid = async (cycleId, amountPaid, note) => {
    try {
      const { error } = await supabase
        .from('obligation_cycles')
        .update({
          status: 'settled',
          paid_amount: parseFloat(amountPaid) || 0,
          paid_at: new Date().toISOString(),
          notes: note || null,
        })
        .eq('id', cycleId)
        .eq('user_id', userId);

      if (error) throw error;

      // Refresh list after settlement
      await fetchPendingCycles();
    } catch (err) {
      console.error('Error settling cycle:', err);
      alert('Failed to settle item. Please try again.');
    }
  };

  useEffect(() => {
    fetchPendingCycles();
  }, [fetchPendingCycles]);

  return { cycles, loading, markCyclePaid, refetch: fetchPendingCycles };
}