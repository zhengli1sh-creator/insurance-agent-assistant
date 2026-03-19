"use client";

import { SendHorizonal, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { initialMessages } from "@/lib/demo-data";
import { requestChatAssistant } from "@/modules/chat/chat-client";
import type { AssistantWorkflowDirective, ChatRequestMode, ChatResponse, AgentMessage } from "@/types/agent";

type ChatPanelProps = {
  mode?: ChatRequestMode;
  onWorkflowChange?: (workflow: AssistantWorkflowDirective | undefined) => void;
  initialMessages?: AgentMessage[];
  initialDraft?: string;
  quickActions?: string[];
  badgeLabel?: string;
  title?: string;
  description?: string;
  statusIdleText?: string;
  statusSendingText?: string;
  promptHint?: string;
  placeholder?: string;
  submitLabel?: string;
  sendingLabel?: string;
  className?: string;
};

const defaultQuickActions = ["帮我新增一位客户", "记录今天的拜访", "找找适合统一跟进的客户", "我今天有点乱，先帮我理清重点"];


export function ChatPanel({
  mode = "chat",
  onWorkflowChange,
  initialMessages: customInitialMessages,
  initialDraft = "请帮我梳理今天最值得优先推进的客户，并提醒我下一步动作。",
  quickActions = defaultQuickActions,
  badgeLabel = "和助手聊一聊",
  title = "把今天要处理的事告诉我",
  description = "你可以像聊天一样把事情交给我。我会先理解重点，再帮你继续下一步。",
  statusIdleText = "随时可以开始",
  statusSendingText = "正在整理中",
  promptHint = "直接说真实情况就好，我会先帮你理清重点。",
  placeholder = "例如：今天拜访了林雅雯，她希望周五收到家庭保障缺口清单，并在下周安排一次家族资产梳理会。",
  submitLabel = "发给助手",
  sendingLabel = "处理中",
  className,
}: ChatPanelProps = {}) {
  const [messages, setMessages] = useState<AgentMessage[]>(customInitialMessages ?? initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [sending, setSending] = useState(false);

  function appendAssistant(data: ChatResponse) {
    const assistantMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      mood: data.mood,
      timestamp: "刚刚",
      content: data.error || data.reply,
      preview: data.preview ?? undefined,
    };

    setMessages((current) => [...current, assistantMessage]);
  }

  function sendMessage(content: string) {
    const value = content.trim();
    if (!value || sending) {
      return;
    }

    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      mood: "执行",
      timestamp: "刚刚",
      content: value,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setSending(true);

    requestChatAssistant(value, mode)
      .then(({ ok, data }) => {
        if (data.workflow) {
          onWorkflowChange?.(data.workflow);
        }

        appendAssistant(ok ? data : { reply: "我暂时没能完成这次处理。", mood: "安慰", error: data.error || "请稍后再试一次。" });
      })
      .catch(() => {
        onWorkflowChange?.(undefined);
        appendAssistant({ reply: "网络连接有些波动，我先把这次意图记在这里。", mood: "安慰", preview: null });
      })
      .finally(() => setSending(false));
  }

  return (
    <Card className={cn("glass-panel flex h-full min-h-[560px] flex-col overflow-hidden border-white/55 bg-white/85 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:min-h-[640px]", className)}>
      <CardHeader className="border-b border-slate-200/70 pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Badge className="mb-3 rounded-full border-0 bg-[#1E3A8A]/10 px-3 py-1 text-[#1E3A8A]">{badgeLabel}</Badge>
            <CardTitle className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</CardTitle>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
          <div className="hidden rounded-2xl border border-[#B8894A]/25 bg-[#B8894A]/10 px-4 py-3 text-sm text-slate-700 xl:block">
            <p className="font-medium text-slate-900">当前状态</p>
            <p>{sending ? statusSendingText : statusIdleText}</p>
          </div>

        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        <div className="flex flex-wrap gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => sendMessage(action)}
              className="cursor-pointer rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 text-[13px] text-slate-600 transition hover:-translate-y-0.5 hover:border-[#1E3A8A]/30 hover:text-[#1E3A8A] sm:px-4 sm:py-2 sm:text-sm"
            >
              {action}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 rounded-[28px] border border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(244,247,251,0.95))] p-4">
          <div className="space-y-4 pr-3">
            {messages.map((message) => {
              const assistant = message.role === "assistant";

              return (
                <div key={message.id} className={`flex gap-3 ${assistant ? "justify-start" : "justify-end"}`}>
                  {assistant && (
                    <Avatar className="mt-1 h-10 w-10 border border-white shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-[#1E3A8A] to-[#B8894A] text-white">AI</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[86%] space-y-2 ${assistant ? "items-start" : "items-end text-right"}`}>
                    <div className={`rounded-[24px] px-4 py-3 text-sm leading-7 shadow-sm ${assistant ? "bg-white text-slate-700" : "bg-gradient-to-br from-[#1E3A8A] to-[#2F7FD9] text-white"}`}>
                      <div className="mb-2 flex items-center gap-2 text-xs opacity-80">
                        <Badge className={`rounded-full border-0 px-2 py-0.5 ${assistant ? "bg-slate-100 text-slate-600" : "bg-white/15 text-white"}`}>{message.mood}</Badge>
                        <span>{message.timestamp}</span>
                      </div>
                      <p>{message.content}</p>
                    </div>

                    {message.preview && (
                      <div className="rounded-[24px] border border-[#B8894A]/20 bg-[#FFF8EE] p-4 text-left shadow-sm">
                        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-900">
                          <WandSparkles className="h-4 w-4 text-[#B8894A]" />
                          {message.preview.title}
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{message.preview.description}</p>
                        <ul className="mt-3 space-y-2 text-sm text-slate-700">
                          {message.preview.items.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B8894A]" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        {message.preview.requiresConfirmation && (
                          <div className="mt-4 flex gap-2">
                            <Button
                              type="button"
                              onClick={() => message.preview?.confirmCommand && sendMessage(message.preview.confirmCommand)}
                              className="cursor-pointer rounded-full bg-[#1E3A8A] text-white hover:bg-[#17306F]"
                            >
                              确认后执行
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setDraft("请补充客户层级、时间或后续事项细节")}
                              className="cursor-pointer rounded-full border-slate-300 bg-transparent"
                            >
                              先补充细节
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="rounded-[28px] border border-slate-200/70 bg-white/90 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-500">
            <Sparkles className="h-4 w-4 text-[#B8894A]" />
            {promptHint}
          </div>
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="min-h-24 rounded-3xl border-0 bg-slate-50/80 px-4 py-3 text-sm leading-6 shadow-none focus-visible:ring-2 focus-visible:ring-[#1E3A8A]/30 sm:min-h-28 sm:leading-7"
            placeholder={placeholder}
          />
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">{mode === "workflow" ? "我会先理解你的目标，再带你进入合适的内容。" : "需要确认的操作会先提醒你，不会直接改动客户资料。"}</p>

            <Button type="button" disabled={sending} onClick={() => sendMessage(draft)} className="cursor-pointer rounded-full bg-gradient-to-r from-[#1E3A8A] via-[#285DA8] to-[#B8894A] px-5 text-white shadow-lg shadow-[#1E3A8A]/25 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70">
              {sending ? sendingLabel : submitLabel}
              <SendHorizonal className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
