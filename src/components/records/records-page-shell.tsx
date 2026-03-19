"use client";

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
        <Card className="glass-panel border-white/55 bg-white/84">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-[#0F766E]/10 px-3 py-1 text-[#0F766E]">记录中心</Badge>
              {fromAssistantHome && <Badge className="rounded-full border-0 bg-[#123B5D]/10 px-3 py-1 text-[#123B5D]">从助手进入</Badge>}
              <Badge className={`rounded-full border-0 px-3 py-1 ${showingActivities ? "bg-[#B8894A]/12 text-[#8A6A3E]" : "bg-[#1E3A8A]/10 text-[#1E3A8A]"}`}>
                {showingActivities ? "正在处理客户活动" : "正在记录拜访"}
              </Badge>
              {workflowHint && (
                <Badge className={`rounded-full border-0 px-3 py-1 ${workflowHint.presentation === "primary" ? "bg-[#0F766E]/10 text-[#0F766E]" : "bg-[#F7F4EE] text-[#8A6A3E]"}`}>
                  {workflowHint.presentation === "primary" ? "已打开当前重点内容" : "已整理好待填写内容"}
                </Badge>
              )}
            </div>

            <h2 className="mt-4 text-3xl font-semibold text-slate-900">这里汇总了全部拜访和活动记录。</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              想查看历史、补充内容、统一修改，或核对参加客户时，都可以在这里完成。
            </p>


            {workflowHint ? (
              <div className={`mt-4 rounded-[24px] px-4 py-3 text-sm leading-6 ${showingActivities ? "border border-[#B8894A]/18 bg-[#FFF8EE] text-slate-700" : "border border-[#1E3A8A]/14 bg-[#F4F7FF] text-slate-700"}`}>
                <p className="font-medium text-slate-900">{workflowHint.launcher.title}</p>
                <p className="mt-1">{workflowHint.launcher.suggestion}</p>
              </div>
            ) : fromAssistantHome ? (
              <div className={`mt-4 rounded-[24px] px-4 py-3 text-sm leading-6 ${showingActivities ? "border border-[#B8894A]/18 bg-[#FFF8EE] text-slate-700" : "border border-[#1E3A8A]/14 bg-[#F4F7FF] text-slate-700"}`}>
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
        <Card className="glass-panel border-white/55 bg-white/84">
          <CardContent className="space-y-4 p-5">
            <p className="text-sm font-medium text-slate-900">这里可以查看全部记录</p>
            <div className="rounded-[24px] bg-[#FFF8EE] p-4 text-sm leading-7 text-slate-700">
              助手会先帮你处理当前最重要的一件事；如果你要回看历史、批量整理或核对活动名单，可以在这里完成。
            </div>
          </CardContent>
        </Card>

        <ChatPanel onWorkflowChange={handleWorkflowChange} />
      </div>
    </div>
  );
}
