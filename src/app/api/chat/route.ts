import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { executeChatMessage, planChatMessage } from "@/modules/chat/action-executor";
import { buildAssistantWorkflow } from "@/modules/chat/workflow-director";
import { detectChatIntent } from "@/modules/chat/intent-service";
import type { ChatRequestMode, ChatResponse } from "@/types/agent";

function buildPreviewOnlyReply(message: string): ChatResponse {
  const intent = detectChatIntent(message);
  const workflow = buildAssistantWorkflow(message, intent);

  if (intent.type === "support") {
    return {
      reply: "你已经在高要求客户场景里做得很稳了。当前还是演示模式，我先陪你把节奏稳住；等 Supabase 配置完成后，我就能直接帮你落库和查询。",
      mood: intent.mood,
      preview: null,
      workflow,
    };
  }

  const writeIntent = intent.type === "customer_create" || intent.type === "visit_create" || intent.type === "activity_create";

  return {
    reply: writeIntent
      ? "我已经理解到你的业务动作。当前处于演示模式：可以继续预览确认逻辑，等 Supabase 登录与环境变量就绪后，我会直接执行真实写入。"
      : "我已经理解到你的查询意图。当前处于演示模式：可以先体验对话结构与结果呈现，配置 Supabase 后将返回真实数据。",
    mood: intent.mood,
    preview: {
      title: writeIntent ? "演示模式预览" : "演示模式查询",
      description: writeIntent ? "待真实数据库启用后，可直接执行新增或记录动作。" : "待真实数据库启用后，可直接返回客户、任务与洞察结果。",
      items: [message],
      requiresConfirmation: writeIntent,
      confirmCommand: writeIntent ? `确认 ${message}` : undefined,
    },
    workflow,
  };
}

export async function POST(request: Request) {
  const body = (await request.json()) as { message?: string; mode?: ChatRequestMode };
  const message = body.message?.trim() ?? "";
  const mode = body.mode === "workflow" ? "workflow" : "chat";

  if (!message) {
    return NextResponse.json({ error: "消息不能为空" }, { status: 400 });
  }

  if (mode === "workflow") {
    return NextResponse.json(planChatMessage(message));
  }

  const context = await requireUserContext();

  if (!context.supabase || !context.user) {
    return NextResponse.json(buildPreviewOnlyReply(message));
  }

  const result = await executeChatMessage(context.supabase, context.user, message);
  return NextResponse.json(result);
}
