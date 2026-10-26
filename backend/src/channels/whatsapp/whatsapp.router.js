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
  if (existing && existing.user_id) return existing;

  // Fallback check against profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('phone_number', phoneNumber.replace('+', ''))
    .maybeSingle();

  const linkedUserId = profile ? profile.id : null;

  if (existing) {
    if (linkedUserId && !existing.user_id) {
      await supabase
        .from('whatsapp_sessions')
        .update({ user_id: linkedUserId })
        .eq('id', existing.id);
      existing.user_id = linkedUserId;
    }
    return existing;
  }

  const { data: created, error: insertErr } = await supabase
    .from('whatsapp_sessions')
    .insert({
      phone_number: phoneNumber,
      user_id: linkedUserId,
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
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    for (let i = -14; i <= 14; i++) {
      const testTime = guessTime + i * 3600 * 1000;
      const formatted = formatter.format(new Date(testTime));
      if (
        formatted.startsWith(`${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`) &&
        formatted.endsWith('00:00:00')
      ) {
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

function getMonthBoundsForTimezone(timeZone = 'Asia/Kolkata', target = 'current') {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
  });
  const parts = formatter.formatToParts(now);
  const year = parseInt(parts.find((p) => p.type === 'year').value, 10);
  const month = parseInt(parts.find((p) => p.type === 'month').value, 10);

  let targetYear = year;
  let targetMonth = month;

  if (target === 'next') {
    targetMonth = month + 1;
    if (targetMonth > 12) {
      targetMonth = 1;
      targetYear += 1;
    }
  }

  const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0));
  const endDate = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0));

  return {
    startDate,
    endDate,
    monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
  };
}

// Helper to check user Pro status
async function isProUser(userId) {
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', userId)
    .single();

  return userProfile?.subscription_status === 'active';
}

// Helper to send Pro Lock error message for Add flow
async function sendAddProGateMessage(senderPhone) {
  await sendWhatsAppText(
    senderPhone,
    '🔒 *Cuenuvo Pro Feature*\n\nAdding new reminders via WhatsApp is exclusive to Cuenuvo Pro subscribers.\n\n' +
    'Please upgrade to Pro on your web app at https://Cuenuvo.duckdns.org or create reminders directly on your web dashboard!'
  );
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
        'Welcome to Cuenuvo! 🌿 This WhatsApp number is not linked to an account yet.\n\n' +
        'Please sign in with Google and complete your setup at https://Cuenuvo.duckdns.org/login\n\n' +
        'Once completed, come back and reply "hi"!'
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

    console.log(
      `📨 WhatsApp event from ${senderPhone} | Step: ${session.step} | Text: "${incomingText}" | Button: "${buttonPayload}" | List: "${listPayload}"`
    );

    // --- UNIVERSAL ESCAPE HATCH ---
    if (
      incomingText === 'cancel' ||
      incomingText === 'exit' ||
      incomingText === 'stop' ||
      incomingText === 'reset' ||
      buttonPayload === 'ADD_CANCEL' ||
      listPayload === 'NAV_CANCEL'
    ) {
      await supabase
        .from('whatsapp_sessions')
        .update({ step: 'idle', payload: {} })
        .eq('id', session.id);
      await sendWhatsAppText(senderPhone, "Cancelled. Reply 'hi' or 'home' whenever you're ready.");
      return;
    }

    // --- LIST FOOTER NAVIGATION: HOME ---
    if (listPayload === 'NAV_HOME' || buttonPayload === 'BTN_HOME') {
      await renderHomeGreeting(senderPhone, session);
      return;
    }

    // --- PRIORITY 1: HANDLE ACTIVE WIZARD STEPS (GATED TO PRO) ---
    if (
      session.step &&
      (session.step === 'awaiting_name' ||
        session.step === 'awaiting_amount' ||
        session.step === 'awaiting_due_date' ||
        session.step === 'awaiting_time' ||
        session.step === 'confirming')
    ) {
      const userIsPro = await isProUser(session.user_id);
      if (!userIsPro) {
        await supabase
          .from('whatsapp_sessions')
          .update({ step: 'idle', payload: {} })
          .eq('id', session.id);
        await sendAddProGateMessage(senderPhone);
        return;
      }
      await handleAddFlow(senderPhone, session, incomingText, buttonPayload);
      return;
    }

    // --- TRIGGER ADD FLOW MANUALLY (GATED TO PRO) ---
    if (incomingText === 'add' || incomingText === 'new' || buttonPayload === 'BTN_ADD') {
      const userIsPro = await isProUser(session.user_id);
      if (!userIsPro) {
        await sendAddProGateMessage(senderPhone);
        return;
      }
      await startAddFlow(senderPhone, session);
      return;
    }

    // --- TRIGGER HOME / GREETING (FREE FOR EVERYONE) ---
    if (
      incomingText === 'hi' ||
      incomingText === 'hello' ||
      incomingText === 'menu' ||
      incomingText === 'start' ||
      incomingText === 'home'
    ) {
      await renderHomeGreeting(senderPhone, session);
      return;
    }

    // --- HELP COMMAND CARD (FREE FOR EVERYONE) ---
    if (incomingText === 'help' || buttonPayload === 'BTN_HELP') {
      await sendWhatsAppText(
        senderPhone,
        "📌 *Cuenuvo Command Guide*\n\n" +
        "• *hi* or *home* - View summary & counts\n" +
        "• *today* - View today's reminders\n" +
        "• *overdue* - View unresolved past items\n" +
        "• *month* - View this month's list\n" +
        "• *next month* - Preview next month\n" +
        "• *master* - Web app link\n" +
        "• *add* - Create a new reminder (Pro 👑)\n" +
        "• *cancel* - Abort action"
      );
      return;
    }

    // --- MASTER LIST BRIDGE (FREE FOR EVERYONE) ---
    if (incomingText === 'master' || incomingText === 'all') {
      await sendWhatsAppText(
        senderPhone,
        "🌐 *Master Reminder Templates*\n\nTo view and manage master templates, pause recurrences, or edit settings, visit your dashboard:\nhttps://Cuenuvo.duckdns.org"
      );
      return;
    }

    // --- VIEW TODAY LIST (FREE FOR EVERYONE) ---
    if (
      incomingText === 'today' ||
      incomingText === 'due today' ||
      incomingText === 'list' ||
      buttonPayload === 'BTN_VIEW_TODAY' ||
      buttonPayload === 'BTN_VIEW_LIST' ||
      buttonPayload === 'BTN_BACK'
    ) {
      await renderTodayObligationsList(senderPhone, session, 0);
      return;
    }

    // --- VIEW OVERDUE LIST (FREE FOR EVERYONE) ---
    if (
      incomingText === 'overdue' ||
      incomingText === 'due overdue' ||
      buttonPayload === 'BTN_VIEW_OVERDUE'
    ) {
      await renderOverdueObligationsList(senderPhone, session, 0);
      return;
    }

    // --- VIEW THIS MONTH LIST (FREE FOR EVERYONE) ---
    if (
      incomingText === 'month' ||
      incomingText === 'this month' ||
      incomingText === 'due this month' ||
      buttonPayload === 'BTN_VIEW_MONTH'
    ) {
      await renderMonthObligationsList(senderPhone, session, 'current', 0);
      return;
    }

    // --- VIEW NEXT MONTH LIST (FREE FOR EVERYONE) ---
    if (incomingText === 'next month' || buttonPayload === 'BTN_VIEW_NEXT_MONTH') {
      await renderMonthObligationsList(senderPhone, session, 'next', 0);
      return;
    }

    // --- PAGINATION HANDLERS (FREE FOR EVERYONE) ---
    if (listPayload.startsWith('PAGE_TODAY_')) {
      const targetPage = parseInt(listPayload.replace('PAGE_TODAY_', ''), 10) || 0;
      return renderTodayObligationsList(senderPhone, session, targetPage);
    }
    if (listPayload.startsWith('PAGE_OVERDUE_')) {
      const targetPage = parseInt(listPayload.replace('PAGE_OVERDUE_', ''), 10) || 0;
      return renderOverdueObligationsList(senderPhone, session, targetPage);
    }
    if (listPayload.startsWith('PAGE_MONTH_')) {
      const parts = listPayload.replace('PAGE_MONTH_', '').split('_');
      const target = parts[0]; // 'current' or 'next'
      const targetPage = parseInt(parts[1], 10) || 0;
      return renderMonthObligationsList(senderPhone, session, target, targetPage);
    }

    // --- REMINDER DETAIL VIEW (FREE FOR EVERYONE) ---
    if (listPayload.startsWith('CYCLE_')) {
      const cycleId = listPayload.replace('CYCLE_', '');

      const { data: cycle, error: cycleErr } = await supabase
        .from('obligation_cycles')
        .select('id, name, expected_amount, due_timestamp, obligations(type)')
        .eq('id', cycleId)
        .eq('user_id', session.user_id)
        .single();

      if (cycleErr || !cycle) {
        await sendWhatsAppText(senderPhone, "That reminder is no longer available.");
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
        `📌 *${cycle.name || 'Untitled'}*\n${amt}Due at ${timeStr}`,
        [
          { id: 'BTN_DONE', title: isMonetary ? 'Mark Paid' : 'Mark Done' },
          { id: 'BTN_BACK', title: 'Back to List' },
        ]
      );
      return;
    }

    // --- MARK DONE / PAID ACTION (FREE FOR EVERYONE) ---
    if (buttonPayload === 'BTN_DONE') {
      const cycleId = session.payload?.selected_cycle_id;

      if (!cycleId) {
        await sendWhatsAppText(senderPhone, "Session expired. Reply *hi* to view your reminders.");
        return;
      }

      const { data: cycle, error: cycleErr } = await supabase
        .from('obligation_cycles')
        .select('id, expected_amount, obligations(type)')
        .eq('id', cycleId)
        .eq('user_id', session.user_id)
        .single();

      if (cycleErr || !cycle) {
        await sendWhatsAppText(senderPhone, "That reminder is no longer available.");
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
        await sendWhatsAppText(senderPhone, "Sorry, I couldn't update that reminder right now.");
        return;
      }

      const confirmationMsg = isMonetary ? "Paid 👍 Bill marked as paid." : "All sorted! 👍 That's taken care of.";
      await sendWhatsAppText(senderPhone, confirmationMsg);

      const currentPage = session.payload?.page || 0;
      return renderTodayObligationsList(senderPhone, session, currentPage);
    }

    // --- FALLBACK ---
    await sendWhatsAppText(
      senderPhone,
      "I didn't quite catch that. Reply *'hi'* for summary, *'today'* for list, or *'help'* for available commands."
    );

  } catch (error) {
    console.error('❌ WhatsApp router error:', error);
  }
});

/**
 * Render Welcome Summary with Overdue Count + Today Count + Late-Month Nudge
 */
async function renderHomeGreeting(senderPhone, session) {
  const userId = session.user_id;

  const { data: sampleCycle } = await supabase
    .from('obligation_cycles')
    .select('user_timezone')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const userTimezone = sampleCycle?.user_timezone || 'Asia/Kolkata';
  const { startOfDay, startOfNextDay } = getTodayBoundsForTimezone(userTimezone);

  // 1. Count Overdue
  const { count: overdueCount } = await supabase
    .from('obligation_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('due_timestamp', startOfDay.toISOString());

  // 2. Count Today
  const { count: todayCount } = await supabase
    .from('obligation_cycles')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('due_timestamp', startOfDay.toISOString())
    .lt('due_timestamp', startOfNextDay.toISOString());

  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'home', payload: {} })
    .eq('id', session.id);

  let summaryText = `Hey there! 👋 Here’s your update:\n`;
  if (overdueCount > 0) {
    summaryText += `\n⚠️ *${overdueCount} Overdue* reminder${overdueCount === 1 ? '' : 's'} (needs attention!)`;
  }
  if (todayCount > 0) {
    summaryText += `\n📌 *${todayCount} Due today*`;
  }
  if (overdueCount === 0 && todayCount === 0) {
    summaryText += `\nYou're all clear for today. Take a deep breath! 🌿`;
  }

  const currentDay = new Date().getDate();
  if (currentDay >= 20) {
    summaryText += `\n\n💡 *Planning ahead?* Type *'next month'* to preview your upcoming bills.`;
  }

  const buttons = [];
  if (overdueCount > 0) {
    buttons.push({ id: 'BTN_VIEW_OVERDUE', title: 'View Overdue' });
  }
  if (todayCount > 0 || buttons.length === 0) {
    buttons.push({ id: 'BTN_VIEW_TODAY', title: 'View Today' });
  }
  buttons.push({ id: 'BTN_ADD', title: '+ Add (Pro 👑)' });

  await sendInteractiveButtons(senderPhone, summaryText, buttons.slice(0, 3));
}

/**
 * Render Today's Interactive List with Full Pagination & Escape Rows (Max 10 rows per Meta constraint)
 */
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
    await sendWhatsAppText(senderPhone, "Sorry, I couldn't load your reminders right now.");
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
        { id: 'BTN_ADD', title: '+ Add (Pro 👑)' },
        { id: 'BTN_HOME', title: 'Home' }
      ]
    );
    return;
  }

  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'today_list', payload: { ...session.payload, page: pageIndex } })
    .eq('id', session.id);

  const PAGE_SIZE = 6; // Leave strict capacity for pagination & nav rows (Max 10 total)
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
      id: `PAGE_TODAY_${pageIndex + 1}`,
      title: '➡️ Next Page',
      description: `Showing ${startIndex + 1}-${startIndex + paginatedCycles.length} of ${cycles.length}`,
    });
  }

  rows.push({
    id: 'NAV_HOME',
    title: '🏠 Back to Home',
    description: 'Return to welcome summary',
  });
  rows.push({
    id: 'NAV_CANCEL',
    title: '❌ Cancel / Exit',
    description: 'Clear current session',
  });

  await sendInteractiveList(
    senderPhone,
    'Today Reminders',
    `Here’s what’s on your plate today (${cycles.length} pending). Tap one to update:`,
    'Select',
    rows
  );
}

/**
 * Render Overdue Obligations List with Full Pagination & Escape Rows
 */
async function renderOverdueObligationsList(senderPhone, session, pageIndex = 0) {
  const userId = session.user_id;

  const { data: sampleCycle } = await supabase
    .from('obligation_cycles')
    .select('user_timezone')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const userTimezone = sampleCycle?.user_timezone || 'Asia/Kolkata';
  const { startOfDay } = getTodayBoundsForTimezone(userTimezone);

  const { data: cycles, error } = await supabase
    .from('obligation_cycles')
    .select('id, name, expected_amount, due_timestamp, obligations(type)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .lt('due_timestamp', startOfDay.toISOString())
    .order('due_timestamp', { ascending: true });

  if (error || !cycles || cycles.length === 0) {
    await sendWhatsAppText(senderPhone, "You have no overdue reminders! 🎉");
    return renderHomeGreeting(senderPhone, session);
  }

  const PAGE_SIZE = 6;
  const startIndex = pageIndex * PAGE_SIZE;
  const paginatedCycles = cycles.slice(startIndex, startIndex + PAGE_SIZE);
  const hasMore = startIndex + PAGE_SIZE < cycles.length;

  const rows = paginatedCycles.map((c) => {
    const isEvent = c.obligations?.type === 'event' || Number(c.expected_amount || 0) === 0;
    const dateStr = new Date(c.due_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      id: `CYCLE_${c.id}`,
      title: `${c.name || 'Untitled'}`,
      description: `${dateStr} • ${!isEvent ? `₹${Number(c.expected_amount).toLocaleString('en-IN')}` : 'Event'}`,
    };
  });

  if (hasMore) {
    rows.push({
      id: `PAGE_OVERDUE_${pageIndex + 1}`,
      title: '➡️ Next Page',
      description: `Showing ${startIndex + 1}-${startIndex + paginatedCycles.length} of ${cycles.length}`,
    });
  }

  rows.push({
    id: 'NAV_HOME',
    title: '🏠 Back to Home',
    description: 'Return to welcome summary',
  });
  rows.push({
    id: 'NAV_CANCEL',
    title: '❌ Cancel / Exit',
    description: 'Clear current session',
  });

  await sendInteractiveList(
    senderPhone,
    'Overdue Reminders',
    `Here are your unresolved past reminders (${cycles.length}):`,
    'Select',
    rows
  );
}

/**
 * Render Calendar Month Obligations List (Current or Next) with Full Pagination & Escape Rows
 */
async function renderMonthObligationsList(senderPhone, session, target = 'current', pageIndex = 0) {
  const userId = session.user_id;

  const { data: sampleCycle } = await supabase
    .from('obligation_cycles')
    .select('user_timezone')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();

  const userTimezone = sampleCycle?.user_timezone || 'Asia/Kolkata';
  const { startDate, endDate, monthName } = getMonthBoundsForTimezone(userTimezone, target);

  const { data: cycles, error } = await supabase
    .from('obligation_cycles')
    .select('id, name, expected_amount, due_timestamp, obligations(type)')
    .eq('user_id', userId)
    .eq('status', 'pending')
    .gte('due_timestamp', startDate.toISOString())
    .lt('due_timestamp', endDate.toISOString())
    .order('due_timestamp', { ascending: true });

  if (error || !cycles || cycles.length === 0) {
    await sendWhatsAppText(senderPhone, `No pending reminders found for ${monthName}. 👍`);
    return;
  }

  const PAGE_SIZE = 6;
  const startIndex = pageIndex * PAGE_SIZE;
  const paginatedCycles = cycles.slice(startIndex, startIndex + PAGE_SIZE);
  const hasMore = startIndex + PAGE_SIZE < cycles.length;

  const rows = paginatedCycles.map((c) => {
    const isEvent = c.obligations?.type === 'event' || Number(c.expected_amount || 0) === 0;
    const dateStr = new Date(c.due_timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return {
      id: `CYCLE_${c.id}`,
      title: `${c.name || 'Untitled'}`,
      description: `${dateStr} • ${!isEvent ? `₹${Number(c.expected_amount).toLocaleString('en-IN')}` : 'Event'}`,
    };
  });

  if (hasMore) {
    rows.push({
      id: `PAGE_MONTH_${target}_${pageIndex + 1}`,
      title: '➡️ Next Page',
      description: `Showing ${startIndex + 1}-${startIndex + paginatedCycles.length} of ${cycles.length}`,
    });
  }

  rows.push({
    id: 'NAV_HOME',
    title: '🏠 Back to Home',
    description: 'Return to welcome summary',
  });
  rows.push({
    id: 'NAV_CANCEL',
    title: '❌ Cancel / Exit',
    description: 'Clear current session',
  });

  await sendInteractiveList(
    senderPhone,
    `${monthName}`,
    `Here are your reminders for ${monthName} (${cycles.length} pending):`,
    'Select',
    rows
  );
}

module.exports = router;