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

  async updateCycleStatus(cycleId, amount, note) {
    const isEvent = note === 'completed' || note === 'skipped';
    const status = isEvent ? note : 'paid';

    const updateData = {
      status,
      paid_at: new Date().toISOString(),
    };

    if (!isEvent && note && typeof note === 'string') {
      updateData.payment_note = note.trim();
    }

    const { data, error } = await supabase
      .from('obligation_cycles')
      .update(updateData)
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};

export default cyclesService;