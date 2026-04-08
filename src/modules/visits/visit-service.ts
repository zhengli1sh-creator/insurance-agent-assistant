import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import { createVisitRepository, deleteVisitRepository, listVisitsByCustomerRepository, listVisitsRepository, updateVisitRepository } from "@/lib/repositories/visit-repository";
import { visitCreateSchema, visitUpdateSchema } from "@/lib/validation/visit";
import { resolveCustomerSnapshotService } from "@/modules/customers/customer-service";
import { generateTaskDraftsFromFollowUps, checkSourceTaskDuplicateRepository } from "@/modules/tasks/task-service";
import type { TaskDraftItem } from "@/types/task";

function toNullableText(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function buildVisitTitle(name: string, timeVisit: string) {
  return `${name}｜${timeVisit} 拜访记录`;
}

function buildVisitTimestamp(timeVisit?: string, happenedAt?: string) {
  if (happenedAt && happenedAt.trim()) {
    return happenedAt.trim();
  }

  return `${timeVisit}T00:00:00.000Z`;
}

function normalizeFollowUps(followWork?: string, followUps?: string[]) {
  if (followUps && followUps.length > 0) {
    return followUps.map((item) => item.trim()).filter(Boolean);
  }

  return (followWork ?? "")
    .split(/[\n；;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function visitErrorMessage(error: PostgrestError | null) {
  if (!error) {
    return "";
  }

  if (error.code === "23505") {
    return "客户姓名 + 拜访日期 已存在，请调整后再保存";
  }

  return error.message;
}

function visitErrorCode(error: PostgrestError | null) {
  if (error?.code === "23505") {
    return "VISIT_DUPLICATE";
  }

  return undefined;
}

function visitErrorStatus(error: PostgrestError | null) {
  return error?.code === "23505" ? 409 : 400;
}

export async function listVisitsService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listVisitsRepository(supabase, ownerId);
  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

export async function listVisitsByCustomerService(supabase: SupabaseClient, ownerId: string, customerId: string) {
  const { data, error } = await listVisitsByCustomerRepository(supabase, ownerId, customerId);
  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

export async function createVisitService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = visitCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      data: null,
      error: parsed.error.issues[0]?.message ?? "拜访记录信息不完整",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const customerResult = await resolveCustomerSnapshotService(supabase, ownerId, {
    customerId: parsed.data.customerId,
    name: parsed.data.name,
    nickName: parsed.data.nickName,
  });
  if (customerResult.error || !customerResult.data) {
    return {
      status: 400,
      data: null,
      error: customerResult.error?.message ?? "涉及的客户必须先保存在客户基础信息表中",
      errorCode: customerResult.error?.code,
    };
  }

  const followUps = normalizeFollowUps(parsed.data.followWork, parsed.data.followUps);
  const visitName = customerResult.data.name;
  const visitNickName = customerResult.data.nickname ?? "";

  const { data, error } = await createVisitRepository(supabase, {
    owner_id: ownerId,
    customer_id: customerResult.data.id,
    sys_platform: "web",
    name: visitName,
    time_visit: parsed.data.timeVisit,
    location: toNullableText(parsed.data.location),
    core_pain: toNullableText(parsed.data.corePain),
    brief_content: toNullableText(parsed.data.briefContent),
    follow_work: toNullableText(parsed.data.followWork),
    method_communicate: toNullableText(parsed.data.methodCommunicate),
    nick_name: toNullableText(visitNickName),
    title: parsed.data.title || buildVisitTitle(visitName, parsed.data.timeVisit),
    summary: parsed.data.briefContent || parsed.data.summary || "待补充谈话摘要",
    happened_at: buildVisitTimestamp(parsed.data.timeVisit, parsed.data.happenedAt),
    tone: toNullableText(parsed.data.tone),
    follow_ups: followUps,
  });

  if (error || !data) {
    return {
      status: visitErrorStatus(error),
      data: null,
      error: visitErrorMessage(error),
      errorCode: visitErrorCode(error),
    };
  }

  // 如果跳过任务同步或没有后续事项，直接返回
  if (parsed.data.skipTaskSync || followUps.length === 0) {
    return { status: 200, data, error: "", errorCode: undefined };
  }

  // 生成任务草稿（不再直接同步到数据库）
  const taskDrafts = generateTaskDraftsFromFollowUps(
    followUps,
    "visit",
    data.id,
    customerResult.data.id,
    visitName,
  );

  // 返回拜访记录数据和任务草稿，前端负责引导用户确认
  return {
    status: 200,
    data: {
      visit: data,
      taskDrafts: {
        from: "visit" as const,
        sourceId: data.id,
        sourceDate: parsed.data.timeVisit,
        customerId: customerResult.data.id,
        customerName: visitName,
        customerNickname: visitNickName,
        sourceSummary: parsed.data.briefContent || "",
        drafts: taskDrafts,
      },
    },
    error: "",
    errorCode: undefined,
  };
}


export async function updateVisitService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = visitUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: 400,
      data: null,
      error: parsed.error.issues[0]?.message ?? "拜访记录更新信息不正确",
      errorCode: "VALIDATION_ERROR",
    };
  }

  const fields = parsed.data;
  const customerResult = await resolveCustomerSnapshotService(supabase, ownerId, {
    customerId: fields.customerId,
    name: fields.name,
    nickName: fields.nickName,
  });
  if (customerResult.error || !customerResult.data) {
    return {
      status: 400,
      data: null,
      error: customerResult.error?.message ?? "涉及的客户必须先保存在客户基础信息表中",
      errorCode: customerResult.error?.code,
    };
  }

  const visitName = customerResult.data.name;
  const visitNickName = customerResult.data.nickname ?? "";
  const followUps = normalizeFollowUps(fields.followWork, fields.followUps);
  const timeVisit = fields.timeVisit || new Date().toISOString().slice(0, 10);

  const { data, error } = await updateVisitRepository(supabase, fields.id, ownerId, {
    customer_id: customerResult.data.id,
    name: visitName,
    time_visit: timeVisit,
    location: fields.location !== undefined ? toNullableText(fields.location) : undefined,
    core_pain: fields.corePain !== undefined ? toNullableText(fields.corePain) : undefined,
    brief_content: fields.briefContent !== undefined ? toNullableText(fields.briefContent) : undefined,
    follow_work: fields.followWork !== undefined ? toNullableText(fields.followWork) : undefined,
    method_communicate: fields.methodCommunicate !== undefined ? toNullableText(fields.methodCommunicate) : undefined,
    nick_name: toNullableText(visitNickName),
    title: fields.title || buildVisitTitle(visitName, timeVisit),
    summary: fields.briefContent || fields.summary || "待补充谈话摘要",
    happened_at: buildVisitTimestamp(timeVisit, fields.happenedAt),
    tone: toNullableText(fields.tone),
    follow_ups: followUps,
  });

  if (error || !data) {
    return {
      status: visitErrorStatus(error),
      data: null,
      error: visitErrorMessage(error),
      errorCode: visitErrorCode(error),
    };
  }

  // 编辑拜访时，不再静默覆盖已有任务
  // 只返回新增的任务草稿（如果有新的后续事项）
  let taskDrafts: TaskDraftItem[] = [];
  if (followUps.length > 0) {
    // 检查哪些任务是新增的（去重）
    const newFollowUps: string[] = [];
    for (const followUp of followUps) {
      const duplicate = await checkSourceTaskDuplicateRepository(
        supabase,
        ownerId,
        "visit",
        fields.id,
        followUp,
        customerResult.data.id,
      );
      if (!duplicate.exists) {
        newFollowUps.push(followUp);
      }
    }

    if (newFollowUps.length > 0) {
      taskDrafts = generateTaskDraftsFromFollowUps(
        newFollowUps,
        "visit",
        fields.id,
        customerResult.data.id,
        visitName,
      );
    }
  }

  return {
    status: 200,
    data: {
      visit: data,
      // 只在有新增草稿时返回 taskDrafts
      ...(taskDrafts.length > 0 && {
        taskDrafts: {
          from: "visit" as const,
          sourceId: fields.id,
          sourceDate: timeVisit,
          customerId: customerResult.data.id,
          customerName: visitName,
          customerNickname: visitNickName,
          sourceSummary: fields.briefContent || "",
          drafts: taskDrafts,
        },
      }),
    },
    error: "",
    errorCode: undefined,
  };
}

export async function deleteVisitService(supabase: SupabaseClient, ownerId: string, id: string) {
  if (!id) {
    return { status: 400, data: null, error: "缺少拜访记录标识", errorCode: "VALIDATION_ERROR" };
  }

  // 删除拜访记录时，不再自动删除关联的任务
  // 任务一旦创建就成为独立的经营事项
  const { error } = await deleteVisitRepository(supabase, id, ownerId);
  return { status: error ? 400 : 200, data: { id }, error: error?.message ?? "", errorCode: error ? visitErrorCode(error) : undefined };
}
