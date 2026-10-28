// src/utils/quickDeferralUtils.js

export function getQuickDeferralActions(frequency) {
  const isDaily = frequency === 'daily';
  const localHour = new Date().getHours();

  if (isDaily) {
    return [
      { id: 'DONE', label: 'Done ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'SKIP_TODAY', label: 'Skip today 🚫', type: 'skip' },
    ];
  }

  // Non-daily items
  if (localHour < 16) {
    return [
      { id: 'DONE', label: 'Done / Paid ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'PLUS_1D', label: 'Snooze 1 day 📅', type: 'snooze', days: 1 },
    ];
  } else {
    return [
      { id: 'DONE', label: 'Done / Paid ✓', type: 'complete' },
      { id: 'PLUS_1H', label: 'Snooze 1 hr ⏰', type: 'snooze', hours: 1 },
      { id: 'TOMORROW_9AM', label: 'Tomorrow 9 AM 🌅', type: 'snooze', target: 'tomorrow_9am' },
    ];
  }
}