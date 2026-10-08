import supabase from '../lib/supabase';

const DEFAULT_REMINDER_TIME = '09:00';
const ALLOWED_FREQUENCIES = new Set(['monthly', 'quarterly', 'yearly', 'one-off']);
const UPCOMING_CYCLES_TARGET = 6;

function normalizeTime(value) {
  if (!value) return DEFAULT_REMINDER_TIME;

  const match = String(value).match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return DEFAULT_REMINDER_TIME;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) return DEFAULT_REMINDER_TIME;

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function normalizeAmount(value) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100) / 100;
}

function normalizeDay(value) {
  const day = Number.parseInt(value, 10);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error('Due day must be between 1 and 31.');
  }
  return day;
}

function normalizeMonth(value) {
  if (value === null || value === undefined || value === '') return null;

  const month = Number.parseInt(value, 10);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Due month must be between 1 and 12.');
  }
  return month;
}

function getLocalDateParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const get = (type) => parts.find((part) => part.type === type)?.value;

  return {
    year: Number(get('year')),
    month: Number(get('month')) - 1,
    day: Number(get('day')),
  };
}

function getUtcTimestampForLocalTime(year, monthIndex, day, hour, minute, timeZone) {
  const initialUtc = Date.UTC(year, monthIndex, day, hour, minute, 0);
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hourCycle: 'h23',
  });

  const parts = formatter.formatToParts(new Date(initialUtc));
  const get = (type) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  const localAsUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));

  return new Date(initialUtc - (localAsUtc - initialUtc)).toISOString();
}

function getMonthLastDay(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function isBeforeToday(year, monthIndex, day, localToday) {
  if (year !== localToday.year) return year < localToday.year;
  if (monthIndex !== localToday.month) return monthIndex < localToday.month;
  return day < localToday.day;
}

function buildCycleOccurrences({ frequency, dueDay, dueMonth, userTimezone }) {
  const now = new Date();
  const localToday = getLocalDateParts(now, userTimezone);
  const cycles = [];

  if (frequency === 'one-off') {
    const monthIndex = dueMonth ? dueMonth - 1 : localToday.month;
    let year = localToday.year;
    const day = Math.min(dueDay, getMonthLastDay(year, monthIndex));

    if (isBeforeToday(year, monthIndex, day, localToday)) {
      throw new Error('One-off reminder date must be today or in the future.');
    }

    return [{ year, monthIndex, day }];
  }

  if (frequency === 'yearly') {
    if (!dueMonth) throw new Error('Yearly reminders require a due month.');

    let year = localToday.year;
    const monthIndex = dueMonth - 1;
    const day = Math.min(dueDay, getMonthLastDay(year, monthIndex));

    if (isBeforeToday(year, monthIndex, day, localToday)) year += 1;

    for (let offset = 0; offset < 2; offset += 1) {
      const targetYear = year + offset;
      cycles.push({
        year: targetYear,
        monthIndex,
        day: Math.min(dueDay, getMonthLastDay(targetYear, monthIndex)),
      });
    }

    return cycles;
  }

  const intervalMonths = frequency === 'quarterly' ? 3 : 1;
  const totalCycles = frequency === 'quarterly' ? 4 : 12;
  let firstMonth = localToday.month;
  let firstYear = localToday.year;
  let firstDay = Math.min(dueDay, getMonthLastDay(firstYear, firstMonth));

  if (firstDay < localToday.day) {
    firstMonth += intervalMonths;
    firstYear += Math.floor(firstMonth / 12);
    firstMonth %= 12;
  }

  for (let index = 0; index < totalCycles; index += 1) {
    const absoluteMonth = firstMonth + index * intervalMonths;
    const year = firstYear + Math.floor(absoluteMonth / 12);
    const monthIndex = absoluteMonth % 12;

    cycles.push({
      year,
      monthIndex,
      day: Math.min(dueDay, getMonthLastDay(year, monthIndex)),
    });
  }

  return cycles;
}

export const obligationsService = {
  async fetchObligations(userId) {
    if (!userId) return [];

    const { data, error } = await supabase
      .from('obligations')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('due_day', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createCycles({
    userId,
    obligationId,
    obligationName,
    dueDay,
    dueMonth,
    amount,
    frequency,
    category,
    reminderTime,
    userTimezone,
    startFromToday = false,
  }) {
    const [hour, minute] = normalizeTime(reminderTime).split(':').map(Number);
    const occurrences = buildCycleOccurrences({
      frequency,
      dueDay,
      dueMonth,
      userTimezone,
    });

    const now = new Date();
    const localToday = getLocalDateParts(now, userTimezone);

    const cycles = occurrences
      .filter(({ year, monthIndex, day }) => {
        if (startFromToday) {
          return !isBeforeToday(year, monthIndex, day, localToday);
        }
        return true;
      })
      .map(({ year, monthIndex, day }) => {
        const dueTimestamp = getUtcTimestampForLocalTime(
          year,
          monthIndex,
          day,
          hour,
          minute,
          userTimezone,
        );

        return {
          obligation_id: obligationId,
          user_id: userId,
          name: obligationName,
          category,
          cycle_month: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
          expected_amount: amount,
          status: 'pending',
          reminder_time: normalizeTime(reminderTime),
          due_timestamp: dueTimestamp,
          notification_sent: false,
          user_timezone: userTimezone,
        };
      });

    if (cycles.length === 0) return;

    const { error } = await supabase
      .from('obligation_cycles')
      .upsert(cycles, { onConflict: 'obligation_id,cycle_month', ignoreDuplicates: true });

    if (error) throw error;
  },

  async ensureUpcomingCycles({
    userId,
    obligationId,
    obligationName,
    dueDay,
    dueMonth,
    amount,
    frequency,
    category,
    reminderTime,
    userTimezone,
  }) {
    const now = new Date();
    const localToday = getLocalDateParts(now, userTimezone);

    const { data: existing, error: fetchError } = await supabase
      .from('obligation_cycles')
      .select('due_timestamp, status')
      .eq('obligation_id', obligationId)
      .eq('status', 'pending');

    if (fetchError) throw fetchError;

    const futurePendingCount = (existing || []).filter((c) => {
      const d = new Date(c.due_timestamp);
      const parts = getLocalDateParts(d, userTimezone);
      return !isBeforeToday(parts.year, parts.month, parts.day, localToday);
    }).length;

    if (futurePendingCount >= UPCOMING_CYCLES_TARGET) return;

    const needed = UPCOMING_CYCLES_TARGET - futurePendingCount;

    const [hour, minute] = normalizeTime(reminderTime).split(':').map(Number);
    const occurrences = buildCycleOccurrences({
      frequency,
      dueDay,
      dueMonth,
      userTimezone,
    });

    const newCycles = [];
    for (const { year, monthIndex, day } of occurrences) {
      if (isBeforeToday(year, monthIndex, day, localToday)) continue;

      const dueTimestamp = getUtcTimestampForLocalTime(
        year,
        monthIndex,
        day,
        hour,
        minute,
        userTimezone,
      );

      newCycles.push({
        obligation_id: obligationId,
        user_id: userId,
        name: obligationName,
        category,
        cycle_month: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
        expected_amount: amount,
        status: 'pending',
        reminder_time: normalizeTime(reminderTime),
        due_timestamp: dueTimestamp,
        notification_sent: false,
        user_timezone: userTimezone,
      });

      if (newCycles.length >= needed) break;
    }

    if (newCycles.length === 0) return;

    const { error } = await supabase
      .from('obligation_cycles')
      .upsert(newCycles, { onConflict: 'obligation_id,cycle_month', ignoreDuplicates: true });

    if (error) throw error;
  },

  async saveObligation(userId, formData, editingId) {
    if (!userId) throw new Error('You must be signed in.');

    const type = formData.type === 'event' ? 'event' : 'bill';
    const frequency = ALLOWED_FREQUENCIES.has(formData.frequency)
      ? formData.frequency
      : 'monthly';
    const dueDay = normalizeDay(formData.due_day ?? formData.dueDay ?? formData.dueday);
    const dueMonth = normalizeMonth(formData.due_month ?? formData.dueMonth ?? formData.duemonth);
    const reminderTime = normalizeTime(
      formData.reminder_time ?? formData.reminderTime ?? formData.remindertime ?? formData.due_time ?? formData.duetime,
    );
    const amount = type === 'event'
      ? 0
      : normalizeAmount(formData.expected_amount ?? formData.expectedAmount ?? formData.expectedamount ?? formData.amount);
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

    if (frequency === 'yearly' && !dueMonth) {
      throw new Error('Please choose a due month for yearly reminders.');
    }

    const payload = {
      user_id: userId,
      name: String(formData.name ?? '').trim(),
      type,
      category: formData.category || 'Other',
      expected_amount: amount,
      due_day: dueDay,
      due_month: dueMonth,
      frequency,
      reminder_time: reminderTime,
      is_active: true,
    };

    if (!payload.name) throw new Error('Reminder name is required.');

    if (editingId) {
      const { error: obligationError } = await supabase
        .from('obligations')
        .update(payload)
        .eq('id', editingId)
        .eq('user_id', userId);

      if (obligationError) throw obligationError;

      const [hour, minute] = normalizeTime(reminderTime).split(':').map(Number);

      const { data: cycles, error: cyclesFetchError } = await supabase
        .from('obligation_cycles')
        .select('id, due_timestamp, user_timezone')
        .eq('obligation_id', editingId)
        .eq('status', 'pending');

      if (cyclesFetchError) throw cyclesFetchError;

      const now = new Date();
      const localToday = getLocalDateParts(now, userTimezone);

      const updates = (cycles || []).map((cycle) => {
        const dueDateParts = getLocalDateParts(new Date(cycle.due_timestamp), cycle.user_timezone || 'UTC');
        const newDueTimestamp = getUtcTimestampForLocalTime(
          dueDateParts.year,
          dueDateParts.month,
          dueDateParts.day,
          hour,
          minute,
          userTimezone,
        );

        return {
          id: cycle.id,
          name: payload.name,
          category: payload.category,
          expected_amount: payload.expected_amount,
          reminder_time: reminderTime,
          user_timezone: userTimezone,
          due_timestamp: newDueTimestamp,
          notification_sent: false,
        };
      });

      if (updates.length > 0) {
        for (const u of updates) {
          const { error: uErr } = await supabase
            .from('obligation_cycles')
            .update(u)
            .eq('id', u.id)
            .eq('obligation_id', editingId)
            .eq('user_id', userId);

          if (uErr) throw uErr;
        }
      }

      await this.ensureUpcomingCycles({
        userId,
        obligationId: editingId,
        obligationName: payload.name,
        dueDay,
        dueMonth,
        amount,
        frequency,
        category: payload.category,
        reminderTime,
        userTimezone,
      });

      return { id: editingId };
    }

    const { data: obligation, error: obligationError } = await supabase
      .from('obligations')
      .insert(payload)
      .select()
      .single();

    if (obligationError) throw obligationError;

    await this.createCycles({
      userId,
      obligationId: obligation.id,
      obligationName: payload.name,
      dueDay,
      dueMonth,
      amount,
      frequency,
      category: payload.category,
      reminderTime,
      userTimezone,
      startFromToday: true,
    });

    return obligation;
  },

  async deleteObligation(userId, id) {
    const { error } = await supabase
      .from('obligations')
      .update({ is_active: false })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  },
};

export default obligationsService;  