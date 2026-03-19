import type { ChatIntent } from "@/modules/chat/intent-service";
import type {
  ActivityWorkflowDraftSeed,
  AssistantWorkflowDirective,
  CustomerWorkflowDraftSeed,
  VisitWorkflowDraftSeed,
} from "@/types/agent";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function extractFollowUps(message: string) {
  return (message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+/g) ?? []).join("\n");
}

function detectCommunication(message: string) {
  if (/电话/.test(message)) {
    return "电话";
  }

  if (/微信/.test(message)) {
    return "微信";
  }

  if (/面谈|见面|当面|拜访/.test(message)) {
    return "面谈";
  }

  return "";
}

function createVisitSeed(message: string, intent: ChatIntent): VisitWorkflowDraftSeed {
  const payload = intent.type === "visit_create" ? (intent.payload as { customerName?: string; timeVisit?: string; summary?: string }) : {};
  const customerName = payload.customerName ?? "";

  return {
    id: crypto.randomUUID(),
    values: {
      name: customerName,
      timeVisit: payload.timeVisit || todayString(),
      briefContent: payload.summary || message,
      followWork: extractFollowUps(message),
      methodCommunicate: detectCommunication(message),
    },
    assistantNote: customerName
      ? `已先把 ${customerName} 的拜访放到前面。你可以继续补充地点、核心判断与后续动作。`
      : "我已先把拜访工作区放到前面。请先补一句客户姓名，我再继续帮你把重点沉淀完整。",
  };
}

function createActivitySeed(message: string, intent: ChatIntent): ActivityWorkflowDraftSeed {
  const payload = intent.type === "activity_create"
    ? (intent.payload as { title?: string; dateActivity?: string; participantNames?: string[]; summary?: string })
    : {};
  const participantNames = payload.participantNames ?? [];
  const followWork = extractFollowUps(message);

  return {
    id: crypto.randomUUID(),
    values: {
      nameActivity: payload.title || "客户活动记录",
      dateActivity: payload.dateActivity || todayString(),
      effectProfile: payload.summary || message,
      participants: participantNames.length > 0 ? participantNames.map((name) => ({ name, followWork })) : undefined,
    },
    assistantNote:
      participantNames.length > 0
        ? "我已先把客户活动承接区准备好。你可以继续补活动效果、参加客户待办与经验教训；若需要批量校验，再展开完整活动视图。"
        : "我已先把客户活动承接区准备好。请先补充参加客户名单，我再继续帮你整理活动效果与后续动作。",
  };
}

function createCustomerSeed(message: string, intent: ChatIntent): CustomerWorkflowDraftSeed {
  const payload = intent.type === "customer_create"
    ? (intent.payload as {
        name?: string;
        nickname?: string;
        profession?: string;
        source?: string;
        coreInteresting?: string;
      })
    : {};

  return {
    id: crypto.randomUUID(),
    values: {
      name: payload.name ?? "",
      nickname: payload.nickname ?? "",
      profession: payload.profession ?? "",
      source: payload.source ?? "",
      coreInteresting: payload.coreInteresting ?? "",

    },
    assistantNote: payload.name
      ? `我已先把 ${payload.name} 的客户建档页准备好。你可以先保存最小必填，再决定是否继续补充财富情况与沟通偏好。`
      : "我已先把客户建档页准备好。你可以先保存最小必填，再继续补充核心关注点与客户来源。",
  };
}

export function buildDefaultAssistantWorkflow(): AssistantWorkflowDirective {
  return {
    preferredSurface: "visit",
    presentation: "primary",
    launcher: {
      mood: "执行",
      title: "我会先帮你理解目标，再把对应任务页放到前面",
      description: "你只需要像交代助理一样说出目标；高频单任务会进入独立承接页，批量与复盘类任务则会转入自主页面。",
      suggestion: "如果你现在更想自己处理，也可以直接进入客户、记录或任务页面。",
    },
    visitSeed: null,
    activitySeed: null,
    customerSeed: null,
  };
}

export function buildAssistantWorkflow(message: string, intent: ChatIntent): AssistantWorkflowDirective {
  if (intent.type === "visit_create") {
    const payload = intent.payload as { customerName?: string };
    const hasCustomer = Boolean(payload.customerName);

    return {
      preferredSurface: "visit",
      presentation: "primary",
      launcher: {
        mood: intent.mood,
        title: hasCustomer ? `已切到 ${payload.customerName} 的拜访任务页` : "已切到拜访任务页",
        description: hasCustomer
          ? "我先把这一条拜访任务页准备好，你现在只需要补齐会谈重点与后续动作。"
          : "我先接住这次拜访。你不需要先找模块，直接在任务页补齐客户与沟通重点即可。",
        suggestion: "若客户尚未建档，系统会先带你完成客户基础信息保存，再自动回到当前拜访继续保存。",
        secondaryAction: {
          label: "进入完整记录中心",
          href: "/records?tab=visits",
        },
      },
      visitSeed: createVisitSeed(message, intent),
      activitySeed: null,
      customerSeed: null,
    };
  }

  if (intent.type === "support") {
    return {
      preferredSurface: "visit",
      presentation: "primary",
      launcher: {
        mood: "安慰",
        title: "我先陪你把节奏稳住，再开始记录",
        description: "这类长期经营本来就更依赖节奏与判断。先把今天最值得沉淀的一次拜访记下来，后面的动作就会清晰很多。",
        suggestion: "下面会直接进入拜访任务页，你可以从客户姓名和今天的沟通重点开始。",
        secondaryAction: {
          label: "进入完整记录中心",
          href: "/records?tab=visits",
        },
      },
      visitSeed: {
        id: crypto.randomUUID(),
        values: {
          timeVisit: todayString(),
          briefContent: message,
        },
        assistantNote: "我先把今天最值得沉淀的一次拜访放到前面，你可以从客户与关键判断开始补充。",
      },
      activitySeed: null,
      customerSeed: null,
    };
  }

  if (intent.type === "activity_create") {
    return {
      preferredSurface: "activities",
      presentation: "secondary",
      launcher: {
        mood: intent.mood,
        title: "我已把客户活动任务页准备好",
        description: "这类场景需要活动摘要、参加客户名单与后续动作一起承接，更适合用独立任务页完成。",
        suggestion: "你可以先完成这场活动；当需要批量回看、历史对比或完整名单校验时，再展开完整活动视图。",
        secondaryAction: {
          label: "进入完整活动视图",
          href: "/records?tab=activities",
        },
      },
      visitSeed: null,
      activitySeed: createActivitySeed(message, intent),
      customerSeed: null,
    };
  }

  if (intent.type === "customer_create") {
    const payload = intent.payload as { name?: string };
    const hasName = Boolean(payload.name);

    return {
      preferredSurface: "customers",
      presentation: "primary",
      launcher: {
        mood: intent.mood,
        title: hasName ? `已切到 ${payload.name} 的客户建档页` : "已切到客户建档页",
        description: hasName
          ? "我先把这位客户的建档任务页准备好。你可以先保存最小必填，再决定是否补齐更多资料。"
          : "我先把客户建档任务页准备好。你可以先补客户姓名、来源和核心关注点。",
        suggestion: "客户档案保存后，我会自动带你回到助手沟通页，继续安排下一步。",
        secondaryAction: {
          label: "进入完整客户中心",
          href: "/customers",
        },
      },
      visitSeed: null,
      activitySeed: null,
      customerSeed: createCustomerSeed(message, intent),
    };
  }

  if (intent.type === "customer_query") {
    return {
      preferredSurface: "customers",
      presentation: "secondary",
      launcher: {
        mood: intent.mood,
        title: "我已识别为客户查询需求",
        description: "客户查询更适合结构化列表与摘要卡承接，避免在助手沟通页里同时并列太多信息。",
        suggestion: "你可以进入客户中心查看完整信息；如你现在更急的是补一条拜访，也可以回到助手继续交代。",
        secondaryAction: {
          label: "进入客户中心查看结果",
          href: "/customers",
        },
      },
      visitSeed: null,
      activitySeed: null,
      customerSeed: null,
    };
  }

  if (intent.type === "tasks_query" || intent.type === "insights_query") {
    return {
      preferredSurface: "tasks",
      presentation: "secondary",
      launcher: {
        mood: intent.mood,
        title: "我已理解你的目标，但这类场景更适合结构化承接",
        description: "任务整理、洞察筛选与优先级比较不适合强行压成单主工作卡，需要列表、排序和结果区一起承接。",
        suggestion: "如果你现在最急的是补一条拜访，可以回到助手继续交代；否则可直接进入任务与洞察视图。",
        secondaryAction: {
          label: "进入任务与洞察视图",
          href: "/tasks",
        },
      },
      visitSeed: null,
      activitySeed: null,
      customerSeed: null,
    };
  }

  return buildDefaultAssistantWorkflow();
}
