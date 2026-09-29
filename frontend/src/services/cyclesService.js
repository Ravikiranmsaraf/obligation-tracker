import { supabase } from '../lib/supabase';

export const cyclesService = {
  /**
   * Fetch active cycles directly for card deck
   */
  async fetchActiveCycles(userId) {
    if (!userId) return { combinedCycles: [], allMonthCompleted: true };

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1).toISOString();
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59).toISOString();

    // 1. Fetch current month pending cycles
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

    const formatCycleCard = (cycle) => ({
      ...cycle,
      name: cycle.name || 'Untitled Reminder',
      category: cycle.category || 'Other',
      type: cycle.type || 'bill',
    });

    let combinedCycles = (currentMonthData || []).map(formatCycleCard);
    const allMonthCompleted = combinedCycles.length === 0;

    // 2. Top-up to 10 cards from upcoming months if needed
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

      if (!upcomingErr && upcomingData) {
        combinedCycles = [...combinedCycles, ...upcomingData.map(formatCycleCard)];
      }
    }

    return { combinedCycles, allMonthCompleted };
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