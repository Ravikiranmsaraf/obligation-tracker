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

    // --- TRIGGER LIST (Hi, Hello, Pending) ---
    if (
      incomingText === 'hi' ||
      incomingText === 'hello' ||
      incomingText === 'pending' ||
      incomingText === 'pending today' ||
      buttonPayload === 'BTN_TODAY' ||
      buttonPayload === 'BTN_BACK'
    ) {
      return renderObligationsList(senderPhone, session, 0);
    }

    // --- PAGINATION HANDLER ---
    if (listPayload.startsWith('PAGE_')) {
      const targetPage = parseInt(listPayload.replace('PAGE_', ''), 10) || 0;
      return renderObligationsList(senderPhone, session, targetPage);
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

      await supabase
        .from('whatsapp_sessions')
        .update({
          step: 'reminder_detail',
          payload: { ...session.payload, selected_cycle_id: cycle.id },
        })
        .eq('id', session.id);

      const currencySymbol = getCurrencySymbol(cycle.currency);
      const isMonetary = Number(cycle.expected_amount || cycle.expectedamount) > 0;
      const amt = isMonetary
        ? `${currencySymbol}${Number(cycle.expected_amount || cycle.expectedamount).toLocaleString('en-IN')} · `
        : 'Event · ';
      
      const timeStr = cycle.due_timestamp 
        ? new Date(cycle.due_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
        : '';

      await sendInteractiveButtons(
        senderPhone,
        `📌 *${cycle.name}*\n${amt}Due: ${new Date(cycle.due_timestamp).toLocaleDateString()} ${timeStr}`,
        [
          { id: 'BTN_DONE', title: isMonetary ? 'Mark Paid' : 'Mark Done' },
          { id: 'BTN_BACK', title: 'Back' },
        ]
      );
      return;
    }

    // --- MARK DONE / PAID ACTION (Mirrors ObligationListView logic) ---
    if (buttonPayload === 'BTN_DONE') {
      const cycleId = session.payload?.selected_cycle_id;

      if (!cycleId) {
        await sendWhatsAppText(senderPhone, 'Session expired. Reply *pending* to view your reminders.');
        return;
      }

      // Fetch cycle to check if monetary (bill) or non-monetary (event)
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

      const isMonetary = Number(cycle.expected_amount || cycle.expectedamount) > 0;
      const newStatus = isMonetary ? 'paid' : 'completed';
      const updatePayload = {
        status: newStatus,
        paid_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('obligation_cycles')
        .update(updatePayload)
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
      return renderObligationsList(senderPhone, session, currentPage);
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

// Helper to fetch and render active pending obligations matching ObligationListView logic
async function renderObligationsList(senderPhone, session, pageIndex = 0) {
  const userId = session.user_id;

  // Fetch pending cycles (similar to frontend data props)
  const { data: cycles } = await supabase
    .from('obligation_cycles')
    .select('id, name, category, expected_amount, expectedamount, currency, due_timestamp, type')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .order('due_timestamp', { ascending: true });

  if (!cycles || cycles.length === 0) {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'home', payload: {} })
      .eq('id', session.id);

    await sendInteractiveButtons(
      senderPhone,
      "All clear for now! 🎉 Take a deep breath and enjoy your day.",
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

  const currencySymbol = getCurrencySymbol(cycles[0]?.currency);
  const rows = paginatedCycles.map((c) => {
    const isEvent = c.type === 'event' || Number(c.expected_amount || c.expectedamount) === 0;
    const amt = !isEvent
      ? `${currencySymbol}${Number(c.expected_amount || c.expectedamount).toLocaleString('en-IN')}`
      : 'Event';
    
    const dueDateLabel = new Date(c.due_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return {
      id: `CYCLE_${c.id}`,
      title: `${c.name || 'Untitled'}`,
      description: `${dueDateLabel} • ${amt}`,
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
    'Reminders List',
    `You have ${cycles.length} pending ${cycles.length === 1 ? 'reminder' : 'reminders'}. Select one to update:`,
    'View Reminders',
    rows
  );
}

module.exports = router;