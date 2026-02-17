-- Cloud sync snapshot table for StatsApp
-- Run this in Supabase SQL Editor.

create table if not exists public.user_sync_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_sync_snapshots enable row level security;

create policy "user_can_select_own_snapshot"
on public.user_sync_snapshots
for select
using (auth.uid() = user_id);

create policy "user_can_insert_own_snapshot"
on public.user_sync_snapshots
for insert
with check (auth.uid() = user_id);

create policy "user_can_update_own_snapshot"
on public.user_sync_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "user_can_delete_own_snapshot"
on public.user_sync_snapshots
for delete
using (auth.uid() = user_id);
