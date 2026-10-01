create table if not exists public.fcm_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.fcm_tokens enable row level security;

create policy "Users can insert their own tokens"
  on public.fcm_tokens for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own tokens"
  on public.fcm_tokens for update
  using (auth.uid() = user_id);

create policy "Users can delete their own tokens"
  on public.fcm_tokens for delete
  using (auth.uid() = user_id);

create policy "Users can view their own tokens"
  on public.fcm_tokens for select
  using (auth.uid() = user_id);

-- Ensure authenticated users have access to the table
grant select, insert, update, delete on public.fcm_tokens to authenticated;
