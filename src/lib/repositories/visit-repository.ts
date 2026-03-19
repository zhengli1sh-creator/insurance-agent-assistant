import type { SupabaseClient } from "@supabase/supabase-js";

export async function listVisitsRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("visit_records")
    .select("*, customer:customers(id, name, nickname)")
    .eq("owner_id", ownerId)
    .order("time_visit", { ascending: false });
}

export async function createVisitRepository(
  supabase: SupabaseClient,
  payload: {
    owner_id: string;
    customer_id: string;
    sys_platform: string;
    name: string;
    time_visit: string;
    location: string | null;
    core_pain: string | null;
    brief_content: string | null;
    follow_work: string | null;
    method_communicate: string | null;
    nick_name: string | null;
    title: string;
    summary: string;
    happened_at: string;
    tone: string | null;
    follow_ups: string[];
  },
) {
  return supabase.from("visit_records").insert(payload).select("*, customer:customers(id, name, nickname)").single();
}

export async function updateVisitRepository(
  supabase: SupabaseClient,
  id: string,
  ownerId: string,
  payload: Partial<{
    customer_id: string;
    name: string;
    time_visit: string;
    location: string | null;
    core_pain: string | null;
    brief_content: string | null;
    follow_work: string | null;
    method_communicate: string | null;
    nick_name: string | null;
    title: string;
    summary: string;
    happened_at: string;
    tone: string | null;
    follow_ups: string[];
  }>,
) {
  return supabase
    .from("visit_records")
    .update(payload)
    .eq("id", id)
    .eq("owner_id", ownerId)
    .select("*, customer:customers(id, name, nickname)")
    .single();
}

export async function deleteVisitRepository(supabase: SupabaseClient, id: string, ownerId: string) {
  return supabase.from("visit_records").delete().eq("id", id).eq("owner_id", ownerId);
}
