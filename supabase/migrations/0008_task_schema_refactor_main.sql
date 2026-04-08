-- 任务迁移：完整迁移（约束已删除后执行）
begin;

-- ============================================
-- 1. 新增核心字段
-- ============================================

alter table public.tasks
  add column if not exists planned_at timestamptz;

alter table public.tasks
  add column if not exists canceled_at timestamptz;

-- ============================================
-- 2. 数据迁移
-- ============================================

update public.tasks
set planned_at = coalesce(
  due_at,
  case when due_date is not null then due_date::timestamptz else null end,
  created_at
)
where planned_at is null;

update public.tasks
set planned_at = created_at
where planned_at is null;

-- ============================================
-- 3. 设置 planned_at 为必填
-- ============================================

alter table public.tasks
  alter column planned_at set not null;

-- ============================================
-- 4. 重新添加状态约束（此时数据已清洗）
-- ============================================

alter table public.tasks
  add constraint tasks_status_check
  check (status in ('待开始', '已完成', '已取消'));

-- ============================================
-- 5. 更新 source_type 约束
-- ============================================

update public.tasks
set source_type = 'activity'
where source_type in ('activity_event', 'activity_participant', 'customer');

update public.tasks
set source_type = 'manual'
where source_type is null or source_type = '';

alter table public.tasks
  drop constraint if exists tasks_source_type_check;

alter table public.tasks
  add constraint tasks_source_type_check
  check (source_type in ('manual', 'visit', 'activity'));

-- ============================================
-- 6. 清理旧的唯一约束
-- ============================================

do $$
declare
  constraint_name text;
begin
  select conname into constraint_name
  from pg_constraint
  where conrelid = 'public.tasks'::regclass
    and contype = 'u'
    and conname like 'tasks_%source%unique%'
  limit 1;
  if constraint_name is not null then
    execute format('alter table public.tasks drop constraint %I', constraint_name);
  end if;
end $$;

-- ============================================
-- 7. 创建新的唯一索引
-- ============================================

drop index if exists idx_tasks_manual_unique;
create unique index idx_tasks_manual_unique
on public.tasks (owner_id, title, planned_at, coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid))
where source_type = 'manual';

drop index if exists idx_tasks_source_unique;
create unique index idx_tasks_source_unique
on public.tasks (owner_id, source_type, coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid), title, coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid))
where source_type in ('visit', 'activity');

-- ============================================
-- 8. 创建查询性能索引
-- ============================================

drop index if exists idx_tasks_owner_status_planned;
create index idx_tasks_owner_status_planned
on public.tasks (owner_id, status, planned_at);

drop index if exists idx_tasks_owner_remind_status;
create index idx_tasks_owner_remind_status
on public.tasks (owner_id, remind_at, status)
where status = '待开始';

drop index if exists idx_tasks_owner_customer_planned;
create index idx_tasks_owner_customer_planned
on public.tasks (owner_id, customer_id, planned_at)
where status = '待开始';

-- ============================================
-- 9. 标记废弃字段
-- ============================================

comment on column public.tasks.due_date is '@deprecated 使用 planned_at 替代';
comment on column public.tasks.due_at is '@deprecated 使用 planned_at 替代';
comment on column public.tasks.description is '@deprecated 使用 note 替代';
comment on column public.tasks.category is '@deprecated 不再使用';
comment on column public.tasks.result_note is '@deprecated 不再使用';

-- ============================================
-- 10. 清理旧索引
-- ============================================

drop index if exists tasks_owner_source_dedupe_unique_idx;

commit;
