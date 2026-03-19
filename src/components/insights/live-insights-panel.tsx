"use client";

import { useQuery } from "@tanstack/react-query";

import { QueryResultPanel } from "@/components/insights/query-result-panel";
import { insights as demoInsights } from "@/lib/demo-data";
import { fetchJson } from "@/lib/crm-api";
import type { InsightGroup } from "@/types/domain";

export function LiveInsightsPanel() {
  const query = useQuery({ queryKey: ["insights-live"], queryFn: () => fetchJson<InsightGroup[]>("/api/insights") });
  return <QueryResultPanel insights={query.isError ? demoInsights : query.data ?? []} />;
}
