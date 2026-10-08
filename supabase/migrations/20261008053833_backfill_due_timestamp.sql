-- 20261008105900_backfill_due_timestamp.sql
-- Backfill due_timestamp for any cycles that currently have NULL.

begin;

-- 1. Ensure every cycle has a due_date; if missing, use today.
update public.obligation_cycles oc
set due_date = coalesce(oc.due_date, (now() at time zone oc.user_timezone)::date)
where oc.due_date is null;

-- 2. Build due_timestamp from due_date + reminder_time (or 09:00).
update public.obligation_cycles oc
set due_timestamp = (
  (oc.due_date::timestamp)
  + (
    case
      when oc.reminder_time is not null then oc.reminder_time
      else '09:00:00'::time
    end
  )::interval
) at time zone coalesce(oc.user_timezone, 'UTC');

commit;