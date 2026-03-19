import type { SupabaseClient } from "@supabase/supabase-js";

export async function listActivitiesRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("activity_events")
    .select("*, activity_participants(customer_id, name, nick_name, follow_work, customer:customers(id, name, nickname))")
    .eq("owner_id", ownerId)
    .order("date_activity", { ascending: false });
}

export async function createActivityRepository(
  supabase: SupabaseClient,
  payload: {
    owner_id: string;
    sys_platform: string;
    name_activity: string;
    date_activity: string;
    location_activity: string | null;
    customer_profile: string | null;
    effect_profile: string | null;
    lessons_learned: string | null;
    title: string;
    theme: string | null;
    summary: string;
    happened_at: string;
    tone: string | null;
    follow_ups: string[];
  },
) {
  return supabase.from("activity_events").insert(payload).select("*").single();
}

export async function insertActivityParticipantsRepository(
  supabase: SupabaseClient,
  payload: Array<{
    activity_id: string;
    customer_id: string;
    owner_id: string;
    sys_platform: string;
    name: string;
    nick_name: string | null;
    follow_work: string | null;
  }>,
) {
  return supabase.from("activity_participants").insert(payload);
}

export async function clearActivityParticipantsRepository(supabase: SupabaseClient, activityId: string, ownerId: string) {
  return supabase.from("activity_participants").delete().eq("activity_id", activityId).eq("owner_id", ownerId);
}

export async function updateActivityRepository(
  supabase: SupabaseClient,
  id: string,
  ownerId: string,
  payload: Partial<{
    name_activity: string;
    date_activity: string;
    location_activity: string | null;
    customer_profile: string | null;
    effect_profile: string | null;
    lessons_learned: string | null;
    title: string;
    theme: string | null;
    summary: string;
    happened_at: string;
    tone: string | null;
    follow_ups: string[];
  }>,
) {
  return supabase.from("activity_events").update(payload).eq("id", id).eq("owner_id", ownerId).select("*").single();
}

export async function fetchActivityRepository(supabase: SupabaseClient, id: string, ownerId: string) {
  return supabase
    .from("activity_events")
    .select("*, activity_participants(customer_id, name, nick_name, follow_work, customer:customers(id, name, nickname))")
    .eq("id", id)
    .eq("owner_id", ownerId)
    .single();
}

export async function deleteActivityRepository(supabase: SupabaseClient, id: string, ownerId: string) {
  return supabase.from("activity_events").delete().eq("id", id).eq("owner_id", ownerId);
}
