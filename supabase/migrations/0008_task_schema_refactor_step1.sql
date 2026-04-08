-- 任务迁移 Step 1：数据清洗（先执行这个）
-- 目的：清理异常状态值，确保后续约束能成功添加

-- 1. 查看当前有哪些状态值
select distinct status as "当前状态值", count(*) as "数量"
from public.tasks
group by status;

-- 2. 将所有非标准状态改为 '待开始'
update public.tasks
set status = '待开始'
where status not in ('待开始', '已完成', '已取消');

-- 3. 验证清理结果
select distinct status as "清理后状态值", count(*) as "数量"
from public.tasks
group by status;
