// src/channels/whatsapp/whatsapp.add-flow.js
const supabase = require('../../../lib/supabase');
const { parseObligationText } = require('../../services/obligation-parser.service');
const {
  sendWhatsAppText,
  sendInteractiveButtons,
} = require('./whatsapp.service');

async function handleAddFlow(senderPhone, session, messageText, buttonPayload) {
  const step = session.step;

  // Universal escape hatch
  if (messageText === 'cancel' || messageText === 'exit' || buttonPayload === 'ADD_CANCEL') {
    await resetSession(session.id);
    await sendWhatsAppText(senderPhone, "No worries! Reminder creation has been cancelled. Reply 'hi' whenever you're ready.");
    return;
  }

  switch (step) {
    case 'awaiting_name':
      return handleNlpInput(senderPhone, session, messageText);
    case 'awaiting_due_date':
      return handleMissingFieldInput(senderPhone, session, messageText);
    case 'confirming':
      return handleConfirmation(senderPhone, session, buttonPayload);
    default:
      return startAddFlow(senderPhone, session);
  }
}

/**
 * Entry point: Triggered when user clicks [+ Add Reminder]
 */
async function startAddFlow(senderPhone, session) {
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({ step: 'awaiting_name', payload: {} })
    .eq('id', session.id);

  if (error) {
    console.error('❌ Failed to update session step:', error);
    await sendWhatsAppText(senderPhone, "Sorry, something went wrong. Please try again.");
    return;
  }

  const promptText = 
    "What’s on your mind? Just type it out naturally.\n\n" +
    "Quick examples:\n" +
    "• *Dentist appointment Friday 4pm* (Event)\n" +
    "• *Pay credit card 4500 tomorrow 5pm* (Bill)\n" +
    "• *Wifi bill 999 monthly on 5th* (Recurring Bill)\n\n" +
    "Type yours below:";

  await sendInteractiveButtons(senderPhone, promptText, [
    { id: 'ADD_CANCEL', title: 'Cancel' }
  ]);
}

/**
 * Parse incoming text via shared service
 */
async function handleNlpInput(senderPhone, session, messageText) {
  if (!messageText) {
    await sendWhatsAppText(senderPhone, "Please type your reminder sentence:");
    return;
  }

  try {
    const parsed = await parseObligationText(messageText);

    if (!parsed.is_obligation || !parsed.name) {
      await sendWhatsAppText(
        senderPhone,
        "Hmm, I couldn't quite catch a reminder in that. Try writing something like: *'Gym tomorrow 7am'* or *'Wifi bill 999 monthly'*."
      );
      return;
    }

    // Check if critical fields are missing
    if (parsed.missing_fields && parsed.missing_fields.length > 0) {
      await supabase
        .from('whatsapp_sessions')
        .update({ step: 'awaiting_due_date', payload: parsed })
        .eq('id', session.id);

      await sendWhatsAppText(
        senderPhone,
        `Got it: *"${parsed.name}"*${parsed.expected_amount ? ` (₹${parsed.expected_amount})` : ''}.\n\nWhen is this due? (e.g., *Tomorrow 5pm* or *10th every month*)`
      );
      return;
    }

    await saveToConfirmStep(senderPhone, session.id, parsed);

  } catch (err) {
    console.error('NLP parsing error:', err);
    await sendWhatsAppText(senderPhone, "Sorry, I had trouble parsing that. Please try typing it again.");
  }
}

/**
 * Handle follow-up text for missing fields
 */
async function handleMissingFieldInput(senderPhone, session, messageText) {
  const existingPayload = session.payload || {};
  const combinedText = `${existingPayload.name} due ${messageText}`;
  
  try {
    const parsed = await parseObligationText(combinedText);
    parsed.expected_amount = existingPayload.expected_amount || parsed.expected_amount;
    parsed.type = existingPayload.type || parsed.type;
    parsed.name = existingPayload.name; // Keep original clean name

    await saveToConfirmStep(senderPhone, session.id, parsed);
  } catch (err) {
    console.error('Follow-up parsing error:', err);
    await sendWhatsAppText(senderPhone, "I didn't quite catch that date. Could you try entering it like *Tomorrow 5pm*?");
  }
}

async function saveToConfirmStep(senderPhone, sessionId, payload) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'confirming', payload })
    .eq('id', sessionId);

  const { name, type, expected_amount, due_day, due_month, due_time, frequency } = payload;
  const typeDisplay = type === 'bill' ? `Bill • ₹${Number(expected_amount).toLocaleString('en-IN')}` : 'Event';
  const currentYear = new Date().getFullYear();
  const dateStr = `${currentYear}-${String(due_month || 1).padStart(2, '0')}-${String(due_day || 1).padStart(2, '0')}`;

  await sendInteractiveButtons(
    senderPhone,
    `📌 *Here's what I've got:*\n\n*${name}*\n${typeDisplay}\nDue: ${dateStr} at ${due_time || '09:00'}\nRepeat: ${frequency || 'one-off'}\n\nLook good?`,
    [
      { id: 'CONFIRM_SAVE', title: 'Save Reminder' },
      { id: 'ADD_CANCEL', title: 'Cancel' },
    ]
  );
}

async function handleConfirmation(senderPhone, session, buttonPayload) {
  if (buttonPayload !== 'CONFIRM_SAVE') {
    await sendInteractiveButtons(senderPhone, "Tap Save Reminder to store it, or Cancel to abort.", [
      { id: 'CONFIRM_SAVE', title: 'Save Reminder' },
      { id: 'ADD_CANCEL', title: 'Cancel' },
    ]);
    return;
  }

  const { name, type, expected_amount, due_day, due_month, due_time, frequency } = session.payload;
  const userId = session.user_id;
  const year = new Date().getFullYear();
  const timeVal = due_time || '09:00';

  const { data: obligation, error: oblErr } = await supabase
    .from('obligations')
    .insert({
      user_id: userId,
      name,
      category: type === 'bill' ? 'Bills' : 'Personal',
      expected_amount: expected_amount || 0,
      frequency: frequency || 'one-off',
      type: type || 'bill',
      due_day: due_day || 1,
      due_month: due_month || 1,
      reminder_time: timeVal,
      is_active: true,
    })
    .select()
    .single();

  if (oblErr) {
    console.error('❌ Failed to create reminder:', oblErr);
    await sendWhatsAppText(senderPhone, "Sorry, I couldn't save your reminder right now.");
    await resetSession(session.id);
    return;
  }

  const dateStr = `${year}-${String(due_month || 1).padStart(2, '0')}-${String(due_day || 1).padStart(2, '0')}`;
  const dueTimestamp = new Date(`${dateStr}T${timeVal}:00`).toISOString();
  const cycleMonth = `${year}-${String(due_month || 1).padStart(2, '0')}-01`;

  await supabase
    .from('obligation_cycles')
    .insert({
      obligation_id: obligation.id,
      user_id: userId,
      cycle_month: cycleMonth,
      expected_amount: expected_amount || 0,
      status: 'pending',
      due_timestamp: dueTimestamp,
      reminder_time: timeVal,
      name,
      category: obligation.category,
      frequency: frequency || 'one-off',
      user_timezone: 'Asia/Kolkata',
    });

  await resetSession(session.id);

  // Post-Save Navigation Menu
  await sendInteractiveButtons(
    senderPhone,
    "All set! 👍 Your reminder is saved.\n\nWhat would you like to do next?",
    [
      { id: 'BTN_VIEW_LIST', title: 'View Reminders' },
      { id: 'BTN_ADD', title: '+ Add Another' },
      { id: 'BTN_HOME', title: 'Home' }
    ]
  );
}

async function resetSession(sessionId) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'idle', payload: {} })
    .eq('id', sessionId);
}

module.exports = {
  handleAddFlow,
  startAddFlow,
};