"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Compass, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { clearAssistantWorkflow, persistAssistantWorkflow } from "@/modules/chat/workflow-session";
import type { AgentMessage, AssistantWorkflowDirective } from "@/types/agent";

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
  "帮我新增一位客户",
  "今天拜访了林雅雯，帮我整理成记录",
  "昨天有一场客户活动，帮我补录",
  "我今天有点乱，先帮我梳理最值得推进的一件事",
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
  const [activeTab, setActiveTab] = useState<"chat" | "work">("chat");

  const initialMessages: AgentMessage[] = [
    {
      id: "assistant-home-welcome",
      role: "assistant",
      mood: returnMessage ? "执行" : "鼓舞",
      timestamp: "现在",
      content: returnMessage
        ? `${returnMessage}。可以继续告诉我下一步。`
        : "直接告诉我你现在想处理什么。我会带你接着往下做。",
    },
  ];

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
    <div className="space-y-4 lg:space-y-6">
      <Card className="glass-panel overflow-hidden border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,251,255,0.94),rgba(247,244,238,0.9))] shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
        <CardContent className="space-y-4 p-4 sm:p-5 lg:p-6">
          <div className="space-y-2">
            <Badge className="rounded-full border-0 bg-[#123B5D]/10 px-3 py-1 text-[#123B5D]">今天先从一件事开始</Badge>
            <h2 className="max-w-3xl text-[28px] font-semibold leading-tight text-slate-900 sm:text-3xl lg:text-[40px]">先和助手聊一聊</h2>
            <p className="max-w-3xl text-sm leading-6 text-slate-600 sm:leading-7">
              你只要说现在想做什么，我会带你接着往下做；如果你想自己处理，也可以切到工作页直接进入客户、记录或任务。
            </p>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 rounded-[24px] bg-[#F4F7FB] p-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`h-11 rounded-[18px] px-3 text-sm font-medium transition ${
                activeTab === "chat" ? "bg-[#123B5D] text-white shadow-sm" : "text-slate-600 hover:bg-white/80"
              }`}
            >
              和助手聊一聊
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("work")}
              className={`h-11 rounded-[18px] px-3 text-sm font-medium transition ${
                activeTab === "work" ? "bg-[#123B5D] text-white shadow-sm" : "text-slate-600 hover:bg-white/80"
              }`}
            >
              开始今天的工作
            </button>
          </div>

          {returnMessage && (
            <div className="rounded-[22px] border border-[#B8894A]/18 bg-[#FFF8EE] px-4 py-3 text-sm leading-6 text-slate-700">
              {returnMessage}。现在可以继续下一步。
            </div>
          )}
        </CardContent>
      </Card>

      {activeTab === "chat" ? (
        <ChatPanel
          mode="workflow"
          onWorkflowChange={handleWorkflowChange}
          initialMessages={initialMessages}
          initialDraft="昨天组织了一场亲子财商沙龙，参加客户有林雅雯、王姐，我答应下周发送课程回顾并安排一对一沟通。"
          quickActions={assistantQuickActions}
          badgeLabel="和助手聊一聊"
          title="先和我说一句"
          description="你不用先判断该去哪里。只要告诉我现在想做什么，我会帮你接上后面的内容。"
          statusIdleText="随时可以开始"
          statusSendingText="正在为你打开相关内容"
          promptHint="例如：刚见完客户、活动刚结束、要为新客户建档，或想先理清今天的重点。"
          submitLabel="交给助手"
          sendingLabel="正在打开"
        />
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <Card className="glass-panel border-white/60 bg-white/88 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <CardContent className="space-y-3 p-4 sm:p-5">
              <Badge className="rounded-full border-0 bg-[#F7F4EE] px-3 py-1 text-[#8A6A3E]">开始今天的工作</Badge>
              <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl">直接进入你现在要处理的栏目。</h3>
              <p className="text-sm leading-6 text-slate-600">适合想直接查看客户、补录记录、处理待办，或回看今天重点的时候使用。</p>
            </CardContent>
          </Card>

          <div className="grid gap-3 sm:gap-4 lg:grid-cols-3">
            {selfServeRoutes.map((route) => {
              const Icon = route.icon;

              return (
                <Link
                  key={route.href}
                  href={route.href}
                  className="group rounded-[26px] border border-white/70 bg-white/88 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#123B5D]/18 sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="rounded-full border-0 bg-[#F7F4EE] px-3 py-1 text-[#8A6A3E]">{route.badge}</Badge>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{route.label}</p>
                    </div>
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123B5D]/10 text-[#123B5D] transition group-hover:bg-[#123B5D] group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{route.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm text-[#123B5D]">
                    进入{route.label}
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
