import { supabase } from '../lib/supabase';

function getUtcTimestampForLocalTime(year, month, day, hour = 9, minute = 0, timeZone = 'UTC') {
  const tentativeUtc = Date.UTC(year, month, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(new Date(tentativeUtc));
  const getPart = (type) => parseInt(parts.find(p => p.type === type)?.value || 0, 10);
  
  const tzYear = getPart('year');
  const tzMonth = getPart('month') - 1;
  const tzDay = getPart('day');
  const tzHour = getPart('hour');
  const tzMinute = getPart('minute');
  
  const tzDateAsUtc = Date.UTC(tzYear, tzMonth, tzDay, tzHour, tzMinute, 0);
  const diff = tzDateAsUtc - tentativeUtc;
  
  return new Date(tentativeUtc - diff).toISOString();
}

export const obligationsService = {
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

  async createCycles(userId, obligationId, obligationName, dueDay, dueMonth, amount, frequency = 'monthly', category = 'Other', reminderTime = '09:00', userTimezone = 'UTC') {
    const cycles = [];
    const today = new Date();
    const currentDay = today.getDate();
    const parsedDay = parseInt(dueDay, 10);
    const parsedMonth = dueMonth ? parseInt(dueMonth, 10) : null;

    const [targetHour, targetMinute] = (reminderTime || '09:00').split(':').map(n => parseInt(n, 10));

    let startMonthOffset = 0;
    if (frequency === 'monthly' && parsedDay < currentDay) {
      startMonthOffset = 1;
    }

    const totalCycles = frequency === 'yearly' ? 2 : (frequency === 'one-off' ? 1 : 12);

    for (let i = 0; i < totalCycles; i++) {
      let targetYear = today.getFullYear();
      let targetMonth;

      if (frequency === 'yearly' && parsedMonth) {
        targetMonth = parsedMonth - 1;
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

      const cycleMonthDate = new Date(Date.UTC(targetYear, targetMonth, 1));
      const maxDaysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const actualDueDay = Math.min(parsedDay, maxDaysInTargetMonth);
      const dueDate = new Date(Date.UTC(targetYear, targetMonth, actualDueDay));

      const dueTimestamp = getUtcTimestampForLocalTime(targetYear, targetMonth, actualDueDay, targetHour, targetMinute, userTimezone);

      cycles.push({
        obligation_id: obligationId,
        user_id: userId,
        name: obligationName,
        category: category,
        cycle_month: cycleMonthDate.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        expected_amount: parseFloat(amount) || 0,
        status: 'pending',
        reminder_time: reminderTime,
        due_timestamp: dueTimestamp,
        notification_sent: false,
        user_timezone: userTimezone,
      });
    }

    const { error } = await supabase.from('obligation_cycles').insert(cycles);
    if (error) throw error;
  },

  async saveObligation(userId, formData, editingId) {
    const isEvent = formData.type === 'event';
    const parsedAmount = isEvent ? 0 : (parseFloat(formData.expected_amount) || 0);
    const parsedDueDay = parseInt(formData.due_day, 10);
    const parsedDueMonth = formData.due_month ? parseInt(formData.due_month, 10) : null;
    const frequency = formData.frequency || 'monthly';
    const reminderTime = formData.reminder_time || formData.due_time || '09:00';
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    const payload = {
      user_id: userId,
      name: formData.name,
      type: formData.type || 'bill',
      category: formData.category,
      expected_amount: parsedAmount,
      due_day: parsedDueDay,
      due_month: parsedDueMonth,
      frequency: frequency,
      reminder_time: reminderTime,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('obligations')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', userId);

      if (updateError) throw updateError;

      const { error: cycleError } = await supabase
        .from('obligation_cycles')
        .update({ 
          name: formData.name,
          category: formData.category,
          expected_amount: parsedAmount,
          reminder_time: reminderTime,
          updated_at: new Date().toISOString(),
        })
        .eq('obligation_id', editingId)
        .eq('status', 'pending');

      if (cycleError) throw cycleError;
    } else {
      const { data: obligationData, error: insertError } = await supabase
        .from('obligations')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      await this.createCycles(
        userId,
        obligationData.id,
        formData.name,
        parsedDueDay,
        parsedDueMonth,
        parsedAmount,
        frequency,
        formData.category,
        reminderTime,
        userTimezone
      );
    }
  },

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