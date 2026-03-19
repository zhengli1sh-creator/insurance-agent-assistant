export type QueryScopeValue = "customers" | "visits" | "activities" | "tasks" | "mixed";
export type InsightReportTypeValue = "system" | "manual" | "custom";

export interface QueryTemplateEntity {
  id: string;
  owner_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  query_name: string;
  query_scope: QueryScopeValue;
  filter_json: Record<string, unknown>;
  sort_json: unknown[];
  display_json: Record<string, unknown>;
  is_default: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QueryTemplateCreatePayload {
  owner_id: string;
  sys_platform?: string;
  query_name: string;
  query_scope: QueryScopeValue;
  filter_json?: Record<string, unknown>;
  sort_json?: unknown[];
  display_json?: Record<string, unknown>;
  is_default?: boolean;
  last_run_at?: string | null;
}

export interface InsightReportEntity {
  id: string;
  owner_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  report_name: string;
  report_type: InsightReportTypeValue;
  source_query_id: string | null;
  summary: string | null;
  generated_at: string;
  created_at: string;
  updated_at: string;
}

export interface InsightReportItemEntity {
  id: string;
  report_id: string;
  owner_id: string;
  insight_key: string;
  title: string;
  description: string | null;
  customer_count: number;
  customer_ids: string[];
  tags: string[];
  suggestion: string | null;
  evidence_json: Record<string, unknown>;
  sort_order: number;
  created_at: string;
}

export interface InsightReportCreatePayload {
  owner_id: string;
  sys_platform?: string;
  report_name: string;
  report_type: InsightReportTypeValue;
  source_query_id?: string | null;
  summary?: string | null;
  generated_at?: string;
}

export interface InsightReportItemCreatePayload {
  report_id: string;
  owner_id: string;
  insight_key: string;
  title: string;
  description?: string | null;
  customer_count?: number;
  customer_ids?: string[];
  tags?: string[];
  suggestion?: string | null;
  evidence_json?: Record<string, unknown>;
  sort_order?: number;
}
