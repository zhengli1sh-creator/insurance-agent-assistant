alter table public.activity_events
  add column if not exists sys_platform text not null default 'web',
  add column if not exists uuid text not null default gen_random_uuid()::text,
  add column if not exists bstudio_create_time timestamptz,
  add column if not exists name_activity text,
  add column if not exists date_activity date,
  add column if not exists location_activity text,
  add column if not exists customer_profile text,
  add column if not exists effect_profile text,
  add column if not exists lessons_learned text;

update public.activity_events
set
  bstudio_create_time = coalesce(bstudio_create_time, created_at),
  name_activity = coalesce(name_activity, title),
  date_activity = coalesce(date_activity, happened_at::date, created_at::date),
  effect_profile = coalesce(effect_profile, summary),
  lessons_learned = coalesce(lessons_learned, tone),
  title = coalesce(title, name_activity),
  summary = coalesce(summary, effect_profile, customer_profile, lessons_learned, name_activity),
  happened_at = coalesce(happened_at, timezone('utc', date_activity::timestamp)),
  follow_ups = coalesce(follow_ups, '[]'::jsonb)
where true;

update public.activity_events
set bstudio_create_time = coalesce(bstudio_create_time, created_at)
where bstudio_create_time is null;

alter table public.activity_events
  alter column bstudio_create_time set default timezone('utc', now()),
  alter column name_activity set not null,
  alter column date_activity set not null,
  alter column bstudio_create_time set not null;

create index if not exists activity_events_owner_date_activity_idx on public.activity_events (owner_id, date_activity desc);
create unique index if not exists activity_events_uuid_unique_idx on public.activity_events (uuid);
create unique index if not exists activity_events_owner_name_date_activity_unique_idx on public.activity_events (owner_id, name_activity, date_activity);

drop index if exists activity_events_owner_happened_at_idx;

alter table public.activity_participants
  add column if not exists sys_platform text not null default 'web',
  add column if not exists uuid text not null default gen_random_uuid()::text,
  add column if not exists bstudio_create_time timestamptz,
  add column if not exists name text,
  add column if not exists nick_name text,
  add column if not exists follow_work text;

update public.activity_participants ap
set
  bstudio_create_time = coalesce(ap.bstudio_create_time, ap.created_at),
  name = coalesce(ap.name, c.name),
  nick_name = coalesce(ap.nick_name, c.nickname),
  follow_work = coalesce(
    ap.follow_work,
    (
      select string_agg(value, '；')
      from jsonb_array_elements_text(coalesce(ae.follow_ups, '[]'::jsonb)) as value
    )
  )
from public.customers c
join public.activity_events ae on ae.id = ap.activity_id
where ap.customer_id = c.id;

update public.activity_participants
set bstudio_create_time = coalesce(bstudio_create_time, created_at)
where bstudio_create_time is null;

alter table public.activity_participants
  alter column bstudio_create_time set default timezone('utc', now()),
  alter column name set not null,
  alter column bstudio_create_time set not null;

create index if not exists activity_participants_owner_customer_idx on public.activity_participants (owner_id, customer_id);
create unique index if not exists activity_participants_uuid_unique_idx on public.activity_participants (uuid);
create unique index if not exists activity_participants_owner_activity_name_nickname_unique_idx on public.activity_participants (owner_id, activity_id, name, coalesce(nick_name, ''));
