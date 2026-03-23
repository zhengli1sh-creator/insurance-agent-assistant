export type ChatIntentType =
  | "support"
  | "customer_create"
  | "customer_query"
  | "visit_create"
  | "activity_create"
  | "tasks_query"
  | "insights_query"
  | "unknown";

export interface ChatIntent {
  type: ChatIntentType;
  mood: "鼓舞" | "安慰" | "执行";
  confirmed: boolean;
  payload: Record<string, unknown>;
}

function extractName(message: string) {
  return message.match(/叫([\u4e00-\u9fa5A-Za-z]{2,12})/)?.[1] ?? "";
}

function extractAfter(message: string, marker: string) {
  return message.match(new RegExp(`${marker}([^，。,；\n]{1,40})`))?.[1]?.trim() ?? "";
}

function offsetDate(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
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
  const nickToNameMatch = message.match(/([^\s，。；\n]{1,12})(?:就|也)(?:是|叫)([^，。；\n]{1,12})/);
  if (nickToNameMatch) {
    const left = normalizeVisitIdentityToken(nickToNameMatch[1]);
    const right = normalizeVisitIdentityToken(nickToNameMatch[2]);
    if (looksLikeVisitNickname(left) && !looksLikeVisitNickname(right)) {
      return { customerName: right, nickName: left };
    }
    if (looksLikeVisitNickname(right) && !looksLikeVisitNickname(left)) {
      return { customerName: left, nickName: right };
    }
    return { customerName: right, nickName: left };
  }

  const explicitNickName = normalizeVisitIdentityToken(message.match(/昵称(?:叫|是)?([^，。,；\n]{1,16})/)?.[1]?.trim() ?? "");
  if (explicitNickName) {
    return { customerName: "", nickName: explicitNickName };
  }


  const matched =
    message.match(/拜访了([\u4e00-\u9fa5A-Za-z]{2,12})/)?.[1] ??
    message.match(/见完([\u4e00-\u9fa5A-Za-z]{2,12})/)?.[1] ??
    message.match(/(?:跟|和)([\u4e00-\u9fa5A-Za-z]{2,12})(?:聊了|聊完|沟通了|沟通完|见面|碰面|面谈)/)?.[1] ??
    "";

  if (!matched) {
    return { customerName: "", nickName: "" };
  }

  return looksLikeVisitNickname(matched)
    ? { customerName: "", nickName: matched }
    : { customerName: matched, nickName: "" };
}



export function extractDateValue(message: string) {

  const exactDate = message.match(/\d{4}-\d{2}-\d{2}/)?.[0];
  if (exactDate) {
    return exactDate;
  }

  if (/今天/.test(message)) {
    return offsetDate(0);
  }

  if (/昨天/.test(message)) {
    return offsetDate(-1);
  }

  if (/明天/.test(message)) {
    return offsetDate(1);
  }

  return "";
}

function parseParticipantNames(message: string) {
  const participants =
    message.match(/参加客户有(.+?)(?:，我|；我|。|；|\n|$)/)?.[1] ?? message.match(/客户有(.+?)(?:，我|；我|。|；|\n|$)/)?.[1] ?? "";
  return participants.split(/[、，,\s]+/).map((item) => item.trim()).filter(Boolean);
}


export function detectChatIntent(message: string): ChatIntent {
  const normalized = message.trim();
  const confirmed = /确认|直接|立即|现在就|马上/.test(normalized);
  const comfort = /辛苦|压力|难|焦虑|沮丧|挫败/.test(normalized);

  if (/新增.*客户|创建.*客户|客户建档|建档/.test(normalized)) {

    return {
      type: "customer_create",
      mood: comfort ? "安慰" : "执行",
      confirmed,
      payload: {
        name: extractName(normalized),
        nickname: extractAfter(normalized, "昵称"),
        profession: extractAfter(normalized, "职业"),
        source: extractAfter(normalized, "来源"),
        coreInteresting: extractAfter(normalized, "关注"),
      },
    };
  }

  if (/今天拜访了|记录拜访|拜访了|见完|见了|聊了|聊完|沟通完|碰面|面谈/.test(normalized)) {
    const identity = extractVisitIdentity(normalized);

    return {
      type: "visit_create",
      mood: comfort ? "安慰" : "执行",
      confirmed,
      payload: {
        customerName: identity.customerName,
        nickName: identity.nickName,
        timeVisit: extractDateValue(normalized) || offsetDate(0),
        summary: normalized,
      },
    };
  }



  if (/记录活动|组织了|活动/.test(normalized) && /客户|参加/.test(normalized)) {
    return {
      type: "activity_create",
      mood: comfort ? "安慰" : "执行",
      confirmed,
      payload: {
        title: extractAfter(normalized, "活动名称") || extractAfter(normalized, "活动") || "客户活动记录",
        dateActivity: extractDateValue(normalized) || offsetDate(0),
        participantNames: parseParticipantNames(normalized),
        summary: normalized,
      },
    };
  }

  if (/待办|提醒|逾期/.test(normalized)) {
    return { type: "tasks_query", mood: comfort ? "安慰" : "执行", confirmed: false, payload: {} };
  }

  if (/共同特点|相似客户|洞察/.test(normalized)) {
    return { type: "insights_query", mood: comfort ? "安慰" : "执行", confirmed: false, payload: {} };
  }

  if (/查|找|看看/.test(normalized) && /客户|林|沈|顾|周/.test(normalized)) {
    return {
      type: "customer_query",
      mood: comfort ? "安慰" : "执行",
      confirmed: false,
      payload: {
        keyword: normalized.replace(/查一下|查|找一下|找|帮我看一下|看看/g, "").replace(/客户/g, "").trim(),
      },
    };
  }

  if (comfort) {
    return { type: "support", mood: "安慰", confirmed: false, payload: {} };
  }

  return { type: "unknown", mood: "鼓舞", confirmed: false, payload: {} };
}
