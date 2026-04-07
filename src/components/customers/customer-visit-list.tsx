"use client";

import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ClipboardList, MapPin, MessageSquare, Sparkles } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { fetchJson } from "@/lib/crm-api";
import type { VisitRecordEntity } from "@/types/visit";

import { customerSurfaceCardClassName } from "./customer-style";

interface CustomerVisitListProps {
  customerId: string;
  customerName?: string;
}

function formatVisitDate(dateStr: string): string {
  if (!dateStr) return "未知日期";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function VisitCard({ visit }: { visit: VisitRecordEntity }) {
  const hasFollowUps = visit.follow_ups && visit.follow_ups.length > 0;

  return (
    <div className="advisor-list-item-card rounded-[24px] p-4 sm:p-5">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-900">
            <div className="advisor-icon-badge advisor-icon-badge-sm">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span className="font-medium">{formatVisitDate(visit.time_visit)}</span>
          </div>
          {visit.location ? (
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5" />
              <span>{visit.location}</span>
            </div>
          ) : null}
        </div>

        {visit.core_pain ? (
          <div className="space-y-1.5">
            <p className="advisor-section-label">核心关注点</p>
            <p className="text-sm leading-6 text-slate-700">{visit.core_pain}</p>
          </div>
        ) : null}

        {visit.brief_content ? (
          <div className="space-y-1.5">
            <p className="advisor-section-label">谈话摘要</p>
            <p className="text-sm leading-6 text-slate-700">{visit.brief_content}</p>
          </div>
        ) : null}

        {hasFollowUps ? (
          <div className="space-y-2">
            <p className="advisor-section-label">后续动作</p>
            <div className="flex flex-wrap gap-2">
              {visit.follow_ups.map((item, index) => (
                <span
                  key={index}
                  className="advisor-meta-tile inline-flex items-center gap-1.5 rounded-full border border-white/75 px-3 py-1.5 text-sm text-slate-700"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600/70" />
                  {item}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyVisitState({ customerName }: { customerName?: string }) {
  return (
    <div className="advisor-empty-state-card rounded-[24px] px-6 py-8 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100/70">
        <ClipboardList className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-medium text-slate-700">暂无拜访记录</p>
      <p className="mt-1 text-sm text-slate-500">
        {customerName ? `可在助手入口快速记录与 ${customerName} 的拜访内容` : "可在助手入口快速记录拜访内容"}
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <div key={i} className="advisor-list-item-card rounded-[24px] p-4 sm:p-5">
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="h-4 w-4 rounded-full bg-slate-200/70" />
              <div className="h-4 w-24 rounded bg-slate-200/70" />
            </div>
            <div className="h-3 w-full rounded bg-slate-200/70" />
            <div className="h-3 w-2/3 rounded bg-slate-200/70" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CustomerVisitList({ customerId, customerName }: CustomerVisitListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-visits", customerId],
    queryFn: () => fetchJson<VisitRecordEntity[]>(`/api/visits?customerId=${encodeURIComponent(customerId)}`),
    enabled: Boolean(customerId),
  });

  const visits = useMemo(() => data ?? [], [data]);
  const hasVisits = visits.length > 0;

  return (
    <Card className={customerSurfaceCardClassName}>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="space-y-1">
            <p className="advisor-kicker">Visit records</p>
            <p className="text-lg font-semibold text-slate-900">拜访记录</p>
          </div>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] px-4 py-6 text-center text-sm text-slate-700">
            获取拜访记录失败，请稍后重试
          </div>
        ) : hasVisits ? (
          <div className="space-y-3">
            {visits.map((visit) => (
              <VisitCard key={visit.id} visit={visit} />
            ))}
          </div>
        ) : (
          <EmptyVisitState customerName={customerName} />
        )}

        {hasVisits ? (
          <div className="advisor-notice-card advisor-notice-card-info flex items-start gap-2 rounded-[20px] px-4 py-3 text-sm leading-5 text-slate-600">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span>可在助手入口快速记录新的拜访内容</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
