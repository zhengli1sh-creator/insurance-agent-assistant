/**
 * 任务服务层
 * 基于任务管理设计文档 v1.0
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  changeTaskStatusRepository,
  checkManualTaskDuplicateRepository,
  checkSourceTaskDuplicateRepository,
  createTaskRepository,
  getTaskByIdRepository,
  listTasksRepository,
  updateTaskRepository,
  batchCreateTasksRepository,
  listTodayReminderTasksRepository,
} from "@/lib/repositories/task-repository";
import {
  taskCreateSchema,
  taskStatusChangeSchema,
  taskUpdateSchema,
} from "@/lib/validation/task";
import type {
  TaskCategorizedResult,
  TaskCreatePayload,
  TaskDraftItem,
  TaskEntity,
  TaskStatusValue,
  TaskUpdatePayload,
} from "@/types/task";

// ============================================
// 任务分区计算
// ============================================

/**
 * 将任务按展示分区分类
 * @param tasks 任务列表
 * @param userTimezone 用户时区（如 'Asia/Shanghai'）
 * @returns 分类后的任务
 */
export function categorizeTasks(
  tasks: TaskEntity[],
  userTimezone: string = "Asia/Shanghai",
): TaskCategorizedResult {
  const now = new Date();
  const today = new Date();

  // 获取今天的起始和结束时间（按用户时区）
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const result: TaskCategorizedResult = {
    todayReminders: [],
    pending: [],
    overdue: [],
    completed: [],
    canceled: [],
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
      // 今日提醒聚焦区（提醒时间在今天内）
      if (task.remind_at) {
        const remindTime = new Date(task.remind_at);
        if (remindTime >= new Date(todayStart) && remindTime <= new Date(todayEnd)) {
          result.todayReminders.push(task);
        }
      }

      // 主分区判断（按 planned_at 与当前时间比较）
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

// ============================================
// 查询服务
// ============================================

/**
 * 查询用户的所有任务（已分区）
 */
export async function listTasksService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listTasksRepository(supabase, ownerId);

  if (error) {
    return { status: 400, data: null, error: error.message };
  }

  const categorized = categorizeTasks(data ?? []);

  return {
    status: 200,
    data: categorized,
    error: "",
  };
}

/**
 * 查询单个任务
 */
export async function getTaskService(supabase: SupabaseClient, ownerId: string, taskId: string) {
  const { data, error } = await getTaskByIdRepository(supabase, ownerId, taskId);

  if (error) {
    return { status: 400, data: null, error: error.message };
  }

  return {
    status: 200,
    data,
    error: "",
  };
}

/**
 * 查询今日提醒任务
 */
export async function listTodayRemindersService(supabase: SupabaseClient, ownerId: string) {
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const { data, error } = await listTodayReminderTasksRepository(
    supabase,
    ownerId,
    todayStart,
    todayEnd,
  );

  if (error) {
    return { status: 400, data: null, error: error.message };
  }

  return {
    status: 200,
    data: data ?? [],
    error: "",
  };
}

// ============================================
// 创建服务
// ============================================

/**
 * 创建单个任务
 */
export async function createTaskService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: unknown,
) {
  const parsed = taskCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      data: null,
      error: parsed.error.issues[0]?.message ?? "任务信息不完整",
    };
  }

  const taskData: TaskCreatePayload = parsed.data;

  // 去重检查
  if (taskData.sourceType === "manual") {
    const duplicate = await checkManualTaskDuplicateRepository(
      supabase,
      ownerId,
      taskData.title,
      taskData.plannedAt,
      taskData.customerId,
    );

    if (duplicate.exists) {
      return {
        status: 409,
        data: null,
        error: "存在重复任务",
        errorCode: "DUPLICATE_TASK",
      };
    }
  } else {
    const duplicate = await checkSourceTaskDuplicateRepository(
      supabase,
      ownerId,
      taskData.sourceType,
      taskData.sourceId,
      taskData.title,
      taskData.customerId,
    );

    if (duplicate.exists) {
      return {
        status: 409,
        data: null,
        error: "该来源已存在相同任务",
        errorCode: "DUPLICATE_SOURCE_TASK",
      };
    }
  }

  const { data, error } = await createTaskRepository(supabase, ownerId, taskData);

  return {
    status: error ? 400 : 201,
    data,
    error: error?.message ?? "",
  };
}

/**
 * 批量创建任务（用于确认任务草稿）
 */
export async function batchCreateTasksService(
  supabase: SupabaseClient,
  ownerId: string,
  payloads: TaskCreatePayload[],
) {
  // 逐个检查去重
  for (const taskData of payloads) {
    if (taskData.sourceType === "manual") {
      const duplicate = await checkManualTaskDuplicateRepository(
        supabase,
        ownerId,
        taskData.title,
        taskData.plannedAt,
        taskData.customerId,
      );

      if (duplicate.exists) {
        return {
          status: 409,
          data: null,
          error: `任务 "${taskData.title}" 已存在`,
          errorCode: "DUPLICATE_TASK",
        };
      }
    } else {
      const duplicate = await checkSourceTaskDuplicateRepository(
        supabase,
        ownerId,
        taskData.sourceType,
        taskData.sourceId,
        taskData.title,
        taskData.customerId,
      );

      if (duplicate.exists) {
        return {
          status: 409,
          data: null,
          error: `该来源任务 "${taskData.title}" 已存在`,
          errorCode: "DUPLICATE_SOURCE_TASK",
        };
      }
    }
  }

  const { data, error } = await batchCreateTasksRepository(supabase, ownerId, payloads);

  return {
    status: error ? 400 : 201,
    data: data ?? [],
    error: error?.message ?? "",
  };
}

// ============================================
// 更新服务
// ============================================

/**
 * 更新任务（仅允许修改待开始状态的任务）
 */
export async function updateTaskService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: unknown,
) {
  const parsed = taskUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      data: null,
      error: parsed.error.issues[0]?.message ?? "任务更新信息不正确",
    };
  }

  const { id, ...updates } = parsed.data;

  // 如果要修改 planned_at，需要去重检查
  if (updates.plannedAt) {
    const { data: existingTask } = await getTaskByIdRepository(supabase, ownerId, id);

    if (existingTask) {
      const duplicate = await checkManualTaskDuplicateRepository(
        supabase,
        ownerId,
        updates.title ?? existingTask.title,
        updates.plannedAt,
        existingTask.customer_id,
      );

      if (duplicate.exists && duplicate.existingId !== id) {
        return {
          status: 409,
          data: null,
          error: "修改后将与现有任务重复",
          errorCode: "DUPLICATE_TASK",
        };
      }
    }
  }

  const { data, error } = await updateTaskRepository(supabase, ownerId, id, updates);

  return {
    status: error ? 400 : 200,
    data,
    error: error?.message ?? "",
  };
}

/**
 * 变更任务状态（完成/取消）
 */
export async function changeTaskStatusService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: unknown,
) {
  const parsed = taskStatusChangeSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      data: null,
      error: parsed.error.issues[0]?.message ?? "任务状态变更信息不正确",
    };
  }

  const { id, status } = parsed.data;

  const { data, error } = await changeTaskStatusRepository(supabase, ownerId, id, status);

  return {
    status: error ? 400 : 200,
    data,
    error: error?.message ?? "",
  };
}

// ============================================
// 任务草稿处理（从拜访/活动来源）
// ============================================

/**
 * 从后续事项文本中提取优先级
 */
function priorityFromText(text: string): "高" | "中" | "低" {
  if (/今天|立即|尽快|马上|本周内/.test(text)) {
    return "高";
  }

  if (/本周|周五|周六|下周|安排/.test(text)) {
    return "中";
  }

  return "低";
}

/**
 * 从后续事项生成任务草稿
 * @param followUps 后续事项文本列表
 * @param sourceType 来源类型
 * @param sourceId 来源记录 ID
 * @param customerId 关联客户 ID
 * @param customerName 客户姓名
 * @returns 任务草稿列表
 */
export function generateTaskDraftsFromFollowUps(
  followUps: string[],
  sourceType: "visit" | "activity",
  sourceId: string,
  customerId: string | null,
  customerName: string | null,
): TaskDraftItem[] {
  const normalized = [...new Set(followUps.map((item) => item.trim()).filter(Boolean))];

  return normalized.map((item, index) => ({
    id: `draft-${Date.now()}-${index}`,
    title: item,
    priority: priorityFromText(item),
    plannedAt: new Date().toISOString(), // 默认今天，用户可修改
    remindAt: null,
    note: null,
    customerId,
    customerName,
  }));
}

// ============================================
// 废弃方法（保留兼容）
// ============================================

import {
  createTasksRepository,
  replaceTasksBySourceRepository,
  updateTaskStatusRepository,
} from "@/lib/repositories/task-repository";
import { taskStatusUpdateSchema } from "@/lib/validation/task";
import { resolveCustomerSnapshotService } from "@/modules/customers/customer-service";
import type { TaskSourceTypeValue, TaskSyncPayload } from "@/types/task";

function toNullableText(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

function defaultTaskMeta(sourceType: TaskSourceTypeValue) {
  switch (sourceType) {
    case "visit":
      return { description: "来自拜访记录", category: "拜访跟进" };
    case "activity":
      return { description: "来自客户活动", category: "活动回访" };
    case "manual":
    default:
      return { description: "手工新增提醒", category: "手工提醒" };
  }
}

type SyncTasksOptions = {
  customerId?: string;
  customerName?: string;
  customerNickname?: string;
  description?: string;
  category?: string;
  dueDate?: string | null;
  remindAt?: string | null;
};

/** @deprecated 使用 listTasksService 替代 */
export async function oldListTasksService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listTasksRepository(supabase, ownerId);

  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

/** @deprecated 使用 createTaskService / batchCreateTasksService 替代 */
export async function createTasksService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: unknown,
) {
  // 旧实现，需要适配新 schema
  return { status: 400, data: null, error: "请使用新的创建接口" };
}

/** @deprecated 不再支持自动替换，改为生成草稿后用户确认 */
export async function syncTasksFromSource(
  supabase: SupabaseClient,
  ownerId: string,
  sourceType: TaskSourceTypeValue,
  sourceId: string,
  followUps: string[],
  options?: SyncTasksOptions,
) {
  // 不再直接同步，改为返回草稿
  const drafts = generateTaskDraftsFromFollowUps(
    followUps,
    sourceType as "visit" | "activity",
    sourceId,
    options?.customerId ?? null,
    options?.customerName ?? null,
  );

  return {
    status: 200,
    data: {
      drafts,
      sourceType,
      sourceId,
    },
    error: "",
  };
}

/** @deprecated 使用 changeTaskStatusService 替代 */
export async function updateTaskStatusService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: unknown,
) {
  const parsed = taskStatusUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "任务状态更新信息不正确" };
  }

  const { data, error } = await updateTaskStatusRepository(supabase, ownerId, parsed.data.id, parsed.data.status as TaskStatusValue);
  return { status: error ? 400 : 200, data, error: error?.message ?? "" };
}
