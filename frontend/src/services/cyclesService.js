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
  
  async updateCycleStatus(cycleId, statusOrAmount, noteOrStatus = 'paid') {
    // Support flexible parameter passing: (cycleId, amount, note) or (cycleId, status, details)
    let status = 'paid';
    let updateData = { paid_at: new Date().toISOString() };

    if (['paid', 'completed', 'skipped', 'cancelled'].includes(statusOrAmount)) {
      status = statusOrAmount;
      if (typeof noteOrStatus === 'string' && noteOrStatus) {
        updateData.payment_note = noteOrStatus.trim();
      }
    } else {
      // Legacy monetary payment flow
      const amount = Number(statusOrAmount) || 0;
      status = 'paid';
      updateData.expected_amount = amount;
      if (noteOrStatus && typeof noteOrStatus === 'string') {
        updateData.payment_note = noteOrStatus.trim();
      }
    }

    updateData.status = status;

    // 1. Fetch cycle info to check if it's a one-off reminder
    const { data: cycleData, error: fetchErr } = await supabase
      .from('obligation_cycles')
      .select('obligation_id, frequency')
      .eq('id', cycleId)
      .single();

    if (fetchErr) throw fetchErr;

    // 2. Update cycle status
    const { data, error } = await supabase
      .from('obligation_cycles')
      .update(updateData)
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw error;

    // 3. Auto-archive (deactivate) parent obligation if it's a one-off reminder and finished
    if (cycleData?.obligation_id && FINISHED_STATUSES.includes(status)) {
      const { data: oblData } = await supabase
        .from('obligations')
        .select('frequency')
        .eq('id', cycleData.obligation_id)
        .single();

      if (oblData?.frequency === 'one-off' || cycleData?.frequency === 'one-off') {
        await supabase
          .from('obligations')
          .update({ is_active: false })
          .eq('id', cycleData.obligation_id);
      }
    }

    return data;
  },
};

export default cyclesService;