import { useState, useEffect, useCallback } from 'react';
import { cyclesService } from '../services/cyclesService';

export function useObligationCycles(userId) {
  const [cycles, setCycles] = useState([]);
  const [allMonthCompleted, setAllMonthCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchCycles = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { combinedCycles, allMonthCompleted: isCompleted } = 
        await cyclesService.fetchActiveCycles(userId);

      setCycles(combinedCycles || []);
      setAllMonthCompleted(isCompleted);
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
    loading, 
    refreshCycles: fetchCycles, 
    markCyclePaid 
  };
}