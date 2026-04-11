"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { persistAssistantWorkflow } from "@/modules/chat/workflow-session";
import type { AssistantWorkflowDirective } from "@/types/agent";

function resolveWorkflowRoute(workflow: AssistantWorkflowDirective) {
  if (workflow.preferredSurface === "visit" && workflow.visitSeed) {
    return "/dashboard/task?surface=visit";
  }

  if (workflow.preferredSurface === "activities" && workflow.activitySeed) {
    return "/dashboard/task?surface=activities";
  }

  if (workflow.preferredSurface === "customers") {
    if (workflow.customerSeed) {
      return "/dashboard/task?surface=customers";
    }

    return workflow.launcher.secondaryAction?.href ?? "/customers";
  }

  if (workflow.preferredSurface === "tasks") {
    return workflow.launcher.secondaryAction?.href ?? "/tasks";
  }

  return workflow.launcher.secondaryAction?.href ?? null;
}

function shouldPersistWorkflow(workflow: AssistantWorkflowDirective) {
  return Boolean(workflow.visitSeed || workflow.activitySeed || workflow.customerSeed);
}

export default function ChatPage() {
  const router = useRouter();

  function handleWorkflowChange(nextWorkflow: AssistantWorkflowDirective | undefined) {
    if (!nextWorkflow) {
      return;
    }

    const targetHref = resolveWorkflowRoute(nextWorkflow);
    if (!targetHref) {
      return;
    }

    if (shouldPersistWorkflow(nextWorkflow)) {
      persistAssistantWorkflow(nextWorkflow);
    }

    router.push(targetHref);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="advisor-accent-chip rounded-full px-3 py-1">自由沟通</Badge>
            <span className="advisor-section-label">单主工作区</span>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            这里适合先交代眼前最想处理的一件事；需要转入客户、记录或任务视图时，我会直接带你进入对应工作区。
          </p>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => router.push("/dashboard")}
          className="advisor-outline-button h-9 rounded-full px-4 text-sm text-slate-700 hover:bg-white"
        >
          <ChevronLeft className="h-4 w-4" />
          返回助手首页
        </Button>
      </div>

      <ChatPanel
        mode="chat"
        onWorkflowChange={handleWorkflowChange}
        badgeLabel="自由沟通页"
        title="先把当前情况交给我"
        description="你可以直接说客户近况、拜访补录、活动补录、任务整理或查询需求；我会先理解，再在需要时把你带到结构化工作区继续完成。"
        initialDraft=""
        statusIdleText="等待你交代当前情况"
        statusSendingText="正在理解并整理下一步"
        promptHint="直接说真实情况即可；涉及保存、修改、生成任务或跨客户关联时，我会先提醒确认。"
        placeholder="例如：今天刚见完林雅雯，她希望下周前收到家庭保障缺口梳理，也想约一次关于子女教育金的深聊。"
      />
    </div>
  );
}
