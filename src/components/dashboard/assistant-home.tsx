"use client";

import type { LucideIcon } from "lucide-react";
import { ArrowRight, Compass, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

  const initialMessages: AgentMessage[] = [
    {
      id: "assistant-home-welcome",
      role: "assistant",
      mood: returnMessage ? "执行" : "鼓舞",
      timestamp: "现在",
      content: returnMessage
        ? `${returnMessage}。可以继续告诉我下一步。`
        : "直接告诉我你现在想处理什么。我会带你进入合适的内容；如果你想自己查看客户、记录或任务，也可以直接进入下面的栏目。",


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
    <div className="space-y-6">
      <Card className="glass-panel overflow-hidden border-white/60 bg-[linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,251,255,0.94),rgba(247,244,238,0.9))] shadow-[0_28px_90px_rgba(15,23,42,0.12)]">
        <CardContent className="space-y-6 p-6 lg:p-8">
          <div className="space-y-4">
            <Badge className="rounded-full border-0 bg-[#123B5D]/10 px-3 py-1 text-[#123B5D]">开始今天的工作</Badge>
            <h2 className="max-w-4xl text-3xl font-semibold leading-tight text-slate-900 lg:text-[40px]">
              先说说今天要处理什么，
              <span className="font-[family-name:var(--font-accent)] text-[#B8894A]">我会带你进入最适合处理这件事的地方。</span>
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              先把当前目标说清楚。常见事项我会一步一步带你完成；如果你想自己查看客户、记录或任务，也可以直接进入下面的栏目。
            </p>
          </div>


          <div className="grid gap-4 lg:grid-cols-3">
            {selfServeRoutes.map((route) => {
              const Icon = route.icon;

              return (
                <Link key={route.href} href={route.href} className="group rounded-[28px] border border-white/70 bg-white/88 p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#123B5D]/18">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Badge className="rounded-full border-0 bg-[#F7F4EE] px-3 py-1 text-[#8A6A3E]">{route.badge}</Badge>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{route.label}</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#123B5D]/10 text-[#123B5D] transition group-hover:bg-[#123B5D] group-hover:text-white">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{route.description}</p>
                  <span className="mt-4 inline-flex items-center gap-2 text-sm text-[#123B5D]">
                    进入{route.label}
                    <ArrowRight className="h-4 w-4" />
                  </span>

                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <ChatPanel
        mode="workflow"
        onWorkflowChange={handleWorkflowChange}
        initialMessages={initialMessages}
        initialDraft="昨天组织了一场亲子财商沙龙，参加客户有林雅雯、王姐，我答应下周发送课程回顾并安排一对一沟通。"
        quickActions={assistantQuickActions}
        badgeLabel="和助手聊一聊"
        title="先说说你的目标"
        description="你不用先想该去哪里。只要告诉我现在想做什么，我会判断是记录拜访、补录活动、创建客户，还是直接带你查看客户、记录或任务。"
        statusIdleText="随时可以开始"
        statusSendingText="正在为你打开相关内容"
        promptHint="例如：刚见完客户、活动刚结束、要为新客户建档，或想先理清今天的重点。"
        submitLabel="交给助手"
        sendingLabel="正在打开"

      />
    </div>
  );
}
