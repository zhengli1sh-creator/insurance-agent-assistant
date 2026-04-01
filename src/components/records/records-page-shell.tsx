"use client";

import { Sparkles } from "lucide-react";
import { useRef, useState } from "react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { RecordsCrmPanel } from "@/components/records/records-crm-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AssistantWorkflowDirective } from "@/types/agent";

type RecordsPageShellProps = {
  initialTab: "visits" | "activities";
  fromAssistantHome: boolean;
};

function getRecordsModeChipClassName(showingActivities: boolean) {
  return showingActivities ? "advisor-chip-warning" : "advisor-chip-info";
}

function getWorkflowPresentationChipClassName(workflowHint?: AssistantWorkflowDirective | null) {
  if (!workflowHint) {
    return "advisor-chip-neutral";
  }

  return workflowHint.presentation === "primary" ? "advisor-chip-success" : "advisor-chip-warning";
}

function getWorkflowNoticeToneClassName(showingActivities: boolean) {
  return showingActivities ? "advisor-notice-card-warning" : "advisor-notice-card-info";
}

export function RecordsPageShell({ initialTab, fromAssistantHome }: RecordsPageShellProps) {
  const [activeTab, setActiveTab] = useState<"visits" | "activities">(initialTab);
  const [workflow, setWorkflow] = useState<AssistantWorkflowDirective | null>(null);
  const recordsPanelRef = useRef<HTMLDivElement | null>(null);

  function revealRecordsPanel() {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      recordsPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function handleWorkflowChange(nextWorkflow: AssistantWorkflowDirective | undefined) {
    setWorkflow(nextWorkflow ?? null);

    if (nextWorkflow?.preferredSurface === "activities") {
      setActiveTab("activities");
      revealRecordsPanel();
      return;
    }

    if (nextWorkflow?.preferredSurface === "visit") {
      setActiveTab("visits");
      revealRecordsPanel();
    }
  }

  const showingActivities = activeTab === "activities";
  const workflowHint = workflow && (workflow.preferredSurface === "visit" || workflow.preferredSurface === "activities") ? workflow : null;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.18fr_0.92fr]">
      <div ref={recordsPanelRef} className="space-y-6 scroll-mt-24">
        <Card className="glass-panel advisor-hero-card rounded-[32px]">
          <CardContent className="space-y-6 p-5 sm:p-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-accent-chip rounded-full px-3 py-1">记录中心</Badge>
                <span className="advisor-section-label">全量记录工作台</span>
                {fromAssistantHome ? <Badge className="advisor-chip-neutral rounded-full border-0 px-3 py-1">从助手进入</Badge> : null}
                <Badge className={`${getRecordsModeChipClassName(showingActivities)} rounded-full border-0 px-3 py-1`}>
                  {showingActivities ? "正在处理客户活动" : "正在记录拜访"}
                </Badge>
                {workflowHint ? (
                  <Badge className={`${getWorkflowPresentationChipClassName(workflowHint)} rounded-full border-0 px-3 py-1`}>
                    {workflowHint.presentation === "primary" ? "已打开当前重点内容" : "已整理好待填写内容"}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-3">
                <p className="advisor-kicker">Records center</p>
                <h2 className="max-w-3xl text-[1.95rem] font-semibold leading-tight text-slate-900 sm:text-[2.3rem]">
                  这里汇总了全部拜访和活动记录。
                </h2>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  想查看历史、补充内容、统一修改，或核对参加客户时，都可以在这里完成。
                </p>
              </div>
            </div>

            {workflowHint ? (
              <div className={`advisor-notice-card ${getWorkflowNoticeToneClassName(showingActivities)} rounded-[24px] px-4 py-3 text-sm leading-6 text-slate-700`}>
                <p className="font-medium text-slate-900">{workflowHint.launcher.title}</p>
                <p className="mt-1">{workflowHint.launcher.suggestion}</p>
              </div>
            ) : fromAssistantHome ? (
              <div className={`advisor-notice-card ${getWorkflowNoticeToneClassName(showingActivities)} rounded-[24px] px-4 py-3 text-sm leading-6 text-slate-700`}>
                {showingActivities
                  ? "你是从助手进入的。如果还没有参加客户的资料，会先帮你补齐，再继续保存这场活动。"
                  : "你是从助手进入的。如果还没有这位客户的资料，会先帮你补齐，再继续保存这次拜访。"}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <RecordsCrmPanel activeTab={activeTab} onTabChange={setActiveTab} workflow={workflowHint} />
      </div>

      <div className="space-y-6 xl:sticky xl:top-28 xl:h-fit">
        <Card className="advisor-soft-card rounded-[30px]">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <p className="advisor-kicker">Assistant guidance</p>
                <p className="text-lg font-semibold text-slate-900">记录入口说明</p>
                <p className="text-sm leading-6 text-slate-600">
                  助手会先帮你处理当前最重要的一件事；如果你要回看历史、批量整理或核对活动名单，可以在这里完成。
                </p>
              </div>
            </div>

            <div className="advisor-hairline" />

            <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 text-sm leading-7 text-slate-700">
              当前页面保留完整记录视图，方便你在需要时回看、补录和统一整理。
            </div>
          </CardContent>
        </Card>

        <ChatPanel onWorkflowChange={handleWorkflowChange} />
      </div>
    </div>
  );
}

