import type { PostgrestError, SupabaseClient } from "@supabase/supabase-js";

import {
  countCustomersByIdsRepository,
  createCustomerRepository,
  deleteCustomerRepository,
  findCustomerSnapshotsByNameRepository,
  findCustomerSnapshotsByNicknameRepository,
  listCustomerSnapshotsByIdsRepository,
  listCustomersRepository,
  updateCustomerRepository,
} from "@/lib/repositories/customer-repository";

import { customerCreateSchema, customerUpdateSchema } from "@/lib/validation/customer";
import type { CustomerSnapshot } from "@/types/customer";

export type CustomerResolutionErrorCode =
  | "CUSTOMER_IDENTIFIER_MISSING"
  | "CUSTOMER_NOT_FOUND"
  | "CUSTOMER_MISMATCH"
  | "CUSTOMER_AMBIGUOUS"
  | "CUSTOMER_LOOKUP_FAILED";

function toNullableText(value?: string) {
  return value && value.trim() ? value.trim() : null;
}

function pickDefined<T extends Record<string, unknown>>(payload: T) {
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined)) as Partial<T>;
}

function normalizeOptionalText(value?: string | null) {
  return value && value.trim() ? value.trim() : "";
}

function customerErrorMessage(error: PostgrestError | null) {
  if (!error) {
    return "";
  }

  if (error.code === "23505") {
    return "客户姓名 + 客户昵称 已存在，请调整后再保存";
  }

  return error.message;
}

function customerErrorStatus(error: PostgrestError | null) {
  return error?.code === "23505" ? 409 : 400;
}

function customerResolutionError(message: string, code: CustomerResolutionErrorCode) {
  return { message, code };
}

export async function listCustomersService(supabase: SupabaseClient, ownerId: string, search = "") {
  const { data, error } = await listCustomersRepository(supabase, ownerId, search);
  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

export async function createCustomerService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = customerCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "客户信息不完整" };
  }

  const { data, error } = await createCustomerRepository(supabase, {
    owner_id: ownerId,
    sys_platform: "web",
    name: parsed.data.name,
    age: toNullableText(parsed.data.age),
    sex: toNullableText(parsed.data.sex),
    profession: toNullableText(parsed.data.profession),
    family_profile: toNullableText(parsed.data.familyProfile),
    wealth_profile: toNullableText(parsed.data.wealthProfile),
    core_interesting: toNullableText(parsed.data.coreInteresting),
    prefer_communicate: toNullableText(parsed.data.preferCommunicate),
    source: toNullableText(parsed.data.source),
    nickname: toNullableText(parsed.data.nickname),
    recent_money: toNullableText(parsed.data.recentMoney),
    remark: toNullableText(parsed.data.remark),
  });


  return {
    status: error ? customerErrorStatus(error) : 200,
    data,
    error: customerErrorMessage(error),
  };
}

export async function updateCustomerService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = customerUpdateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "客户更新信息不正确" };
  }

  const fields = parsed.data;
  const updates = pickDefined({
    name: fields.name,
    age: fields.age !== undefined ? toNullableText(fields.age) : undefined,
    sex: fields.sex !== undefined ? toNullableText(fields.sex) : undefined,
    profession: fields.profession !== undefined ? toNullableText(fields.profession) : undefined,
    family_profile: fields.familyProfile !== undefined ? toNullableText(fields.familyProfile) : undefined,
    wealth_profile: fields.wealthProfile !== undefined ? toNullableText(fields.wealthProfile) : undefined,
    core_interesting: fields.coreInteresting !== undefined ? toNullableText(fields.coreInteresting) : undefined,
    prefer_communicate: fields.preferCommunicate !== undefined ? toNullableText(fields.preferCommunicate) : undefined,
    source: fields.source !== undefined ? toNullableText(fields.source) : undefined,
    nickname: fields.nickname !== undefined ? toNullableText(fields.nickname) : undefined,
    recent_money: fields.recentMoney !== undefined ? toNullableText(fields.recentMoney) : undefined,
    remark: fields.remark !== undefined ? toNullableText(fields.remark) : undefined,
  });


  const { data, error } = await updateCustomerRepository(supabase, fields.id, ownerId, updates);
  return {
    status: error ? customerErrorStatus(error) : 200,
    data,
    error: customerErrorMessage(error),
  };
}

export async function deleteCustomerService(supabase: SupabaseClient, ownerId: string, id: string) {
  if (!id) {
    return { status: 400, data: null, error: "缺少客户标识" };
  }

  const { error } = await deleteCustomerRepository(supabase, id, ownerId);
  return { status: error ? 400 : 200, data: { id }, error: error?.message ?? "" };
}

export async function validateCustomersOwnership(supabase: SupabaseClient, ownerId: string, ids: string[]) {
  const result = await countCustomersByIdsRepository(supabase, ownerId, ids);
  if (result.error) {
    return { ok: false, error: result.error.message };
  }

  return { ok: result.count === ids.length, error: result.count === ids.length ? "" : "存在不属于当前代理人的客户" };
}

export async function listCustomerSnapshotsService(supabase: SupabaseClient, ownerId: string, ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { status: 200, data: [] as CustomerSnapshot[], error: "" };
  }

  const { data, error } = await listCustomerSnapshotsByIdsRepository(supabase, ownerId, uniqueIds);
  return { status: error ? 400 : 200, data: (data ?? []) as CustomerSnapshot[], error: error?.message ?? "" };
}

export async function ensureCustomerSnapshotsMatchService(
  supabase: SupabaseClient,
  ownerId: string,
  payloads: Array<{ customerId: string; name?: string; nickName?: string }>,
) {
  const snapshotResult = await listCustomerSnapshotsService(
    supabase,
    ownerId,
    payloads.map((item) => item.customerId),
  );

  if (snapshotResult.error) {
    return { ok: false, data: [] as CustomerSnapshot[], error: snapshotResult.error };
  }

  const snapshotMap = new Map(snapshotResult.data.map((item) => [item.id, item]));
  const orderedSnapshots: CustomerSnapshot[] = [];

  for (const payload of payloads) {
    const snapshot = snapshotMap.get(payload.customerId);
    if (!snapshot) {
      return { ok: false, data: [] as CustomerSnapshot[], error: "涉及的客户必须先保存在客户基础信息表中" };
    }

    if (payload.name && payload.name.trim() !== snapshot.name) {
      return {
        ok: false,
        data: [] as CustomerSnapshot[],
        error: `客户“${payload.name.trim()}”与客户基础信息表不一致，请先维护客户档案`,
      };
    }

    if (payload.nickName !== undefined && normalizeOptionalText(payload.nickName) !== normalizeOptionalText(snapshot.nickname)) {
      return {
        ok: false,
        data: [] as CustomerSnapshot[],
        error: `客户“${snapshot.name}”的昵称与客户基础信息表不一致，请先维护客户档案`,
      };
    }

    orderedSnapshots.push(snapshot);
  }

  return { ok: true, data: orderedSnapshots, error: "" };
}

export async function resolveCustomerSnapshotService(
  supabase: SupabaseClient,
  ownerId: string,
  payload: { customerId?: string; name?: string; nickName?: string },
) {
  if (payload.customerId) {
    const snapshotResult = await listCustomerSnapshotsService(supabase, ownerId, [payload.customerId]);
    if (snapshotResult.error) {
      return { data: null, error: customerResolutionError(snapshotResult.error, "CUSTOMER_LOOKUP_FAILED") };
    }

    const snapshot = snapshotResult.data[0];
    if (!snapshot) {
      return { data: null, error: customerResolutionError("涉及的客户必须先保存在客户基础信息表中", "CUSTOMER_NOT_FOUND") };
    }

    if (payload.name && payload.name.trim() !== snapshot.name) {
      return {
        data: null,
        error: customerResolutionError(`客户“${payload.name.trim()}”与客户基础信息表不一致，请先维护客户档案`, "CUSTOMER_MISMATCH"),
      };
    }

    if (payload.nickName !== undefined && normalizeOptionalText(payload.nickName) !== normalizeOptionalText(snapshot.nickname)) {
      return {
        data: null,
        error: customerResolutionError(`客户“${snapshot.name}”的昵称与客户基础信息表不一致，请先维护客户档案`, "CUSTOMER_MISMATCH"),
      };
    }

    return { data: snapshot, error: null };
  }

  const name = payload.name?.trim() ?? "";
  const nickName = payload.nickName?.trim() ?? "";

  if (!name && !nickName) {
    return { data: null, error: customerResolutionError("缺少客户标识", "CUSTOMER_IDENTIFIER_MISSING") };
  }

  if (!name && nickName) {
    const { data, error } = await findCustomerSnapshotsByNicknameRepository(supabase, ownerId, nickName);
    if (error) {
      return { data: null, error: customerResolutionError(error.message, "CUSTOMER_LOOKUP_FAILED") };
    }

    const nicknameMatches = data ?? [];
    if (nicknameMatches.length === 0) {
      return { data: null, error: customerResolutionError(`当前还没有查到昵称“${nickName}”的已保存客户档案`, "CUSTOMER_NOT_FOUND") };
    }

    if (nicknameMatches.length > 1) {
      return { data: null, error: customerResolutionError(`昵称“${nickName}”命中了多位客户，请补一句姓名、来源或职业，我再继续核对。`, "CUSTOMER_AMBIGUOUS") };
    }

    return { data: nicknameMatches[0], error: null };
  }

  const { data, error } = await findCustomerSnapshotsByNameRepository(supabase, ownerId, name, payload.nickName);
  if (error) {
    return { data: null, candidate: null, error: customerResolutionError(error.message, "CUSTOMER_LOOKUP_FAILED") };
  }

  const matches = data ?? [];
  if (matches.length === 0 && payload.nickName?.trim()) {
    const fallbackByName = await findCustomerSnapshotsByNameRepository(supabase, ownerId, name);
    if (fallbackByName.error) {
      return { data: null, candidate: null, error: customerResolutionError(fallbackByName.error.message, "CUSTOMER_LOOKUP_FAILED") };
    }

    const fallbackMatches = fallbackByName.data ?? [];
    if (fallbackMatches.length === 1) {
      return {
        data: null,
        candidate: fallbackMatches[0],
        error: customerResolutionError(`已查到姓名为“${name}”的客户档案，但昵称与当前补充信息不完全一致，请先确认是否为同一位客户`, "CUSTOMER_MISMATCH"),
      };
    }

    if (fallbackMatches.length > 1) {
      return { data: null, candidate: null, error: customerResolutionError(`客户“${name}”存在多条档案，请补充客户来源、职业或更明确的身份信息后再继续核对`, "CUSTOMER_AMBIGUOUS") };
    }
  }

  if (matches.length === 0) {
    return { data: null, candidate: null, error: customerResolutionError("涉及的客户必须先保存在客户基础信息表中", "CUSTOMER_NOT_FOUND") };
  }

  if (matches.length > 1) {
    return { data: null, candidate: null, error: customerResolutionError(`客户“${name}”存在多条档案，请补充客户昵称后再保存记录`, "CUSTOMER_AMBIGUOUS") };
  }

  return { data: matches[0], candidate: null, error: null };
}


