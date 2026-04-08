-- 任务迁移：先删除约束，再清洗数据，最后重建约束

-- ============================================
-- Step 1: 删除旧的约束（如果不存在会静默跳过）
-- ============================================

-- 删除旧的状态约束
alter table public.tasks
  drop constraint if exists tasks_status_check;

-- ============================================
-- Step 2: 查看当前有哪些状态值
-- ============================================

select distinct status as "当前状态值", count(*) as "数量"
from public.tasks
group by status
order by status;

-- ============================================
-- Step 3: 将所有非标准状态改为 '待开始'
-- ============================================

update public.tasks
set status = '待开始'
where status not in ('待开始', '已完成', '已取消');

-- ============================================
-- Step 4: 确认清理结果
-- ============================================

select distinct status as "清理后状态值", count(*) as "数量"
from public.tasks
group by status
order by status;
