import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is missing from environment variables.`);
  return value;
}

function isInvalidTokenError(code) {
  return [
    'messaging/invalid-registration-token',
    'messaging/registration-token-not-registered',
  ].includes(code);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(
    Buffer.from(requireEnv('FIREBASE_SERVICE_ACCOUNT_BASE64'), 'base64').toString('utf8'),
  );
} catch (error) {
  console.error('Failed to parse Firebase credentials:', error.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const supabase = createClient(
  requireEnv('SUPABASE_URL'),
  requireEnv('SUPABASE_SERVICE_ROLE_KEY'),
  {
    auth: { persistSession: false },
    realtime: { transport: ws },
  },
);

async function deleteInvalidTokens(tokens, response) {
  const invalidTokens = response.responses
    .map((result, index) => ({ result, token: tokens[index] }))
    .filter(({ result }) => !result.success && isInvalidTokenError(result.error?.code))
    .map(({ token }) => token);

  if (!invalidTokens.length) return;

  const { error } = await supabase
    .from('user_push_tokens')
    .delete()
    .in('fcm_token', invalidTokens);

  if (error) console.error('Could not remove invalid FCM tokens:', error.message);
}

/**
 * Gets local time components based on user timezone.
 */
function getUserLocalParts(timeZone = 'UTC') {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
    });
    const parts = formatter.formatToParts(new Date());
    const getPart = (type) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);
    return {
      hour: getPart('hour'),
      minute: getPart('minute'),
    };
  } catch (err) {
    const now = new Date();
    return { hour: now.getUTCHours(), minute: now.getUTCMinutes() };
  }
}

/**
 * Computes dynamic action buttons matching Google Calendar style.
 */
function resolveReminderActions(frequency, localHour) {
  const isDaily = frequency === 'daily';

  if (isDaily) {
    return [
      { id: 'DONE', label: 'Done ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'SKIP_TODAY', label: 'Skip today 🚫', type: 'skip' },
    ];
  }

  // Non-daily items
  if (localHour < 16) {
    return [
      { id: 'DONE', label: 'Done / Paid ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'PLUS_1D', label: 'Snooze 1 day 📅', type: 'snooze', days: 1 },
    ];
  } else {
    return [
      { id: 'DONE', label: 'Done / Paid ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'TOMORROW_9AM', label: 'Tomorrow 9 AM 🌅', type: 'snooze', target: 'tomorrow_9am' },
    ];
  }
}

export async function dispatchReminders() {
  const now = new Date().toISOString();
  console.log(`Reminder dispatcher started at ${now}`);

  const nowDate = new Date();
  const windowStart = new Date(nowDate.getTime() - 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(nowDate.getTime() + 15 * 60 * 1000).toISOString();

  const { data: cycles, error: cycleError } = await supabase
    .from('obligation_cycles')
    .select('id, user_id, name, expected_amount, due_timestamp, user_timezone, frequency')
    .eq('status', 'pending')
    .eq('notification_sent', false)
    .gte('due_timestamp', windowStart)
    .lte('due_timestamp', windowEnd)
    .order('due_timestamp', { ascending: true })
    .limit(500);

  if (cycleError) throw cycleError;
  if (!cycles?.length) {
    console.log('No due reminders.');
    return;
  }

  for (const cycle of cycles) {
    const tz = cycle.user_timezone || 'UTC';
    const { hour: localHour } = getUserLocalParts(tz);

    // Quiet Hours Check: 10:00 PM (22:00) to 7:00 AM (07:00) local time
    if (localHour >= 22 || localHour < 7) {
      console.log(
        `Cycle ${cycle.id}: Skipped due to quiet hours in timezone ${tz} (Local hour: ${localHour}). Held for morning digest.`
      );
      continue;
    }

    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('fcm_token')
      .eq('user_id', cycle.user_id);

    if (tokenError) {
      console.error(`Token lookup failed for cycle ${cycle.id}:`, tokenError.message);
      continue;
    }

    if (!tokens?.length) {
      console.warn(`No active push token for cycle ${cycle.id}.`);
      continue;
    }

    const deviceTokens = tokens.map(({ fcm_token }) => fcm_token);
    const amount = Number(cycle.expected_amount || 0);
    const isBill = amount > 0;
    const body = isBill ? `Reminder due now. Amount: ${amount}` : 'Reminder due now.';

    const actions = resolveReminderActions(cycle.frequency, localHour, isBill);

    try {
      const response = await admin.messaging().sendEachForMulticast({
        notification: {
          title: cycle.name || 'Reminder due',
          body,
        },
        data: {
          reminderId: cycle.id,
          cycleId: cycle.id,
          dueTimestamp: cycle.due_timestamp || '',
          REMINDER_ACTIONS: JSON.stringify(actions),
        },
        tokens: deviceTokens,
      });

      await deleteInvalidTokens(deviceTokens, response);

      // Mark sent only after at least one successful delivery.
      if (response.successCount > 0) {
        const { error: updateError } = await supabase
          .from('obligation_cycles')
          .update({ notification_sent: true })
          .eq('id', cycle.id)
          .eq('notification_sent', false);

        if (updateError) {
          console.error(`Could not mark cycle ${cycle.id} as notified:`, updateError.message);
        } else {
          console.log(
            `Cycle ${cycle.id}: notification delivered to ${response.successCount} device(s). Actions attached: ${actions.map((a) => a.id).join(', ')}`
          );
        }
      } else {
        console.error(
          `Cycle ${cycle.id}: notification failed for every device.`,
          JSON.stringify(
            response.responses.map((r) => ({
              success: r.success,
              code: r.error?.code,
              message: r.error?.message,
            })),
            null,
            2
          )
        );
      }
    } catch (error) {
      console.error(`FCM dispatch failed for cycle ${cycle.id}:`, error.message);
    }
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  dispatchReminders().catch((error) => {
    console.error('Reminder dispatcher failed:', error);
    process.exit(1);
  });
}