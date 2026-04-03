import { AlertCircle, CheckCircle, Sparkles } from "lucide-react";

import { customerCardHeadingClassName, customerNoticeCardClassName, customerNoticeCardCompactClassName } from "@/components/customers/customer-style";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { VisitDraftState, VisitCustomerStatus } from "@/components/visits/visit-page-types";
import type { VisitRecordEntity } from "@/types/visit";

const summaryRows: Array<{ key: keyof VisitDraftState; label: string }> = [
  { key: "timeVisit", label: "拜访日期" },
  { key: "location", label: "地点" },
  { key: "methodCommunicate", label: "沟通方式" },
  { key: "corePain", label: "客户关注点" },
  { key: "briefContent", label: "沟通摘要" },
];

function customerStatusClassName(tone: VisitCustomerStatus["tone"]) {
  switch (tone) {
    case "matched":
      return "advisor-chip-success";
    case "review":
      return "advisor-chip-warning";
    case "missing":
      return "advisor-chip-warning";
    default:
      return "advisor-chip-info";
  }
}

function toneCardClassName(tone: VisitCustomerStatus["tone"]) {
  switch (tone) {
    case "matched":
      return "advisor-notice-card-success";
    case "review":
    case "missing":
      return "advisor-notice-card-warning";
    default:
      return "advisor-notice-card-info";
  }
}

function splitFollowUps(value: string) {
  return value
    .split(/[\n；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatFollowUpHint(followWork: string) {
  const items = splitFollowUps(followWork);
  if (items.length === 0) {
    return {
      title: "当前未识别到明确的后续动作",
      helper: "本次可先保存拜访记录；如稍后想到下一步，也可以补充后再整理成任务。",
      count: 0,
    };
  }

  return {
    title: `已识别到 ${items.length} 条后续事项`,
    helper: "拜访保存成功后，会继续进入新增任务页，由你补充、修改并确认创建。",
    count: items.length,
  };
}

function formatVisitMeta(visit: VisitRecordEntity) {
  const parts = [visit.time_visit, visit.location, visit.method_communicate].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "已为你沉淀本次拜访。";
}

export function VisitExtractedSummaryCard({
  extractedFields,
  currentDraft,
  customerStatus,
}: {
  extractedFields: Array<{ label: string; value: string }>;
  currentDraft: VisitDraftState;
  customerStatus: VisitCustomerStatus;
}) {
  const filledCount = summaryRows.filter(({ key }) => currentDraft[key].trim()).length + (currentDraft.name.trim() || currentDraft.customerId ? 1 : 0);
  const followUpMeta = formatFollowUpHint(currentDraft.followWork);
  const customerLabel = currentDraft.name.trim() || currentDraft.nickName.trim() || "待补充客户";

  return (
    <div className={cn(customerNoticeCardClassName, "advisor-notice-card-warning")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="advisor-icon-badge advisor-icon-badge-warning mt-0.5 h-9 w-9 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className={customerCardHeadingClassName}>已为你整理出本次拜访的关键信息</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">当前只呈现保存前需要核对的必要信息，你仍可继续补充。</p>
          </div>
        </div>
        <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">已具备 {filledCount} 项</Badge>
      </div>

      <div className={cn("mt-4 rounded-2xl p-3.5 sm:p-4", toneCardClassName(customerStatus.tone))}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(customerStatusClassName(customerStatus.tone), "rounded-full border-0 px-3 py-1")}>{customerStatus.title}</Badge>
          <p className="text-sm font-medium text-slate-900">{customerLabel}{currentDraft.nickName.trim() ? `（${currentDraft.nickName.trim()}）` : ""}</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-700">{customerStatus.description}</p>
      </div>

      <div className="advisor-subtle-card mt-4 rounded-2xl p-3.5 sm:p-4">
        <p className="advisor-kicker">拜访简报</p>
        <div className="mt-3 space-y-2.5">
          {summaryRows.map(({ key, label }) => {
            const value = currentDraft[key].trim();
            if (!value) {
              return null;
            }

            return (
              <div key={key} className="flex gap-3 text-sm leading-6">
                <span className="w-20 shrink-0 text-slate-500">{label}</span>
                <span className="flex-1 text-slate-700">{value}</span>
              </div>
            );
          })}
        </div>
      </div>

      {extractedFields.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 text-xs leading-5 text-slate-500">
          {extractedFields.map((field, index) => (
            <span key={`${field.label}-${index}`} className="advisor-chip-info rounded-full px-3 py-1">
              已识别：{field.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/78 px-4 py-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(followUpMeta.count > 0 ? "advisor-chip-warning" : "advisor-chip-info", "rounded-full border-0 px-3 py-1")}>{followUpMeta.title}</Badge>
        </div>
        {followUpMeta.count > 0 ? (
          <div className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
            {splitFollowUps(currentDraft.followWork)
              .slice(0, 3)
              .map((item, index) => (
                <p key={`${item}-${index}`}>{index + 1}. {item}</p>
              ))}
          </div>
        ) : null}
        <p className="mt-3 text-xs leading-5 text-slate-500">{followUpMeta.helper}</p>
      </div>
    </div>
  );
}

export function VisitSaveSuccessCard({ visit, pendingTaskCount = 0 }: { visit: VisitRecordEntity; pendingTaskCount?: number }) {
  return (
    <div className={cn(customerNoticeCardClassName, "advisor-notice-card-success")}>
      <div className="flex items-start gap-3">
        <div className="advisor-icon-badge advisor-icon-badge-success mt-0.5 h-9 w-9 shrink-0">
          <CheckCircle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">已为你保存拜访记录</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {pendingTaskCount > 0 ? `接下来会继续带你确认 ${pendingTaskCount} 条后续任务。` : "本次拜访已沉淀完成，你可以继续补录下一次拜访。"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5">
        <p className="text-lg font-semibold text-slate-900">{visit.name}{visit.nick_name ? `（${visit.nick_name}）` : ""}</p>
        <p className="mt-1 text-sm text-slate-500">{formatVisitMeta(visit)}</p>
      </div>

      {visit.brief_content ? (
        <div className="mt-4 rounded-2xl border border-white/80 bg-white/74 p-3.5 sm:p-4">
          <p className="text-sm font-medium text-slate-700">沟通摘要</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">{visit.brief_content}</p>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {pendingTaskCount > 0 ? "任务不会直接写入，仍需你在下一页补充并确认。" : "当前未检测到明确后续事项，本次仅保存拜访记录。"}
      </p>
    </div>
  );
}

export function VisitErrorHintCard({ message }: { message: string }) {
  return (
    <div className={cn(customerNoticeCardCompactClassName, "advisor-notice-card-warning")}>
      <div className="flex items-start gap-3">
        <div className="advisor-icon-badge advisor-icon-badge-warning mt-0.5 h-8 w-8 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">还需要你确认一下</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">系统会优先保留当前草稿，不会直接误写拜访或任务数据。</p>
        </div>
      </div>
    </div>
  );
}
