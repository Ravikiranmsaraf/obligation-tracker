-- Normalize problematic rows first
update public.obligations
set due_month = 1
where frequency = 'yearly' and due_month is null;

-- Now add constraints
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