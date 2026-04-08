# 任务管理改造清单

> 基于《任务管理设计文档 v1.0》的改造实施计划

---

## 一、数据库层改造

### 1.1 新增字段（Supabase Migration）

**文件位置**：`supabase/migrations/xxxx_task_schema_refactor.sql`

```sql
-- 新增字段
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS planned_at timestamptz,
  ADD COLUMN IF NOT EXISTS canceled_at timestamptz;

-- 添加约束：planned_at 必填
ALTER TABLE public.tasks 
  ALTER COLUMN planned_at SET NOT NULL;

-- 调整 status 约束为 3 个值
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('待开始', '已完成', '已取消'));

-- 调整 source_type 约束
ALTER TABLE public.tasks 
  DROP CONSTRAINT IF EXISTS tasks_source_type_check;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_source_type_check 
  CHECK (source_type IN ('manual', 'visit', 'activity'));
```

### 1.2 数据迁移

```sql
-- 迁移：将现有数据从 due_date/due_at 迁移到 planned_at
UPDATE public.tasks 
SET planned_at = COALESCE(due_at, due_date::timestamptz)
WHERE planned_at IS NULL;

-- 迁移：将现有状态从 5 个改为 3 个
-- 已逾期 -> 待开始（因为已过期是计算分区，不是存储状态）
UPDATE public.tasks 
SET status = '待开始'
WHERE status = '已逾期';

-- 迁移：source_type 归一化
UPDATE public.tasks 
SET source_type = 'activity'
WHERE source_type IN ('activity_event', 'activity_participant');

UPDATE public.tasks 
SET source_type = 'manual'
WHERE source_type IS NULL;
```

### 1.3 索引优化

```sql
-- 删除旧的唯一索引（如有）
DROP INDEX IF EXISTS idx_tasks_owner_title_planned_customer;

-- 创建手工任务去重索引
CREATE UNIQUE INDEX idx_tasks_manual_unique 
ON public.tasks (owner_id, title, planned_at, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'))
WHERE source_type = 'manual';

-- 创建来源任务去重索引
CREATE UNIQUE INDEX idx_tasks_source_unique 
ON public.tasks (owner_id, source_type, COALESCE(source_id, '00000000-0000-0000-0000-000000000000'), title, COALESCE(customer_id, '00000000-0000-0000-0000-000000000000'))
WHERE source_type IN ('visit', 'activity');

-- 创建查询性能索引
CREATE INDEX idx_tasks_owner_status_planned 
ON public.tasks (owner_id, status, planned_at);

CREATE INDEX idx_tasks_owner_remind 
ON public.tasks (owner_id, remind_at) 
WHERE status = '待开始';
```

---

## 二、类型定义与校验层改造

### 2.1 修改类型定义文件

**文件位置**：`src/types/task.ts`

```typescript
// 修改前
export type TaskStatusValue = "待执行" | "进行中" | "已完成" | "已取消" | "已逾期";

// 修改后
export type TaskStatusValue = "待开始" | "已完成" | "已取消";

// 修改前
export type TaskSourceTypeValue = "manual" | "visit" | "activity_event" | "activity_participant" | "customer" | ...;

// 修改后
export type TaskSourceTypeValue = "manual" | "visit" | "activity";

// 修改 TaskEntity 接口
export interface TaskEntity {
  id: string;
  owner_id: string;
  customer_id: string | null;
  title: string;
  note: string | null;
  planned_at: string;           // 改为必填
  remind_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;   // 新增
  priority: TaskPriorityValue;
  status: TaskStatusValue;
  source_type: TaskSourceTypeValue;
  source_id: string | null;
  created_at: string;
  
  // 以下字段标记为废弃，后续逐步清理
  due_date?: string | null;
  due_at?: string | null;
  description?: string | null;
  category?: string | null;
  result_note?: string | null;
}
```

### 2.2 修改校验规则

**文件位置**：`src/lib/validation/task.ts`

```typescript
// 创建任务校验
export const taskCreateSchema = z.object({
  title: z.string().min(1, "任务标题不能为空").max(100, "任务标题不超过100字"),
  plannedAt: z.string().datetime("计划执行时间格式不正确"),
  remindAt: z.string().datetime("提醒时间格式不正确").optional().nullable(),
  customerId: z.string().uuid("客户标识格式不正确").optional().nullable(),
  priority: z.enum(["高", "中", "低"]).default("中"),
  note: z.string().max(500, "备注不超过500字").optional().nullable(),
});

// 更新任务校验（新增，不是只改状态）
export const taskUpdateSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  title: z.string().min(1).max(100).optional(),
  plannedAt: z.string().datetime().optional(),
  remindAt: z.string().datetime().optional().nullable(),
  priority: z.enum(["高", "中", "低"]).optional(),
  note: z.string().max(500).optional().nullable(),
});

// 状态变更校验
export const taskStatusChangeSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  status: z.enum(["已完成", "已取消"]),  // 只能从待开始改为完成/取消
});
```

### 2.3 修改领域模型

**文件位置**：`src/types/domain.ts`

```typescript
// 修改 TaskItem 展示层模型
export interface TaskItem {
  id: string;
  title: string;
  plannedAt: string;      // 改为 plannedAt
  remindAt: string | null; // 新增
  status: TaskStatus;     // 改为 3 个值
  priority: "高" | "中" | "低";
  customerId: string | null;
  customerName: string | null;
  sourceType: TaskSourceType;
}

// 修改 TaskStatus 类型
export type TaskStatus = "待开始" | "已完成" | "已取消";
```

---

## 三、服务层与仓储层改造

### 3.1 修改仓储层

**文件位置**：`src/lib/repositories/task-repository.ts`

```typescript
// 新增：通用任务更新方法
export async function updateTaskRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
  updates: Partial<Pick<TaskEntity, 'title' | 'planned_at' | 'remind_at' | 'priority' | 'note'>>
) {
  return supabase
    .from("tasks")
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .eq("status", "待开始")  // 只允许修改待开始任务
    .select("*")
    .single();
}

// 修改：状态变更方法
export async function changeTaskStatusRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
  status: "已完成" | "已取消"
) {
  const updateData: Record<string, unknown> = { status };
  
  if (status === "已完成") {
    updateData.completed_at = new Date().toISOString();
  } else if (status === "已取消") {
    updateData.canceled_at = new Date().toISOString();
  }
  
  return supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .eq("status", "待开始")  // 只能从待开始变更
    .select("*")
    .single();
}

// 新增：按分区查询任务
export async function queryTasksByOwnerRepository(
  supabase: SupabaseClient,
  ownerId: string
) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .order("planned_at", { ascending: true });
}
```

### 3.2 修改服务层

**文件位置**：`src/modules/tasks/task-service.ts`

```typescript
// 移除：normalizeTaskEntity 中的已逾期自动计算逻辑
// 因为已过期不再是存储状态，而是页面计算分区

// 新增：任务分区计算逻辑
export function categorizeTasks(tasks: TaskEntity[], userTimezone: string) {
  const now = new Date(); // 需要按用户时区转换
  const today = new Date().toISOString().slice(0, 10);
  
  const result = {
    todayReminders: [] as TaskEntity[],  // 今日提醒聚焦区
    pending: [] as TaskEntity[],         // 待开始任务区
    overdue: [] as TaskEntity[],         // 已过期任务区
    completed: [] as TaskEntity[],       // 已完成任务区
    canceled: [] as TaskEntity[],        // 已取消任务区
  };
  
  for (const task of tasks) {
    // 已完成 / 已取消直接进入对应分区
    if (task.status === "已完成") {
      result.completed.push(task);
      continue;
    }
    if (task.status === "已取消") {
      result.canceled.push(task);
      continue;
    }
    
    // 待开始任务，进一步细分
    if (task.status === "待开始") {
      // 今日提醒聚焦区
      if (task.remind_at) {
        const remindDate = task.remind_at.slice(0, 10);
        if (remindDate === today) {
          result.todayReminders.push(task);
        }
      }
      
      // 主分区判断
      const plannedTime = new Date(task.planned_at);
      if (plannedTime > now) {
        result.pending.push(task);
      } else {
        result.overdue.push(task);
      }
    }
  }
  
  return result;
}

// 修改：创建任务服务
export async function createTaskService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: TaskCreatePayload
) {
  // 去重检查
  const duplicateCheck = await checkDuplicateTask(supabase, ownerId, payload);
  if (duplicateCheck.exists) {
    return { status: 409, data: null, error: "存在重复任务", errorCode: "DUPLICATE_TASK" };
  }
  
  // 创建任务
  const taskData = {
    owner_id: ownerId,
    title: payload.title,
    planned_at: payload.plannedAt,
    remind_at: payload.remindAt || null,
    customer_id: payload.customerId || null,
    priority: payload.priority || "中",
    note: payload.note || null,
    status: "待开始" as const,
    source_type: payload.sourceType || "manual",
    source_id: payload.sourceId || null,
  };
  
  const result = await supabase.from("tasks").insert(taskData).select("*").single();
  
  return { status: result.error ? 400 : 201, data: result.data, error: result.error?.message };
}
```

---

## 四、API 接口层改造

### 4.1 修改任务 API 路由

**文件位置**：`src/app/api/tasks/route.ts`

```typescript
// GET /api/tasks - 查询任务列表
export async function GET(request: Request) {
  // 返回按分区组织的数据结构
  const categorized = categorizeTasks(tasks, userTimezone);
  return Response.json({
    data: {
      todayReminders: categorized.todayReminders,
      pending: categorized.pending,
      overdue: categorized.overdue,
      completed: categorized.completed,
      canceled: categorized.canceled,
    }
  });
}

// POST /api/tasks - 创建任务
export async function POST(request: Request) {
  // 使用新的 taskCreateSchema 校验
}

// PATCH /api/tasks - 更新任务（新增，不只是改状态）
export async function PATCH(request: Request) {
  // 支持修改：title, plannedAt, remindAt, priority, note
  // 只允许修改 status = "待开始" 的任务
}

// 新增：状态变更专用接口
// POST /api/tasks/:id/change-status
export async function changeTaskStatus(request: Request, { params }: { params: { id: string } }) {
  // 只允许从 "待开始" 改为 "已完成" 或 "已取消"
  // 自动记录 completed_at 或 canceled_at
}
```

---

## 五、前端页面层改造

### 5.1 任务管理页重构

**文件位置**：`src/components/tasks/task-board.tsx`

```typescript
// 修改：数据结构和展示逻辑
interface TaskBoardData {
  todayReminders: TaskItem[];  // 顶部今日提醒聚焦区
  pending: TaskItem[];         // 待开始任务区
  overdue: TaskItem[];         // 已过期任务区
  completed: TaskItem[];       // 已完成任务区
  canceled: TaskItem[];        // 已取消任务区
}

// 修改：不再简单按 status 分组，而是按服务端计算的分区展示
```

### 5.2 新增/编辑任务页改造

**文件位置**：`src/components/tasks/task-draft-page.tsx`

```typescript
// 新增字段：
// - plannedAt: 日期时间选择器（必填）
// - remindAt: 日期时间选择器（可空）
// - customerId: 客户选择器（可空，支持不关联客户）

// 移除字段：
// - dueDate（被 plannedAt 替代）

// 表单校验：
// - title 必填
// - plannedAt 必填
// - remindAt 可选，但如果有值必须在 plannedAt 之前
```

### 5.3 任务卡片与操作

**文件位置**：`src/components/tasks/task-card.tsx`（如不存在则新建）

```typescript
// 展示信息：
// - 标题
// - 计划执行时间
// - 优先级
// - 客户信息（如有）
// - 提醒标识（如有 remind_at）

// 操作按钮（仅对 "待开始" 任务显示）：
// - 编辑（弹出编辑抽屉）
// - 标记完成
// - 标记取消
// - 删除（可选，第一阶段可不做）
```

### 5.4 日历组件改造

**文件位置**：`src/components/tasks/task-calendar.tsx`

```typescript
// 修改：按 planned_at 分组，不再从字符串提取日期
function getCalendarDateKey(plannedAt: string): string {
  return plannedAt.slice(0, 10); // YYYY-MM-DD
}

// 修改：日历只展示 "待开始" 和 "已过期" 的任务
// 不再被 remind_at 干扰分组
```

### 5.5 今日提醒聚焦区组件

**文件位置**：`src/components/tasks/today-reminders.tsx`（新建）

```typescript
// 顶部固定区域展示
// 展示 todayReminders 列表
// 支持快速操作：标记完成、稍后提醒
```

---

## 六、拜访/活动流程层改造

### 6.1 修改拜访服务

**文件位置**：`src/modules/visits/visit-service.ts`

```typescript
// 修改：不再直接 syncTasksFromSource
// 改为：生成待确认任务草稿

export async function saveVisitService(...) {
  // 1. 保存拜访记录
  const visitResult = await saveVisitRepository(...);
  
  // 2. 提取后续事项
  const followUps = extractFollowUps(visitData.content);
  
  // 3. 不再直接写入 tasks 表
  // 改为：生成待确认草稿，返回给前端
  if (followUps.length > 0) {
    const taskDrafts = followUps.map(fu => ({
      title: fu.title,
      plannedAt: fu.plannedAt,
      customerId: customerResult.data.id,
      sourceType: "visit" as const,
      sourceId: visitResult.data.id,
      // 其他默认值...
    }));
    
    return {
      status: 200,
      data: visitResult.data,
      taskDrafts,  // 前端用这些草稿弹出确认界面
    };
  }
}
```

### 6.2 修改活动服务

**文件位置**：`src/modules/activities/activity-service.ts`

```typescript
// 同理：不再直接 syncTasksFromSource
// 改为：生成待确认任务草稿
```

### 6.3 新增任务草稿确认流程

**文件位置**：`src/modules/tasks/task-draft-confirmation.ts`（新建）

```typescript
// 管理来源于拜访/活动的任务草稿
// - 保存草稿状态
// - 支持中断恢复
// - 用户确认后批量创建任务

export interface TaskDraft {
  id: string;           // 草稿 ID
  sourceType: "visit" | "activity";
  sourceId: string;
  tasks: TaskCreatePayload[];
  createdAt: string;
  confirmedAt: string | null;
}

// 草稿保存、恢复、确认创建接口
```

---

## 七、聊天助手与文案改造

### 7.1 修改助手文案

**涉及文件**：
- `src/modules/chat/action-executor.ts`
- `src/modules/chat/workflow-director.ts`
- 其他聊天相关组件

```typescript
// 修改前文案：
// "已为你保存客户档案并同步生成后续任务"

// 修改后文案：
// "已为你保存拜访记录，识别到 2 项后续待办，请确认后创建任务"
// "已生成待确认任务草稿，你可以修改时间、优先级后确认创建"
```

### 7.2 新增任务草稿确认承接页

**文件位置**：`src/app/(app)/tasks/confirm/page.tsx`（新建）

```typescript
// 从拜访/活动跳转过来的任务草稿确认页
// - 展示待确认任务列表
// - 支持逐项修改
// - 支持批量确认创建
// - 支持暂存草稿（中断恢复）
```

---

## 八、废弃字段清理计划

### 第一阶段（兼容期）

保留以下字段但不再使用：
- `due_date`
- `due_at`
- `description`
- `category`
- `result_note`

代码中标记为 `@deprecated`

### 第二阶段（清理期）

在确认业务稳定后，通过 migration 删除废弃字段。

---

## 九、测试与回归清单

### 9.1 单元测试

- [ ] 任务创建校验规则测试
- [ ] 任务去重逻辑测试
- [ ] 任务分区计算逻辑测试
- [ ] 时间时区处理测试

### 9.2 集成测试

- [ ] 手工创建未来时间任务
- [ ] 手工创建过去时间任务（进入已过期区）
- [ ] 手工创建无客户任务
- [ ] 拜访保存后生成任务草稿
- [ ] 活动保存后生成任务草稿
- [ ] 任务草稿确认创建
- [ ] 任务草稿中断恢复
- [ ] 同标题同时间不同客户允许创建
- [ ] 同来源重复提取任务正确去重
- [ ] 今日提醒聚焦区与主分区同时展示
- [ ] 到点后任务自动从待开始进入已过期分区
- [ ] 标记完成写入 completed_at
- [ ] 标记取消写入 canceled_at
- [ ] 结束任务只读，不支持修改
- [ ] 编辑拜访/活动不自动覆盖已有任务

### 9.3 回归测试

- [ ] 任务管理页整体功能回归
- [ ] 任务日历视图回归
- [ ] 拜访记录保存流程回归
- [ ] 活动记录保存流程回归
- [ ] 手机端体验测试

---

## 十、实施顺序建议

```
Phase 1: 数据库改造
  - 新增字段 migration
  - 数据迁移脚本
  - 索引优化

Phase 2: 类型定义与校验层
  - 修改 TaskStatusValue
  - 修改 TaskEntity 接口
  - 更新校验 schema

Phase 3: 后端服务层
  - 修改仓储层
  - 修改服务层
  - 新增任务分区计算逻辑
  - 改造 API 接口

Phase 4: 前端任务管理页
  - 重构任务看板
  - 新增今日提醒聚焦区
  - 改造新增任务页
  - 新增任务编辑能力
  - 改造日历组件

Phase 5: 拜访/活动联动
  - 改造拜访服务
  - 改造活动服务
  - 新增任务草稿确认流程
  - 新增确认承接页

Phase 6: 文案与助手
  - 修改助手文案
  - 调整聊天承接逻辑

Phase 7: 测试与验收
  - 单元测试
  - 集成测试
  - 回归测试
```

---

## 附录：关键文件清单

### 需要修改的文件

| 文件路径 | 改造内容 |
|----------|----------|
| `supabase/migrations/*.sql` | 新增字段、约束、索引 |
| `src/types/task.ts` | 修改类型定义 |
| `src/types/domain.ts` | 修改展示层模型 |
| `src/lib/validation/task.ts` | 更新校验规则 |
| `src/lib/repositories/task-repository.ts` | 新增/修改仓储方法 |
| `src/modules/tasks/task-service.ts` | 重构服务逻辑 |
| `src/app/api/tasks/route.ts` | 改造 API 接口 |
| `src/components/tasks/task-board.tsx` | 重构任务看板 |
| `src/components/tasks/live-task-board.tsx` | 改造实时任务板 |
| `src/components/tasks/task-calendar.tsx` | 改造日历逻辑 |
| `src/components/tasks/task-draft-page.tsx` | 改造新增任务页 |
| `src/modules/visits/visit-service.ts` | 改造拜访任务生成逻辑 |
| `src/modules/activities/activity-service.ts` | 改造活动任务生成逻辑 |

### 需要新建的文件

| 文件路径 | 用途 |
|----------|------|
| `src/components/tasks/today-reminders.tsx` | 今日提醒聚焦区组件 |
| `src/components/tasks/task-card.tsx` | 任务卡片组件 |
| `src/components/tasks/task-edit-drawer.tsx` | 任务编辑抽屉 |
| `src/modules/tasks/task-draft-confirmation.ts` | 任务草稿确认逻辑 |
| `src/app/(app)/tasks/confirm/page.tsx` | 任务草稿确认页 |

---

> 本改造清单基于《任务管理设计文档 v1.0》制定，实施前请确保设计文档已最终确认。
