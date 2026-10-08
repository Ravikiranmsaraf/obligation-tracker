-- OPTIONAL CLEANUP
-- Run only if your existing migration created these exact old policy names.
-- It avoids duplicate policies on user_push_tokens.

drop policy if exists "Users can view their own push tokens" on public.user_push_tokens;
drop policy if exists "Users can insert their own push tokens" on public.user_push_tokens;
drop policy if exists "Users can update their own push tokens" on public.user_push_tokens;
drop policy if exists "Users can remove their own push tokens" on public.user_push_tokens;

create policy user_push_tokens_select_own on public.user_push_tokens
for select using (auth.uid() = user_id);

create policy user_push_tokens_insert_own on public.user_push_tokens
for insert with check (auth.uid() = user_id);

create policy user_push_tokens_update_own on public.user_push_tokens
for update using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy user_push_tokens_delete_own on public.user_push_tokens
for delete using (auth.uid() = user_id);
