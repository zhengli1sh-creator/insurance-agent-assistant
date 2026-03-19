"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Compass, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";


import { ChatPanel } from "@/components/chat/chat-panel";
import { clearAssistantWorkflow, persistAssistantWorkflow } from "@/modules/chat/workflow-session";

import type { AssistantWorkflowDirective } from "@/types/agent";


type AssistantHomeProps = {
  returnMessage?: string;
};

type SelfServeRoute = {
  label: string;
  description: string;
  href: string;
  badge: string;
  icon: LucideIcon;
};

const selfServeRoutes: SelfServeRoute[] = [
  {
    label: "客户中心",
    description: "查看客户资料，补充信息，继续跟进。",
    href: "/customers",
    badge: "客户",
    icon: Users,
  },
  {
    label: "记录中心",
    description: "查看拜访和活动记录，补录内容，回看历史。",
    href: "/records",
    badge: "记录",
    icon: NotebookPen,
  },
  {
    label: "任务与洞察",
    description: "查看今天要跟进的事，以及值得优先推进的客户。",
    href: "/tasks",
    badge: "任务",
    icon: Compass,
  },
];

const assistantQuickActions = [
  { label: "新增客户", prompt: "帮我新增一位客户" },
  { label: "新增拜访", prompt: "帮我新增一条拜访记录" },
  { label: "新增活动", prompt: "帮我新增一场客户活动并补录参与客户" },
  { label: "综合查询", prompt: "帮我做综合查询，看看客户、记录和任务里有哪些需要我现在优先处理的内容" },
];


function buildAssistantRoute(workflow: AssistantWorkflowDirective) {
  if (workflow.preferredSurface === "activities") {
    return "/dashboard/task?surface=activities";
  }

  if (workflow.preferredSurface === "visit") {
    return "/dashboard/task?surface=visit";
  }

  if (workflow.preferredSurface === "customers" && workflow.customerSeed) {
    return "/dashboard/task?surface=customers";
  }

  if (workflow.preferredSurface === "customers") {
    return "/customers";
  }

  if (workflow.preferredSurface === "tasks") {
    return "/tasks";
  }

  return "/dashboard";
}

export function AssistantHome({ returnMessage }: AssistantHomeProps) {
  const router = useRouter();



  function handleWorkflowChange(workflow: AssistantWorkflowDirective | undefined) {
    if (!workflow) {
      clearAssistantWorkflow();
      return;
    }

    const targetRoute = buildAssistantRoute(workflow);
    if (targetRoute.startsWith("/dashboard/task")) {
      persistAssistantWorkflow(workflow);
    } else {
      clearAssistantWorkflow();
    }

    router.push(targetRoute);
  }

  return (
    <div className="space-y-3 lg:space-y-5">
      {returnMessage && (
        <div className="rounded-[18px] border border-[#B8894A]/18 bg-[#FFF8EE] px-4 py-2.5 text-sm leading-6 text-slate-700">
          {returnMessage}。现在可以继续下一步。
        </div>
      )}

      <ChatPanel
        mode="workflow"
        onWorkflowChange={handleWorkflowChange}
        initialMessages={[]}
        initialDraft=""
        quickActions={assistantQuickActions}
        badgeLabel="和助手聊一聊"
        title=""
        description=""
        statusIdleText="随时可以开始"
        statusSendingText="正在为你打开相关内容"
        promptHint=""
        placeholder=""
        submitLabel="交给助手"
        sendingLabel="正在打开"
      />


      <div className="grid grid-cols-3 gap-3">
        {selfServeRoutes.map((route) => {
          const Icon = route.icon;

          return (
            <Link
              key={route.href}
              href={route.href}
              className="group rounded-[22px] border border-white/70 bg-white/88 p-3 shadow-[0_14px_40px_rgba(15,23,42,0.07)] transition hover:-translate-y-0.5 hover:border-[#123B5D]/18 sm:p-4"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123B5D]/10 text-[#123B5D] transition group-hover:bg-[#123B5D] group-hover:text-white">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-semibold leading-5 text-slate-900 sm:text-base">{route.label}</p>
              <p className="mt-1 hidden text-xs leading-5 text-slate-600 sm:block">{route.description}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs text-[#123B5D] sm:text-sm">
                进入
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );

}
