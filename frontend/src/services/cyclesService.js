import supabase from '../lib/supabase';

const FINISHED_STATUSES = ['paid', 'completed', 'skipped', 'cancelled'];

function getRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const day = now.getDate();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const includeNextMonth = day >= daysInMonth - 7;

  return {
    now,
    currentYear: year,
    currentMonth: month,
    start: new Date(year, month, 1).toISOString(),
    end: new Date(year, month + (includeNextMonth ? 2 : 1), 1).toISOString(),
  };
}

export const cyclesService = {
  async fetchActiveCycles(userId) {
    if (!userId) return { combinedCycles: [], allMonthCompleted: true };

    const { currentYear, currentMonth, start, end } = getRange();
    const { data, error } = await supabase
      .from('obligation_cycles')
      .select('*')
      .eq('user_id', userId)
      .not('status', 'in', `(${FINISHED_STATUSES.join(',')})`)
      .gte('due_timestamp', start)
      .lt('due_timestamp', end)
      .order('due_timestamp', { ascending: true });

    if (error) throw error;

    const combinedCycles = (data || []).map((cycle) => ({
      ...cycle,
      name: cycle.name || 'Untitled reminder',
      category: cycle.category || 'Other',
      type: Number(cycle.expected_amount || 0) > 0 ? 'bill' : 'event',
      due_date: cycle.due_timestamp,
      frequency: cycle.frequency || 'monthly',
    }));

    const currentMonthPendingCount = combinedCycles.filter((cycle) => {
      const date = new Date(cycle.due_timestamp);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;

    return {
      combinedCycles,
      allMonthCompleted: currentMonthPendingCount === 0,
    };
  },
  // Inside fetchActiveCycles, update the query mapping or filter:
  async fetchActiveCycles(userId) {
    if (!userId) return { combinedCycles: [], allMonthCompleted: true };

    const { currentYear, currentMonth, start, end } = getRange();
    const { data, error } = await supabase
      .from('obligation_cycles')
      .select('*, obligations(is_paused, paused_start_date, paused_end_date, frequency)')
      .eq('user_id', userId)
      .not('status', 'in', `(${FINISHED_STATUSES.join(',')})`)
      .gte('due_timestamp', start)
      .lt('due_timestamp', end)
      .order('due_timestamp', { ascending: true });

    if (error) throw error;

    const todayStr = new Date().toISOString().split('T')[0];

    const combinedCycles = (data || [])
      .filter((cycle) => {
        // If the parent obligation is paused and today falls within the pause window, hide it
        const obl = cycle.obligations;
        if (obl && obl.is_paused && obl.paused_start_date && obl.paused_end_date) {
          if (todayStr >= obl.paused_start_date && todayStr <= obl.paused_end_date) {
            return false; // Skip hidden paused cycle
          }
        }
        return true;
      })
      .map((cycle) => ({
        ...cycle,
        name: cycle.name || 'Untitled reminder',
        category: cycle.category || 'Other',
        type: Number(cycle.expected_amount || 0) > 0 ? 'bill' : 'event',
        due_date: cycle.due_timestamp,
        frequency: cycle.frequency || cycle.obligations?.frequency || 'monthly',
      }));

    const currentMonthPendingCount = combinedCycles.filter((cycle) => {
      const date = new Date(cycle.due_timestamp);
      return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
    }).length;

    return {
      combinedCycles,
      allMonthCompleted: currentMonthPendingCount === 0,
    };
  },
  // Fetch completed/paid cycles for archive views (This month & Last month)
  async fetchCompletedCyclesWithHistory(userId) {
    if (!userId) return [];

    const now = new Date();
    // Start of last month
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    // End of current month
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

    const { data, error } = await supabase
      .from('obligation_cycles')
      .select('*')
      .eq('user_id', userId)
      .in('status', ['paid', 'completed'])
      .gte('due_timestamp', startOfLastMonth)
      .lt('due_timestamp', endOfCurrentMonth)
      .order('due_timestamp', { ascending: false });

    if (error) throw error;

    return (data || []).map((cycle) => ({
      ...cycle,
      name: cycle.name || 'Untitled reminder',
      category: cycle.category || 'Other',
    }));
  },

  // Fetch pending scheduled cycles for the next calendar month (Forward planning)
  async fetchNextMonthCycles(userId) {
    if (!userId) return [];

    const now = new Date();
    const nextMonthStart = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString();

    const { data, error } = await supabase
      .from('obligation_cycles')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .gte('due_timestamp', nextMonthStart)
      .lt('due_timestamp', nextMonthEnd)
      .order('due_timestamp', { ascending: true });

    if (error) throw error;

    return (data || []).map((cycle) => ({
      ...cycle,
      name: cycle.name || 'Untitled reminder',
      category: cycle.category || 'Other',
      frequency: cycle.frequency || 'monthly',
    }));
  },
  
  async updateCycleStatus(cycleId, statusOrAmount, noteOrStatus = 'paid', newDueTimestamp = null) {
    if (statusOrAmount && typeof statusOrAmount === 'object') {
      const payload = statusOrAmount;
      statusOrAmount = payload.amount_paid ?? payload.status ?? 'paid';
      noteOrStatus = payload.notes ?? payload.payment_note ?? 'paid';
    }

    let status = 'paid';
    let updateData = { paid_at: new Date().toISOString() };

    if (['paid', 'completed', 'skipped', 'cancelled', 'pending'].includes(statusOrAmount)) {
      status = statusOrAmount;
      if (status === 'pending') {
        updateData.paid_at = null; // Clear completion timestamp when reopening
        updateData.payment_note = null;
      }
      if (typeof noteOrStatus === 'string' && noteOrStatus) {
        updateData.payment_note = noteOrStatus.trim();
      }
    } else {
      const amount = Number(statusOrAmount) || 0;
      status = 'paid';
      updateData.expected_amount = amount;
      if (noteOrStatus && typeof noteOrStatus === 'string') {
        updateData.payment_note = noteOrStatus.trim();
      }
    }

    updateData.status = status;

    // If a new due timestamp was provided (e.g., from ReopenCycleModal), update it!
    if (newDueTimestamp) {
      updateData.due_timestamp = newDueTimestamp;
    }

    const { data: cycleData, error: fetchErr } = await supabase
      .from('obligation_cycles')
      .select('obligation_id, frequency, user_id')
      .eq('id', cycleId)
      .single();

    if (fetchErr) throw fetchErr;

    const { data, error } = await supabase
      .from('obligation_cycles')
      .update(updateData)
      .eq('id', cycleId)
      .eq('user_id', cycleData.user_id)
      .select()
      .single();

    if (error) throw error;

    return data;
  },
};

export default cyclesService;