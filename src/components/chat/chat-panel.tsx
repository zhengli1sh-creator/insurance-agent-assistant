"use client";

import { CircleAlert, CircleCheckBig, SendHorizonal, Sparkles, WandSparkles } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { initialMessages } from "@/lib/demo-data";
import { cn } from "@/lib/utils";
import { requestChatAssistant } from "@/modules/chat/chat-client";
import type { AssistantWorkflowDirective, AgentMessage, ChatRequestMode, ChatResponse } from "@/types/agent";

type QuickAction = string | { label: string; prompt?: string };

type ChatPanelProps = {
  mode?: ChatRequestMode;
  onWorkflowChange?: (workflow: AssistantWorkflowDirective | undefined) => void;
  initialMessages?: AgentMessage[];
  initialDraft?: string;
  quickActions?: QuickAction[];
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

function getMoodChipClassName(message: AgentMessage) {
  if (message.role === "user") {
    return "advisor-chip-info";
  }

  switch (message.mood) {
    case "鼓舞":
      return "advisor-chip-success";
    case "安慰":
      return "advisor-chip-warning";
    default:
      return "advisor-chip-info";
  }
}

function getStatusChipClassName(sending: boolean) {
  return sending ? "advisor-chip-info" : "advisor-chip-neutral";
}

function getStatusCardClassName(sending: boolean) {
  return sending ? "advisor-status-progress" : "advisor-status-healthy";
}

function getStatusIconClassName(sending: boolean) {
  return sending
    ? "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-sm"
    : "advisor-icon-badge advisor-icon-badge-success advisor-icon-badge-sm";
}

function getPreviewSurfaceClassName(preview?: AgentMessage["preview"]) {

  if (!preview) {
    return "";
  }

  if (preview.requiresConfirmation) {
    return "advisor-notice-card advisor-notice-card-warning";
  }

  return preview.actions?.length ? "advisor-review-card" : "advisor-notice-card advisor-notice-card-info";
}

function getPreviewIconToneClassName(preview?: AgentMessage["preview"]) {
  if (!preview) {
    return "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-sm";
  }

  if (preview.requiresConfirmation) {
    return "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm";
  }

  return preview.actions?.length
    ? "advisor-icon-badge advisor-icon-badge-success advisor-icon-badge-sm"
    : "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-sm";
}

function getPreviewKicker(preview?: AgentMessage["preview"]) {
  if (!preview) {
    return "Assistant preview";
  }

  if (preview.requiresConfirmation) {
    return "待确认执行";
  }

  return preview.actions?.length ? "下一步建议" : "结构化结果";
}

function getActionButtonClassName(variant?: "primary" | "secondary") {
  return variant === "secondary"
    ? "advisor-outline-button cursor-pointer rounded-full px-4 py-2 text-sm"
    : "advisor-primary-button cursor-pointer rounded-full px-4 py-2 text-sm text-white transition-all duration-200 hover:brightness-[1.03] disabled:shadow-none";
}

function getSectionLabel(mode: ChatRequestMode) {
  return mode === "companion" ? "陪伴式对话" : "助手驱动主流程";
}

function getQuickStartKicker(mode: ChatRequestMode) {
  return mode === "companion" ? "陪伴入口" : "Quick start";
}

function getQuickStartTitle(mode: ChatRequestMode) {
  return mode === "companion" ? "可以先从当下状态说起" : "直接从高频事项开始";
}

function getQuickStartTag(mode: ChatRequestMode) {
  return mode === "companion" ? "先稳住节奏" : "一项一项处理";
}

function getConversationNotice(mode: ChatRequestMode) {
  if (mode === "companion") {
    return "这里先不直接发起客户、记录或任务流程；如果你只是想缓一缓、理一理，或想有人接住一下，我会先陪你把节奏稳住。";
  }

  return "助手先理解目标，再把结果整理成预览或引导你进入结构化工作区；涉及写入、修改或生成任务时，会先提醒确认。";
}

function getFooterNote(mode: ChatRequestMode) {
  if (mode === "workflow") {
    return "我会先理解你的目标，再把你带到合适的内容工作区。";
  }

  if (mode === "companion") {
    return "这里不直接打开业务流程，适合先整理情绪、节奏和眼下最难的一步。";
  }

  return "需要确认的操作会先提醒你，不会直接改动客户资料。";
}

export function ChatPanel({
  mode = "chat",
  onWorkflowChange,
  initialMessages: customInitialMessages,
  initialDraft = "请帮我梳理今天最值得优先推进的客户，并提醒我下一步动作。",
  quickActions = defaultQuickActions,
  badgeLabel = "助手入口",
  title = "先把当前目标交给我",
  description = "我会先理解你的目标，必要时先澄清，再把你带到合适的结构化工作区继续处理。",
  statusIdleText = "等待你交代当前目标",
  statusSendingText = "正在理解并整理",
  promptHint = "直接描述真实情况即可；涉及写入、修改或生成任务时，我会先提示确认。",
  placeholder = "例如：今天拜访了林雅雯，她希望周五收到家庭保障缺口清单，并在下周安排一次家族资产梳理会。",
  submitLabel = "发给助手",
  sendingLabel = "处理中",
  className,
}: ChatPanelProps = {}) {
  const [messages, setMessages] = useState<AgentMessage[]>(customInitialMessages ?? initialMessages);
  const [draft, setDraft] = useState(initialDraft);
  const [pendingContinuationContext, setPendingContinuationContext] = useState("");
  const [sending, setSending] = useState(false);
  const [forceShowInput, setForceShowInput] = useState(false);
  const hasHeaderText = Boolean(title || description);
  const hasMessages = messages.length > 0;
  const latestMessage = messages[messages.length - 1];
  const hasDraftAction = latestMessage?.role === "assistant" && latestMessage.preview?.actions?.some((action) => action.draft !== undefined);
  const showInputArea = !hasDraftAction || forceShowInput;
  const statusText = sending ? statusSendingText : statusIdleText;
  const continuationActive = Boolean(pendingContinuationContext);

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

  function sendMessage(content: string, continuationContextOverride?: string | null) {
    const value = content.trim();
    if (!value || sending) {
      return;
    }

    const activeContinuationContext = continuationContextOverride === undefined
      ? pendingContinuationContext
      : continuationContextOverride || "";
    const requestMessage = activeContinuationContext
      ? `${activeContinuationContext} 用户补充：${value}`
      : value;

    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      mood: "执行",
      timestamp: "刚刚",
      content: value,
    };

    setMessages((current) => [...current, userMessage]);
    setDraft("");
    setPendingContinuationContext("");
    setForceShowInput(false);
    setSending(true);

    requestChatAssistant(requestMessage, mode)
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
    <Card
      className={cn(
        "glass-panel advisor-soft-card flex h-full flex-col overflow-hidden",
        hasMessages ? "min-h-[560px] sm:min-h-[640px]" : "min-h-[360px] sm:min-h-[420px]",
        className,
      )}
    >
      <CardHeader className="advisor-panel-header-surface pb-4 sm:pb-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {badgeLabel ? <Badge className="advisor-accent-chip rounded-full px-3 py-1">{badgeLabel}</Badge> : null}
              <span className="advisor-section-label">助手驱动主流程</span>
              <Badge className={cn(getStatusChipClassName(sending), "rounded-full border-0 px-3 py-1 xl:hidden")}>{statusText}</Badge>
            </div>

            {hasHeaderText ? (
              <div className="space-y-2">
                {title ? <CardTitle className="text-xl font-semibold text-slate-900 sm:text-2xl">{title}</CardTitle> : null}
                {description ? <p className="max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
              </div>
            ) : null}
          </div>

          <div className={cn("hidden min-w-[188px] rounded-[22px] px-4 py-3 text-sm xl:block", getStatusCardClassName(sending))}>
            <div className="flex items-start gap-3">
              <div className={getStatusIconClassName(sending)}>
                {sending ? <Sparkles className="h-4 w-4" /> : <CircleCheckBig className="h-4 w-4" />}
              </div>

              <div className="space-y-1">
                <p className="font-medium text-slate-900">当前状态</p>
                <p>{statusText}</p>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-4 p-4 sm:gap-5 sm:p-5">
        {quickActions.length > 0 ? (
          <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="advisor-kicker">{getQuickStartKicker(mode)}</p>
                <p className="mt-1 text-base font-semibold text-slate-900">{getQuickStartTitle(mode)}</p>
              </div>
              <span className="advisor-section-label">{getQuickStartTag(mode)}</span>

            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickActions.map((action) => {
                const actionLabel = typeof action === "string" ? action : action.label;
                const actionPrompt = typeof action === "string" ? action : action.prompt || action.label;

                return (
                  <button
                    key={actionLabel}
                    type="button"
                    onClick={() => {
                      setPendingContinuationContext("");
                      sendMessage(actionPrompt, null);
                    }}
                    className="advisor-outline-button cursor-pointer rounded-full px-3.5 py-2 text-[13px] transition-all duration-200 hover:-translate-y-0.5 sm:px-4 sm:text-sm"
                  >
                    {actionLabel}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {hasMessages ? (
          <ScrollArea className="advisor-subtle-card flex-1 rounded-[28px] p-4 sm:p-5">
            <div className="space-y-4 pr-2">
              <div className="advisor-notice-card advisor-notice-card-info rounded-[22px] p-3 text-xs leading-6 text-slate-600 sm:text-sm">
                助手先理解目标，再把结果整理成预览或引导你进入结构化工作区；涉及写入、修改或生成任务时，会先提醒确认。
              </div>

              {messages.map((message) => {
                const assistant = message.role === "assistant";
                const PreviewIcon = message.preview?.requiresConfirmation ? CircleAlert : WandSparkles;

                return (
                  <div key={message.id} className={cn("flex gap-3", assistant ? "justify-start" : "justify-end")}>
                    {assistant ? (
                      <Avatar className="mt-1 h-10 w-10 border border-white/80 shadow-sm">
                        <AvatarFallback className="bg-[var(--advisor-ink)] text-white">AI</AvatarFallback>
                      </Avatar>
                    ) : null}

                    <div className={cn("max-w-[88%] space-y-2", assistant ? "items-start" : "items-end text-right")}>
                      <div className={cn("rounded-[24px] px-4 py-3 text-sm leading-7", assistant ? "advisor-assistant-bubble text-slate-700" : "advisor-user-bubble text-white")}>
                        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs opacity-90">
                          <Badge className={cn(getMoodChipClassName(message), "rounded-full border-0 px-2.5 py-0.5", !assistant && "bg-white/15 text-white")}>{message.mood}</Badge>
                          <span>{message.timestamp}</span>
                        </div>
                        <p>{message.content}</p>
                      </div>

                      {message.preview ? (
                        <div className={cn(getPreviewSurfaceClassName(message.preview), "rounded-[24px] p-4 text-left sm:p-5")}>
                          <div className="flex items-start gap-3">
                            <div className={getPreviewIconToneClassName(message.preview)}>
                              <PreviewIcon className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="advisor-kicker">{getPreviewKicker(message.preview)}</p>
                              <div className="mt-1 text-base font-semibold text-slate-900">{message.preview.title}</div>
                              <p className="mt-2 text-sm leading-6 text-slate-600">{message.preview.description}</p>
                            </div>
                          </div>

                          <ul className="mt-4 space-y-2 text-sm text-slate-700">
                            {message.preview.items.map((item) => (
                              <li key={item} className="advisor-list-item-card flex items-start gap-3 rounded-[18px] px-3 py-2.5">
                                <span className="advisor-icon-badge advisor-icon-badge-warning mt-2 h-1.5 w-1.5 shrink-0 p-0" />
                                <span>{item}</span>
                              </li>

                            ))}
                          </ul>

                          {message.preview.actions && message.preview.actions.length > 0 ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {message.preview.actions.map((action) => (
                                <Button
                                  key={action.label}
                                  type="button"
                                  variant={action.variant === "secondary" ? "outline" : "default"}
                                  onClick={() => {
                                    if (action.workflow) {
                                      setPendingContinuationContext("");
                                      onWorkflowChange?.(action.workflow);
                                      return;
                                    }

                                    if (action.command) {
                                      setPendingContinuationContext("");
                                      sendMessage(action.command, action.continuationContext ?? null);
                                      return;
                                    }

                                    if (action.draft !== undefined) {
                                      setPendingContinuationContext(action.continuationContext ?? "");
                                      setDraft(action.draft);
                                      setForceShowInput(true);
                                    }
                                  }}
                                  className={getActionButtonClassName(action.variant)}
                                >
                                  {action.label}
                                </Button>
                              ))}
                            </div>
                          ) : null}

                          {message.preview.requiresConfirmation ? (
                            <div className="mt-4 flex flex-wrap gap-2">
                              <Button
                                type="button"
                                onClick={() => message.preview?.confirmCommand && sendMessage(message.preview.confirmCommand)}
                                className={getActionButtonClassName("primary")}
                              >
                                确认后执行
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setPendingContinuationContext("");
                                  setDraft("请补充客户层级、时间或后续事项细节");
                                  setForceShowInput(true);
                                }}
                                className={getActionButtonClassName("secondary")}
                              >
                                先补充细节
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : null}

        {showInputArea ? (
          <div className="advisor-input-dock rounded-[28px] p-4 sm:p-5">
            {promptHint ? (
              <div className="mb-3 flex items-start gap-2 text-sm leading-6 text-slate-600">
                <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
                  <Sparkles className="h-4 w-4" />
                </div>
                <p>{promptHint}</p>
              </div>
            ) : null}

            {continuationActive ? (
              <div className="advisor-notice-card advisor-notice-card-warning mb-3 rounded-[20px] p-3 text-sm leading-6 text-slate-700">
                你正在补充上一条待继续事项。发送后，我会沿着原来的上下文继续整理，不会把这次输入当成新的独立任务。
              </div>
            ) : null}

            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="advisor-form-control advisor-form-textarea min-h-24 rounded-[24px] px-4 py-3 text-sm leading-6 focus-visible:ring-0 sm:min-h-28 sm:leading-7"
              placeholder={placeholder}
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-slate-500">
                {mode === "workflow"
                  ? "我会先理解你的目标，再把你带到合适的内容工作区。"
                  : "需要确认的操作会先提醒你，不会直接改动客户资料。"}
              </p>

              <Button
                type="button"
                disabled={sending}
                onClick={() => sendMessage(draft)}
                className="advisor-primary-button cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-70"
              >
                {sending ? sendingLabel : submitLabel}
                <SendHorizonal className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4 text-sm leading-6 text-slate-700">
            当前有一项待继续处理的内容。你可以先使用上方建议动作，或点击“先补充细节”继续完善信息。
          </div>
        )}
      </CardContent>
    </Card>
  );
}
