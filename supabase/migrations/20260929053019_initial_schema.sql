-- create table public.obligations (
--   id uuid not null default gen_random_uuid (),
--   user_id uuid null,
--   name text not null,
--   category text not null,
--   expected_amount numeric(10, 2) null,
--   due_day integer null,
--   frequency text null default 'monthly'::text,
--   is_active boolean null default true,
--   created_at timestamp with time zone null default now(),
--   updated_at timestamp with time zone null default now(),
--   type public.obligation_type null default 'bill'::obligation_type,
--   target_date date null,
--   lead_days integer null default 7,
--   constraint obligations_pkey primary key (id),
--   constraint obligations_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
-- ) TABLESPACE pg_default;


-- create table public.obligation_cycles (
--   id uuid not null default gen_random_uuid (),
--   obligation_id uuid null,
--   user_id uuid null,
--   cycle_month date not null,
--   due_date date not null,
--   expected_amount numeric(10, 2) null,
--   actual_amount numeric(10, 2) null,
--   status text not null default 'pending'::text,
--   paid_at timestamp with time zone null,
--   payment_note text null,
--   created_at timestamp with time zone null default now(),
--   updated_at timestamp with time zone null default now(),
--   constraint obligation_cycles_pkey primary key (id),
--   constraint obligation_cycles_obligation_id_cycle_month_key unique (obligation_id, cycle_month),
--   constraint obligation_cycles_obligation_id_fkey foreign KEY (obligation_id) references obligations (id) on delete CASCADE,
--   constraint obligation_cycles_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
-- ) TABLESPACE pg_default;

-- create index IF not exists idx_cycles_user_status on public.obligation_cycles using btree (user_id, status) TABLESPACE pg_default;

-- create index IF not exists idx_cycles_due_date on public.obligation_cycles using btree (due_date) TABLESPACE pg_default;

-- Migration: Update obligations table
ALTER TABLE public.obligations
  ADD COLUMN IF NOT EXISTS due_month integer null check (due_month between 1 and 12),
  ADD COLUMN IF NOT EXISTS due_year integer null,
  ADD COLUMN IF NOT EXISTS reminder_time time null,
  ADD COLUMN IF NOT EXISTS actual_amount numeric(10, 2) null;

-- Ensure due_day falls within valid calendar days
ALTER TABLE public.obligations
  ADD CONSTRAINT chk_due_day CHECK (due_day BETWEEN 1 AND 31);

-- Migration: Update obligation_cycles table
ALTER TABLE public.obligation_cycles
  ADD COLUMN IF NOT EXISTS reminder_time time null;

-- Optimized composite index for the main screen feed query
CREATE INDEX IF NOT EXISTS idx_cycles_user_status_due 
  ON public.obligation_cycles (user_id, status, due_date ASC);  