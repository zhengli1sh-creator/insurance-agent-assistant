import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  InsightReportCreatePayload,
  InsightReportItemCreatePayload,
  InsightReportItemEntity,
  QueryTemplateCreatePayload,
  QueryTemplateEntity,
} from "@/types/query";


export async function listQueryTemplatesRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("query_templates")
    .select("*")
    .eq("owner_id", ownerId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .returns<QueryTemplateEntity[]>();
}

export async function createQueryTemplateRepository(
  supabase: SupabaseClient,
  payload: QueryTemplateCreatePayload,
) {
  return supabase.from("query_templates").insert(payload).select("*").single();
}

export async function fetchLatestInsightReportRepository(supabase: SupabaseClient, ownerId: string) {
  return supabase
    .from("insight_reports")
    .select("*")
    .eq("owner_id", ownerId)
    .order("generated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
}

export async function listInsightReportItemsRepository(
  supabase: SupabaseClient,
  ownerId: string,
  reportId: string,
) {
  return supabase
    .from("insight_report_items")
    .select("*")
    .eq("owner_id", ownerId)
    .eq("report_id", reportId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .returns<InsightReportItemEntity[]>();
}

export async function createInsightReportRepository(
  supabase: SupabaseClient,
  payload: InsightReportCreatePayload,
) {
  return supabase.from("insight_reports").insert(payload).select("*").single();
}

export async function insertInsightReportItemsRepository(
  supabase: SupabaseClient,
  payload: InsightReportItemCreatePayload[],
) {
  return supabase.from("insight_report_items").insert(payload);
}

export async function touchQueryTemplateLastRunRepository(
  supabase: SupabaseClient,
  ownerId: string,
  templateId: string,
  lastRunAt: string,
) {
  return supabase
    .from("query_templates")
    .update({ last_run_at: lastRunAt })
    .eq("id", templateId)
    .eq("owner_id", ownerId)
    .select("id")
    .maybeSingle();
}
