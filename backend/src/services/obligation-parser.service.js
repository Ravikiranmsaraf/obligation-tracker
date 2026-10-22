// src/services/obligation-parser.service.js
const Groq = require('groq-sdk');

async function parseObligationText(rawText) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is missing from process.env');
  }

  const groq = new Groq({ apiKey });
  const now = new Date();
  const currentIsoDate = now.toISOString().split('T')[0];

  const systemPrompt = `
You are a fast, precise information extraction engine for the financial admin app 'Settld'.
Your task is to convert text or speech transcripts into a clean JSON obligation payload.

CURRENT TEMPORAL CONTEXT:
- Today's ISO Date: ${currentIsoDate}
- Current Year: ${now.getFullYear()}
- Current Month: ${now.getMonth() + 1}
- Current Day of Month: ${now.getDate()}

STRICT CATEGORY CLASSIFICATION:
- Choose from: "Bills", "Subscriptions", "Loans", "Insurance", "Personal", "Health", "Documents", "Other".
- If off-topic or weather query: set "is_obligation": false.

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
  "missing_fields": array of strings (e.g. ["expected_amount"], ["due_day"], etc.)
}

PARSING & CLEANING RULES:
1. NAME EXTRACTION: Strip out conversational filler words (e.g., "remind me to", "add reminder for", "buy", "pay"), dates, frequencies, and times. Keep *only* the core name/title (e.g. "Ravi's Birthday", "Wifi bill", "Gym").
2. TYPE & AMOUNT: 
   - If a monetary amount is present -> type="bill", extract expected_amount as a number.
   - If no money involved (birthdays, appointments, chores) -> type="event", expected_amount=0.
3. TIME PARSING: Extract time into 24-hour HH:mm format (e.g., "10am" -> "10:00", "4:30 PM" -> "16:30"). If no time is mentioned anywhere, default to "09:00".
4. FREQUENCY: Normalize to "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "one-off".
5. MISSING FIELDS DETECTION: Evaluate if required fields are missing. 
   - For bills: If amount is missing, add "expected_amount" to "missing_fields".
   - For all: If due day/month cannot be determined, add "due_date" to "missing_fields". Otherwise, return an empty array [].
`;

  const completion = await groq.chat.completions.create({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract JSON from this text: "${rawText}"` },
    ],
    model: 'qwen/qwen3.8-27b',
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });

  return JSON.parse(completion.choices[0].message.content);
}

module.exports = { parseObligationText };