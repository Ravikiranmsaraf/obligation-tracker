-- Add due_timestamp, timezone, and notification tracking to obligation_cycles
alter table public.obligation_cycles 
add column if not exists due_timestamp timestamp with time zone,
add column if not exists notification_sent boolean default false,
add column if not exists user_timezone text default 'UTC';

-- Index for the background dispatcher script to query pending reminders quickly
create index if not exists idx_cycles_dispatcher 
on public.obligation_cycles(due_timestamp) 
where status = 'pending' and notification_sent = false;