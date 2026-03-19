alter table public.customers
  add column if not exists sys_platform text not null default 'web',
  add column if not exists uuid text not null default gen_random_uuid()::text,
  add column if not exists bstudio_create_time timestamptz not null default timezone('utc', now()),
  add column if not exists age text,
  add column if not exists sex text,
  add column if not exists profession text,
  add column if not exists family_profile text,
  add column if not exists wealth_profile text,
  add column if not exists core_interesting text,
  add column if not exists prefer_communicate text,
  add column if not exists source text,
  add column if not exists nickname text,
  add column if not exists recent_money text;

update public.customers
set
  core_interesting = coalesce(core_interesting, asset_focus),
  family_profile = coalesce(family_profile, note),
  bstudio_create_time = coalesce(bstudio_create_time, created_at)
where true;

create index if not exists customers_owner_created_at_idx on public.customers (owner_id, bstudio_create_time desc);
create unique index if not exists customers_uuid_unique_idx on public.customers (uuid);
create unique index if not exists customers_owner_name_nickname_unique_idx on public.customers (owner_id, name, coalesce(nickname, ''));

drop index if exists customers_owner_tier_idx;
