// src/channels/whatsapp/whatsapp.router.js

const express = require('express');
const router = express.Router();
const supabase = require('../../../lib/supabase');
const {
  sendWhatsAppText,
  sendInteractiveButtons,
  sendInteractiveList,
} = require('./whatsapp.service');
const { handleAddFlow, startAddFlow } = require('./whatsapp.add-flow');

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

function getTodayBoundsForTimezone(timeZone = 'Asia/Kolkata') {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date());

    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    const year = parseInt(getPart('year'), 10);
    const month = parseInt(getPart('month'), 10);
    const day = parseInt(getPart('day'), 10);

    let guessTime = Date.UTC(year, month - 1, day, 0, 0, 0);
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });

    for (let i = -14; i <= 14; i++) {
      const testTime = guessTime + (i * 3600 * 1000);
      const formatted = formatter.format(new Date(testTime));
      if (formatted.startsWith(`${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`) && formatted.endsWith('00:00:00')) {
        guessTime = testTime;
        break;
      }
    }

    const startOfDay = new Date(guessTime);
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    return { startOfDay, startOfNextDay };
  } catch (e) {
    const now = new Date();
    const startOfDay = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
    const startOfNextDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
    return { startOfDay, startOfNextDay };
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

    console.log(`📨 WhatsApp event from ${senderPhone} | Step: ${session.step} | Text: "${incomingText}" | Button: "${buttonPayload}" | List: "${listPayload}"`);

    // --- DELEGATE TO ADD REMINDER FLOW IF SESSION IS ACTIVE IN WIZARD ---
    if (session.step !== 'idle' && session.step !== 'today_list' && session.step !== 'reminder_detail' && session.step !== 'home') {
      return handleAddFlow(senderPhone, session, incomingText, buttonPayload, listPayload);
    }

    // --- TRIGGER ADD FLOW MANUALLY ---
    if (incomingText === 'add' || incomingText === 'new' || buttonPayload === 'BTN_ADD') {
      return startAddFlow(senderPhone, session);
    }

    // --- TRIGGER LIST (Hi, Hello, Pending) ---
    if (
      incomingText === 'hi' ||
      incomingText === 'hello' ||
      incomingText === 'pending' ||
      incomingText === 'pending today' ||
      buttonPayload === 'BTN_TODAY' ||
      buttonPayload === 'BTN_BACK'
    ) {
      return renderTodayObligationsList(senderPhone, session, 0);
    }

    // --- PAGINATION HANDLER ---
    if (listPayload.startsWith('PAGE_')) {
      const targetPage = parseInt(listPayload.replace('PAGE_', ''), 10) || 0;
      return renderTodayObligationsList(senderPhone, session, targetPage);
    }

    // --- REMINDER DETAIL VIEW ---
    if (listPayload.startsWith('CYCLE_')) {
      const cycleId = listPayload.replace('CYCLE_', '');

      const { data: cycle, error: cycleErr } = await supabase
        .from('obligation_cycles')
        .select('id, name, expected_amount, due_timestamp, obligations(type)')
        .eq('id', cycleId)
        .eq('user_id', session.user_id)
        .single();

      if (cycleErr || !cycle) {
        await sendWhatsAppText(senderPhone, 'That reminder is no longer available.');
        return;
      }

      await supabase
        .from('whatsapp_sessions')
        .update({
          step: 'reminder_detail',
          payload: { ...session.payload, selected_cycle_id: cycle.id },
        })
        .eq('id', session.id);

      const obligationType = cycle.obligations?.type || 'bill';
      const isMonetary = obligationType === 'bill' && Number(cycle.expected_amount || 0) > 0;
      const amt = isMonetary
        ? `₹${Number(cycle.expected_amount).toLocaleString('en-IN')} · `
        : 'Event · ';
      
      const timeStr = cycle.due_timestamp 
        ? new Date(cycle.due_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : '';

      await sendInteractiveButtons(
        senderPhone,
        `📌 *${cycle.name || 'Untitled'}*\n${amt}Due Today at ${timeStr}`,
        [
          { id: 'BTN_DONE', title: isMonetary ? 'Mark Paid' : 'Mark Done' },
          { id: 'BTN_BACK', title: 'Back' },
        ]
      );
      return;
    }

    // --- MARK DONE / PAID ACTION ---
    if (buttonPayload === 'BTN_DONE') {
      const cycleId = session.payload?.selected_cycle_id;

      if (!cycleId) {
        await sendWhatsAppText(senderPhone, 'Session expired. Reply *pending* to view your reminders.');
        return;
      }

      const { data: cycle, error: cycleErr } = await supabase
        .from('obligation_cycles')
        .select('id, expected_amount, obligations(type)')
        .eq('id', cycleId)
        .eq('user_id', session.user_id)
        .single();

      if (cycleErr || !cycle) {
        await sendWhatsAppText(senderPhone, 'That reminder is no longer available.');
        return;
      }

      const obligationType = cycle.obligations?.type || 'bill';
      const isMonetary = obligationType === 'bill' && Number(cycle.expected_amount || 0) > 0;
      const newStatus = isMonetary ? 'paid' : 'completed';

      const { error: updateError } = await supabase
        .from('obligation_cycles')
        .update({
          status: newStatus,
          paid_at: new Date().toISOString(),
        })
        .eq('id', cycleId)
        .eq('user_id', session.user_id);

      if (updateError) {
        console.error('❌ Failed to update cycle status:', updateError);
        await sendWhatsAppText(senderPhone, 'Sorry, could not complete that reminder right now.');
        return;
      }

      const confirmationMsg = isMonetary ? "Paid 👍 Bill marked as paid." : "Done 👍 That's taken care of.";
      await sendWhatsAppText(senderPhone, confirmationMsg);
      
      const currentPage = session.payload?.page || 0;
      return renderTodayObligationsList(senderPhone, session, currentPage);
    }

    // --- FALLBACK ---
    await sendWhatsAppText(
      senderPhone,
      "I'm not sure what you mean. Reply 'pending' or 'hi' to see your reminders."
    );

  } catch (error) {
    console.error('❌ WhatsApp router error:', error);
  }
});

async function renderTodayObligationsList(senderPhone, session, pageIndex = 0) {
  const userId = session.user_id;

  const { data: sampleCycle } = await supabase
    .from('obligation_cycles')
    .select('user_timezone')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const userTimezone = sampleCycle?.user_timezone || 'Asia/Kolkata';
  const { startOfDay, startOfNextDay } = getTodayBoundsForTimezone(userTimezone);

  const { data: cycles, error: queryError } = await supabase
    .from('obligation_cycles')
    .select('id, name, category, expected_amount, due_timestamp, user_timezone, obligations(type)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('due_timestamp', startOfDay.toISOString())
    .lt('due_timestamp', startOfNextDay.toISOString())
    .order('due_timestamp', { ascending: true });

  if (queryError) {
    console.error('❌ Supabase cycles query error:', queryError);
    await sendWhatsAppText(senderPhone, 'Sorry, I could not load your reminders right now.');
    return;
  }

  if (!cycles || cycles.length === 0) {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'home', payload: {} })
      .eq('id', session.id);

    await sendInteractiveButtons(
      senderPhone,
      "You're all clear today. 👍",
      [
        { id: 'BTN_ADD', title: 'Add reminder' },
      ]
    );
    return;
  }

  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'today_list', payload: { ...session.payload, page: pageIndex } })
    .eq('id', session.id);

  const PAGE_SIZE = 9;
  const startIndex = pageIndex * PAGE_SIZE;
  const paginatedCycles = cycles.slice(startIndex, startIndex + PAGE_SIZE);
  const hasMore = startIndex + PAGE_SIZE < cycles.length;

  const rows = paginatedCycles.map((c) => {
    const obligationType = c.obligations?.type || 'bill';
    const isEvent = obligationType === 'event' || Number(c.expected_amount || 0) === 0;
    const amt = !isEvent
      ? `₹${Number(c.expected_amount).toLocaleString('en-IN')}`
      : 'Event';
    
    const timeStr = c.due_timestamp 
      ? new Date(c.due_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : '';

    return {
      id: `CYCLE_${c.id}`,
      title: `${c.name || 'Untitled'}`,
      description: `${timeStr} • ${amt}`,
    };
  });

  if (hasMore) {
    rows.push({
      id: `PAGE_${pageIndex + 1}`,
      title: '➡️ Next reminders',
      description: `Showing ${startIndex + 1}-${startIndex + paginatedCycles.length} of ${cycles.length}`,
    });
  }

  await sendInteractiveList(
    senderPhone,
    'Today Reminders',
    `You have ${cycles.length} pending ${cycles.length === 1 ? 'reminder' : 'reminders'} due today. Select one to update:`,
    'Select',
    rows
  );
}

module.exports = router;