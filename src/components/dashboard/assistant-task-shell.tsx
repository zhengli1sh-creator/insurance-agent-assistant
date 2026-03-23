"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { CustomerCrmPanel } from "@/components/customers/customer-crm-panel";
import { ActivityManager } from "@/components/records/activity-manager";
import { VisitManager } from "@/components/records/visit-manager";
import { Card, CardContent } from "@/components/ui/card";
import { clearAssistantWorkflow, persistAssistantWorkflow, readAssistantWorkflow } from "@/modules/chat/workflow-session";
import type { AssistantWorkflowDirective } from "@/types/agent";
import type { CustomerRecord } from "@/types/customer";

type AssistantTaskSurface = "visit" | "activities" | "customers";

type AssistantTaskShellProps = {
  surface: AssistantTaskSurface;
};

const surfaceConfig: Record<
  AssistantTaskSurface,
  {
    title: string;
    description: string;
    manualHref: string;
    manualLabel: string;
  }
> = {
  visit: {
    title: "记录拜访",
    description: "补充客户、时间和沟通重点，保存后会自动回到助手。",
    manualHref: "/records?tab=visits",
    manualLabel: "查看记录中心",
  },
  activities: {
    title: "补录活动",
    description: "确认活动信息和参加客户，保存后会自动回到助手。",
    manualHref: "/records?tab=activities",
    manualLabel: "查看活动记录",
  },
  customers: {
    title: "新增客户",
    description: "先保存基础信息，后续还可以继续补充。",
    manualHref: "/customers",
    manualLabel: "查看客户中心",
  },
};

export function AssistantTaskShell({ surface }: AssistantTaskShellProps) {
  const router = useRouter();
  const [workflow, setWorkflow] = useState<AssistantWorkflowDirective | null | undefined>(undefined);
  const [returningMessage, setReturningMessage] = useState("");

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setWorkflow(readAssistantWorkflow());
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  function returnToAssistant(message: string) {
    setReturningMessage(message);
    clearAssistantWorkflow();
    window.setTimeout(() => {
      router.replace(`/dashboard?returnMessage=${encodeURIComponent(message)}`);
    }, 900);
  }

  function continueVisitAfterCustomerSaved(currentWorkflow: AssistantWorkflowDirective, message: string, customer?: CustomerRecord) {
    if (!currentWorkflow.visitSeed || !customer) {
      returnToAssistant(message);
      return;
    }

    const nextWorkflow: AssistantWorkflowDirective = {
      ...currentWorkflow,
      preferredSurface: "visit",
      presentation: "primary",
      launcher: {
        mood: currentWorkflow.launcher.mood,
        title: `已回到 ${customer.name} 的拜访任务页`,
        description: "客户基础信息已保存。我已把刚才的拜访内容继续接在后面，你可以直接核对并保存。",
        suggestion: "如无误，可直接保存这次拜访记录；若还要补信息，也可以继续完善。",
        secondaryAction: {
          label: "进入完整记录中心",
          href: "/records?tab=visits",
        },
      },
      visitSeed: {
        ...currentWorkflow.visitSeed,
        id: crypto.randomUUID(),
        values: {
          ...currentWorkflow.visitSeed.values,
          customerId: customer.id,
          name: customer.name,
          nickName: customer.nickname ?? currentWorkflow.visitSeed.values.nickName ?? "",
        },
        assistantNote: `${message}。现在可以继续完成刚才的拜访记录，原有内容已为你保留。`,
      },
      customerSeed: null,
    };

    persistAssistantWorkflow(nextWorkflow);
    setWorkflow(nextWorkflow);
    router.replace("/dashboard/task?surface=visit");
  }

  const validWorkflow = useMemo(() => {
    if (!workflow) {
      return null;
    }

    if (surface === "visit" && workflow.preferredSurface === "visit" && workflow.visitSeed) {
      return workflow;
    }

    if (surface === "activities" && workflow.preferredSurface === "activities" && workflow.activitySeed) {
      return workflow;
    }

    if (surface === "customers" && workflow.preferredSurface === "customers" && workflow.customerSeed) {
      return workflow;
    }

    return null;
  }, [surface, workflow]);

  if (workflow === undefined) {
    return (
      <Card className="glass-panel border-white/60 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <CardContent className="p-6 text-sm text-slate-600">正在打开…</CardContent>
      </Card>
    );
  }

  if (!validWorkflow) {
    const surfaceMeta = surfaceConfig[surface];

    return (
      <Card className="glass-panel border-white/60 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">这个链接已失效</h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">请回到助手重新开始，或直接进入相关栏目继续处理。</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard" className="inline-flex items-center rounded-full bg-[#123B5D] px-4 py-2 text-sm text-white transition hover:opacity-95">
              返回助手
            </Link>
            <Link href={surfaceMeta.manualHref} className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-[#123B5D]/30 hover:text-[#123B5D]">
              {surfaceMeta.manualLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  const dynamicDescription = surface === "customers" && validWorkflow.visitSeed
    ? "先保存客户基础信息，保存后会自动继续刚才的拜访记录。"
    : surfaceConfig[surface].description;

  return (
    <div className="space-y-4">
      {returningMessage && (
        <Card className="glass-panel overflow-hidden border-white/60 bg-white/92 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
          <CardContent className="p-6">
            <p className="text-sm leading-6 text-[#0F766E]">{returningMessage}</p>
          </CardContent>
        </Card>
      )}

      {surface === "visit" ? (

        <VisitManager
          key={validWorkflow.visitSeed?.id ?? "visit-task"}
          variant="embedded"
          source="assistant-task"
          draftSeed={validWorkflow.visitSeed ?? null}
          expandHref="/records?tab=visits&source=assistant-home"
          onSaved={(message) => returnToAssistant(message)}
        />
      ) : surface === "activities" ? (
        <ActivityManager
          variant="embedded"
          source="assistant-task"
          draftSeed={validWorkflow.activitySeed ?? null}
          expandHref="/records?tab=activities&source=assistant-home"
          onSaved={(message) => returnToAssistant(message)}
        />
      ) : (
        <CustomerCrmPanel
          variant="assistant"
          draftSeed={validWorkflow.customerSeed ?? null}
          onSaved={(message, customer) => continueVisitAfterCustomerSaved(validWorkflow, message, customer)}
        />
      )}
    </div>
  );
}
