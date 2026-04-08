import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  clearActivityParticipantsRepository,
  createActivityRepository,
  deleteActivityRepository,
  fetchActivityRepository,
  insertActivityParticipantsRepository,
  listActivitiesRepository,
  updateActivityRepository,
} from "@/lib/repositories/activity-repository";
import { activityCreateSchema, activityUpdateSchema } from "@/lib/validation/activity";
import { ensureCustomerSnapshotsMatchService } from "@/modules/customers/customer-service";
import { generateTaskDraftsFromFollowUps, checkSourceTaskDuplicateRepository } from "@/modules/tasks/task-service";
import type { ActivityParticipant } from "@/types/activity";
import type { CustomerSnapshot } from "@/types/customer";
import type { TaskDraftItem } from "@/types/task";

function toNullableText(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function pickDefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

type NormalizedActivityParticipant = {
  customerId: string;
  name: string;
  nickName: string;
  followWork: string;
};

function splitFollowWork(value?: string) {
  return (value ?? "")
    .split(/\r?\n|；|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectParticipantTodos(participants: Array<{ followWork?: string }>) {
  return [...new Set(participants.flatMap((item) => splitFollowWork(item.followWork)))];
}

function toActivityTimestamp(dateActivity: string) {
  return `${dateActivity}T00:00:00.000Z`;
}

function buildLegacyActivityFields(
  activity: {
    nameActivity: string;
    dateActivity: string;
    customerProfile?: string;
    effectProfile?: string;
    lessonsLearned?: string;
  },
  followUps: string[],
) {
  return {
    title: activity.nameActivity,
    theme: toNullableText(activity.customerProfile),
    summary:
      activity.effectProfile?.trim() || activity.customerProfile?.trim() || activity.lessonsLearned?.trim() || activity.nameActivity,
    happened_at: toActivityTimestamp(activity.dateActivity),
    tone: toNullableText(activity.lessonsLearned),
    follow_ups: followUps,
  };
}

function activityErrorMessage(error: PostgrestError | null) {
  if (!error) {
    return "";
  }

  if (error.code === "23505") {
    return "活动名称 + 活动日期 已存在，或同一活动下“客户姓名 + 客户昵称”重复，请调整后再保存";
  }

  return error.message;
}

function activityErrorStatus(error: PostgrestError | null) {
  return error?.code === "23505" ? 409 : 400;
}

function mergeParticipantsWithSnapshots(
  participants: NormalizedActivityParticipant[],
  snapshots: CustomerSnapshot[],
) {
  return participants.map((item, index) => ({
    customerId: item.customerId,
    name: snapshots[index]?.name ?? item.name,
    nickName: snapshots[index]?.nickname ?? "",
    followWork: item.followWork,
  }));
}

export async function listActivitiesService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listActivitiesRepository(supabase, ownerId);
  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

export async function createActivityService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = activityCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "活动信息不完整" };
  }

  const normalizedParticipants: NormalizedActivityParticipant[] = parsed.data.participants.map((item) => ({
    customerId: item.customerId,
    name: item.name.trim(),
    nickName: item.nickName?.trim() ?? "",
    followWork: item.followWork?.trim() ?? "",
  }));

  const matchedCustomers = await ensureCustomerSnapshotsMatchService(supabase, ownerId, normalizedParticipants);
  if (!matchedCustomers.ok) {
    return { status: 400, data: null, error: matchedCustomers.error };
  }

  const participantsToSave = mergeParticipantsWithSnapshots(normalizedParticipants, matchedCustomers.data);
  const followUps = collectParticipantTodos(participantsToSave);
  const legacyFields = buildLegacyActivityFields(
    {
      nameActivity: parsed.data.nameActivity,
      dateActivity: parsed.data.dateActivity,
      customerProfile: parsed.data.customerProfile,
      effectProfile: parsed.data.effectProfile,
      lessonsLearned: parsed.data.lessonsLearned,
    },
    followUps,
  );

  const activityResult = await createActivityRepository(supabase, {
    owner_id: ownerId,
    sys_platform: "web",
    name_activity: parsed.data.nameActivity,
    date_activity: parsed.data.dateActivity,
    location_activity: toNullableText(parsed.data.locationActivity),
    customer_profile: toNullableText(parsed.data.customerProfile),
    effect_profile: toNullableText(parsed.data.effectProfile),
    lessons_learned: toNullableText(parsed.data.lessonsLearned),
    ...legacyFields,
  });

  if (activityResult.error || !activityResult.data) {
    return {
      status: activityErrorStatus(activityResult.error),
      data: null,
      error: activityErrorMessage(activityResult.error),
    };
  }

  const participantsResult = await insertActivityParticipantsRepository(
    supabase,
    participantsToSave.map((item) => ({
      activity_id: activityResult.data.id,
      customer_id: item.customerId,
      owner_id: ownerId,
      sys_platform: "web",
      name: item.name,
      nick_name: toNullableText(item.nickName),
      follow_work: toNullableText(item.followWork),
    })),
  );

  if (participantsResult.error) {
    await deleteActivityRepository(supabase, activityResult.data.id, ownerId);
    return {
      status: activityErrorStatus(participantsResult.error),
      data: null,
      error: activityErrorMessage(participantsResult.error),
    };
  }

  // 生成任务草稿（不再直接同步到数据库）
  let taskDrafts: TaskDraftItem[] = [];
  if (followUps.length > 0) {
    // 使用第一个参与客户的ID和名称
    const firstParticipant = participantsToSave[0];
    taskDrafts = generateTaskDraftsFromFollowUps(
      followUps,
      "activity",
      activityResult.data.id,
      firstParticipant?.customerId ?? null,
      firstParticipant?.name ?? null,
    );
  }

  const fetched = await fetchActivityRepository(supabase, activityResult.data.id, ownerId);
  return {
    status: fetched.error ? 400 : 200,
    data: {
      activity: fetched.data,
      // 只在有草稿时返回
      ...(taskDrafts.length > 0 && {
        taskDrafts: {
          from: "activity" as const,
          sourceId: activityResult.data.id,
          sourceDate: parsed.data.dateActivity,
          customerId: participantsToSave[0]?.customerId ?? null,
          customerName: participantsToSave[0]?.name ?? null,
          customerNickname: participantsToSave[0]?.nickName ?? null,
          sourceSummary: parsed.data.effectProfile || parsed.data.customerProfile || "",
          drafts: taskDrafts,
        },
      }),
    },
    error: activityErrorMessage(fetched.error),
  };
}

export async function updateActivityService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = activityUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "活动更新信息不正确" };
  }

  const currentResult = await fetchActivityRepository(supabase, parsed.data.id, ownerId);
  if (currentResult.error || !currentResult.data) {
    return { status: 400, data: null, error: currentResult.error?.message ?? "未找到活动记录" };
  }

  const current = currentResult.data;
  const normalizedParticipants: NormalizedActivityParticipant[] =
    parsed.data.participants?.map((item) => ({
      customerId: item.customerId,
      name: item.name.trim(),
      nickName: item.nickName?.trim() ?? "",
      followWork: item.followWork?.trim() ?? "",
    })) ??
    (current.activity_participants ?? []).map((item: ActivityParticipant) => ({
      customerId: item.customer_id,
      name: item.name,
      nickName: item.nick_name ?? "",
      followWork: item.follow_work ?? "",
    }));

  const matchedCustomers = await ensureCustomerSnapshotsMatchService(supabase, ownerId, normalizedParticipants);
  if (!matchedCustomers.ok) {
    return { status: 400, data: null, error: matchedCustomers.error };
  }

  const participantsToSave = mergeParticipantsWithSnapshots(normalizedParticipants, matchedCustomers.data);
  const mergedActivity = {
    nameActivity: parsed.data.nameActivity ?? current.name_activity,
    dateActivity: parsed.data.dateActivity ?? current.date_activity,
    customerProfile: parsed.data.customerProfile ?? current.customer_profile ?? "",
    effectProfile: parsed.data.effectProfile ?? current.effect_profile ?? "",
    lessonsLearned: parsed.data.lessonsLearned ?? current.lessons_learned ?? "",
  };
  const followUps = collectParticipantTodos(participantsToSave);
  const legacyFields = buildLegacyActivityFields(mergedActivity, followUps);

  const activityResult = await updateActivityRepository(
    supabase,
    parsed.data.id,
    ownerId,
    pickDefined({
      name_activity: parsed.data.nameActivity,
      date_activity: parsed.data.dateActivity,
      location_activity:
        parsed.data.locationActivity !== undefined ? toNullableText(parsed.data.locationActivity) : undefined,
      customer_profile:
        parsed.data.customerProfile !== undefined ? toNullableText(parsed.data.customerProfile) : undefined,
      effect_profile: parsed.data.effectProfile !== undefined ? toNullableText(parsed.data.effectProfile) : undefined,
      lessons_learned:
        parsed.data.lessonsLearned !== undefined ? toNullableText(parsed.data.lessonsLearned) : undefined,
      title: legacyFields.title,
      theme: legacyFields.theme,
      summary: legacyFields.summary,
      happened_at: legacyFields.happened_at,
      tone: legacyFields.tone,
      follow_ups: legacyFields.follow_ups,
    }),
  );

  if (activityResult.error) {
    return {
      status: activityErrorStatus(activityResult.error),
      data: null,
      error: activityErrorMessage(activityResult.error),
    };
  }

  if (parsed.data.participants) {
    const clearResult = await clearActivityParticipantsRepository(supabase, parsed.data.id, ownerId);
    if (clearResult.error) {
      return { status: 400, data: null, error: clearResult.error.message };
    }

    const insertResult = await insertActivityParticipantsRepository(
      supabase,
      participantsToSave.map((item) => ({
        activity_id: parsed.data.id,
        customer_id: item.customerId,
        owner_id: ownerId,
        sys_platform: "web",
        name: item.name,
        nick_name: toNullableText(item.nickName),
        follow_work: toNullableText(item.followWork),
      })),
    );

    if (insertResult.error) {
      return {
        status: activityErrorStatus(insertResult.error),
        data: null,
        error: activityErrorMessage(insertResult.error),
      };
    }
  }

  // 编辑活动时，不再静默覆盖已有任务
  // 只返回新增的任务草稿（如果有新的后续事项）
  let taskDrafts: TaskDraftItem[] = [];
  if (followUps.length > 0) {
    // 检查哪些任务是新增的（去重）
    const newFollowUps: string[] = [];
    const firstParticipant = participantsToSave[0];

    for (const followUp of followUps) {
      const duplicate = await checkSourceTaskDuplicateRepository(
        supabase,
        ownerId,
        "activity",
        parsed.data.id,
        followUp,
        firstParticipant?.customerId ?? null,
      );
      if (!duplicate.exists) {
        newFollowUps.push(followUp);
      }
    }

    if (newFollowUps.length > 0) {
      taskDrafts = generateTaskDraftsFromFollowUps(
        newFollowUps,
        "activity",
        parsed.data.id,
        firstParticipant?.customerId ?? null,
        firstParticipant?.name ?? null,
      );
    }
  }

  const fetched = await fetchActivityRepository(supabase, parsed.data.id, ownerId);
  return {
    status: fetched.error ? 400 : 200,
    data: {
      activity: fetched.data,
      // 只在有新增草稿时返回
      ...(taskDrafts.length > 0 && {
        taskDrafts: {
          from: "activity" as const,
          sourceId: parsed.data.id,
          sourceDate: mergedActivity.dateActivity,
          customerId: participantsToSave[0]?.customerId ?? null,
          customerName: participantsToSave[0]?.name ?? null,
          customerNickname: participantsToSave[0]?.nickName ?? null,
          sourceSummary: mergedActivity.effectProfile || mergedActivity.customerProfile || "",
          drafts: taskDrafts,
        },
      }),
    },
    error: activityErrorMessage(fetched.error),
  };
}

export async function deleteActivityService(supabase: SupabaseClient, ownerId: string, id: string) {
  if (!id) {
    return { status: 400, data: null, error: "缺少活动记录标识" };
  }

  // 删除活动记录时，不再自动删除关联的任务
  // 任务一旦创建就成为独立的经营事项
  const { error } = await deleteActivityRepository(supabase, id, ownerId);
  return { status: error ? 400 : 200, data: { id }, error: error?.message ?? "" };
}

