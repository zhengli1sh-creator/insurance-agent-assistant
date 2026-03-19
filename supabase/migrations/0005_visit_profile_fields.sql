alter table public.visit_records
  add column if not exists sys_platform text not null default 'web',
  add column if not exists uuid text not null default gen_random_uuid()::text,
  add column if not exists bstudio_create_time timestamptz,
  add column if not exists name text,
  add column if not exists time_visit date,
  add column if not exists location text,
  add column if not exists core_pain text,
  add column if not exists brief_content text,
  add column if not exists follow_work text,
  add column if not exists method_communicate text,
  add column if not exists nick_name text;

update public.visit_records v
set
  bstudio_create_time = coalesce(v.bstudio_create_time, v.created_at),
  name = coalesce(v.name, c.name),
  nick_name = coalesce(v.nick_name, c.nickname),
  time_visit = coalesce(v.time_visit, v.happened_at::date, v.created_at::date),
  brief_content = coalesce(v.brief_content, v.summary),
  method_communicate = coalesce(v.method_communicate, v.tone),
  follow_work = coalesce(
    v.follow_work,
    (
      select string_agg(value, '；')
      from jsonb_array_elements_text(v.follow_ups) as value
    )
  )
from public.customers c
where v.customer_id = c.id;

update public.visit_records
set bstudio_create_time = coalesce(bstudio_create_time, created_at)
where bstudio_create_time is null;

alter table public.visit_records
  alter column bstudio_create_time set default timezone('utc', now()),
  alter column name set not null,
  alter column time_visit set not null,
  alter column bstudio_create_time set not null;

create index if not exists visit_records_owner_time_visit_idx on public.visit_records (owner_id, time_visit desc);
create unique index if not exists visit_records_owner_name_time_visit_unique_idx on public.visit_records (owner_id, name, time_visit);
create unique index if not exists visit_records_uuid_unique_idx on public.visit_records (uuid);

drop index if exists visit_records_owner_happened_at_idx;
