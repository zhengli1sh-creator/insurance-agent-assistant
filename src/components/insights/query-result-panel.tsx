"use client";

import dynamic from "next/dynamic";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InsightGroup } from "@/types/domain";

const InsightsChart = dynamic(
  () => import("@/components/insights/insights-chart").then((mod) => mod.InsightsChart),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-[28px] bg-white/70 text-sm text-slate-500">
        正在准备客户群分布图…
      </div>
    ),
  },
);

export function QueryResultPanel({ insights }: { insights: InsightGroup[] }) {
  const chartData = insights.map((item) => ({ name: item.title.slice(0, 8), 客户数: item.count }));



  return (
    <Card className="glass-panel border-white/55 bg-white/84 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <CardHeader className="pb-4">
        <Badge className="mb-3 w-fit rounded-full border-0 bg-[#0F766E]/10 px-3 py-1 text-[#0F766E]">综合查询与共同特点</Badge>
        <CardTitle className="text-2xl text-slate-900">客户群洞察</CardTitle>
        <p className="text-sm leading-6 text-slate-600">通过客户标签、经营阶段和近期记录，快速找到更适合统一跟进的人群。</p>

      </CardHeader>
      <CardContent className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-4">
          {insights.map((insight) => (
            <div key={insight.id} className="rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{insight.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{insight.description}</p>
                </div>
                <div className="rounded-2xl bg-[#1E3A8A]/10 px-4 py-3 text-center text-[#1E3A8A]">
                  <p className="text-2xl font-semibold">{insight.count}</p>
                  <p className="text-xs">客户</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {insight.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-4 rounded-2xl bg-[#FFF8EE] px-4 py-3 text-sm leading-6 text-slate-700">建议：{insight.suggestion}</p>
            </div>
          ))}
        </div>
        <div className="rounded-[32px] border border-slate-200/70 bg-[linear-gradient(180deg,#F8FBFF_0%,#F7F4EE_100%)] p-5">
          <p className="text-sm font-medium text-slate-900">高价值客群分布</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">优先把时间投向高响应、高信任和强转介绍潜力客户群。</p>
          <div className="mt-6 h-[320px] w-full">
            <InsightsChart data={chartData} />
          </div>


        </div>
      </CardContent>
    </Card>
  );
}
