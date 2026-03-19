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

export function RecordsCrmPanel({ activeTab, onTabChange, workflow = null }: RecordsCrmPanelProps) {
  const visitSeed = workflow?.preferredSurface === "visit" ? workflow.visitSeed ?? null : null;
  const activitySeed = workflow?.preferredSurface === "activities" ? workflow.activitySeed ?? null : null;
  const showingActivities = activeTab === "activities";

  return (
    <div className="space-y-4">
      <Card className="glass-panel border-white/55 bg-white/84">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-[#123B5D]/10 px-3 py-1 text-[#123B5D]">当前内容</Badge>
              <Badge className={`rounded-full border-0 px-3 py-1 ${showingActivities ? "bg-[#B8894A]/12 text-[#8A6A3E]" : "bg-[#1E3A8A]/10 text-[#1E3A8A]"}`}>
                {showingActivities ? "客户活动" : "拜访记录"}
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              {workflow
                ? workflow.launcher.description
                : "你可以手动切换拜访和活动；也可以直接在右侧告诉我目标，我会先打开你最需要的内容。"}
            </p>

          </div>
          {workflow?.launcher.secondaryAction && (
            <a href={workflow.launcher.secondaryAction.href} className="inline-flex items-center rounded-full bg-[#123B5D] px-4 py-2 text-sm text-white transition hover:opacity-95">
              {workflow.launcher.secondaryAction.label}
            </a>
          )}
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as "visits" | "activities")} className="w-full">
        <TabsList className="mb-6 rounded-full bg-white/80 p-1">
          <TabsTrigger value="visits" className="cursor-pointer rounded-full px-5">拜访记录</TabsTrigger>
          <TabsTrigger value="activities" className="cursor-pointer rounded-full px-5">客户活动</TabsTrigger>
        </TabsList>
        <TabsContent value="visits">
          <VisitManager key={visitSeed?.id ?? "records-visit-default"} variant="full" source="records" draftSeed={visitSeed} />
        </TabsContent>

        <TabsContent value="activities">
          <ActivityManager key={activitySeed?.id ?? "records-activity-default"} variant="full" source="records" draftSeed={activitySeed} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
