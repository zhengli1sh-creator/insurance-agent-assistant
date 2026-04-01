"use client";

import { ActivityManager } from "@/components/records/activity-manager";
import { VisitManager } from "@/components/records/visit-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AssistantWorkflowDirective } from "@/types/agent";

type RecordsCrmPanelProps = {
  activeTab: "visits" | "activities";
  onTabChange: (tab: "visits" | "activities") => void;
  workflow?: AssistantWorkflowDirective | null;
};

function getActiveTabChipClassName(showingActivities: boolean) {
  return showingActivities ? "advisor-chip-warning" : "advisor-chip-info";
}

function getWorkflowChipClassName(workflow?: AssistantWorkflowDirective | null) {
  if (!workflow) {
    return "advisor-chip-neutral";
  }

  return workflow.presentation === "primary" ? "advisor-chip-success" : "advisor-chip-warning";
}

export function RecordsCrmPanel({ activeTab, onTabChange, workflow = null }: RecordsCrmPanelProps) {
  const visitSeed = workflow?.preferredSurface === "visit" ? workflow.visitSeed ?? null : null;
  const activitySeed = workflow?.preferredSurface === "activities" ? workflow.activitySeed ?? null : null;
  const showingActivities = activeTab === "activities";

  return (
    <div className="space-y-4">
      <Card className="glass-panel advisor-soft-card rounded-[30px]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">当前内容</Badge>
                <Badge className={`${getActiveTabChipClassName(showingActivities)} rounded-full border-0 px-3 py-1`}>
                  {showingActivities ? "客户活动" : "拜访记录"}
                </Badge>
                {workflow ? (
                  <Badge className={`${getWorkflowChipClassName(workflow)} rounded-full border-0 px-3 py-1`}>
                    {workflow.presentation === "primary" ? "助手已打开重点" : "已整理待填写内容"}
                  </Badge>
                ) : null}
              </div>

              <div className="space-y-2">
                <p className="advisor-kicker">Records workspace</p>
                <p className="text-lg font-semibold text-slate-900">先承接当前最重要的一类记录。</p>
                <p className="text-sm leading-6 text-slate-600">
                  {workflow
                    ? workflow.launcher.description
                    : "你可以手动切换拜访和活动；也可以直接在右侧告诉我目标，我会先打开你最需要的内容。"}
                </p>
              </div>
            </div>

            {workflow?.launcher.secondaryAction && (
              <a
                href={workflow.launcher.secondaryAction.href}
                className="advisor-primary-button inline-flex items-center rounded-full px-4 py-2 text-sm text-white transition-all duration-200 hover:brightness-[1.03]"
              >
                {workflow.launcher.secondaryAction.label}
              </a>
            )}
          </div>

          <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] px-4 py-3 text-sm leading-6 text-slate-700">
            {showingActivities
              ? "活动补录需要核对参与客户；如果名单里有人还未建档，系统会先补客户，再回到当前活动。"
              : "拜访记录以单客户为主；如果客户资料还不存在，系统会先补最小档案，再自动回到当前拜访。"}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "visits" | "activities")} className="w-full">
        <TabsList className="advisor-input-dock mb-6 h-auto rounded-full p-1.5">
          <TabsTrigger
            value="visits"
            className="cursor-pointer rounded-full px-5 py-2.5 text-slate-600 transition data-[state=active]:bg-[var(--advisor-ink)] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(18,59,93,0.18)]"
          >
            拜访记录
          </TabsTrigger>
          <TabsTrigger
            value="activities"
            className="cursor-pointer rounded-full px-5 py-2.5 text-slate-600 transition data-[state=active]:bg-[var(--advisor-ink)] data-[state=active]:text-white data-[state=active]:shadow-[0_12px_24px_rgba(18,59,93,0.18)]"
          >
            客户活动
          </TabsTrigger>
        </TabsList>
        <TabsContent value="visits" className="mt-0">
          <VisitManager key={visitSeed?.id ?? "records-visit-default"} variant="full" source="records" draftSeed={visitSeed} />
        </TabsContent>

        <TabsContent value="activities" className="mt-0">
          <ActivityManager key={activitySeed?.id ?? "records-activity-default"} variant="full" source="records" draftSeed={activitySeed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

