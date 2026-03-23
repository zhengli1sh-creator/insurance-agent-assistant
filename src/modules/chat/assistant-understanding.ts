import { z } from "zod";

import { deepSeekEnv, hasDeepSeekEnv } from "@/lib/deepseek/config";
import { detectChatIntent, extractDateValue, type ChatIntent, type ChatIntentType } from "@/modules/chat/intent-service";
import type { AgentMood, AssistantSurface } from "@/types/agent";

type AssistantClarificationReason = "ambiguous_intent" | "missing_information" | "potential_input_error";

export type AssistantUnderstandingSource = "deepseek" | "rules";

export interface AssistantClarification {
  reason: AssistantClarificationReason;
  question: string;
}

export interface AssistantUnderstandingResult extends ChatIntent {
  source: AssistantUnderstandingSource;
  confidence: number;
  suggestedSurface: AssistantSurface;
  clarification?: AssistantClarification | null;
}

const clarificationSchema = z.object({
  reason: z.enum(["ambiguous_intent", "missing_information", "potential_input_error"]),
  question: z.string().trim().min(1),
});

const understandingSchema = z.object({
  intent: z.enum(["support", "customer_create", "customer_query", "visit_create", "activity_create", "tasks_query", "insights_query", "unknown"]),
  mood: z.enum(["鼓舞", "安慰", "执行"]),
  confirmed: z.boolean().optional().default(false),
  confidence: z.number().min(0).max(1).optional().default(0.5),
  suggestedSurface: z.enum(["visit", "activities", "customers", "tasks", "unknown"]).optional(),
  clarification: clarificationSchema.nullable().optional(),
  payload: z.record(z.string(), z.unknown()).optional().default({}),
});

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function clampConfidence(value: number) {
  return Math.max(0, Math.min(1, value));
}

function defaultSurfaceForIntent(intent: ChatIntentType): AssistantSurface {
  if (intent === "visit_create" || intent === "support") {
    return "visit";
  }

  if (intent === "activity_create") {
    return "activities";
  }

  if (intent === "customer_create" || intent === "customer_query") {
    return "customers";
  }

  if (intent === "tasks_query" || intent === "insights_query") {
    return "tasks";
  }

  return "unknown";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return value;
  }

  return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
}

function normalizeCustomerSource(value: string) {
  return value.trim().replace(/^(她|他|客户|这位客户)(是|来自)/, "").replace(/^来自/, "").trim();
}

function normalizeCustomerProfession(value: string) {
  return value.trim().replace(/^(一位|一名|一个)/, "").replace(/^(她|他|客户)是/, "").trim();
}

function normalizePayload(payload: Record<string, unknown>, message: string) {

  const nextPayload = { ...payload };
  const stringKeys = [
    "summary",
    "customerName",
    "nickName",
    "timeVisit",
    "location",
    "corePain",
    "methodCommunicate",
    "name",
    "nickname",

    "age",
    "sex",
    "profession",
    "familyProfile",
    "wealthProfile",
    "source",
    "coreInteresting",
    "preferCommunicate",
    "recentMoney",
    "remark",
    "keyword",

    "title",
    "dateActivity",
  ] as const;

  for (const key of stringKeys) {
    if (typeof nextPayload[key] === "string") {
      nextPayload[key] = nextPayload[key].trim();
    }
  }

  if (typeof nextPayload.source === "string") {
    nextPayload.source = normalizeCustomerSource(nextPayload.source);
  }

  if (typeof nextPayload.profession === "string") {
    nextPayload.profession = normalizeCustomerProfession(nextPayload.profession);
  }


  nextPayload.followWork = normalizeStringArray(nextPayload.followWork);
  nextPayload.participantNames = normalizeStringArray(nextPayload.participantNames);

  if (typeof nextPayload.summary !== "string" || !nextPayload.summary.trim()) {
    nextPayload.summary = message.trim();
  }

  return nextPayload;
}

function buildAmbiguousClarification(source: AssistantUnderstandingSource, mood: AgentMood, confirmed: boolean, message: string): AssistantUnderstandingResult {
  return {
    source,
    type: "unknown",
    mood,
    confirmed,
    confidence: 0.3,
    suggestedSurface: "unknown",
    clarification: {
      reason: "ambiguous_intent",
      question: "我还没完全听明白你的目标。你是想新增客户、记录拜访、补录活动，还是查看待办与客户情况？",
    },
    payload: normalizePayload({}, message),
  };
}

function buildVisitClarification(source: AssistantUnderstandingSource, message: string, mood: AgentMood, confirmed: boolean): AssistantUnderstandingResult {
  return {
    source,
    type: "visit_create",
    mood,
    confirmed,
    confidence: 0.46,
    suggestedSurface: "visit",
    clarification: {
      reason: "missing_information",
      question: "可以，我先帮你接住这次拜访。请先告诉我客户姓名或常用昵称，我再把记录页为你准备好。",

    },
    payload: {
      timeVisit: extractDateValue(message) || todayString(),
      summary: message.trim(),
    },
  };
}

function finalizeUnderstandingResult(result: AssistantUnderstandingResult, message: string) {
  const nextResult: AssistantUnderstandingResult = {
    ...result,
    confidence: clampConfidence(result.confidence),
    suggestedSurface: result.suggestedSurface ?? defaultSurfaceForIntent(result.type),
    clarification: result.clarification ?? null,
    payload: normalizePayload(result.payload, message),
  };

  if (nextResult.type === "unknown" && !nextResult.clarification) {
    return buildAmbiguousClarification(nextResult.source, nextResult.mood, nextResult.confirmed, message);
  }

  if (nextResult.type === "visit_create") {
    const payload = nextResult.payload as { customerName?: string; nickName?: string };
    if (!payload.customerName && !payload.nickName && !nextResult.clarification) {
      return buildVisitClarification(nextResult.source, message, nextResult.mood, nextResult.confirmed);
    }
  }


  return nextResult;
}

function normalizeModelResult(parsed: z.infer<typeof understandingSchema>, source: AssistantUnderstandingSource, message: string): AssistantUnderstandingResult {
  return finalizeUnderstandingResult(
    {
      source,
      type: parsed.intent,
      mood: parsed.mood,
      confirmed: parsed.confirmed,
      confidence: clampConfidence(parsed.confidence),
      suggestedSurface: parsed.suggestedSurface ?? defaultSurfaceForIntent(parsed.intent),
      clarification: parsed.clarification ?? null,
      payload: normalizePayload(parsed.payload, message),
    },
    message,
  );
}

function normalizeDeepSeekContent(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === "string") {
          return item;
        }

        if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
          return item.text;
        }

        return "";
      })
      .join("\n")
      .trim();
  }

  if (content && typeof content === "object") {
    return JSON.stringify(content);
  }

  return "";
}

function extractJsonObject(content: unknown) {
  if (content && typeof content === "object" && !Array.isArray(content)) {
    return content;
  }

  const raw = normalizeDeepSeekContent(content);
  if (!raw) {
    throw new Error("模型未返回合法内容");
  }

  const direct = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();

  try {
    return JSON.parse(direct) as unknown;
  } catch {
    const start = direct.indexOf("{");
    const end = direct.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("模型未返回合法 JSON");
    }

    return JSON.parse(direct.slice(start, end + 1)) as unknown;
  }
}

function splitClauses(message: string) {
  return message
    .split(/[，。,；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeVisitNickname(value: string) {
  return /(?:总|老师|主任|经理|老板|哥|姐|叔|姨|董|总监|院长|行长)$/.test(value)
    || /^(?:小|老|阿)[\u4e00-\u9fa5A-Za-z]{1,4}$/.test(value);
}

function normalizeVisitIdentityToken(value: string) {
  return value
    .trim()
    .replace(/^[“”"'\s]+|[“”"'\s]+$/g, "")
    .replace(/^(?:我说的|我刚说的|刚说的|前面说的|之前说的|这里说的|你说的|那个|这位|那位)/, "")
    .replace(/^(?:客户昵称|昵称|客户姓名|姓名)(?:是|叫)?/, "")
    .replace(/^(?:就是|是|叫)/, "")
    .trim();
}

function extractVisitIdentity(message: string) {

  // 优先识别「昵称就是姓名」这种确认句式（如：刘总就是刘涛 / 我说的刘总就是刘涛）
  const nickToNameMatch = message.match(/([^\s，。；\n""]{1,12})(?:就|也)(?:是|叫)["\"]?([\u4e00-\u9fa5A-Za-z]{2,12})["\"]?/);
  if (nickToNameMatch) {
    const left = normalizeVisitIdentityToken(nickToNameMatch[1]);
    const right = normalizeVisitIdentityToken(nickToNameMatch[2]);
    // 判断哪边是昵称（通常昵称更像尊称/小名）
    if (looksLikeVisitNickname(left) && !looksLikeVisitNickname(right)) {
      return { customerName: right, nickName: left };
    }
    if (looksLikeVisitNickname(right) && !looksLikeVisitNickname(left)) {
      return { customerName: left, nickName: right };
    }
    // 如果两边都像或都不像，默认左边是昵称，右边是姓名
    return { customerName: right, nickName: left };
  }


  const explicitCustomerName = normalizeVisitIdentityToken(
    message.match(/客户姓名(?:叫|是)?["\"]?([\u4e00-\u9fa5A-Za-z]{2,12})["\"]?/)?.[1]?.trim()
    ?? message.match(/姓名(?:叫|是)?["\"]?([\u4e00-\u9fa5A-Za-z]{2,12})["\"]?/)?.[1]?.trim()
    ?? ""
  );

  const explicitNickName = normalizeVisitIdentityToken(
    message.match(/当前昵称(?:叫|是)?["\"]?([^，。；\n""]{1,16})["\"]?/)?.[1]?.trim()
    ?? message.match(/昵称(?:叫|是)?["\"]?([^，。；\n""]{1,16})["\"]?/)?.[1]?.trim()
    ?? message.match(/(?:都叫她|都叫他|平时叫她|平时叫他|大家都叫她|大家都叫他)["\"]?([^，。；\n""]{1,16})["\"]?/)?.[1]?.trim()
    ?? ""
  );


  if (explicitCustomerName || explicitNickName) {
    return { customerName: explicitCustomerName, nickName: explicitNickName };
  }

  const patterns = [
    /见完([\u4e00-\u9fa5A-Za-z]{2,12})/,
    /拜访(?:了)?([\u4e00-\u9fa5A-Za-z]{2,12})/,
    /(?:跟|和)([\u4e00-\u9fa5A-Za-z]{2,12})(?:聊了|聊完|沟通了|沟通完|见面|碰面|面谈)/,
    /刚见了([\u4e00-\u9fa5A-Za-z]{2,12})/,
    /记录(?:一下)?([\u4e00-\u9fa5A-Za-z]{2,12})的拜访/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return looksLikeVisitNickname(match)
        ? { customerName: "", nickName: match }
        : { customerName: match, nickName: "" };
    }
  }

  return { customerName: "", nickName: "" };
}




function extractVisitLocation(message: string) {
  const patterns = [
    /在([^，。,；\n]{1,20})(?:见面|碰面|聊了|沟通|拜访)/,
    /地点(?:是|在)?([^，。,；\n]{1,20})/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function extractVisitCorePain(message: string) {
  const patterns = [
    /比较在意([^，。；\n]{2,30})/,
    /最在意([^，。；\n]{2,30})/,
    /关注([^，。；\n]{2,30})/,
    /聊到([^，。；\n]{2,30})/,
    /重点聊了([^，。；\n]{2,30})/,
    /她想了解([^，。；\n]{2,30})/,
    /希望了解([^，。；\n]{2,30})/,
    /聊了([^，。；\n]{2,24})/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function extractVisitSource(message: string) {
  const patterns = [
    /([\u4e00-\u9fa5A-Za-z]{2,20}转介绍)/,
    /来源(?:是|为)?([^，。；\n]{2,20})/,
    /通过([^，。；\n]{2,20})认识/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function extractVisitProfession(message: string) {
  const patterns = [
    /转介绍的([^，。；\n]{2,12})/,
    /是一位([^，。；\n]{2,12})/,
    /是个([^，。；\n]{2,12})/,
    /职业(?:是|为)?([^，。；\n]{2,12})/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return match;
    }
  }

  return "";
}

function extractVisitFollowUps(message: string) {

  const clauses = splitClauses(message);
  const followUps = clauses.filter((clause) => /发|发送|安排|跟进|邀请|再约|约一次|联系|回访|整理|准备|确认/.test(clause));

  return Array.from(new Set(followUps));
}

function detectVisitCommunication(message: string) {
  if (/电话/.test(message)) {
    return "电话";
  }

  if (/微信/.test(message)) {
    return "微信";
  }

  if (/见完|见面|碰面|面谈|拜访|当面|聊了/.test(message)) {
    return "面谈";
  }

  return "";
}

function looksLikeVisitIntent(message: string) {
  return /拜访|见完|见了|见面|碰面|面谈|聊了|聊完|沟通完|记一下拜访|记录拜访|补录拜访|继续刚才的拜访核对|继续核对|用户补充/.test(message);
}


function buildRuleBasedVisitUnderstanding(message: string): AssistantUnderstandingResult | null {
  const normalized = message.trim();
  const comfort = /辛苦|压力|难|焦虑|沮丧|挫败|乱|累|烦/.test(normalized);
  const mood: AgentMood = comfort ? "安慰" : "执行";
  const confirmed = /确认|直接|立即|现在就|马上/.test(normalized);
  const identity = extractVisitIdentity(normalized);
  const customerName = identity.customerName;
  const nickName = identity.nickName;
  const looksVisit = looksLikeVisitIntent(normalized);
  const vagueRecord = /帮我记一下|帮我补一下|补进去|记录一下|整理一下/.test(normalized);

  if (!looksVisit && !customerName && !nickName) {
    return null;
  }

  if (!customerName && !nickName && (looksVisit || vagueRecord)) {
    return buildVisitClarification("rules", normalized, mood, confirmed);
  }

  if (!customerName && !nickName) {
    return null;
  }


  return finalizeUnderstandingResult(
    {
      source: "rules",
      type: "visit_create",
      mood,
      confirmed,
      confidence: 0.78,
      suggestedSurface: "visit",
      clarification: null,
      payload: {
        customerName,
        nickName,
        timeVisit: extractDateValue(normalized) || todayString(),
        location: extractVisitLocation(normalized),
        corePain: extractVisitCorePain(normalized),
        profession: extractVisitProfession(normalized),
        source: extractVisitSource(normalized),
        summary: normalized,
        followWork: extractVisitFollowUps(normalized),
        methodCommunicate: detectVisitCommunication(normalized),
      },


    },
    normalized,
  );
}

function buildRuleBasedUnderstanding(message: string): AssistantUnderstandingResult {
  const visitResult = buildRuleBasedVisitUnderstanding(message);
  if (visitResult) {
    return visitResult;
  }

  const fallbackIntent = detectChatIntent(message);
  return finalizeUnderstandingResult(
    {
      source: "rules",
      ...fallbackIntent,
      confidence: fallbackIntent.type === "unknown" ? 0.3 : 0.72,
      suggestedSurface: defaultSurfaceForIntent(fallbackIntent.type),
      clarification: fallbackIntent.type === "unknown"
        ? {
            reason: "ambiguous_intent",
            question: "我还没完全听明白你的目标。你是想新增客户、记录拜访、补录活动，还是查看待办与客户情况？",
          }
        : null,
      payload: normalizePayload(fallbackIntent.payload, message),
    },
    message,
  );
}

function buildDeepSeekSystemPrompt() {
  return [
    "你是保险代理人助手的理解层，只负责理解，不负责执行。",
    "你必须只输出一个 JSON 对象，不要输出任何解释、markdown、代码块。",
    `当前日期：${todayString()}。能明确推断日期时，统一输出 YYYY-MM-DD。`,
    "允许的 intent：support、customer_create、customer_query、visit_create、activity_create、tasks_query、insights_query、unknown。",
    "允许的 mood：鼓舞、安慰、执行。若同时包含情绪诉求和业务诉求，先承接情绪，mood 输出安慰，但 intent 保留最主要的业务目标。",
    "多意图时，只保留一个主流程 intent，其余信息放进 payload.summary、payload.followWork 或其他合适字段，不要并发多个 intent。",
    "若意图不明确、信息不完整、存在歧义、可能口误或对象混淆，必须返回 clarification，不要猜测，不要假设。",
    "高风险写动作不会在这里执行，你只做结构化理解。",
    "visit_create 的 payload 尽量提取：customerName、nickName、timeVisit、location、corePain、profession、source、summary、followWork、methodCommunicate。followWork 优先输出字符串数组。若只有客户常用昵称、没有正式姓名，也要把昵称写入 nickName。若文本里出现客户来源或职业 / 身份，也一并提取。",
    "当用户是在补充或纠正客户身份时，要优先按语义理解，而不是机械截取字面片段。像‘我说的刘总就是刘涛’这类句子，应理解为 nickName=刘总、customerName=刘涛，不要把‘我说的刘总’整体当成昵称。",
    "若句子里同时出现一个昵称和一个正式姓名，并带有‘就是 / 是 / 叫 / 也叫’这类对应关系，优先把更像尊称或常用叫法的值放进 nickName，把正式姓名放进 customerName。",

    "activity_create 的 payload 尽量提取：title、dateActivity、participantNames、summary。participantNames 必须是字符串数组。",

    "customer_create 的 payload 尽量提取：name、nickname、age、sex、profession、familyProfile、wealthProfile、source、coreInteresting、preferCommunicate、recentMoney、remark。",
    "customer_create 中较个性化、难归类但对后续经营有价值的信息，如性格特点、决策习惯、服务禁忌、相处提醒，优先放进 remark。",
    "输出结构必须严格遵守：{ intent, mood, confirmed, confidence, suggestedSurface, clarification, payload }。",

    "clarification 仅允许：null，或 { reason: ambiguous_intent | missing_information | potential_input_error, question: string }。",
  ].join("\n");
}

async function understandWithDeepSeek(message: string) {
  if (!hasDeepSeekEnv()) {
    return null;
  }

  const response = await fetch(`${deepSeekEnv.baseUrl}/chat/completions`, {
    method: "POST",
    cache: "no-store",
    signal: AbortSignal.timeout(deepSeekEnv.timeoutMs),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${deepSeekEnv.apiKey}`,
    },
    body: JSON.stringify({
      model: deepSeekEnv.model,
      temperature: 0.1,
      max_tokens: 700,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildDeepSeekSystemPrompt(),
        },
        {
          role: "user",
          content: message,
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = (await response.text()).trim();
    throw new Error(`DeepSeek 请求失败：${response.status}${detail ? ` ${detail.slice(0, 300)}` : ""}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (content == null) {
    throw new Error("DeepSeek 未返回内容");
  }

  const parsed = understandingSchema.safeParse(extractJsonObject(content));
  if (!parsed.success) {
    throw new Error(`DeepSeek 返回结构不合法：${parsed.error.message}`);
  }

  return normalizeModelResult(parsed.data, "deepseek", message);
}

export async function understandAssistantMessage(message: string): Promise<AssistantUnderstandingResult> {
  try {
    const deepSeekResult = await understandWithDeepSeek(message);
    if (deepSeekResult) {
      return deepSeekResult;
    }
  } catch (error) {
    console.warn("[assistant-understanding] DeepSeek 调用失败，已回退本地规则。", error instanceof Error ? error.message : error);
  }

  return buildRuleBasedUnderstanding(message);
}
