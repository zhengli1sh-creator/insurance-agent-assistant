begin;

alter table public.tasks
  add column if not exists sys_platform text not null default 'web',
  add column if not exists uuid text not null default gen_random_uuid()::text,
  add column if not exists bstudio_create_time timestamptz,
  add column if not exists description text,
  add column if not exists category text,
  add column if not exists customer_id uuid,
  add column if not exists customer_name text,
  add column if not exists customer_nickname text,
  add column if not exists due_date date,
  add column if not exists remind_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists result_note text;

update public.tasks
set
  bstudio_create_time = coalesce(bstudio_create_time, created_at),
  description = coalesce(description, note),
  due_date = coalesce(due_date, due_at::date),
  completed_at = case
    when completed_at is not null then completed_at
    when status = '已完成' then updated_at
    else completed_at
  end
where true;

update public.tasks
set bstudio_create_time = coalesce(bstudio_create_time, created_at)
where bstudio_create_time is null;

alter table public.tasks
  alter column bstudio_create_time set default timezone('utc', now()),
  alter column bstudio_create_time set not null;

alter table public.tasks drop constraint if exists tasks_source_type_check;
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks drop constraint if exists tasks_priority_check;

alter table public.tasks
  add constraint tasks_source_type_check check (source_type in ('manual', 'customer', 'visit', 'activity', 'activity_event', 'activity_participant')),
  add constraint tasks_status_check check (status in ('待执行', '进行中', '已完成', '已取消', '已逾期')),
  add constraint tasks_priority_check check (priority in ('高', '中', '低'));

alter table public.tasks
  alter column source_id drop not null;

do $$
begin
  alter table public.tasks
    add constraint tasks_customer_id_fkey
    foreign key (customer_id) references public.customers(id) on delete set null;
exception
  when duplicate_object then
    null;
end $$;

do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
  from pg_constraint
  where conrelid = 'public.tasks'::regclass
    and contype = 'u'
    and conname like 'tasks_%source_id%title%key'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.tasks drop constraint %I', constraint_name);
  end if;
end $$;

create unique index if not exists tasks_uuid_unique_idx on public.tasks (uuid);
create index if not exists tasks_owner_bstudio_create_time_idx on public.tasks (owner_id, bstudio_create_time desc);
create index if not exists tasks_owner_due_date_idx on public.tasks (owner_id, status, due_date desc nulls last);
create index if not exists tasks_owner_customer_due_date_idx on public.tasks (owner_id, customer_id, due_date desc nulls last);
create index if not exists tasks_owner_priority_status_idx on public.tasks (owner_id, priority, status);
create unique index if not exists tasks_owner_source_dedupe_unique_idx
  on public.tasks (
    owner_id,
    source_type,
    coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    title
  )
  where source_type <> 'manual';

create table if not exists public.query_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  query_name text not null,
  query_scope text not null check (query_scope in ('customers', 'visits', 'activities', 'tasks', 'mixed')),
  filter_json jsonb not null default '{}'::jsonb,
  sort_json jsonb not null default '[]'::jsonb,
  display_json jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  last_run_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.query_templates enable row level security;

create unique index if not exists query_templates_uuid_unique_idx on public.query_templates (uuid);
create unique index if not exists query_templates_owner_name_unique_idx on public.query_templates (owner_id, query_name);
create index if not exists query_templates_owner_scope_idx on public.query_templates (owner_id, query_scope, updated_at desc);

drop trigger if exists query_templates_handle_updated_at on public.query_templates;
create trigger query_templates_handle_updated_at
before update on public.query_templates
for each row
execute function public.handle_updated_at();

drop policy if exists "query_templates_select_own" on public.query_templates;
create policy "query_templates_select_own" on public.query_templates for select using ((select auth.uid()) = owner_id);
drop policy if exists "query_templates_insert_own" on public.query_templates;
create policy "query_templates_insert_own" on public.query_templates for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "query_templates_update_own" on public.query_templates;
create policy "query_templates_update_own" on public.query_templates for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "query_templates_delete_own" on public.query_templates;
create policy "query_templates_delete_own" on public.query_templates for delete using ((select auth.uid()) = owner_id);

create table if not exists public.insight_reports (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  sys_platform text not null default 'web',
  uuid text not null default gen_random_uuid()::text,
  bstudio_create_time timestamptz not null default timezone('utc', now()),
  report_name text not null,
  report_type text not null check (report_type in ('system', 'manual', 'custom')),
  source_query_id uuid references public.query_templates(id) on delete set null,
  summary text,
  generated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.insight_reports enable row level security;

create unique index if not exists insight_reports_uuid_unique_idx on public.insight_reports (uuid);
create index if not exists insight_reports_owner_generated_at_idx on public.insight_reports (owner_id, generated_at desc);
create index if not exists insight_reports_owner_type_idx on public.insight_reports (owner_id, report_type, generated_at desc);
create index if not exists insight_reports_source_query_idx on public.insight_reports (source_query_id);

drop trigger if exists insight_reports_handle_updated_at on public.insight_reports;
create trigger insight_reports_handle_updated_at
before update on public.insight_reports
for each row
execute function public.handle_updated_at();

drop policy if exists "insight_reports_select_own" on public.insight_reports;
create policy "insight_reports_select_own" on public.insight_reports for select using ((select auth.uid()) = owner_id);
drop policy if exists "insight_reports_insert_own" on public.insight_reports;
create policy "insight_reports_insert_own" on public.insight_reports for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "insight_reports_update_own" on public.insight_reports;
create policy "insight_reports_update_own" on public.insight_reports for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "insight_reports_delete_own" on public.insight_reports;
create policy "insight_reports_delete_own" on public.insight_reports for delete using ((select auth.uid()) = owner_id);

create table if not exists public.insight_report_items (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.insight_reports(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  insight_key text not null,
  title text not null,
  description text,
  customer_count integer not null default 0 check (customer_count >= 0),
  customer_ids jsonb not null default '[]'::jsonb,
  tags jsonb not null default '[]'::jsonb,
  suggestion text,
  evidence_json jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  unique (report_id, insight_key)
);

alter table public.insight_report_items enable row level security;

create index if not exists insight_report_items_report_sort_idx on public.insight_report_items (report_id, sort_order, created_at);
create index if not exists insight_report_items_owner_created_at_idx on public.insight_report_items (owner_id, created_at desc);

drop policy if exists "insight_report_items_select_own" on public.insight_report_items;
create policy "insight_report_items_select_own" on public.insight_report_items for select using ((select auth.uid()) = owner_id);
drop policy if exists "insight_report_items_insert_own" on public.insight_report_items;
create policy "insight_report_items_insert_own" on public.insight_report_items for insert with check ((select auth.uid()) = owner_id);
drop policy if exists "insight_report_items_update_own" on public.insight_report_items;
create policy "insight_report_items_update_own" on public.insight_report_items for update using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);
drop policy if exists "insight_report_items_delete_own" on public.insight_report_items;
create policy "insight_report_items_delete_own" on public.insight_report_items for delete using ((select auth.uid()) = owner_id);

commit;
