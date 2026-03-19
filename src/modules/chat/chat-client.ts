import type { ChatRequestMode, ChatResponse } from "@/types/agent";

export async function requestChatAssistant(message: string, mode: ChatRequestMode = "chat") {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, mode }),
  });

  const data = (await response.json()) as ChatResponse;
  return { ok: response.ok, data };
}
