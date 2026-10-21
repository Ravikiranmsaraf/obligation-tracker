// src/channels/whatsapp/whatsapp.add-flow.js
const supabase = require('../../../lib/supabase');
const {
  sendWhatsAppText,
  sendInteractiveButtons,
  sendInteractiveList,
} = require('./whatsapp.service');

/**
 * Main dispatcher for the Add Reminder flow based on session step
 */
async function handleAddFlow(senderPhone, session, messageText, buttonPayload, listPayload) {
  const step = session.step;
  const payload = session.payload || {};

  // Global escape hatch
  if (messageText === 'cancel' || buttonPayload === 'ADD_CANCEL') {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'idle', payload: {} })
      .eq('id', session.id);
    await sendWhatsAppText(senderPhone, 'Reminder creation cancelled.');
    return;
  }

  switch (step) {
    case 'ADD_NAME':
      return handleNameInput(senderPhone, session, messageText);
    case 'ADD_TYPE':
      return handleTypeInput(senderPhone, session, buttonPayload, messageText);
    case 'ADD_AMOUNT':
      return handleAmountInput(senderPhone, session, messageText);
    case 'ADD_DATE':
      return handleDateInput(senderPhone, session, buttonPayload, messageText);
    case 'ADD_CUSTOM_DATE':
      return handleCustomDateInput(senderPhone, session, messageText);
    case 'ADD_TIME':
      return handleTimeInput(senderPhone, session, buttonPayload, messageText);
    case 'ADD_CUSTOM_TIME':
      return handleCustomTimeInput(senderPhone, session, messageText);
    case 'ADD_REPEAT':
      return handleRepeatInput(senderPhone, session, listPayload, buttonPayload);
    case 'ADD_CONFIRM':
      return handleConfirmation(senderPhone, session, buttonPayload);
    default:
      return startAddFlow(senderPhone, session);
  }
}

/**
 * Entry point: Triggered when user taps [Add reminder]
 */
async function startAddFlow(senderPhone, session) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_NAME', payload: {} })
    .eq('id', session.id);

  await sendInteractiveButtons(
    senderPhone,
    "What should I remember? (Reply with the name, or tap Cancel below)",
    [{ id: 'ADD_CANCEL', title: 'Cancel' }]
  );
}

/**
 * Step 1: Capture Name
 */
async function handleNameInput(senderPhone, session, messageText) {
  if (!messageText) {
    await sendWhatsAppText(senderPhone, 'Please type a valid name for the reminder:');
    return;
  }

  const newPayload = { ...session.payload, name: messageText };
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_TYPE', payload: newPayload })
    .eq('id', session.id);

  await sendInteractiveButtons(
    senderPhone,
    `Remembering: *"${messageText}"*\n\nIs this a bill (with an amount) or an event?`,
    [
      { id: 'TYPE_BILL', title: 'Bill' },
      { id: 'TYPE_EVENT', title: 'Event' },
      { id: 'ADD_CANCEL', title: 'Cancel' },
    ]
  );
}

/**
 * Step 2: Type Selection (Bill vs Event)
 */
async function handleTypeInput(senderPhone, session, buttonPayload, messageText) {
  let type = '';
  if (buttonPayload === 'TYPE_BILL') type = 'bill';
  else if (buttonPayload === 'TYPE_EVENT') type = 'event';
  else {
    await sendWhatsAppText(senderPhone, "Please select either *Bill* or *Event* using the buttons.");
    return;
  }

  const newPayload = { ...session.payload, type };

  if (type === 'bill') {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'ADD_AMOUNT', payload: newPayload })
      .eq('id', session.id);

    await sendInteractiveButtons(
      senderPhone,
      "Enter the expected amount (e.g., `1500`):",
      [{ id: 'ADD_CANCEL', title: 'Cancel' }]
    );
  } else {
    // Events default to amount 0, skip amount step
    newPayload.expected_amount = 0;
    await advanceToDateStep(senderPhone, session, newPayload);
  }
}

/**
 * Step 2b: Amount Input for Bills
 */
async function handleAmountInput(senderPhone, session, messageText) {
  const cleanAmount = parseFloat(messageText.replace(/[^0-9.]/g, ''));
  if (isNaN(cleanAmount) || cleanAmount < 0) {
    await sendWhatsAppText(senderPhone, "That doesn't look like a valid amount. Please enter a number like `1500`:");
    return;
  }

  const newPayload = { ...session.payload, expected_amount: cleanAmount };
  await advanceToDateStep(senderPhone, session, newPayload);
}

async function advanceToDateStep(senderPhone, session, payload) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_DATE', payload })
    .eq('id', session.id);

  await sendInteractiveButtons(
    senderPhone,
    "When is this due?",
    [
      { id: 'DATE_TODAY', title: 'Today' },
      { id: 'DATE_TOMORROW', title: 'Tomorrow' },
      { id: 'DATE_CUSTOM', title: 'Custom Date' },
    ]
  );
}

/**
 * Step 3: Date Selection
 */
async function handleDateInput(senderPhone, session, buttonPayload, messageText) {
  const now = new Date();
  let selectedDate = new Date();

  if (buttonPayload === 'DATE_TODAY') {
    selectedDate = now;
  } else if (buttonPayload === 'DATE_TOMORROW') {
    selectedDate.setDate(now.getDate() + 1);
  } else if (buttonPayload === 'DATE_CUSTOM') {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'ADD_CUSTOM_DATE', payload: session.payload })
      .eq('id', session.id);

    await sendWhatsAppText(senderPhone, "Please type the date (e.g., `Oct 25` or `2026-10-25`):");
    return;
  } else {
    await sendWhatsAppText(senderPhone, "Please choose an option or tap Custom Date.");
    return;
  }

  const dateString = selectedDate.toISOString().split('T')[0];
  const newPayload = { ...session.payload, due_date: dateString };
  await advanceToTimeStep(senderPhone, session, newPayload);
}

/**
 * Step 3b: Custom Date Validation & Retry Loop
 */
async function handleCustomDateInput(senderPhone, session, messageText) {
  const parsedDate = new Date(messageText);
  if (isNaN(parsedDate.getTime())) {
    await sendWhatsAppText(
      senderPhone,
      "I couldn't understand that date format. Please try entering it like `Oct 25` or `2026-10-25`:"
    );
    return; // Stay in ADD_CUSTOM_DATE step
  }

  const dateString = parsedDate.toISOString().split('T')[0];
  const newPayload = { ...session.payload, due_date: dateString };
  await advanceToTimeStep(senderPhone, session, newPayload);
}

async function advanceToTimeStep(senderPhone, session, payload) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_TIME', payload })
    .eq('id', session.id);

  await sendInteractiveButtons(
    senderPhone,
    "What time should I remind you?",
    [
      { id: 'TIME_9AM', title: '9:00 AM' },
      { id: 'TIME_10AM', title: '10:00 AM' },
      { id: 'TIME_CUSTOM', title: 'Custom Time' },
    ]
  );
}

/**
 * Step 4: Time Selection
 */
async function handleTimeInput(senderPhone, session, buttonPayload, messageText) {
  let timeString = '09:00';

  if (buttonPayload === 'TIME_9AM') {
    timeString = '09:00';
  } else if (buttonPayload === 'TIME_10AM') {
    timeString = '10:00';
  } else if (buttonPayload === 'TIME_CUSTOM') {
    await supabase
      .from('whatsapp_sessions')
      .update({ step: 'ADD_CUSTOM_TIME', payload: session.payload })
      .eq('id', session.id);

    await sendWhatsAppText(senderPhone, "Please type the time (e.g., `4:30 PM` or `16:30`):");
    return;
  } else {
    await sendWhatsAppText(senderPhone, "Please choose a time option or tap Custom Time.");
    return;
  }

  const newPayload = { ...session.payload, due_time: timeString };
  await advanceToRepeatStep(senderPhone, session, newPayload);
}

/**
 * Step 4b: Custom Time Validation & Retry Loop
 */
async function handleCustomTimeInput(senderPhone, session, messageText) {
  // Simple regex parser for 12hr/24hr formats (e.g. 4:30 PM, 16:30, 4pm)
  const normalized = messageText.toUpperCase().trim();
  let hours = 9, minutes = 0;

  const match24 = normalized.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  const match12 = normalized.match(/^(1[0-2]|0?[1-9]):([0-5]\d)\s*(AM|PM)$/);
  const match12Short = normalized.match(/^(1[0-2]|0?[1-9])\s*(AM|PM)$/);

  if (match24) {
    hours = parseInt(match24[1], 10);
    minutes = parseInt(match24[2], 10);
  } else if (match12) {
    hours = parseInt(match12[1], 10);
    minutes = parseInt(match12[2], 10);
    const period = match12[3];
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else if (match12Short) {
    hours = parseInt(match12Short[1], 10);
    minutes = 0;
    const period = match12Short[2];
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  } else {
    await sendWhatsAppText(
      senderPhone,
      "I couldn't understand that time format. Please try entering it like `4:30 PM` or `16:30`:"
    );
    return; // Stay in ADD_CUSTOM_TIME step
  }

  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const newPayload = { ...session.payload, due_time: timeString };
  await advanceToRepeatStep(senderPhone, session, newPayload);
}

async function advanceToRepeatStep(senderPhone, session, payload) {
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_REPEAT', payload })
    .eq('id', session.id);

  // Use Interactive List for 6 frequency options allowed by database constraint
  const rows = [
    { id: 'FREQ_ONEOFF', title: "Don't repeat", description: 'One-off reminder' },
    { id: 'FREQ_DAILY', title: 'Daily', description: 'Repeats every day' },
    { id: 'FREQ_WEEKLY', title: 'Weekly', description: 'Repeats every week' },
    { id: 'FREQ_MONTHLY', title: 'Monthly', description: 'Repeats every month' },
    { id: 'FREQ_QUARTERLY', title: 'Quarterly', description: 'Repeats every 3 months' },
    { id: 'FREQ_YEARLY', title: 'Yearly', description: 'Repeats every year' },
  ];

  await sendInteractiveList(
    senderPhone,
    'Repeat Frequency',
    'How often should this reminder repeat?',
    'Select Frequency',
    rows
  );
}

/**
 * Step 5: Repeat Selection & Summary Preview
 */
async function handleRepeatInput(senderPhone, session, listPayload, buttonPayload) {
  let frequency = 'monthly';
  switch (listPayload) {
    case 'FREQ_ONEOFF': frequency = 'one-off'; break;
    case 'FREQ_DAILY': frequency = 'daily'; break;
    case 'FREQ_WEEKLY': frequency = 'weekly'; break;
    case 'FREQ_MONTHLY': frequency = 'monthly'; break;
    case 'FREQ_QUARTERLY': frequency = 'quarterly'; break;
    case 'FREQ_YEARLY': frequency = 'yearly'; break;
    default:
      await sendWhatsAppText(senderPhone, "Please select an option from the list.");
      return;
  }

  const newPayload = { ...session.payload, frequency };
  await supabase
    .from('whatsapp_sessions')
    .update({ step: 'ADD_CONFIRM', payload: newPayload })
    .eq('id', session.id);

  const { name, type, expected_amount, due_date, due_time } = newPayload;
  const typeDisplay = type === 'bill' ? `Bill • ₹${Number(expected_amount).toLocaleString('en-IN')}` : 'Event';

  await sendInteractiveButtons(
    senderPhone,
    `📌 *Confirm Reminder*\n\n*${name}*\n${typeDisplay}\nDue: ${due_date} at ${due_time}\nRepeat: ${frequency}`,
    [
      { id: 'CONFIRM_SAVE', title: 'Save' },
      { id: 'ADD_CANCEL', title: 'Cancel' },
    ]
  );
}

/**
 * Step 6: Final Save to Supabase
 */
async function handleConfirmation(senderPhone, session, buttonPayload) {
  if (buttonPayload !== 'CONFIRM_SAVE') {
    await sendInteractiveButtons(senderPhone, "Tap Save to store your reminder, or Cancel to abort.", [
      { id: 'CONFIRM_SAVE', title: 'Save' },
      { id: 'ADD_CANCEL', title: 'Cancel' },
    ]);
    return;
  }

  const { name, type, expected_amount, due_date, due_time, frequency } = session.payload;
  const userId = session.user_id;

  // 1. Insert into master `obligations` table
  const [year, month, day] = due_date.split('-').map(Number);
  const { data: obligation, error: oblErr } = await supabase
    .from('obligations')
    .insert({
      user_id: userId,
      name,
      category: type === 'bill' ? 'Bills' : 'Personal',
      expected_amount: expected_amount || 0,
      frequency: frequency || 'monthly',
      type: type || 'bill',
      due_day: day,
      due_month: month,
      reminder_time: due_time,
      is_active: true,
    })
    .select()
    .single();

  if (oblErr) {
    console.error('❌ Failed to create obligation:', oblErr);
    await sendWhatsAppText(senderPhone, 'Sorry, could not save your reminder right now.');
    await resetSession(session.id);
    return;
  }

  // 2. Generate initial `obligation_cycles` row for dispatching
  const dueTimestamp = new Date(`${due_date}T${due_time}:00`).toISOString();
  const cycleMonth = `${year}-${String(month).padStart(2, '0')}-01`;

  const { error: cycleErr } = await supabase
    .from('obligation_cycles')
    .insert({
      obligation_id: obligation.id,
      user_id: userId,
      cycle_month: cycleMonth,
      expected_amount: expected_amount || 0,
      status: 'pending',
      due_timestamp: dueTimestamp,
      reminder_time: due_time,
      name,
      category: obligation.category,
      frequency,
      user_timezone: 'Asia/Kolkata', // Default or user context
    });

  if (cycleErr) {
    console.error('❌ Failed to create obligation cycle:', cycleErr);
  }

  await resetSession(session.id);
  await sendWhatsAppText(senderPhone, "Saved 👍 Your reminder is set.");
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