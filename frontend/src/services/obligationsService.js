import { supabase } from '../lib/supabase';

export const obligationsService = {
  // Fetch active obligations
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

  // Helper to create initial cycle records for a new obligation
  async createCycles(userId, obligationId, dueDay, amount) {
    const cycles = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const cycleDate = new Date(today);
      cycleDate.setMonth(today.getMonth() + i);
      cycleDate.setDate(parseInt(dueDay));

      if (cycleDate.getDate() !== parseInt(dueDay)) {
        cycleDate.setDate(0);
      }

      const cycleMonth = new Date(cycleDate.getFullYear(), cycleDate.getMonth(), 1);

      cycles.push({
        obligation_id: obligationId,
        user_id: userId,
        cycle_month: cycleMonth.toISOString(),
        due_date: cycleDate.toISOString(),
        expected_amount: parseFloat(amount) || 0,
        status: 'pending',
      });
    }

    const { error } = await supabase.from('obligation_cycles').insert(cycles);
    if (error) throw error;
  },

  // Insert or update an obligation
  async saveObligation(userId, formData, editingId) {
    const isEvent = formData.type === 'event';
    const parsedAmount = isEvent ? 0 : (parseFloat(formData.expected_amount) || 0);
    const parsedDueDay = parseInt(formData.due_day);

    if (editingId) {
      const { error: updateError } = await supabase
        .from('obligations')
        .update({
          name: formData.name,
          type: formData.type,
          category: formData.category,
          expected_amount: parsedAmount,
          due_day: parsedDueDay,
          frequency: formData.frequency,
        })
        .eq('id', editingId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const { error: cycleError } = await supabase
        .from('obligation_cycles')
        .update({ expected_amount: parsedAmount })
        .eq('obligation_id', editingId)
        .eq('status', 'pending');

      if (cycleError) throw cycleError;
    } else {
      const { data: obligationData, error: insertError } = await supabase
        .from('obligations')
        .insert({
          user_id: userId,
          name: formData.name,
          type: formData.type,
          category: formData.category,
          expected_amount: parsedAmount,
          due_day: parsedDueDay,
          frequency: formData.frequency,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await this.createCycles(
        userId,
        obligationData.id,
        parsedDueDay,
        parsedAmount
      );
    }
  },

  // Soft delete an obligation
  async deleteObligation(userId, id) {
    const { error } = await supabase
      .from('obligations')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
};