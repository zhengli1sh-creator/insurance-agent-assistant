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

const visitFieldLabels: Record<string, string> = {
  name: "姓名",
  nick_name: "昵称",
  time_visit: "拜访日期",
  location: "地点",
  method_communicate: "沟通方式",
  core_pain: "客户关注点",
  brief_content: "沟通摘要",
  follow_work: "后续工作",
  title: "标题",
  summary: "摘要",
  happened_at: "发生时间",
  tone: "沟通氛围",
};

const systemFields = new Set([
  "id",
  "owner_id",
  "customer_id",
  "sys_platform",
  "uuid",
  "bstudio_create_time",
  "created_at",
  "updated_at",
  "follow_ups",
  "customer",
]);

export function VisitSaveSuccessCard({ visit, pendingTaskCount = 0 }: { visit: VisitRecordEntity; pendingTaskCount?: number }) {
  // 动态收集所有有值的业务字段
  const filledRows: Array<{ key: string; label: string; value: string }> = [];

  // 优先按固定顺序展示主要字段
  const priorityFields = ["name", "time_visit", "location", "method_communicate", "core_pain", "brief_content", "follow_work"];

  // 处理优先字段
  priorityFields.forEach((key) => {
    const value = visit[key as keyof VisitRecordEntity];
    if (typeof value === "string" && value.trim()) {
      filledRows.push({ key, label: visitFieldLabels[key] || key, value: value.trim() });
    }
  });

  // 处理其他业务字段（排除系统字段和已处理的优先字段）
  Object.entries(visit).forEach(([key, value]) => {
    if (systemFields.has(key) || priorityFields.includes(key)) return;
    if (key === "nick_name") return; // 昵称特殊处理，合并到姓名
    if (typeof value === "string" && value.trim()) {
      filledRows.push({ key, label: visitFieldLabels[key] || key, value: value.trim() });
    }
  });

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

      {/* 展示所有已保存的字段，带有对应的信息项标签 */}
      <div className="advisor-subtle-card mt-4 rounded-2xl p-3.5 sm:p-4">
        <p className="advisor-kicker">拜访简报</p>
        <div className="mt-3 space-y-2.5">
          {filledRows.map(({ key, label, value }) => {
            // 姓名特殊处理：加上昵称
            if (key === "name") {
              const displayValue = visit.nick_name ? `${value}（${visit.nick_name}）` : value;
              return (
                <div key={key} className="flex gap-3 text-sm leading-6">
                  <span className="w-20 shrink-0 text-slate-500">{label}</span>
                  <span className="flex-1 font-medium text-slate-900">{displayValue}</span>
                </div>
              );
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
