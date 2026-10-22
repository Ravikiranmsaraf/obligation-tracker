// src/channels/whatsapp/whatsapp.add-flow.js
const Groq = require('groq-sdk');
const supabase = require('../../../lib/supabase');
const {
  sendWhatsAppText,
  sendInteractiveButtons,
} = require('./whatsapp.service');

async function handleAddFlow(senderPhone, session, messageText, buttonPayload) {
  const step = session.step;

  if (messageText === 'cancel' || messageText === 'exit' || buttonPayload === 'ADD_CANCEL') {
    await resetSession(session.id);
    await sendWhatsAppText(senderPhone, "No worries! Reminder creation has been cancelled.");
    return;
  }

  switch (step) {
    case 'ADD_NAME':
      return handleNlpInput(senderPhone, session, messageText);
    case 'ADD_DETAILS':
      return handleMissingFieldInput(senderPhone, session, messageText);
    case 'ADD_CONFIRM':
      return handleConfirmation(senderPhone, session, buttonPayload);
    default:
      return startAddFlow(senderPhone, session);
  }
}

/**
 * Entry point: Triggered when user clicks [+ Add Reminder]
 * Displays the MECE examples prompt.
 */
async function startAddFlow(senderPhone, session) {
  const { error } = await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_NAME', payload: {} })
    .eq('id', session.id);

  if (error) {
    console.error('❌ Failed to update session step to ADD_NAME:', error);
    await sendWhatsAppText(senderPhone, "Sorry, something went wrong starting the reminder flow. Please try again.");
    return;
  }

  const promptText = 
    "What’s on your mind? Just type it out naturally.\n\n" +
    "Quick examples:\n" +
    "• *Dentist appointment Friday 4pm* (One-off Event)\n" +
    "• *Team sync every Tuesday 11am* (Recurring Event)\n" +
    "• *Pay credit card 4500 tomorrow 5pm* (One-off Bill)\n" +
    "• *Car Insurance of 4000 annually 10am on 13 Feb* (Recurring Bill)\n" +
    "• *Robert's Birthday 10 July every year* (Recurring Event)\n" +
    "• *Wifi bill 999 monthly on 5th 10am* (Recurring Bill)\n\n" +
    "Type yours below:";

  await sendInteractiveButtons(senderPhone, promptText, [
    { id: 'ADD_CANCEL', title: 'Cancel' }
  ]);
}

/**
 * Parse incoming text using Groq
 */
async function handleNlpInput(senderPhone, session, messageText) {
  if (!messageText) {
    await sendWhatsAppText(senderPhone, "Please type your reminder sentence:");
    return;
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    await sendWhatsAppText(senderPhone, "Sorry, system configuration error. Please try again later.");
    return;
  }

  const now = new Date();
  const systemPrompt = `
You are a fast, precise information extraction engine for the financial admin app 'Settld'.
Your task is to convert text into a JSON obligation payload.

CURRENT TEMPORAL CONTEXT:
- Today's ISO Date: ${now.toISOString().split('T')[0]}
- Current Year: ${now.getFullYear()}
- Current Month: ${now.getMonth() + 1}
- Current Day of Month: ${now.getDate()}

JSON OUTPUT STRUCTURE (Respond ONLY with valid JSON):
{
  "is_obligation": boolean,
  "name": string or null,
  "expected_amount": number or null,
  "due_day": number or null,
  "due_month": number or null,
  "frequency": "monthly" | "quarterly" | "yearly" | "one-off" | null,
  "type": "bill" | "event" | null,
  "due_time": string
}
Rules: Events without cost -> type="event", expected_amount=0. Bills -> type="bill", extract expected_amount. Default due_time="09:00" if missing.
`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract JSON from this text: "${messageText}"` },
      ],
      model: 'qwen/qwen3.8-27b',
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const parsed = JSON.parse(completion.choices[0].message.content);

    if (!parsed.is_obligation || !parsed.name) {
      await sendWhatsAppText(
        senderPhone,
        "Hmm, I couldn't quite catch a reminder in that. Try writing something like: *'Gym tomorrow 7am'* or *'Wifi bill 999 monthly'*."
      );
      return;
    }

    // Check for missing critical info (e.g. due date)
    if (!parsed.due_day || !parsed.due_month) {
      await supabase
        .from('whatsapp_sessions')
        .update({ step: 'ADD_DETAILS', payload: parsed })
        .eq('id', session.id);

      await sendWhatsAppText(
        senderPhone,
        `Got it: *"${parsed.name}"*${parsed.expected_amount ? ` (₹${parsed.expected_amount})` : ''}.\n\nWhen is this due? (e.g., *Tomorrow 5pm* or *Oct 25*)`
      );
      return;
    }

    // All fields present -> proceed to confirmation
    await saveToConfirmStep(senderPhone, session.id, parsed);

  } catch (err) {
    console.error('Groq NLP parsing error:', err);
    await sendWhatsAppText(senderPhone, "Sorry, I had trouble parsing that. Please try typing it again.");
  }
}

/**
 * Handle follow-up when user supplies missing fields (like due date)
 */
async function handleMissingFieldInput(senderPhone, session, messageText) {
  const existingPayload = session.payload || {};
  
  existingPayload.due_day = new Date(messageText).getDate() || new Date().getDate();
  existingPayload.due_month = new Date(messageText).getMonth() + 1 || new Date().getMonth() + 1;
  
  await saveToConfirmStep(senderPhone, session.id, existingPayload);
}

async function saveToConfirmStep(senderPhone, sessionId, payload) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_CONFIRM', payload })
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
      reminder_time: due_time || '09:00',
      is_active: true,
    })
    .select()
    .single();

  if (oblErr) {
    console.error('❌ Failed to create obligation:', oblErr);
    await sendWhatsAppText(senderPhone, "Sorry, I couldn't save your reminder right now.");
    await resetSession(session.id);
    return;
  }

  const dateStr = `${year}-${String(due_month || 1).padStart(2, '0')}-${String(due_day || 1).padStart(2, '0')}`;
  const dueTimestamp = new Date(`${dateStr}T${due_time || '09:00'}:00`).toISOString();
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
      reminder_time: due_time || '09:00',
      name,
      category: obligation.category,
      frequency: frequency || 'one-off',
      user_timezone: 'Asia/Kolkata',
    });

  await resetSession(session.id);
  await sendWhatsAppText(senderPhone, "All set! 👍 Your reminder is saved.");
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