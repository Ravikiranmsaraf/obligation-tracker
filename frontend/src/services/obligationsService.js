import { supabase } from '../lib/supabase';

export const obligationsService = {
  /**
   * Fetch active obligations for a user
   */
  async fetchObligations(userId) {
    const { data, error } = await supabase
      .from('obligations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('due_day', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  /**
   * Pre-generates cycle records:
   * Includes current month if dueDay >= today's date, otherwise starts next month.
   */
  async createCycles(userId, obligationId, obligationName, dueDay, dueMonth, amount, frequency = 'monthly', category = 'Other') {
    const cycles = [];
    const today = new Date();
    const currentDay = today.getDate();
    const parsedDay = parseInt(dueDay, 10);
    const parsedMonth = dueMonth ? parseInt(dueMonth, 10) : null;

    // Determine starting month offset:
    // If dueDay >= currentDay, start from current month (offset 0).
    // Otherwise, start from next month (offset 1).
    let startMonthOffset = 0;
    if (frequency === 'monthly' && parsedDay < currentDay) {
      startMonthOffset = 1;
    }

    const totalCycles = frequency === 'yearly' ? 2 : 12;

    for (let i = 0; i < totalCycles; i++) {
      let targetYear = today.getFullYear();
      let targetMonth;

      if (frequency === 'yearly' && parsedMonth) {
        targetMonth = parsedMonth - 1; // 0-indexed
        
        // If yearly date already passed this year, start next year
        const yearlyDateThisYear = new Date(targetYear, targetMonth, parsedDay);
        if (yearlyDateThisYear < today) {
          targetYear += 1 + i;
        } else {
          targetYear += i;
        }
      } else {
        targetMonth = today.getMonth() + startMonthOffset + i;
        if (targetMonth > 11) {
          targetYear += Math.floor(targetMonth / 12);
          targetMonth = targetMonth % 12;
        }
      }

      // 1. First day of target month (prevents cycle_month duplicate keys)
      const cycleMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1));

      // 2. Compute due date with month-end protection (e.g. Feb 30 -> Feb 28/29)
      const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDueDay = Math.min(parsedDay, maxDaysInTargetMonth);
      const dueDate = new Date(Date.UTC(targetYear, targetMonth, actualDueDay));

      cycles.push({
        obligation_id: obligationId,
        user_id: userId,
        name: obligationName,
        category: category,
        cycle_month: cycleMonthDate.toISOString(),
        due_date: dueDate.toISOString(),
        expected_amount: parseFloat(amount) || 0,
        status: 'pending',
      });
    }

    const { error } = await supabase.from('obligation_cycles').insert(cycles);
    if (error) throw error;
  },

  /**
   * Insert or update an obligation and sync pending cycle records
   */
  async saveObligation(userId, formData, editingId) {
    const isEvent = formData.type === 'event';
    const parsedAmount = isEvent ? 0 : (parseFloat(formData.expected_amount) || 0);
    const parsedDueDay = parseInt(formData.due_day, 10);
    const parsedDueMonth = formData.due_month ? parseInt(formData.due_month, 10) : null;
    const frequency = formData.frequency || 'monthly';

    const payload = {
      user_id: userId,
      name: formData.name,
      type: formData.type || 'bill',
      category: formData.category,
      expected_amount: parsedAmount,
      due_day: parsedDueDay,
      due_month: parsedDueMonth,
      frequency: frequency,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      // 1. Update master obligation table
      const { error: updateError } = await supabase
        .from('obligations')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      // 2. Sync name, category, amount on pending cycles
      const { error: cycleError } = await supabase
        .from('obligation_cycles')
        .update({ 
          name: formData.name,
          category: formData.category,
          expected_amount: parsedAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('obligation_id', editingId)
        .eq('status', 'pending');

      if (cycleError) throw cycleError;
    } else {
      // 1. Create master obligation
      const { data: obligationData, error: insertError } = await supabase
        .from('obligations')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      // 2. Pre-generate cycle records starting from current or next month
      await this.createCycles(
        userId,
        obligationData.id,
        formData.name,
        parsedDueDay,
        parsedDueMonth,
        parsedAmount,
        frequency,
        formData.category
      );
    }
  },

  /**
   * Soft delete an obligation
   */
  async deleteObligation(userId, id) {
    const { error } = await supabase
      .from('obligations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
};