require('dotenv').config(); // MUST BE AT THE VERY TOP


const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
const supabase = require('./lib/supabase');


const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';


// Allow requests from the frontend origin
app.use(
  cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
);


app.use(express.json());


app.get('/', (req, res) => {
  res.json({ message: 'Hello from Obligation Tracker API' });
});


const DEPLOY_COLOR = process.env.DEPLOY_COLOR || 'unknown';


app.get('/api/info', (req, res) => {
  res.json({
    deployColor: DEPLOY_COLOR,
    nodeVersion: process.version,
    uptime: process.uptime(),
  });
});


app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


// Voice Parsing Endpoint for Settld
app.post('/api/parse-voice', async (req, res) => {
  try {
    const { transcript } = req.body;


    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript string is required' });
    }


    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('❌ GROQ_API_KEY is missing from process.env!');
      return res.status(500).json({ error: 'Groq API key is not configured on the server' });
    }


    const groq = new Groq({ apiKey });


    const systemPrompt = `
You are a fast, precise information extraction engine for the financial admin app 'Settld'.
Your task is to convert spoken text into a JSON obligation payload.


CURRENT TEMPORAL CONTEXT:
- Today's ISO Date: {{CURRENT_DATE_ISO}}
- Current Year: {{CURRENT_YEAR}}
- Current Month: {{CURRENT_MONTH}}
- Current Day of Month: {{CURRENT_DAY}}
- Current Day of Week: {{CURRENT_WEEKDAY}}


STRICT CATEGORY CLASSIFICATION:
- If transcript is off-topic, general conversation, or weather queries: set "is_obligation": false.
- "is_obligation": true ONLY IF the transcript refers to a bill, subscription, loan, payment, birthday, health checkup, admin reminder, or event.


JSON OUTPUT STRUCTURE (Respond ONLY with valid JSON):
{
  "is_obligation": boolean,
  "rejection_reason": string or null,
  "name": string or null,
  "category": "Bills" | "Subscriptions" | "Loans" | "Insurance" | "Personal" | "Health" | "Documents" | "Other" | null,
  "expected_amount": number or null,
  "due_month": number or null,
  "due_day": number or null,
  "frequency": "monthly" | "quarterly" | "yearly" | "one-off" | null,
  "type": "bill" | "event" | null,
  "due_time": string,
  "reminder_time": string
}


TIME PARSING RULES (CRITICAL - READ CAREFULLY):
1. SEARCH TRANSCRIPT FOR TIME PATTERNS FIRST:
   - "4PM", "4 PM", "4 p.m.", "4pm", "16:00" -> "16:00"
   - "5PM", "5 PM", "5 p.m.", "5pm", "17:00" -> "17:00"
   - "4 in the evening", "4 evening", "4 o'clock evening" -> "16:00"
   - "9 in the morning", "9 AM", "9am" -> "09:00"
   - "noon", "12pm" -> "12:00", "midnight" -> "00:00"
2. CONVERSION RULE:
   - Convert all afternoon/evening times (PM, evening, night) to 24-hour format HH:mm (e.g. 4 PM = 16:00, 5 PM = 17:00, 8:30 PM = 20:30).
3. DEFAULT RULE:
   - ONLY set "due_time" and "reminder_time" to "09:00" IF NO TIME IS MENTIONED ANYWHERE in the transcript.
   - Set BOTH "due_time" AND "reminder_time" to the exact same extracted 24-hour time value.


RULES FOR DATE CALCULATIONS:
1. RELATIVE DATES:
   - "Today" / "this evening" -> Set "due_day": {{CURRENT_DAY}}, "due_month": {{CURRENT_MONTH}}, "frequency": "one-off".
   - "Tomorrow" -> Calculate tomorrow relative to {{CURRENT_DATE_ISO}}. Set "due_day" and "due_month" accordingly, "frequency": "one-off".
   - Specific Day (e.g., "on the 15th") -> Set "due_day": 15. If 15th has passed this month, increment "due_month" by 1.


2. TYPE & AMOUNT:
   - Events/reminders without cost (e.g. doctor appointments, birthdays) -> type="event", expected_amount=0.
   - Bills and payments -> type="bill", extract expected_amount as a number.
   `;


    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Extract JSON from this speech: "${transcript}"` },
      ],
      model: 'qwen/qwen3.8-27b',
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });


    const parsedData = JSON.parse(completion.choices[0].message.content);
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Groq voice parsing error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process voice request' });
  }
});


// Echo endpoint
app.post('/api/echo', (req, res) => {
  const { text } = req.body;
  res.json({ youSaid: text });
});


// WhatsApp Cloud API webhook
const WHATSAPP_VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;


app.get('/whatsapp/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];


  if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified !');
    return res.status(200).send(challenge);
  }


  console.warn('❌ WhatsApp webhook verification failed');
  return res.sendStatus(403);
});


async function sendWhatsAppText(toPhone, text) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;


  if (!accessToken || !phoneNumberId) {
    console.error(
      '❌ Missing WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID'
    );
    return;
  }


  const url = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;


  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: toPhone,
        type: 'text',
        text: {
          preview_url: false,
          body: text,
        },
      }),
    });


    const result = await response.json();


    if (!response.ok) {
      console.error('❌ Meta send message error:', result);
    } else {
      console.log('✅ WhatsApp reply sent to', toPhone);
    }
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}


async function getOrCreateWhatsAppSession(phoneNumber) {
  const { data: existingSession, error: selectError } = await supabase
    .from('whatsapp_sessions')
    .select('id, phone_number, user_id, step, payload, expires_at')
    .eq('phone_number', phoneNumber)
    .maybeSingle();


  if (selectError) {
    throw selectError;
  }


  if (existingSession) {
    return existingSession;
  }


  const { data: newSession, error: insertError } = await supabase
    .from('whatsapp_sessions')
    .insert({
      phone_number: phoneNumber,
      step: 'idle',
      payload: {},
    })
    .select('id, phone_number, user_id, step, payload, expires_at')
    .single();


  if (insertError) {
    throw insertError;
  }


  return newSession;
}


function getCurrencySymbol(currency) {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    default:
      return '₹';
  }
}


app.post('/whatsapp/webhook', async (req, res) => {
  // Acknowledge Meta immediately; Meta retries if this does not return 2xx.
  res.sendStatus(200);


  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];


    if (!message || message.type !== 'text') {
      return;
    }


    const senderPhone = message.from;
    const messageText = message.text?.body?.trim().toLowerCase();


    if (!senderPhone || !messageText) {
      return;
    }


    console.log(
      `📨 WhatsApp message from ${senderPhone}: "${messageText}"`
    );


    const normalizedPhone = `+${senderPhone.replace(/^\+/, '')}`;


    const session = await getOrCreateWhatsAppSession(normalizedPhone);


    if (!session.user_id) {
      await sendWhatsAppText(
        senderPhone,
        'Welcome to Krona! This WhatsApp number is not linked to a Krona account yet.\n\nPlease sign in at https://Settld.duckdns.org and link this phone number to your account.'
      );
      return;
    }


    const isPendingRequest =
      messageText === 'pending' ||
      messageText === 'pending today' ||
      messageText === '1' ||
      messageText === 'hi' ||
      messageText === 'hello' ||
      messageText === 'menu';


    if (!isPendingRequest) {
      await sendWhatsAppText(
        senderPhone,
        'Welcome to Krona!\n\nReply *pending* to see reminders due today.'
      );
      return;
    }


    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];


    const { data: cycles, error: cyclesError } = await supabase
      .from('obligationcycles')
      .select(
        'id, name, category, expectedamount, currency, duedate'
      )
      .eq('userid', session.user_id)
      .eq('status', 'pending')
      .eq('duedate', todayISO)
      .order('duedate', { ascending: true });


    if (cyclesError) {
      console.error('❌ Supabase cycles query error:', cyclesError);
      await sendWhatsAppText(
        senderPhone,
        'Sorry, I could not load your reminders right now. Please try again later.'
      );
      return;
    }


    if (!cycles || cycles.length === 0) {
      await sendWhatsAppText(
        senderPhone,
        '✅ You have no reminders due today.'
      );
      return;
    }


    const currencySymbol = getCurrencySymbol(cycles[0]?.currency);


    const lines = cycles.map((cycle, index) => {
      const amount =
        cycle.expectedamount && Number(cycle.expectedamount) > 0
          ? `${currencySymbol}${Number(cycle.expectedamount).toLocaleString(
              'en-IN'
            )}`
          : 'Event';


      return `${index + 1}. ${cycle.name || 'Untitled Reminder'} — ${amount}`;
    });


    const reply =
      `📅 *Pending today*\n\n` +
      lines.join('\n') +
      `\n\nReply *pending* anytime to see this list again.`;


    await sendWhatsAppText(senderPhone, reply);
  } catch (error) {
    console.error('❌ WhatsApp webhook processing error:', error);
  }
});


app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});