-- Settld P0/P1/P2/P4 hardening migration.
-- IMPORTANT: Run this in a staging project first and take a database backup.
-- This migration keeps due_timestamp as the single scheduling source of truth.

begin;

-- 1. Backfill fields before NOT NULL constraints.
update public.obligation_cycles oc
set user_id = o.user_id
from public.obligations o
where oc.obligation_id = o.id
  and oc.user_id is null;

-- Delete only orphaned cycles; review this query before production execution.
delete from public.obligation_cycles
where obligation_id is null
   or user_id is null;

delete from public.obligations
where user_id is null;

-- 2. Remove obsolete scheduling columns.
alter table public.obligation_cycles
  drop column if exists due_date;

alter table public.obligations
  drop column if exists lead_days,
  drop column if exists target_date,
  drop column if exists due_year,
  drop column if exists actual_amount;

-- 3. Make ownership mandatory.
alter table public.obligations
  alter column user_id set not null;

alter table public.obligation_cycles
  alter column obligation_id set not null,
  alter column user_id set not null,
  alter column due_timestamp set not null,
  alter column notification_sent set not null,
  alter column user_timezone set not null;

-- 4. Normalize existing data before constraints.
update public.obligation_cycles
set status = 'pending'
where status is null
   or status not in ('pending', 'paid', 'completed', 'skipped', 'cancelled');

update public.obligations
set frequency = 'monthly'
where frequency is null
   or frequency not in ('monthly', 'quarterly', 'yearly', 'one-off');

-- 5. Domain constraints.
alter table public.obligation_cycles
  drop constraint if exists obligation_cycles_status_check;

alter table public.obligation_cycles
  add constraint obligation_cycles_status_check
  check (status in ('pending', 'paid', 'completed', 'skipped', 'cancelled'));

alter table public.obligations
  drop constraint if exists obligations_frequency_check,
  drop constraint if exists obligations_type_check,
  drop constraint if exists obligations_yearly_month_check;

alter table public.obligations
  add constraint obligations_frequency_check
  check (frequency in ('monthly', 'quarterly', 'yearly', 'one-off')),
  add constraint obligations_type_check
  check (type in ('bill', 'event')),
  add constraint obligations_yearly_month_check
  check (frequency <> 'yearly' or due_month is not null);

-- 6. Prevent a mismatched cycle owner and obligation owner.
create or replace function public.validate_cycle_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_user_id uuid;
begin
  select user_id into parent_user_id
  from public.obligations
  where id = new.obligation_id;

  if parent_user_id is null then
    raise exception 'The referenced obligation does not exist or has no owner';
  end if;

  if new.user_id <> parent_user_id then
    raise exception 'obligation_cycles.user_id must match obligations.user_id';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validate_cycle_owner on public.obligation_cycles;
create trigger trg_validate_cycle_owner
before insert or update of obligation_id, user_id
on public.obligation_cycles
for each row
execute function public.validate_cycle_owner();

-- 7. Maintain updated_at consistently.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_obligations_updated_at on public.obligations;
create trigger trg_obligations_updated_at
before update on public.obligations
for each row execute function public.set_updated_at();

drop trigger if exists trg_obligation_cycles_updated_at on public.obligation_cycles;
create trigger trg_obligation_cycles_updated_at
before update on public.obligation_cycles
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_push_tokens_updated_at on public.user_push_tokens;
create trigger trg_user_push_tokens_updated_at
before update on public.user_push_tokens
for each row execute function public.set_updated_at();

-- 8. Useful indexes.
create index if not exists idx_obligations_user_active
  on public.obligations (user_id, is_active);

create index if not exists idx_cycles_user_status_due_timestamp
  on public.obligation_cycles (user_id, status, due_timestamp);

create index if not exists idx_cycles_dispatcher_due_timestamp
  on public.obligation_cycles (due_timestamp)
  where status = 'pending' and notification_sent = false;

-- 9. RLS for browser access. Service-role dispatcher bypasses RLS.
alter table public.obligations enable row level security;
alter table public.obligation_cycles enable row level security;
alter table public.user_push_tokens enable row level security;

drop policy if exists obligations_select_own on public.obligations;
drop policy if exists obligations_insert_own on public.obligations;
drop policy if exists obligations_update_own on public.obligations;
drop policy if exists obligations_delete_own on public.obligations;

create policy obligations_select_own on public.obligations
for select using (auth.uid() = user_id);

create policy obligations_insert_own on public.obligations
for insert with check (auth.uid() = user_id);

create policy obligations_update_own on public.obligations
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy obligations_delete_own on public.obligations
for delete using (auth.uid() = user_id);

drop policy if exists cycles_select_own on public.obligation_cycles;
drop policy if exists cycles_insert_own on public.obligation_cycles;
drop policy if exists cycles_update_own on public.obligation_cycles;
drop policy if exists cycles_delete_own on public.obligation_cycles;

create policy cycles_select_own on public.obligation_cycles
for select using (auth.uid() = user_id);

create policy cycles_insert_own on public.obligation_cycles
for insert with check (auth.uid() = user_id);

create policy cycles_update_own on public.obligation_cycles
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy cycles_delete_own on public.obligation_cycles
for delete using (auth.uid() = user_id);

-- 10. WhatsApp foundation only. No webhook is deployed by this migration.
create table if not exists public.whatsapp_sessions (
  id uuid primary key default gen_random_uuid(),
  phone_number text not null,
  user_id uuid null references auth.users(id) on delete cascade,
  step text not null default 'idle',
  payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint whatsapp_sessions_phone_number_key unique (phone_number),
  constraint whatsapp_sessions_step_check check (
    step in ('idle', 'awaiting_name', 'awaiting_amount', 'awaiting_due_date', 'awaiting_time', 'confirming')
  )
);

create index if not exists idx_whatsapp_sessions_expires_at
  on public.whatsapp_sessions (expires_at);

-- Webhook/service-role only: no client access through Supabase.
alter table public.whatsapp_sessions enable row level security;

drop trigger if exists trg_whatsapp_sessions_updated_at on public.whatsapp_sessions;
create trigger trg_whatsapp_sessions_updated_at
before update on public.whatsapp_sessions
for each row execute function public.set_updated_at();

commit;
