import { supabase } from '../lib/supabase';

export const cyclesService = {
  /**
   * Fetch active cycles with dynamic date filtering
   */
  async fetchActiveCycles(userId) {
    if (!userId) return { combinedCycles: [], allMonthCompleted: true };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const currentDay = now.getDate();

    // Calculate total days in current month
    const totalDaysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const isLastWeek = currentDay > totalDaysInCurrentMonth - 7;

    // Range Start: Start of current month
    const startRange = new Date(currentYear, currentMonth, 1).toISOString();

    // Range End: End of current month OR End of next month if in last week
    let endRange;
    if (isLastWeek) {
      endRange = new Date(currentYear, currentMonth + 2, 0, 23, 59, 59).toISOString();
    } else {
      endRange = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();
    }

    const { data: cyclesData, error } = await supabase
      .from('obligation_cycles')
      .select('*')
      .eq('user_id', userId)
      .neq('status', 'paid')
      .neq('status', 'completed')
      .neq('status', 'skipped')
      .gte('due_date', startRange)
      .lte('due_date', endRange)
      .order('due_date', { ascending: true });

    if (error) throw error;

    const formatCycleCard = (cycle) => ({
      ...cycle,
      name: cycle.name || 'Untitled Reminder',
      category: cycle.category || 'Other',
      type: cycle.type || 'bill',
    });

    const combinedCycles = (cyclesData || []).map(formatCycleCard);

    // Check if current month items specifically are all finished
    const currentMonthPendingCount = combinedCycles.filter((item) => {
      const d = new Date(item.due_date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;

    return { 
      combinedCycles, 
      allMonthCompleted: currentMonthPendingCount === 0 
    };
  },

  /**
   * Update cycle status to paid, completed, or skipped
   */
  async updateCycleStatus(cycleId, amount, note) {
    const isEvent = note === 'completed' || note === 'skipped';
    const status = isEvent ? note : 'paid';

    const updateData = { 
      status,
      actual_amount: amount ? Number(amount) : null,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (note && !isEvent) {
      updateData.payment_note = note;
    }

    const { data, error } = await supabase
      .from('obligation_cycles')
      .update(updateData)
      .eq('id', cycleId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
};