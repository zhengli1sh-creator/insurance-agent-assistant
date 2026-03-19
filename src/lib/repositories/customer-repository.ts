import type { SupabaseClient } from "@supabase/supabase-js";

import type { CustomerCreatePayload, CustomerSnapshot, CustomerUpdatePayload } from "@/types/customer";

export async function listCustomersRepository(supabase: SupabaseClient, ownerId: string, search = "") {
  let query = supabase
    .from("customers")
    .select("*")
    .eq("owner_id", ownerId)
    .order("bstudio_create_time", { ascending: false });

  if (search) {
    query = query.or(
      [
        `name.ilike.%${search}%`,
        `nickname.ilike.%${search}%`,
        `profession.ilike.%${search}%`,
        `core_interesting.ilike.%${search}%`,
        `wealth_profile.ilike.%${search}%`,
        `prefer_communicate.ilike.%${search}%`,
        `source.ilike.%${search}%`,
      ].join(","),
    );
  }

  return query;
}

export async function createCustomerRepository(supabase: SupabaseClient, payload: CustomerCreatePayload) {
  return supabase.from("customers").insert(payload).select("*").single();
}

export async function updateCustomerRepository(
  supabase: SupabaseClient,
  id: string,
  ownerId: string,
  payload: CustomerUpdatePayload,
) {
  return supabase.from("customers").update(payload).eq("id", id).eq("owner_id", ownerId).select("*").single();
}

export async function deleteCustomerRepository(supabase: SupabaseClient, id: string, ownerId: string) {
  return supabase.from("customers").delete().eq("id", id).eq("owner_id", ownerId);
}

export async function countCustomersByIdsRepository(supabase: SupabaseClient, ownerId: string, ids: string[]) {
  const { data, error } = await supabase.from("customers").select("id").eq("owner_id", ownerId).in("id", ids);
  return { count: data?.length ?? 0, error };
}

export async function listCustomerSnapshotsByIdsRepository(supabase: SupabaseClient, ownerId: string, ids: string[]) {
  return supabase.from("customers").select("id, name, nickname").eq("owner_id", ownerId).in("id", ids);
}

export async function findCustomerSnapshotsByNameRepository(
  supabase: SupabaseClient,
  ownerId: string,
  name: string,
  nickname?: string,
) {
  let query = supabase
    .from("customers")
    .select("id, name, nickname")
    .eq("owner_id", ownerId)
    .eq("name", name.trim());

  if (nickname !== undefined) {
    const normalizedNickname = nickname.trim();
    query = normalizedNickname ? query.eq("nickname", normalizedNickname) : query.is("nickname", null);
  }

  const { data, error } = await query;
  return { data: (data ?? []) as CustomerSnapshot[], error };
}

