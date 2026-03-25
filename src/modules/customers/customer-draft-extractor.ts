import { z } from "zod";

import { deepSeekEnv, hasDeepSeekEnv } from "@/lib/deepseek/config";

export interface CustomerDraftExtraction {
  name: string;
  nickname: string;
  age: string;
  sex: string;
  profession: string;
  familyProfile: string;
  wealthProfile: string;
  coreInteresting: string;
  preferCommunicate: string;
  source: string;
  recentMoney: string;
  remark: string;
}

const customerDraftExtractionSchema = z.object({
  name: z.string().trim().optional().default(""),
  nickname: z.string().trim().optional().default(""),
  age: z.string().trim().optional().default(""),
  sex: z.string().trim().optional().default(""),
  profession: z.string().trim().optional().default(""),
  familyProfile: z.string().trim().optional().default(""),
  wealthProfile: z.string().trim().optional().default(""),
  coreInteresting: z.string().trim().optional().default(""),
  preferCommunicate: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default(""),
  recentMoney: z.string().trim().optional().default(""),
  remark: z.string().trim().optional().default(""),
});

const emptyExtraction: CustomerDraftExtraction = {
  name: "",
  nickname: "",
  age: "",
  sex: "",
  profession: "",
  familyProfile: "",
  wealthProfile: "",
  coreInteresting: "",
  preferCommunicate: "",
  source: "",
  recentMoney: "",
  remark: "",
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

function pickClauses(clauses: string[], tester: RegExp) {
  return Array.from(new Set(clauses.filter((item) => tester.test(item)))).join("；");
}

function normalizeProfession(value: string) {
  return value
    .replace(/^(一位|一名|一个)/, "")
    .replace(/^(她|他|客户)(是|在)/, "")
    .replace(/(工作|上班|任职)$/, "")
    .trim();
}

function normalizeSource(value: string) {
  return value
    .replace(/^(她|他|客户)(是|来自)/, "")
    .replace(/^来自/, "")
    .trim();
}

function normalizeSentence(value: string) {
  return value.replace(/^(她|他|客户)(比较|主要|目前|现在)?/, "").trim();
}

function stripCustomerCreateCommand(value: string) {
  return value
    .replace(/^(帮我|给我|帮忙|麻烦|请|先|直接|我想|我要|想|需要)?(?:新增|新建|创建|建立|录入|录一下|录个|录|做|建)(?:一位|一个|个)?(?:客户)?(?:档案|档|资料|信息|建档)?(?:吧)?[:：,，\s-]*/g, "")
    .replace(/^(客户建档|新增客户|新建客户|创建客户)(?:吧)?[:：,，\s-]*/g, "")
    .trim();
}

function detectSex(message: string) {

  if (/(女士|女性|女客户|宝妈|妈妈)/.test(message)) {
    return "女";
  }

  if (/(先生|男性|男客户|爸爸)/.test(message)) {
    return "男";
  }

  return "";
}

function detectCommunication(clauses: string[]) {
  const sentence = pickClause(clauses, /微信|电话|面谈|见面|当面|沟通偏好|联系/);
  if (!sentence) {
    return "";
  }

  if (/微信为主/.test(sentence)) {
    return "微信为主";
  }

  if (/电话为主/.test(sentence)) {
    return "电话为主";
  }

  if (/面谈|见面|当面/.test(sentence)) {
    return "面谈";
  }

  if (/微信/.test(sentence) && /电话/.test(sentence)) {
    return "微信、电话";
  }

  if (/微信/.test(sentence)) {
    return "微信";
  }

  if (/电话/.test(sentence)) {
    return "电话";
  }

  return normalizeSentence(sentence);
}

export function extractCustomerDraftByRules(message: string, currentName?: string): CustomerDraftExtraction {

  const normalized = message.trim();
  const clauses = splitClauses(normalized);
  const familyProfile = pickClauses(clauses, /家庭|孩子|女儿|儿子|老公|丈夫|爱人|太太|父母|单身|结婚|已婚/);
  const wealthProfile = pickClauses(clauses, /资产|存款|理财|保单|房|车|年收入|收入|现金流|企业|公司/);
  const recentMoney = pickClause(clauses, /资金|预算|保费|收入|现金流|存款|理财/);
  const sourceFromClause = pickClause(clauses, /转介绍|介绍|认识|渠道|活动|同学|朋友|家人|老客户|客户介绍/);
  const professionFromClause = pickClause(clauses, /职业|工作|上班|任职|老师|医生|老板|财务|销售|公务员|创业|经营/);
  const interestFromClause = pickClause(clauses, /关注|在意|担心|考虑|想了解|想给|重点|主要想|比较看重|规划/);
  const fieldMatchers = [
    /叫[\u4e00-\u9fa5A-Za-z]{2,16}|客户是[\u4e00-\u9fa5A-Za-z]{2,16}|客户叫[\u4e00-\u9fa5A-Za-z]{2,16}|她叫[\u4e00-\u9fa5A-Za-z]{2,16}/,
    /昵称(?:是|叫)?/,
    /\d{2}岁|年龄(?:是|为)?/,
    /女士|女性|女客户|宝妈|妈妈|先生|男性|男客户|爸爸/,
    /职业|工作|上班|任职|老师|医生|老板|财务|销售|公务员|创业|经营/,
    /家庭|孩子|女儿|儿子|老公|丈夫|爱人|太太|父母|单身|结婚|已婚/,
    /资产|存款|理财|保单|房|车|年收入|收入|现金流|企业|公司/,
    /关注|在意|担心|考虑|想了解|想给|重点|主要想|比较看重|规划/,
    /微信|电话|面谈|见面|当面|沟通偏好|联系/,
    /来源|通过.+认识|介绍的|转介绍|介绍|渠道|活动|同学|朋友|家人|老客户|客户介绍/,
    /资金|预算|保费|收入|现金流|存款|理财/,
  ];
  const remark = Array.from(new Set(
    clauses
      .map((item) => item.trim())
      .filter(Boolean)
      .filter((item) => !fieldMatchers.some((tester) => tester.test(item)))
      .map((item) => item.replace(/^(还有|另外|补充一句|补充|备注是|备注：)/, "").trim())
      .map(stripCustomerCreateCommand)
      .filter(Boolean),
  )).join("；");


  return {
    ...emptyExtraction,
    name:
      pickByPatterns(normalized, [
        /叫([\u4e00-\u9fa5A-Za-z]{2,16})/,
        /客户是([\u4e00-\u9fa5A-Za-z]{2,16})/,
        /客户叫([\u4e00-\u9fa5A-Za-z]{2,16})/,
        /她叫([\u4e00-\u9fa5A-Za-z]{2,16})/,
      ]) || currentName || "",
    nickname: pickByPatterns(normalized, [/昵称(?:是|叫)?([^，。,；\n]{1,16})/]),
    age: pickByPatterns(normalized, [/(\d{2})岁/, /年龄(?:是|为)?(\d{2})/]),
    sex: detectSex(normalized),
    profession:
      pickByPatterns(normalized, [
        /职业(?:是|为)?([^，。,；\n]{2,20})/,
        /是一位([^，。,；\n]{2,20})/,
        /是个([^，。,；\n]{2,20})/,
        /在([^，。,；\n]{2,20})(?:工作|上班|任职)/,
        /做([^，。,；\n]{2,20})/,
      ], normalizeProfession) || normalizeProfession(professionFromClause),
    familyProfile,
    wealthProfile,
    coreInteresting:
      pickByPatterns(normalized, [
        /关注([^，。,；\n]{2,30})/,
        /在意([^，。,；\n]{2,30})/,
        /想了解([^，。,；\n]{2,30})/,
        /主要想([^，。,；\n]{2,30})/,
        /重点是([^，。,；\n]{2,30})/,
      ], normalizeSentence) || normalizeSentence(interestFromClause),
    preferCommunicate: detectCommunication(clauses),
    source:
      pickByPatterns(normalized, [
        /来源(?:是|为)?([^，。,；\n]{2,20})/,
        /通过([^，。,；\n]{2,20})认识/,
        /是([^，。,；\n]{2,20}介绍的)/,
        /由([^，。,；\n]{2,20}介绍)/,
      ], normalizeSource) || normalizeSource(sourceFromClause),
    recentMoney: normalizeSentence(recentMoney),
    remark,
  };
}


function buildDeepSeekPrompt(currentName?: string, currentRemark?: string) {
  const lines = [
    "你是保险代理人助手里的客户信息提取器，只负责从自然语言里抽取客户档案字段，不负责解释。",
    "你必须只输出一个 JSON 对象，不要输出任何 markdown、说明或代码块。",
    "禁止编造。没有提到的字段输出空字符串。",
    currentName ? `当前客户姓名：${currentName}。若用户只说"她/他"，且没有新名字，可沿用当前客户姓名。` : "若用户没有明确说出客户姓名，name 输出空字符串。",
  ];

  // 关键：让大模型理解备注的意图
  if (currentRemark && currentRemark.trim()) {
    lines.push(
      "",
      "【备注处理规则 - 重要】",
      `当前已有备注内容："${currentRemark.trim()}"`,
      "请分析用户输入中对备注的意图，并输出处理后的完整备注内容：",
      "- 若用户说'补充'、'还有'、'另外'、'再记一下'、'再补充'等 → 将新内容追加到现有备注之后，用分号分隔",
      "- 若用户说'改为'、'应该是'、'修改为'、'更正'、'不对'等 → 用新内容完全替换现有备注",
      "- 若用户说'删除'、'清空'、'去掉备注'、'不要了'等 → remark 输出空字符串",
      "- 若用户只是描述一些难以归入标准字段的信息，但未明确表达追加或替换意图 → 默认追加到现有备注",
      "- 如果用户输入中没有涉及备注相关内容 → 保持现有备注不变（直接输出当前备注内容）",
      "输出时 remark 字段应包含根据用户意图处理后的完整备注内容"
    );
  } else {
    lines.push(
      "",
      "【备注处理】",
      "当前无备注。若用户输入包含备注信息，直接写入 remark 字段。"
    );
  }

  lines.push(
    "",
    "请尽量提取这些字段：name、nickname、age、sex、profession、familyProfile、wealthProfile、coreInteresting、preferCommunicate、source、recentMoney、remark。",
    "若文中出现家庭成员、婚姻、孩子、父母等，写入 familyProfile。",
    "若文中出现资产、收入、存款、房车、理财、企业等，写入 wealthProfile。",
    "若文中出现预算、现金流、近期可动用资金、保费承受能力等，写入 recentMoney。",
    "若文中出现较个性化、难以归入标准字段、但对后续经营有价值的信息，例如性格特点、决策习惯、服务禁忌、相处提醒等，写入 remark。",
    "remark 不要机械重复其他字段已经承接的信息。",
    "sex 只允许输出：男、女或空字符串。",
    '输出结构严格为：{"name":"","nickname":"","age":"","sex":"","profession":"","familyProfile":"","wealthProfile":"","coreInteresting":"","preferCommunicate":"","source":"","recentMoney":"","remark":""}'
  );

  return lines.join("\n");
}

async function extractWithDeepSeek(message: string, currentName?: string, currentRemark?: string) {
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
          content: buildDeepSeekPrompt(currentName, currentRemark),
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

  const parsed = customerDraftExtractionSchema.safeParse(JSON.parse(content));
  if (!parsed.success) {
    throw new Error(`DeepSeek 返回结构不合法：${parsed.error.message}`);
  }

  return parsed.data;
}

export async function extractCustomerDraft(message: string, currentName?: string, currentRemark?: string): Promise<CustomerDraftExtraction> {
  const normalized = message.trim();
  if (!normalized) {
    return { ...emptyExtraction, name: currentName?.trim() ?? "", remark: currentRemark?.trim() ?? "" };
  }

  try {
    const deepSeekResult = await extractWithDeepSeek(normalized, currentName, currentRemark);
    if (deepSeekResult) {
      return deepSeekResult;
    }
  } catch (error) {
    console.warn("[customer-draft-extractor] DeepSeek 调用失败，已回退本地规则。", error instanceof Error ? error.message : error);
  }

  // 规则提取回退：将当前备注传递给规则提取器
  const ruleResult = extractCustomerDraftByRules(normalized, currentName);
  // 如果规则提取没有提取到新备注，但用户有当前备注，则保留当前备注
  if (!ruleResult.remark && currentRemark) {
    ruleResult.remark = currentRemark.trim();
  }
  return ruleResult;
}

