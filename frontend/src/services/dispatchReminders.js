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

export async function dispatchReminders() {
  const now = new Date().toISOString();
  console.log(`Reminder dispatcher started at ${now}`);

  const { data: cycles, error: cycleError } = await supabase
    .from('obligation_cycles')
    .select('id, user_id, name, expected_amount, due_timestamp')
    .eq('status', 'pending')
    .eq('notification_sent', false)
    .lte('due_timestamp', now)
    .order('due_timestamp', { ascending: true })
    .limit(500);

  if (cycleError) throw cycleError;
  if (!cycles?.length) {
    console.log('No due reminders.');
    return;
  }

  for (const cycle of cycles) {
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
    const body = amount > 0 ? `Reminder due now. Amount: ${amount}` : 'Reminder due now.';

    try {
      const response = await admin.messaging().sendEachForMulticast({
        notification: {
          title: cycle.name || 'Reminder due',
          body,
        },
        data: {
          cycleId: cycle.id,
          dueTimestamp: cycle.due_timestamp || '',
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
          console.log(`Cycle ${cycle.id}: notification delivered to ${response.successCount} device(s).`);
        }
      } else {
        console.error(`Cycle ${cycle.id}: notification failed for every device.`);
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
