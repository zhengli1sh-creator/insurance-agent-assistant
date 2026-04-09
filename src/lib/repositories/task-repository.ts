/**
 * 任务数据仓储层
 * 基于任务管理设计文档 v1.0
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  TaskEntity,
  TaskSourceTypeValue,
  TaskStatusValue,
  TaskCreatePayload,
  TaskUpdatePayload,
} from "@/types/task";

// ============================================
// 查询操作
// ============================================

/**
 * 查询用户的所有任务
 * 按 planned_at 排序
 */
export async function listTasksRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .order("planned_at", { ascending: true })
    .returns<TaskEntity[]>();
}

/**
 * 按状态查询任务
 */
export async function listTasksByStatusRepository(
  supabase: SupabaseClient,
  ownerId: string,
  status: TaskStatusValue,
) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", status)
    .order("planned_at", { ascending: true })
    .returns<TaskEntity[]>();
}

/**
 * 查询单个任务
 */
export async function getTaskByIdRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .single();
}

/**
 * 查询今日提醒任务
 * 条件：remind_at 在今天内，且 status = 待开始
 */
export async function listTodayReminderTasksRepository(
  supabase: SupabaseClient,
  ownerId: string,
  todayStart: string,
  todayEnd: string,
) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("status", "待开始")
    .gte("remind_at", todayStart)
    .lte("remind_at", todayEnd)
    .order("remind_at", { ascending: true })
    .returns<TaskEntity[]>();
}

// ============================================
// 创建操作
// ============================================

/**
 * 创建单个任务
 */
export async function createTaskRepository(
  supabase: SupabaseClient,
  ownerId: string,
  payload: TaskCreatePayload,
) {
  const taskData = {
    owner_id: ownerId,
    title: payload.title,
    planned_at: payload.plannedAt,
    remind_at: payload.remindAt || null,
    priority: payload.priority || "中",
    note: payload.note || null,
    customer_id: payload.customerId || null,
    source_type: payload.sourceType || "manual",
    source_id: payload.sourceId || null,
    status: "待开始" as const,
  };

  return supabase
    .from("tasks")
    .insert(taskData)
    .select("*")
    .single();
}

/**
 * 批量创建任务
 */
export async function batchCreateTasksRepository(
  supabase: SupabaseClient,
  ownerId: string,
  payloads: TaskCreatePayload[],
) {
  const tasksData = payloads.map((payload) => ({
    owner_id: ownerId,
    title: payload.title,
    planned_at: payload.plannedAt,
    remind_at: payload.remindAt || null,
    priority: payload.priority || "中",
    note: payload.note || null,
    customer_id: payload.customerId || null,
    source_type: payload.sourceType || "manual",
    source_id: payload.sourceId || null,
    status: "待开始" as const,
  }));

  return supabase
    .from("tasks")
    .insert(tasksData)
    .select("*")
    .returns<TaskEntity[]>();
}

// ============================================
// 更新操作
// ============================================

/**
 * 更新任务（仅允许修改特定字段）
 * 只允许修改 status = "待开始" 的任务
 */
export async function updateTaskRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
  payload: Omit<TaskUpdatePayload, "id">,
) {

  const updateData: Record<string, unknown> = {};

  if (payload.title !== undefined) updateData.title = payload.title;
  if (payload.plannedAt !== undefined) updateData.planned_at = payload.plannedAt;
  if (payload.remindAt !== undefined) updateData.remind_at = payload.remindAt;
  if (payload.priority !== undefined) updateData.priority = payload.priority;
  if (payload.note !== undefined) updateData.note = payload.note;

  return supabase
    .from("tasks")
    .update(updateData)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .eq("status", "待开始") // 只允许修改待开始的任务
    .select("*")
    .single();
}

/**
 * 变更任务状态
 * 只允许从 "待开始" 改为 "已完成" 或 "已取消"
 * 自动记录 completed_at 或 canceled_at
 */
export async function changeTaskStatusRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
  status: "已完成" | "已取消",
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
    .eq("status", "待开始") // 只能从待开始变更
    .select("*")
    .single();
}

// ============================================
// 去重检查
// ============================================

/**
 * 检查手工任务是否重复
 * 去重规则：owner_id + title + planned_at + coalesce(customer_id, zero_uuid)
 */
export async function checkManualTaskDuplicateRepository(
  supabase: SupabaseClient,
  ownerId: string,
  title: string,
  plannedAt: string,
  customerId: string | null | undefined,
) {
  const query = supabase
    .from("tasks")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("title", title)
    .eq("planned_at", plannedAt)
    .eq("source_type", "manual");

  if (customerId) {
    query.eq("customer_id", customerId);
  } else {
    query.is("customer_id", null);
  }

  const result = await query.single();

  return {
    exists: !result.error && result.data !== null,
    existingId: result.data?.id as string | undefined,
  };
}

/**
 * 检查来源任务是否重复
 * 去重规则：owner_id + source_type + coalesce(source_id, zero_uuid) + title + coalesce(customer_id, zero_uuid)
 */
export async function checkSourceTaskDuplicateRepository(
  supabase: SupabaseClient,
  ownerId: string,
  sourceType: "visit" | "activity",
  sourceId: string | null | undefined,
  title: string,
  customerId: string | null | undefined,
) {
  const query = supabase
    .from("tasks")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("source_type", sourceType)
    .eq("title", title);

  if (sourceId) {
    query.eq("source_id", sourceId);
  } else {
    query.is("source_id", null);
  }

  if (customerId) {
    query.eq("customer_id", customerId);
  } else {
    query.is("customer_id", null);
  }

  const result = await query.single();

  return {
    exists: !result.error && result.data !== null,
    existingId: result.data?.id as string | undefined,
  };
}

// ============================================
// 废弃方法（保留兼容）
// ============================================

import type { TaskSyncPayload } from "@/types/task";

function sourceTypesForCleanup(sourceType: TaskSourceTypeValue) {
  if (sourceType === "activity") {
    return ["activity", "activity_event", "activity_participant"] as TaskSourceTypeValue[];
  }
  return [sourceType];
}

/** @deprecated 使用 batchCreateTasksRepository 替代 */
export async function createTasksRepository(supabase: SupabaseClient, payload: TaskSyncPayload[]) {
  return supabase.from("tasks").insert(payload).select("*").returns<TaskEntity[]>();
}

/** @deprecated 不再支持自动替换，改为生成草稿后用户确认 */
export async function replaceTasksBySourceRepository(
  supabase: SupabaseClient,
  ownerId: string,
  sourceType: TaskSourceTypeValue,
  sourceId: string,
  tasks: TaskSyncPayload[],
) {
  const cleanupSourceTypes = sourceTypesForCleanup(sourceType);
  let deleteQuery = supabase.from("tasks").delete().eq("owner_id", ownerId).eq("source_id", sourceId);

  deleteQuery =
    cleanupSourceTypes.length === 1
      ? deleteQuery.eq("source_type", cleanupSourceTypes[0])
      : deleteQuery.in("source_type", cleanupSourceTypes);

  const deleteResult = await deleteQuery;

  if (deleteResult.error || tasks.length === 0) {
    return deleteResult;
  }

  return supabase.from("tasks").insert(tasks).select("*").returns<TaskEntity[]>();
}

/** @deprecated 使用 changeTaskStatusRepository 替代 */
export async function updateTaskStatusRepository(
  supabase: SupabaseClient,
  ownerId: string,
  id: string,
  status: TaskStatusValue,
) {
  return supabase
    .from("tasks")
    .update({
      status,
      completed_at: status === "已完成" ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*")
    .single();
}
