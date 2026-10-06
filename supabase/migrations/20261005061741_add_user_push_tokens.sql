-- 1. Create the user_push_tokens table
create table if not exists public.user_push_tokens (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    fcm_token text not null unique,
    device_type text default 'desktop_web', -- e.g., 'mobile_web', 'desktop_web', 'ios_pwa'
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Create index on user_id for fast queries when fetching tokens for notifications
create index if not exists idx_user_push_tokens_user_id 
on public.user_push_tokens(user_id);

-- 3. Enable Row Level Security (RLS)
alter table public.user_push_tokens enable row level security;

-- 4. Set up Row Level Security (RLS) Policies
-- Users can only read their own push tokens
create policy "Users can view their own push tokens" 
on public.user_push_tokens for select 
using (auth.uid() = user_id);

-- Users can register new tokens linked to their account
create policy "Users can insert their own push tokens" 
on public.user_push_tokens for insert 
with check (auth.uid() = user_id);

-- Users can update timestamps/device info for their own tokens
create policy "Users can update their own push tokens" 
on public.user_push_tokens for update 
using (auth.uid() = user_id);

-- Users can remove device tokens (e.g., logging out or revoking permission)
create policy "Users can delete their own push tokens" 
on public.user_push_tokens for delete 
using (auth.uid() = user_id);