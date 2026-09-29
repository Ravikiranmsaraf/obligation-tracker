require('dotenv').config(); // MUST BE AT THE VERY TOP

const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');

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

STRICT CATEGORY CLASSIFICATION:
- If transcript is off-topic, general conversation, or weather queries: set "is_obligation": false.
- "is_obligation": true ONLY IF the transcript refers to a bill, subscription, loan, payment, birthday, health checkup, or admin reminder.

JSON OUTPUT STRUCTURE (Respond ONLY with valid JSON):
{
  "is_obligation": boolean,
  "rejection_reason": string or null,
  "name": string or null,
  "category": "Bills" | "Subscriptions" | "Loans" | "Insurance" | "Personal" | "Events" | "Other" | null,
  "expected_amount": number or null,
  "due_month": number or null,
  "due_day": number or null,
  "frequency": "monthly" | "quarterly" | "yearly" | null,
  "type": "bill" | "event" | null
}

RULES:
1. "due_month" must be an integer between 1 and 12 representing the month (e.g., January = 1, October = 10). If not mentioned, infer from current context or return the current month (1-12).
2. "due_day" must be an integer between 1 and 31. If not mentioned, infer from context or return current day of month.
3. Explicit words like "annual" / "yearly" set frequency="yearly".
4. Events/reminders without monetary cost set type="event", expected_amount=0.
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

app.listen(PORT, HOST, () => {
  console.log(`Backend running at http://${HOST}:${PORT}`);
});