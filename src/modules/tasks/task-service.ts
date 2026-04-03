import type { SupabaseClient } from "@supabase/supabase-js";

import { createTasksRepository, listTasksRepository, replaceTasksBySourceRepository, updateTaskStatusRepository } from "@/lib/repositories/task-repository";
import { taskCreateSchema, taskStatusUpdateSchema } from "@/lib/validation/task";
import { resolveCustomerSnapshotService } from "@/modules/customers/customer-service";
import type { TaskEntity, TaskSourceTypeValue, TaskSyncPayload } from "@/types/task";

function toNullableText(value?: string | null) {
  return value && value.trim() ? value.trim() : null;
}

function priorityFromText(text: string): "高" | "中" | "低" {
  if (/今天|立即|尽快|马上|本周内/.test(text)) {
    return "高";
  }

  if (/本周|周五|周六|下周|安排/.test(text)) {
    return "中";
  }

  return "低";
}

function normalizeTaskEntity(task: TaskEntity): TaskEntity {
  const normalizedDueDate = task.due_date ?? task.due_at?.slice(0, 10) ?? null;
  const today = new Date().toISOString().slice(0, 10);
  const normalizedStatus =
    task.status !== "已完成" && task.status !== "已取消" && normalizedDueDate && normalizedDueDate < today ? "已逾期" : task.status;

  return {
    ...task,
    status: normalizedStatus,
    due_date: normalizedDueDate,
    description: task.description ?? task.note,
    note: task.note ?? task.description,
    due_at: task.due_at ?? (normalizedDueDate ? `${normalizedDueDate}T00:00:00.000Z` : null),
  };
}

function defaultTaskMeta(sourceType: TaskSourceTypeValue) {
  switch (sourceType) {
    case "visit":
      return { description: "来自拜访记录", category: "拜访跟进" };
    case "activity":
    case "activity_event":
      return { description: "来自客户活动", category: "活动回访" };
    case "activity_participant":
      return { description: "来自活动参与客户", category: "活动回访" };
    case "customer":
      return { description: "来自客户档案", category: "客户维护" };
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

export async function listTasksService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listTasksRepository(supabase, ownerId);
  return { status: error ? 400 : 200, data: (data ?? []).map(normalizeTaskEntity), error: error?.message ?? "" };
}

export async function createTasksService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = taskCreateSchema.safeParse(payload);
  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "任务信息不完整" };
  }

  const tasksToCreate: TaskSyncPayload[] = [];

  for (const item of parsed.data.tasks) {
    let customerId = item.customerId ?? null;
    let customerName = toNullableText(item.customerName);
    let customerNickname = toNullableText(item.customerNickname);

    if (item.customerId) {
      const customerResult = await resolveCustomerSnapshotService(supabase, ownerId, {
        customerId: item.customerId,
        name: item.customerName,
        nickName: item.customerNickname,
      });

      if (customerResult.error || !customerResult.data) {
        return { status: 400, data: null, error: customerResult.error?.message ?? "涉及的客户必须先保存在客户基础信息表中" };
      }

      customerId = customerResult.data.id;
      customerName = customerResult.data.name;
      customerNickname = toNullableText(customerResult.data.nickname);
    }

    const sourceMeta = defaultTaskMeta(item.sourceType);
    const description = toNullableText(item.description) ?? sourceMeta.description;
    const category = toNullableText(item.category) ?? sourceMeta.category;
    const dueDate = item.dueDate || null;

    tasksToCreate.push({
      owner_id: ownerId,
      sys_platform: "web",
      source_type: item.sourceType,
      source_id: item.sourceId ?? null,
      title: item.title.trim(),
      status: "待执行",
      priority: item.priority,
      description,
      category,
      customer_id: customerId,
      customer_name: customerName,
      customer_nickname: customerNickname,
      due_date: dueDate,
      remind_at: null,
      completed_at: null,
      result_note: null,
      due_at: dueDate ? `${dueDate}T00:00:00.000Z` : null,
      note: toNullableText(item.note) ?? description,
    });
  }

  const { data, error } = await createTasksRepository(supabase, tasksToCreate);
  return {
    status: error ? 400 : 200,
    data: (data ?? []).map(normalizeTaskEntity),
    error: error?.message ?? "",
  };
}

export async function syncTasksFromSource(
  supabase: SupabaseClient,
  ownerId: string,
  sourceType: TaskSourceTypeValue,
  sourceId: string,
  followUps: string[],
  options?: SyncTasksOptions,
) {
  const normalized = [...new Set(followUps.map((item) => item.trim()).filter(Boolean))];
  const sourceMeta = defaultTaskMeta(sourceType);
  const description = options?.description ?? sourceMeta.description;
  const category = options?.category ?? sourceMeta.category;

  const result = await replaceTasksBySourceRepository(
    supabase,
    ownerId,
    sourceType,
    sourceId,
    normalized.map<TaskSyncPayload>((item) => ({
      owner_id: ownerId,
      sys_platform: "web",
      source_type: sourceType,
      source_id: sourceId,
      title: item,
      status: "待执行",
      priority: priorityFromText(item),
      description,
      category,
      customer_id: options?.customerId ?? null,
      customer_name: options?.customerName ?? null,
      customer_nickname: options?.customerNickname ?? null,
      due_date: options?.dueDate ?? null,
      remind_at: options?.remindAt ?? null,
      completed_at: null,
      result_note: null,
      due_at: null,
      note: description,
    })),
  );

  return { status: result.error ? 400 : 200, error: result.error?.message ?? "" };
}

export async function updateTaskStatusService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = taskStatusUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "任务状态更新信息不正确" };
  }

  const { data, error } = await updateTaskStatusRepository(supabase, ownerId, parsed.data.id, parsed.data.status);
  return { status: error ? 400 : 200, data: data ? normalizeTaskEntity(data as TaskEntity) : null, error: error?.message ?? "" };
}

