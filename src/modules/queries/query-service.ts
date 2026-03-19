import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createInsightReportRepository,
  createQueryTemplateRepository,
  fetchLatestInsightReportRepository,
  insertInsightReportItemsRepository,
  listInsightReportItemsRepository,
  listQueryTemplatesRepository,
  touchQueryTemplateLastRunRepository,
} from "@/lib/repositories/query-repository";
import { insightReportGenerateSchema, queryTemplateCreateSchema } from "@/lib/validation/query";
import type { InsightGroup } from "@/types/domain";
import type {
  InsightReportCreatePayload,
  InsightReportEntity,
  InsightReportItemCreatePayload,
  InsightReportItemEntity,
  QueryTemplateCreatePayload,
} from "@/types/query";

type InsightSnapshot = InsightGroup & {
  customerIds: string[];
  evidenceJson: Record<string, unknown>;
};

type InsightCustomerRow = {
  id: string;
  name: string;
  nickname: string | null;
  profession: string | null;
  family_profile: string | null;
  wealth_profile: string | null;
  core_interesting: string | null;
  prefer_communicate: string | null;
  source: string | null;
  recent_money: string | null;
};

type InsightTaskRow = {
  status: string;
  priority: string;
};

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function toInsightGroup(item: InsightSnapshot): InsightGroup {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    count: item.count,
    tags: item.tags,
    suggestion: item.suggestion,
  };
}

function mapStoredInsightItems(items: InsightReportItemEntity[]): InsightGroup[] {

  return items.map((item) => ({
    id: item.insight_key,
    title: item.title,
    description: item.description ?? "",
    count: item.customer_count,
    tags: toStringArray(item.tags),
    suggestion: item.suggestion ?? "",
  }));
}

function buildRealtimeInsights(customers: InsightCustomerRow[], tasks: InsightTaskRow[]): InsightSnapshot[] {
  const premiumServiceCustomers = customers.filter((item) =>
    [item.prefer_communicate, item.family_profile, item.core_interesting, item.wealth_profile]
      .filter(Boolean)
      .some((value) => /细节|审美|礼宾|体验|优雅|私享|高端/.test(value ?? "")),
  );
  const wealthPlanningCustomers = customers.filter((item) =>
    [item.wealth_profile, item.recent_money, item.core_interesting]
      .filter(Boolean)
      .some((value) => /财富|资产|传承|保障|退休|医疗|资金|家族/.test(value ?? "")),
  );
  const relationshipCustomers = customers.filter((item) =>
    [item.source, item.prefer_communicate, item.profession]
      .filter(Boolean)
      .some((value) => /转介绍|活动|沙龙|线下|圈层|企业主|高知|私享/.test(value ?? "")),
  );
  const urgentTasks = tasks.filter((item) => item.status !== "已完成" && item.status !== "已取消" && item.priority === "高").length;

  return [
    {
      id: "insight-premium-service",
      title: "偏好高质感沟通的客户群",
      description: "这组客户更关注表达分寸、服务质感和沟通体验，适合继续用礼宾式经营方式推进。",
      count: premiumServiceCustomers.length,
      tags: ["高审美", "重细节", "体验敏感"],
      suggestion: "优先准备高级感邀约函、纪要模板和更温和稳重的话术。",
      customerIds: premiumServiceCustomers.map((item) => item.id),
      evidenceJson: {
        customerNames: premiumServiceCustomers.map((item) => item.nickname || item.name),
        matchDimension: ["prefer_communicate", "family_profile", "core_interesting", "wealth_profile"],
      },
    },
    {
      id: "insight-wealth-planning",
      title: "财富规划与家族议题更集中的客户",
      description: "这些客户在财富情况、近期资金安排和核心关注点上，更适合深入讨论保障、资产配置与传承。",
      count: wealthPlanningCustomers.length,
      tags: ["财富规划", "家族传承", "深度经营"],
      suggestion: `当前有 ${urgentTasks} 条高优先提醒，建议先推进财富议题最明确的客户。`,
      customerIds: wealthPlanningCustomers.map((item) => item.id),
      evidenceJson: {
        customerNames: wealthPlanningCustomers.map((item) => item.nickname || item.name),
        urgentTasks,
      },
    },
    {
      id: "insight-relationship-source",
      title: "适合活动邀约与圈层经营的客户",
      description: "客户来源、沟通偏好和职业背景显示，这组客户更适合通过私享活动和长期陪伴建立关系深度。",
      count: relationshipCustomers.length,
      tags: ["活动邀约", "圈层经营", "关系沉淀"],
      suggestion: "适合用精品沙龙、小范围闭门交流和一对一会后回访继续培育。",
      customerIds: relationshipCustomers.map((item) => item.id),
      evidenceJson: {
        customerNames: relationshipCustomers.map((item) => item.nickname || item.name),
        matchDimension: ["source", "prefer_communicate", "profession"],
      },
    },
  ];
}

async function listRealtimeInsightsSnapshots(supabase: SupabaseClient, ownerId: string) {
  const [customersResult, tasksResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, nickname, profession, family_profile, wealth_profile, core_interesting, prefer_communicate, source, recent_money")
      .eq("owner_id", ownerId),
    supabase.from("tasks").select("status, priority").eq("owner_id", ownerId),
  ]);

  if (customersResult.error) {
    return { status: 400, data: [] as InsightSnapshot[], error: customersResult.error.message };
  }

  if (tasksResult.error) {
    return { status: 400, data: [] as InsightSnapshot[], error: tasksResult.error.message };
  }

  return {
    status: 200,
    error: "",
    data: buildRealtimeInsights(
      (customersResult.data ?? []) as InsightCustomerRow[],
      (tasksResult.data ?? []) as InsightTaskRow[],
    ),
  };
}

export async function listInsightsService(supabase: SupabaseClient, ownerId: string) {
  const latestReportResult = await fetchLatestInsightReportRepository(supabase, ownerId);

  if (!latestReportResult.error && latestReportResult.data?.id) {
    const itemsResult = await listInsightReportItemsRepository(supabase, ownerId, latestReportResult.data.id);
    if (!itemsResult.error && (itemsResult.data ?? []).length > 0) {
      return { status: 200, error: "", data: mapStoredInsightItems(itemsResult.data) };
    }
  }

  const realtimeResult = await listRealtimeInsightsSnapshots(supabase, ownerId);
  return {
    status: realtimeResult.status,
    error: realtimeResult.error,
    data: realtimeResult.data.map(toInsightGroup),
  };
}


export async function listQueryTemplatesService(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await listQueryTemplatesRepository(supabase, ownerId);
  return { status: error ? 400 : 200, data: data ?? [], error: error?.message ?? "" };
}

export async function createQueryTemplateService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = queryTemplateCreateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "查询模板信息不完整" };
  }

  const createPayload: QueryTemplateCreatePayload = {
    owner_id: ownerId,
    sys_platform: "web",
    query_name: parsed.data.queryName,
    query_scope: parsed.data.queryScope,
    filter_json: parsed.data.filterJson,
    sort_json: parsed.data.sortJson,
    display_json: parsed.data.displayJson,
    is_default: parsed.data.isDefault,
  };

  const { data, error } = await createQueryTemplateRepository(supabase, createPayload);
  return { status: error ? 400 : 200, data, error: error?.message ?? "" };
}

export async function generateInsightsReportService(supabase: SupabaseClient, ownerId: string, payload: unknown) {
  const parsed = insightReportGenerateSchema.safeParse(payload);

  if (!parsed.success) {
    return { status: 400, data: null, error: parsed.error.issues[0]?.message ?? "洞察报告参数不正确" };
  }

  const realtimeResult = await listRealtimeInsightsSnapshots(supabase, ownerId);
  if (realtimeResult.error) {
    return { status: realtimeResult.status, data: null, error: realtimeResult.error };
  }

  const generatedAt = new Date().toISOString();
  const reportPayload: InsightReportCreatePayload = {
    owner_id: ownerId,
    sys_platform: "web",
    report_name: parsed.data.reportName ?? `客户洞察报告 ${generatedAt.slice(0, 10)}`,
    report_type: parsed.data.reportType,
    source_query_id: parsed.data.sourceQueryId ?? null,
    summary: realtimeResult.data.map((item) => `${item.title}(${item.count})`).join("；"),
    generated_at: generatedAt,
  };

  const reportResult = await createInsightReportRepository(supabase, reportPayload);
  if (reportResult.error || !reportResult.data) {
    return { status: 400, data: null, error: reportResult.error?.message ?? "洞察报告创建失败" };
  }

  const report = reportResult.data as InsightReportEntity;
  const itemPayload: InsightReportItemCreatePayload[] = realtimeResult.data.map((item, index) => ({
    report_id: report.id,
    owner_id: ownerId,
    insight_key: item.id,
    title: item.title,
    description: item.description,
    customer_count: item.count,
    customer_ids: item.customerIds,
    tags: item.tags,
    suggestion: item.suggestion,
    evidence_json: item.evidenceJson,
    sort_order: index,
  }));

  const itemsResult = await insertInsightReportItemsRepository(supabase, itemPayload);
  if (itemsResult.error) {
    return { status: 400, data: null, error: itemsResult.error.message };
  }

  if (parsed.data.sourceQueryId) {
    await touchQueryTemplateLastRunRepository(supabase, ownerId, parsed.data.sourceQueryId, generatedAt);
  }

  return {
    status: 200,
    error: "",
    data: {
      report,
      items: realtimeResult.data.map(toInsightGroup),

    },
  };
}
