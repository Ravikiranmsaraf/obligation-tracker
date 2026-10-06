import { STANDARD_CATEGORIES } from '../constants/categories';

export function parseVoiceInput(rawText) {
  const text = rawText.toLowerCase();

  // 1. Extract Amount
  const amountMatch = text.match(/(?:₹|rs\.?|rupees|amount|cost)?\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs)?/i);
  const amount = amountMatch ? amountMatch[1] : '';

  // 2. Extract Category
  const matchedCategory = STANDARD_CATEGORIES.find((cat) =>
    text.includes(cat.toLowerCase())
  ) || STANDARD_CATEGORIES[0];

  // 3. Extract Frequency (Return null if not explicitly stated)
  let frequency = null;
  if (text.includes('monthly') || text.includes('every month')) frequency = 'monthly';
  else if (text.includes('yearly') || text.includes('annual')) frequency = 'yearly';
  else if (text.includes('quarterly')) frequency = 'quarterly';
  else if (text.includes('one-off') || text.includes('once')) frequency = 'one-off';

  // 4. Extract Due Date / Day of Month
  const dayMatch = text.match(/(?:due|on|day)?\s*(\d{1,2})(?:st|nd|rd|th)?/i);
  const today = new Date();
  let startDate = today.toISOString().split('T')[0];

  if (dayMatch) {
    const day = parseInt(dayMatch[1], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date();
      d.setDate(day);
      startDate = d.toISOString().split('T')[0];
    }
  }

  // 5. Extract Due Time
  let dueTime = '09:00';
  const timeMatch = text.match(/(?:at|@)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? timeMatch[2] : '00';
    const meridiem = timeMatch[3] ? timeMatch[3].toLowerCase() : '';

    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;

    if (hours >= 0 && hours <= 23) {
      dueTime = `${String(hours).padStart(2, '0')}:${minutes}`;
    }
  }

  // 6. Clean up name
  let cleanedName = rawText
    .replace(/(?:₹|rs\.?|rupees|amount|cost)?\s*\d+(?:\.\d+)?\s*(?:rupees|rs)?/gi, '')
    .replace(/monthly|yearly|quarterly|annual|one-off|once|every month/gi, '')
    .replace(new RegExp(STANDARD_CATEGORIES.join('|'), 'gi'), '')
    .replace(/(?:due|on|day)?\s*\d{1,2}(?:st|nd|rd|th)?/gi, '')
    .replace(/(?:at|@)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    name: cleanedName || rawText,
    type: amount ? 'bill' : 'event',
    category: matchedCategory,
    expected_amount: amount,
    startDate: startDate,
    due_time: dueTime,
    frequency: frequency, // Will be null if missing, triggering TTS prompt!
  };
}

export function getDaySuffix(day) {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}