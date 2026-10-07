import 'dotenv/config';
import ws from 'ws';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// 1. Decode Base64 Firebase Service Account safely
let serviceAccount;
try {
  const base64String = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64String) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is missing from environment variables.');
  }
  const jsonString = Buffer.from(base64String, 'base64').toString('utf8');
  serviceAccount = JSON.parse(jsonString);
} catch (e) {
  console.error('Failed to parse Firebase credentials from Base64:', e.message);
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 2. Initialize Supabase with Service Role Key
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
    realtime: { transport: ws }
  }
);

export async function dispatchReminders() {
  console.log('[Dispatcher Service] Checking for due obligation cycles...');
  const nowISO = new Date().toISOString();
  console.log(`[Dispatcher Service] Current UTC timestamp check: ${nowISO}`);

  const { data: cycles, error: fetchError } = await supabase
    .from('obligation_cycles')
    .select('*')
    .eq('status', 'pending')
    .eq('notification_sent', false)
    .lte('due_timestamp', nowISO);

  if (fetchError) {
    console.error('[Dispatcher Service] Error fetching obligation cycles:', fetchError);
    return;
  }

  if (!cycles || cycles.length === 0) {
    console.log('[Dispatcher Service] No pending cycle reminders due right now.');
    return;
  }

  console.log(`[Dispatcher Service] Found ${cycles.length} cycle reminder(s) to dispatch.`);

  for (const cycle of cycles) {
    console.log(`\n--- Processing Cycle ID: ${cycle.id} ---`);
    console.log(`[Dispatcher Service] Cycle Name: "${cycle.name}", User ID: ${cycle.user_id}`);

    // Query tokens for this specific user
    const { data: tokens, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('fcm_token, device_type, updated_at')
      .eq('user_id', cycle.user_id);

    if (tokenError) {
      console.error(`[Dispatcher Service] DB Error fetching tokens for user ${cycle.user_id}:`, tokenError);
      continue;
    }

    if (!tokens || tokens.length === 0) {
      console.warn(`[Dispatcher Service] ⚠️ NO ACTIVE TOKENS FOUND in user_push_tokens for user_id: ${cycle.user_id}`);
      continue;
    }

    console.log(`[Dispatcher Service] Found ${tokens.length} token(s) for user ${cycle.user_id}:`);
    tokens.forEach((t, idx) => {
      console.log(`  [Token ${idx + 1}] Type: ${t.device_type}, Updated: ${t.updated_at}, Token (first 15 chars): ${t.fcm_token.substring(0, 15)}...`);
    });

    const deviceTokens = tokens.map((t) => t.fcm_token);

    const message = {
      notification: {
        title: `Reminder: ${cycle.name || 'Obligation Due'} 🔔`,
        body: `Due now! Amount: ${cycle.expected_amount || 'N/A'}`
      },
      tokens: deviceTokens
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      console.log(`[Dispatcher Service] Multicast Dispatch Summary: Success = ${response.successCount}, Failure = ${response.failureCount}`);

      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            console.error(`  ❌ [Token ${idx + 1} Delivery Error]: ${resp.error?.code} - ${resp.error?.message}`);
          }
        });
      }

      if (response.successCount > 0) {
        await supabase
          .from('obligation_cycles')
          .update({ notification_sent: true })
          .eq('id', cycle.id);
        console.log(`[Dispatcher Service] ✅ Updated notification_sent = true for cycle ${cycle.id}`);
      } else {
        console.warn(`[Dispatcher Service] ⚠️ Skipping notification_sent flag update because successCount was 0.`);
      }

    } catch (err) {
      console.error(`[Dispatcher Service] Failed to send FCM message for cycle ${cycle.id}:`, err);
    }
  }
}

if (process.argv[1] === import.meta.filename) {
  dispatchReminders();
}