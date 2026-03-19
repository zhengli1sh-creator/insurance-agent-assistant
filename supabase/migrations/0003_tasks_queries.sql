create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('visit', 'activity')),
  source_id uuid not null,
  title text not null,
  status text not null default '待执行' check (status in ('待执行', '进行中', '已完成', '已逾期')),
  priority text not null default '中' check (priority in ('高', '中', '低')),
  due_at timestamptz,
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (owner_id, source_type, source_id, title)
);

alter table public.tasks enable row level security;

create index if not exists tasks_owner_created_at_idx on public.tasks (owner_id, created_at desc);
create index if not exists tasks_owner_status_idx on public.tasks (owner_id, status);
create index if not exists tasks_owner_source_idx on public.tasks (owner_id, source_type, source_id);

drop trigger if exists tasks_handle_updated_at on public.tasks;
create trigger tasks_handle_updated_at
before update on public.tasks
for each row
execute function public.handle_updated_at();

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks for select using ((select auth.uid()) = owner_id);
drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks for delete using ((select auth.uid()) = owner_id);
