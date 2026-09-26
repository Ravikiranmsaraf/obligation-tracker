import { STANDARD_CATEGORIES } from '../constants/categories';

export function parseVoiceInput(rawText) {
  const text = rawText.toLowerCase();

  // 1. Extract Amount (e.g., "599 rupees", "rs 1200", "₹500")
  const amountMatch = text.match(/(?:₹|rs\.?|rupees|amount|cost)?\s*(\d+(?:\.\d+)?)\s*(?:rupees|rs)?/i);
  const amount = amountMatch ? amountMatch[1] : '';

  // 2. Extract Category
  const matchedCategory = STANDARD_CATEGORIES.find((cat) =>
    text.includes(cat.toLowerCase())
  ) || STANDARD_CATEGORIES[0];

  // 3. Extract Frequency
  let frequency = 'monthly';
  if (text.includes('yearly') || text.includes('annual')) frequency = 'yearly';
  if (text.includes('quarterly')) frequency = 'quarterly';

  // 4. Extract Due Date / Day of Month (e.g., "15th", "on day 5", "due 21")
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

  // 5. Clean up name by removing keywords that matched amount, frequency, category, or date
  let cleanedName = rawText
    .replace(/(?:₹|rs\.?|rupees|amount|cost)?\s*\d+(?:\.\d+)?\s*(?:rupees|rs)?/gi, '')
    .replace(/monthly|yearly|quarterly|annual/gi, '')
    .replace(new RegExp(STANDARD_CATEGORIES.join('|'), 'gi'), '')
    .replace(/(?:due|on|day)?\s*\d{1,2}(?:st|nd|rd|th)?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    name: cleanedName || rawText,
    type: amount ? 'bill' : 'reminder',
    category: matchedCategory,
    expected_amount: amount,
    startDate: startDate,
    frequency: frequency,
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