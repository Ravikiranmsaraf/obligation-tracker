// src/channels/whatsapp/whatsapp.router.js

const express = require('express');
const router = express.Router();
const supabase = require('../../../lib/supabase');
const {
  sendWhatsAppText,
  sendInteractiveButtons,
  sendInteractiveList,
} = require('./whatsapp.service');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'krona_whatsapp_verify_2026';

// 1. GET: Meta webhook verification
router.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified!');
    return res.status(200).send(challenge);
  }

  console.warn('❌ WhatsApp webhook verification failed');
  return res.sendStatus(403);
});

async function getOrCreateSession(phoneNumber) {
  const { data: existing, error: selectErr } = await supabase
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone_number', phoneNumber)
    .maybeSingle();

  if (selectErr) throw selectErr;
  if (existing) return existing;

  const { data: created, error: insertErr } = await supabase
    .from('whatsapp_sessions')
    .insert({
      phone_number: phoneNumber,
      step: 'idle',
      payload: {},
    })
    .select('*')
    .single();

  if (insertErr) throw insertErr;
  return created;
}

function getCurrencySymbol(currency) {
  switch (currency) {
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    default: return '₹';
  }
}

// 2. POST: Handle incoming WhatsApp messages & interactive events
router.post('/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    if (!message) return;

    const senderPhone = message.from;
    const normalizedPhone = `+${senderPhone.replace(/^\+/, '')}`;
    const session = await getOrCreateSession(normalizedPhone);

    if (!session.user_id) {
      await sendWhatsAppText(
        senderPhone,
        'Welcome to Krona! This WhatsApp number is not linked to an account yet.\n\nPlease sign in at https://Settld.duckdns.org and link your phone number.'
      );
      return;
    }

    let incomingText = '';
    let buttonPayload = '';
    let listPayload = '';

    if (message.type === 'text') {
      incomingText = message.text?.body?.trim().toLowerCase() || '';
    } else if (message.type === 'interactive') {
      if (message.interactive.type === 'button_reply') {
        buttonPayload = message.interactive.button_reply.id;
      } else if (message.interactive.type === 'list_reply') {
        listPayload = message.interactive.list_reply.id;
      }
    }

    console.log(`📨 WhatsApp event from ${senderPhone} | Text: "${incomingText}" | Button: "${buttonPayload}" | List: "${listPayload}"`);

    // --- HOME / MENU ---
    if (incomingText === 'hi' || incomingText === 'hello' || incomingText === 'menu' || buttonPayload === 'BTN_HOME') {
      const count = await getTodayCount(session.user_id);
      await supabase
        .from('whatsapp_sessions')
        .update({ step: 'home', payload: {} })
        .eq('id', session.id);

      await sendInteractiveButtons(
        senderPhone,
        `Hi 👋\nYou have ${count} ${count === 1 ? 'thing' : 'things'} to remember today.`,
        [
          { id: 'BTN_TODAY', title: 'Today' },
          { id: 'BTN_UPCOMING', title: 'Upcoming' },
          { id: 'BTN_ADD', title: 'Add reminder' },
        ]
      );
      return;
    }

    // --- TODAY LIST FLOW ---
    if (incomingText === 'pending' || incomingText === 'pending today' || buttonPayload === 'BTN_TODAY' || buttonPayload === 'BTN_BACK') {
      const cycles = await fetchTodayCycles(session.user_id);

      if (!cycles || cycles.length === 0) {
        await sendInteractiveButtons(
          senderPhone,
          "You're all clear today. 👍",
          [
            { id: 'BTN_ADD', title: 'Add reminder' },
            { id: 'BTN_UPCOMING', title: 'Upcoming' },
          ]
        );
        return;
      }

      await supabase
        .from('whatsapp_sessions')
        .update({ step: 'today_list', payload: {} })
        .eq('id', session.id);

      const currencySymbol = getCurrencySymbol(cycles[0]?.currency);
      const rows = cycles.map((c) => {
        const amt = Number(c.expected_amount || c.expectedamount) > 0
          ? `${currencySymbol}${Number(c.expected_amount || c.expectedamount).toLocaleString('en-IN')}`
          : 'Event';
        return {
          id: `CYCLE_${c.id}`,
          title: c.name || 'Untitled',
          description: amt,
        };
      });

      await sendInteractiveList(
        senderPhone,
        'Today Reminders',
        'Select a reminder below to view details:',
        'View Reminders',
        rows
      );
      return;
    }

    // --- REMINDER DETAIL VIEW ---
    if (listPayload.startsWith('CYCLE_')) {
      const cycleId = listPayload.replace('CYCLE_', '');

      const { data: cycle } = await supabase
        .from('obligation_cycles')
        .select('*')
        .eq('id', cycleId)
        .eq('user_id', session.user_id)
        .single();

      if (!cycle) {
        await sendWhatsAppText(senderPhone, 'That reminder is no longer available.');
        return;
      }

      // Save selected cycle ID in session payload
      await supabase
        .from('whatsapp_sessions')
        .update({
          step: 'reminder_detail',
          payload: { selected_cycle_id: cycle.id },
        })
        .eq('id', session.id);

      const currencySymbol = getCurrencySymbol(cycle.currency);
      const amt = Number(cycle.expected_amount || cycle.expectedamount) > 0
        ? `${currencySymbol}${Number(cycle.expected_amount || cycle.expectedamount).toLocaleString('en-IN')} · `
        : '';
      
      const timeStr = new Date(cycle.due_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await sendInteractiveButtons(
        senderPhone,
        `📌 *${cycle.name}*\n${amt}Due today at ${timeStr}`,
        [
          { id: 'BTN_DONE', title: 'Done' },
          { id: 'BTN_BACK', title: 'Back' },
        ]
      );
      return;
    }

    // --- COMPLETE / DONE ACTION ---
    if (buttonPayload === 'BTN_DONE') {
      const cycleId = session.payload?.selected_cycle_id;

      if (!cycleId) {
        await sendWhatsAppText(senderPhone, 'Session expired. Reply *pending* to view your reminders.');
        return;
      }

      // Update cycle status to completed in Supabase
      const { error: updateError } = await supabase
        .from('obligation_cycles')
        .update({ status: 'completed' })
        .eq('id', cycleId)
        .eq('user_id', session.user_id);

      if (updateError) {
        console.error('❌ Failed to complete cycle:', updateError);
        await sendWhatsAppText(senderPhone, 'Sorry, could not complete that reminder right now.');
        return;
      }

      // Acknowledge completion cleanly without extra clutter
      await sendWhatsAppText(senderPhone, "Done 👍 That's taken care of.");
      
      // Follow up by showing current pending list status
      return handleTodayShortcut(senderPhone, session.user_id);
    }

    // --- FALLBACK ---
    await sendWhatsAppText(
      senderPhone,
      "I'm not sure what you mean. Reply *menu* to see options."
    );

  } catch (error) {
    console.error('❌ WhatsApp router error:', error);
  }
});

async function getTodayCount(userId) {
  const { startOfDay, startOfNextDay } = getTodayBounds();
  const { count } = await supabase
    .from('obligation_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('due_timestamp', startOfDay.toISOString())
    .lt('due_timestamp', startOfNextDay.toISOString());
  return count || 0;
}

async function fetchTodayCycles(userId) {
  const { startOfDay, startOfNextDay } = getTodayBounds();
  const { data } = await supabase
    .from('obligation_cycles')
    .select('id, name, category, expected_amount, expectedamount, currency, due_timestamp')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('due_timestamp', startOfDay.toISOString())
    .lt('due_timestamp', startOfNextDay.toISOString())
    .order('due_timestamp', { ascending: true });
  return data || [];
}

function getTodayBounds() {
  const timeZone = 'Asia/Kolkata';
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const getPart = (type) => parts.find((p) => p.type === type).value;
  const localDate = `${getPart('year')}-${getPart('month')}-${getPart('day')}`;
  const [year, month, day] = localDate.split('-').map(Number);
  
  const startOfDay = new Date(Date.UTC(year, month - 1, day) - 330 * 60 * 1000);
  const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  return { startOfDay, startOfNextDay };
}

async function handleTodayShortcut(senderPhone, userId) {
  const cycles = await fetchTodayCycles(userId);

  if (!cycles || cycles.length === 0) {
    await sendInteractiveButtons(
      senderPhone,
      "You're all clear today. 👍",
      [
        { id: 'BTN_ADD', title: 'Add reminder' },
        { id: 'BTN_UPCOMING', title: 'Upcoming' },
      ]
    );
    return;
  }

  const currencySymbol = getCurrencySymbol(cycles[0]?.currency);
  const rows = cycles.map((c) => {
    const amt = Number(c.expected_amount || c.expectedamount) > 0
      ? `${currencySymbol}${Number(c.expected_amount || c.expectedamount).toLocaleString('en-IN')}`
      : 'Event';
    return {
      id: `CYCLE_${c.id}`,
      title: c.name || 'Untitled',
      description: amt,
    };
  });

  await sendInteractiveList(
    senderPhone,
    'Today Reminders',
    'Remaining for today:',
    'View Reminders',
    rows
  );
}

module.exports = router;