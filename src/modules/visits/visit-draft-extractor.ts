import { z } from "zod";

import { deepSeekEnv, hasDeepSeekEnv } from "@/lib/deepseek/config";

export interface VisitDraftExtraction {
  timeVisit: string;
  location: string;
  methodCommunicate: string;
  corePain: string;
  briefContent: string;
  followWork: string;
}

const visitDraftExtractionSchema = z.object({
  timeVisit: z.string().trim().optional().default(""),
  location: z.string().trim().optional().default(""),
  methodCommunicate: z.string().trim().optional().default(""),
  corePain: z.string().trim().optional().default(""),
  briefContent: z.string().trim().optional().default(""),
  followWork: z.string().trim().optional().default(""),
});

const emptyExtraction: VisitDraftExtraction = {
  timeVisit: "",
  location: "",
  methodCommunicate: "",
  corePain: "",
  briefContent: "",
  followWork: "",
};

function splitClauses(message: string) {
  return message
    .split(/[，。,；；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function pickByPatterns(message: string, patterns: RegExp[], transform?: (value: string) => string) {
  for (const pattern of patterns) {
    const match = message.match(pattern)?.[1]?.trim();
    if (match) {
      return transform ? transform(match) : match;
    }
  }
  return "";
}

function pickClause(clauses: string[], tester: RegExp) {
  return clauses.find((item) => tester.test(item)) ?? "";
}

function normalizeSentence(value: string) {
  return value.replace(/^(客户|他|她|对方)(比较|主要|目前|现在|说)?/, "").trim();
}

function extractDate(message: string): string {
  const today = new Date();
  const year = today.getFullYear();

  // 匹配 "今天"、"昨天"、"前天"
  if (/今天/.test(message)) {
    return today.toISOString().slice(0, 10);
  }
  if (/昨天/.test(message)) {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toISOString().slice(0, 10);
  }
  if (/前天/.test(message)) {
    const dayBeforeYesterday = new Date(today);
    dayBeforeYesterday.setDate(dayBeforeYesterday.getDate() - 2);
    return dayBeforeYesterday.toISOString().slice(0, 10);
  }

  // 匹配 "3月15日"、"3月15号"、"03-15"、"2024-03-15"
  const dateMatch = message.match(/(\d{4})?[年\-/]?(\d{1,2})[月\-/](\d{1,2})[日号]?/);
  if (dateMatch) {
    const matchedYear = dateMatch[1];
    const month = dateMatch[2].padStart(2, "0");
    const day = dateMatch[3].padStart(2, "0");
    const finalYear = matchedYear || year;
    return `${finalYear}-${month}-${day}`;
  }

  // 匹配 "15号"、"15日"
  const dayMatch = message.match(/(\d{1,2})[号日]/);
  if (dayMatch) {
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = dayMatch[1].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return "";
}

function extractLocation(message: string): string {
  return pickByPatterns(message, [
    /在([^，。,；\n]{2,30})(?:见面|拜访|聊|谈|沟通)/,
    /地点(?:是|在)?[:：]?([^，。,；\n]{2,30})/,
    /去了([^，。,；\n]{2,30})/,
    /约在([^，。,；\n]{2,30})/,
    /在([^，。,；\n]{2,30})办公室/,
    /在([^，。,；\n]{2,30})公司/,
    /在([^，。,；\n]{2,30})咖啡厅/,
    /在([^，。,；\n]{2,30})茶馆/,
  ]);
}

function extractMethod(message: string): string {
  const clauses = splitClauses(message);
  const methodClause = pickClause(clauses, /面谈|电话|微信|视频|线上|线下|见面|拜访|约见/);

  if (/面谈|见面|线下/.test(methodClause)) return "面谈";
  if (/电话/.test(methodClause)) return "电话";
  if (/微信/.test(methodClause)) return "微信";
  if (/视频/.test(methodClause)) return "视频";
  if (/线上/.test(methodClause)) return "线上沟通";
  if (/拜访|约见/.test(methodClause)) return "拜访";

  return normalizeSentence(methodClause);
}

function extractCorePain(message: string): string {
  const clauses = splitClauses(message);

  // 找包含"在意"、"担心"、"关注"、"想了解"的句子
  const painClause = pickClause(clauses, /在意|担心|关注|顾虑|疑问|问|想了解|想咨询|想给.*规划|主要想|重点是/);

  return normalizeSentence(painClause);
}

function extractBriefContent(message: string): string {
  const clauses = splitClauses(message);

  // 排除已经提取过的内容
  const contentClauses = clauses.filter((clause) => {
    // 排除时间、地点、沟通方式相关的句子
    if (/今天|昨天|前天|\d{1,2}月|\d{1,2}[号日]|\d{4}-\d{2}-\d{2}/.test(clause) && clause.length < 15) return false;
    if (/在[^，。]{2,20}(?:见面|拜访|聊|谈|办公室|公司)/.test(clause) && clause.length < 20) return false;
    if (/面谈|电话|微信|视频|线上|线下/.test(clause) && clause.length < 10) return false;
    if (/^(客户|他|她|对方)(比较|主要|目前|现在)?(在意|担心|关注|顾虑|疑问)/.test(clause)) return false;
    if (/^(后续|接下来|后面|然后|待办|动作|需要)(要|还|接着|继续|跟进)/.test(clause)) return false;
    return true;
  });

  return contentClauses.join("；");
}

function extractFollowWork(message: string): string {
  const clauses = splitClauses(message);

  // 找包含"后续"、"接下来"、"然后"、"待办"、"动作"、"需要"的句子
  const followClauses = clauses.filter((clause) =>
    /后续|接下来|后面|然后|待办|动作|需要|跟进|准备|计划|安排|约|联系/.test(clause),
  );

  return followClauses.map(normalizeSentence).join("；");
}

export function extractVisitDraftByRules(message: string): VisitDraftExtraction {
  const normalized = message.trim();

  return {

    ...emptyExtraction,
    timeVisit: extractDate(normalized),
    location: extractLocation(normalized),
    methodCommunicate: extractMethod(normalized),
    corePain: extractCorePain(normalized),
    briefContent: extractBriefContent(normalized),
    followWork: extractFollowWork(normalized),
  };
}

function buildDeepSeekPrompt() {
  return [
    "你是保险代理人助手里的拜访记录信息提取器，只负责从自然语言里抽取拜访记录字段，不负责解释。",
    "你必须只输出一个 JSON 对象，不要输出任何 markdown、说明或代码块。",
    "禁止编造。没有提到的字段输出空字符串。",
    "请尽量提取这些字段：timeVisit（拜访日期，格式YYYY-MM-DD）、location（地点）、methodCommunicate（沟通方式，如面谈/电话/微信等）、corePain（客户当下最在意的问题/核心痛点）、briefContent（拜访内容摘要）、followWork（后续待办事项）。",
    "日期处理：\"今天\"输出当天日期，\"昨天\"输出昨天日期，\"3月15日\"转换为YYYY-03-15。",
    "briefContent 应该是对拜访过程的简要总结，不要包含已经单独提取的日期、地点、沟通方式。",
    "followWork 应该包含后续需要跟进的动作、待办事项、约定等。",
    '输出结构严格为：{"timeVisit":"","location":"","methodCommunicate":"","corePain":"","briefContent":"","followWork":""}',
  ].join("\n");
}

async function extractWithDeepSeek(message: string) {
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
      max_tokens: 800,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: buildDeepSeekPrompt(),
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
        content?: string;
      };
    }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) {
    throw new Error("DeepSeek 未返回内容");
  }

  const parsed = visitDraftExtractionSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error(`DeepSeek 返回结构不合法：${parsed.error.message}`);
  }

  return parsed.data;
}

export async function extractVisitDraft(message: string): Promise<VisitDraftExtraction> {
  const normalized = message.trim();
  if (!normalized) {
    return { ...emptyExtraction };
  }

  try {
    const deepSeekResult = await extractWithDeepSeek(normalized);
    if (deepSeekResult) {
      return deepSeekResult;
    }
  } catch (error) {
    console.warn("[visit-draft-extractor] DeepSeek 调用失败，已回退本地规则。", error instanceof Error ? error.message : error);
  }

  return extractVisitDraftByRules(normalized);
}
