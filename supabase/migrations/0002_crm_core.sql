create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  name text not null,
  age text,
  sex text,
  profession text,
  family_profile text,
  wealth_profile text,
  core_interesting text,
  prefer_communicate text,
  source text,
  nickname text,
  recent_money text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.visit_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  name text not null,
  time_visit date not null,
  location text,
  core_pain text,
  brief_content text,
  follow_work text,
  method_communicate text,
  nick_name text,
  title text not null,
  summary text not null,
  happened_at timestamptz not null,
  tone text,
  follow_ups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  name_activity text not null,
  date_activity date not null,
  location_activity text,
  customer_profile text,
  effect_profile text,
  lessons_learned text,
  title text not null,
  theme text,
  summary text not null,
  happened_at timestamptz not null,
  tone text,
  follow_ups jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.activity_participants (
  activity_id uuid not null references public.activity_events(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  name text not null,
  nick_name text,
  follow_work text,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (activity_id, customer_id)
);

alter table public.customers enable row level security;
alter table public.visit_records enable row level security;
alter table public.activity_events enable row level security;
alter table public.activity_participants enable row level security;

create index if not exists customers_owner_created_at_idx on public.customers (owner_id, bstudio_create_time desc);
create unique index if not exists customers_uuid_unique_idx on public.customers (uuid);
create unique index if not exists customers_owner_name_nickname_unique_idx on public.customers (owner_id, name, coalesce(nickname, ''));
create index if not exists visit_records_owner_time_visit_idx on public.visit_records (owner_id, time_visit desc);
create unique index if not exists visit_records_owner_name_time_visit_unique_idx on public.visit_records (owner_id, name, time_visit);
create unique index if not exists visit_records_uuid_unique_idx on public.visit_records (uuid);
create index if not exists activity_events_owner_date_activity_idx on public.activity_events (owner_id, date_activity desc);
create unique index if not exists activity_events_uuid_unique_idx on public.activity_events (uuid);
create unique index if not exists activity_events_owner_name_date_activity_unique_idx on public.activity_events (owner_id, name_activity, date_activity);
create index if not exists activity_participants_owner_customer_idx on public.activity_participants (owner_id, customer_id);
create unique index if not exists activity_participants_uuid_unique_idx on public.activity_participants (uuid);
create unique index if not exists activity_participants_owner_activity_name_nickname_unique_idx on public.activity_participants (owner_id, activity_id, name, coalesce(nick_name, ''));

drop trigger if exists customers_handle_updated_at on public.customers;
create trigger customers_handle_updated_at
before update on public.customers
for each row
execute function public.handle_updated_at();

drop trigger if exists visit_records_handle_updated_at on public.visit_records;
create trigger visit_records_handle_updated_at
before update on public.visit_records
for each row
execute function public.handle_updated_at();

drop trigger if exists activity_events_handle_updated_at on public.activity_events;
create trigger activity_events_handle_updated_at
before update on public.activity_events
for each row
execute function public.handle_updated_at();

drop policy if exists "customers_select_own" on public.customers;
create policy "customers_select_own" on public.customers for select using ((select auth.uid()) = owner_id);
drop policy if exists "customers_insert_own" on public.customers;
create policy "customers_insert_own" on public.customers for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "customers_update_own" on public.customers;
create policy "customers_update_own" on public.customers for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "customers_delete_own" on public.customers;
create policy "customers_delete_own" on public.customers for delete using ((select auth.uid()) = owner_id);

drop policy if exists "visit_records_select_own" on public.visit_records;
create policy "visit_records_select_own" on public.visit_records for select using ((select auth.uid()) = owner_id);
drop policy if exists "visit_records_insert_own" on public.visit_records;
create policy "visit_records_insert_own" on public.visit_records for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "visit_records_update_own" on public.visit_records;
create policy "visit_records_update_own" on public.visit_records for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "visit_records_delete_own" on public.visit_records;
create policy "visit_records_delete_own" on public.visit_records for delete using ((select auth.uid()) = owner_id);

drop policy if exists "activity_events_select_own" on public.activity_events;
create policy "activity_events_select_own" on public.activity_events for select using ((select auth.uid()) = owner_id);
drop policy if exists "activity_events_insert_own" on public.activity_events;
create policy "activity_events_insert_own" on public.activity_events for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "activity_events_update_own" on public.activity_events;
create policy "activity_events_update_own" on public.activity_events for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "activity_events_delete_own" on public.activity_events;
create policy "activity_events_delete_own" on public.activity_events for delete using ((select auth.uid()) = owner_id);

drop policy if exists "activity_participants_select_own" on public.activity_participants;
create policy "activity_participants_select_own" on public.activity_participants for select using ((select auth.uid()) = owner_id);
drop policy if exists "activity_participants_insert_own" on public.activity_participants;
create policy "activity_participants_insert_own" on public.activity_participants for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "activity_participants_delete_own" on public.activity_participants;
create policy "activity_participants_delete_own" on public.activity_participants for delete using ((select auth.uid()) = owner_id);
