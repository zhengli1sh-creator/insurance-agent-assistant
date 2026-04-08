import type { SupabaseClient } from "@supabase/supabase-js";

import type { TaskEntity, TaskSourceTypeValue, TaskStatusValue, TaskSyncPayload } from "@/types/task";

function sourceTypesForCleanup(sourceType: TaskSourceTypeValue) {
  if (sourceType === "activity_event") {
    return ["activity_event", "activity"] as TaskSourceTypeValue[];
  }

  return [sourceType];
}

export async function listTasksRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("tasks")
    .select("*")
    .eq("owner_id", ownerId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .returns<TaskEntity[]>();
}

export async function createTasksRepository(supabase: SupabaseClient, payload: TaskSyncPayload[]) {
  return supabase.from("tasks").insert(payload).select("*").returns<TaskEntity[]>();
}

export async function replaceTasksBySourceRepository(
  supabase: SupabaseClient,
  ownerId: string,
  sourceType: TaskSourceTypeValue,
  sourceId: string,
  tasks: TaskSyncPayload[],
) {
  const cleanupSourceTypes = sourceTypesForCleanup(sourceType);
  let deleteQuery = supabase.from("tasks").delete().eq("owner_id", ownerId).eq("source_id", sourceId);

  deleteQuery = cleanupSourceTypes.length === 1 ? deleteQuery.eq("source_type", cleanupSourceTypes[0]) : deleteQuery.in("source_type", cleanupSourceTypes);

  const deleteResult = await deleteQuery;

  if (deleteResult.error || tasks.length === 0) {
    return deleteResult;
  }

  return supabase.from("tasks").insert(tasks).select("*").returns<TaskEntity[]>();
}

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

