-- 任务管理重构 Migration
-- 基于任务管理设计文档 v1.0
-- 将任务系统从旧的 due_date/due_at 体系迁移到 planned_at 体系

begin;

-- ============================================
-- 1. 新增核心字段
-- ============================================

-- 新增 planned_at (计划执行时间)
alter table public.tasks
  add column if not exists planned_at timestamptz;

-- 新增 canceled_at (取消时间)
alter table public.tasks
  add column if not exists canceled_at timestamptz;

-- ============================================
-- 2. 数据迁移：从旧字段迁移到新字段
-- ============================================

-- 迁移 planned_at：优先使用 due_at，其次使用 due_date
update public.tasks
set planned_at = coalesce(
  due_at,
  case 
    when due_date is not null then due_date::timestamptz
    else null
  end,
  created_at  -- 兜底：如果没有截止日期，使用创建时间
)
where planned_at is null;

-- 确保所有记录都有 planned_at
update public.tasks
set planned_at = created_at
where planned_at is null;

-- ============================================
-- 3. 设置 planned_at 为必填
-- ============================================

alter table public.tasks
  alter column planned_at set not null;

-- ============================================
-- 4. 更新状态约束：从 5 个状态改为 3 个
-- ============================================

-- 4.1 先查看并处理所有异常状态值
-- 将 "已逾期"、"进行中"、"待执行" 改为 "待开始"
update public.tasks
set status = '待开始'
where status in ('已逾期', '进行中', '待执行');

-- 4.2 处理其他异常状态值（如简写、错别字等）
update public.tasks
set status = '待开始'
where status not in ('待开始', '已完成', '已取消');

-- 4.3 删除旧的状态约束（如果存在）
alter table public.tasks
  drop constraint if exists tasks_status_check;

-- 4.4 添加新的状态约束
alter table public.tasks
  add constraint tasks_status_check
  check (status in ('待开始', '已完成', '已取消'));

-- ============================================
-- 5. 更新 source_type 约束
-- ============================================

-- 归一化 source_type
update public.tasks
set source_type = 'activity'
where source_type in ('activity_event', 'activity_participant', 'customer');

update public.tasks
set source_type = 'manual'
where source_type is null;

-- 删除旧的 source_type 约束
alter table public.tasks
  drop constraint if exists tasks_source_type_check;

-- 添加新的 source_type 约束
alter table public.tasks
  add constraint tasks_source_type_check
  check (source_type in ('manual', 'visit', 'activity'));

-- ============================================
-- 6. 清理旧的唯一约束，准备新建
-- ============================================

-- 删除旧的基于 source 的唯一约束（如果存在）
do $$
declare
  constraint_name text;
begin
  select conname
  into constraint_name
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
-- 7. 创建新的唯一索引（去重规则）
-- ============================================

-- 手工任务去重索引
-- owner_id + title + planned_at + coalesce(customer_id, zero_uuid)
drop index if exists idx_tasks_manual_unique;
create unique index idx_tasks_manual_unique
on public.tasks (
  owner_id,
  title,
  planned_at,
  coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where source_type = 'manual';

-- 来源任务去重索引
-- owner_id + source_type + coalesce(source_id, zero_uuid) + title + coalesce(customer_id, zero_uuid)
drop index if exists idx_tasks_source_unique;
create unique index idx_tasks_source_unique
on public.tasks (
  owner_id,
  source_type,
  coalesce(source_id, '00000000-0000-0000-0000-000000000000'::uuid),
  title,
  coalesce(customer_id, '00000000-0000-0000-0000-000000000000'::uuid)
)
where source_type in ('visit', 'activity');

-- ============================================
-- 8. 创建查询性能索引
-- ============================================

-- 用于按 owner + status + planned_at 查询
drop index if exists idx_tasks_owner_status_planned;
create index idx_tasks_owner_status_planned
on public.tasks (owner_id, status, planned_at);

-- 用于今日提醒查询
drop index if exists idx_tasks_owner_remind_status;
create index idx_tasks_owner_remind_status
on public.tasks (owner_id, remind_at, status)
where status = '待开始';

-- 用于客户关联任务查询
drop index if exists idx_tasks_owner_customer_planned;
create index idx_tasks_owner_customer_planned
on public.tasks (owner_id, customer_id, planned_at)
where status = '待开始';

-- ============================================
-- 9. 可选：标记废弃字段（第一阶段保留，第二阶段清理）
-- ============================================

-- 添加注释标记废弃字段
comment on column public.tasks.due_date is '@deprecated 使用 planned_at 替代';
comment on column public.tasks.due_at is '@deprecated 使用 planned_at 替代';
comment on column public.tasks.description is '@deprecated 使用 note 替代';
comment on column public.tasks.category is '@deprecated 不再使用';
comment on column public.tasks.result_note is '@deprecated 不再使用';

-- ============================================
-- 10. 清理旧索引（如果与新索引冲突）
-- ============================================

drop index if exists tasks_owner_source_dedupe_unique_idx;

commit;
