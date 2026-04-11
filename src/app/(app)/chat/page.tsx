"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { ChatPanel } from "@/components/chat/chat-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AgentMessage } from "@/types/agent";

const companionInitialMessages: AgentMessage[] = [
  {
    id: "companion-welcome-1",
    role: "assistant",
    mood: "安慰",
    timestamp: "刚刚",
    content: "今天如果你只是想缓一缓、理一理，或者想有人先接住你的情绪，也可以先在这里说。",
  },
  {
    id: "companion-welcome-2",
    role: "assistant",
    mood: "鼓舞",
    timestamp: "刚刚",
    content: "这里暂时不直接打开客户、记录或任务流程；我先陪你把状态稳住，再决定下一步。",
  },
];

const companionQuickActions = [
  { label: "今天有点累，想先缓一缓", prompt: "今天有点累，想先缓一缓，你先陪我把状态稳一下。" },
  { label: "刚被客户拒绝，心里有点堵", prompt: "我刚被客户拒绝了，心里有点堵，想先跟你说说。" },
  { label: "今天节奏很乱，帮我稳一下", prompt: "今天节奏有点乱，你先帮我把思路稳一下。" },
  { label: "你帮我看看，我最近做得怎么样", prompt: "你帮我看看，我最近其实做得怎么样。" },
  { label: "我现在有点怀疑自己", prompt: "我现在有点怀疑自己，是不是哪里没做好。" },
];

export default function ChatPage() {
  const router = useRouter();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="advisor-accent-chip rounded-full px-3 py-1">随便聊聊</Badge>
            <span className="advisor-section-label">轻陪伴工作区</span>
          </div>
          <p className="text-sm leading-6 text-slate-600">
            这里先不直接承接客户、记录或任务流程；如果你只是想缓一缓、理一理，或者想有人接住一下，我在。
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
        mode="companion"
        badgeLabel="陪伴模式"
        title="先把今天的状态交给我"
        description="这里更适合承接鼓励、安慰、压力整理和轻度复盘；不急着处理具体流程，先把节奏稳住。"
        initialMessages={companionInitialMessages}
        initialDraft=""
        quickActions={companionQuickActions}
        statusIdleText="等你开口，我会先接住你"
        statusSendingText="我在认真听你说"
        promptHint="你可以直接说累、乱、堵、委屈、怀疑自己，或者说说今天最放不下的一件事。"
        placeholder="例如：今天被客户婉拒了，心里有点堵，我有点怀疑是不是自己哪里没做好。"
        submitLabel="继续说"
        sendingLabel="正在陪你梳理"
      />
    </div>
  );
}

