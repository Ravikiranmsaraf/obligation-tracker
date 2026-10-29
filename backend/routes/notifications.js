  // backend/routes/notifications.js
import express from 'express';
import supabase from '@supabase/supabase-js';

const router = express.Router();


router.post('/notifications/action', async (req, res) => {
  const { reminderId, actionId } = req.body;

  if (!reminderId || !actionId) {
    return res.status(400).json({ error: 'Missing reminderId or actionId' });
  }

  try {
    console.log(`[Webhook] Received action ${actionId} for reminder/cycle ${reminderId}`);

    // 1. Handle "Done" or "Paid"
    if (actionId === 'MARK_COMPLETE' || actionId === 'MARK_PAID' || actionId === 'DONE') {
      await supabase
        .from('obligation_cycles')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);
    } 
    // 2. Handle "Skip Today"
    else if (actionId === 'SKIP_TODAY') {
      await supabase
        .from('obligation_cycles')
        .update({
          status: 'skipped',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);
    } 
    // 3. Handle Snooze actions (PLUS_1H, PLUS_1D, TOMORROW_9AM)
    else if (actionId === 'PLUS_1H' || actionId === 'PLUS_1D' || actionId === 'TOMORROW_9AM') {
      // Fetch the current cycle to get its due_timestamp and timezone
      const { data: cycle, error: fetchError } = await supabase
        .from('obligation_cycles')
        .select('due_timestamp, user_timezone')
        .eq('id', reminderId)
        .single();

      if (fetchError || !cycle) {
        throw new Error('Cycle not found for deferral');
      }

      const currentDue = new Date(cycle.due_timestamp);
      let newDueDate = new Date(currentDue);

      if (actionId === 'PLUS_1H') {
        newDueDate.setHours(newDueDate.getHours() + 1);
      } else if (actionId === 'PLUS_1D') {
        newDueDate.setDate(newDueDate.getDate() + 1);
      } else if (actionId === 'TOMORROW_9AM') {
        newDueDate.setDate(newDueDate.getDate() + 1);
        newDueDate.setHours(9, 0, 0, 0);
      }

      // Update Supabase: Shift due_timestamp and reset notification_sent to false
      await supabase
        .from('obligation_cycles')
        .update({
          due_timestamp: newDueDate.toISOString(),
          notification_sent: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reminderId);
    }

    return res.status(200).json({ success: true, message: 'Action processed successfully' });
  } catch (err) {
    console.error('[Webhook Error] Failed to process notification action:', err);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;