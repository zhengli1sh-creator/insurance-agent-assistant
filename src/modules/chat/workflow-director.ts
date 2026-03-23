import type { ChatIntent } from "@/modules/chat/intent-service";
import type { AssistantWorkflowBuildOptions } from "@/modules/chat/workflow-context";
import { extractCustomerDraftByRules } from "@/modules/customers/customer-draft-extractor";
import type {

  ActivityWorkflowDraftSeed,
  AssistantWorkflowDirective,
  CustomerWorkflowDraftSeed,
  CustomerWorkflowDraftValues,
  VisitWorkflowDraftSeed,
  WorkflowSeedField,
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

function normalizeFollowWork(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).join("\n");
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function previewSeedValue(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    return "";
  }

  return normalized.length > 30 ? `${normalized.slice(0, 30)}…` : normalized;
}

function pickSeedValue(primary: unknown, fallback = "") {
  return typeof primary === "string" && primary.trim() ? primary.trim() : fallback.trim();
}

function buildCustomerSeedValues(message: string, payload: Partial<CustomerWorkflowDraftValues>): CustomerWorkflowDraftValues {
  const extracted = extractCustomerDraftByRules(message, typeof payload.name === "string" ? payload.name : undefined);

  return {
    name: pickSeedValue(payload.name, extracted.name),
    nickname: pickSeedValue(payload.nickname, extracted.nickname),
    age: pickSeedValue(payload.age, extracted.age),
    sex: pickSeedValue(payload.sex, extracted.sex),
    profession: pickSeedValue(payload.profession, extracted.profession),
    familyProfile: pickSeedValue(payload.familyProfile, extracted.familyProfile),
    wealthProfile: pickSeedValue(payload.wealthProfile, extracted.wealthProfile),
    source: pickSeedValue(payload.source, extracted.source),
    coreInteresting: pickSeedValue(payload.coreInteresting, extracted.coreInteresting),
    preferCommunicate: pickSeedValue(payload.preferCommunicate, extracted.preferCommunicate),
    recentMoney: pickSeedValue(payload.recentMoney, extracted.recentMoney),
    remark: pickSeedValue(payload.remark, extracted.remark),
  };
}

function buildSuggestedCustomerFields(values: CustomerWorkflowDraftValues): WorkflowSeedField[] {
  const fields: WorkflowSeedField[] = [];

  if (values.name?.trim()) {
    fields.push({ label: "客户姓名", value: values.name.trim() });
  }

  if (values.nickname?.trim()) {
    fields.push({ label: "客户昵称", value: values.nickname.trim() });
  }

  if (values.source?.trim()) {

    fields.push({ label: "客户来源", value: values.source.trim() });
  }

  if (values.profession?.trim()) {
    fields.push({ label: "职业 / 身份", value: values.profession.trim() });
  }

  if (values.coreInteresting?.trim()) {
    fields.push({ label: "核心关注点", value: previewSeedValue(values.coreInteresting) });
  }

  if (values.preferCommunicate?.trim()) {
    fields.push({ label: "沟通偏好", value: values.preferCommunicate.trim() });
  }

  if (values.recentMoney?.trim()) {
    fields.push({ label: "资金情况", value: previewSeedValue(values.recentMoney) });
  }

  if (values.remark?.trim()) {
    fields.push({ label: "备注", value: previewSeedValue(values.remark) });
  }

  return fields;
}


function createVisitSeed(
  message: string,
  intent: ChatIntent,
  options: AssistantWorkflowBuildOptions = {},
): VisitWorkflowDraftSeed {
  const payload = intent.type === "visit_create"
    ? (intent.payload as {
        customerName?: string;
        nickName?: string;
        timeVisit?: string;
        summary?: string;
        location?: string;
        corePain?: string;
        followWork?: string | string[];
        methodCommunicate?: string;
        nickname?: string;
      })
    : {};
  const matchedCustomer = options.visitMatchedCustomer ?? null;
  const customerName = payload.customerName?.trim() || matchedCustomer?.name || "";
  const nickName = payload.nickName?.trim() || payload.nickname?.trim() || matchedCustomer?.nickname || "";

  const followWork = normalizeFollowWork(payload.followWork) || extractFollowUps(message);

  return {
    id: crypto.randomUUID(),
    values: {
      customerId: matchedCustomer?.id,
      name: customerName,
      nickName,
      timeVisit: payload.timeVisit || todayString(),
      location: payload.location ?? "",
      corePain: payload.corePain ?? "",
      briefContent: payload.summary || message,
      followWork,
      methodCommunicate: payload.methodCommunicate || detectCommunication(message),
    },
    assistantNote: customerName
      ? payload.customerName
        ? `已先把 ${customerName} 的拜访放到前面。你可以继续补充地点、核心判断与后续动作。`
        : nickName
          ? `我已按昵称“${nickName}”核对到 ${customerName} 的档案，并把这条拜访放到前面。`
          : `已先把 ${customerName} 的拜访放到前面。你可以继续补充地点、核心判断与后续动作。`
      : nickName
        ? `我先把这次拜访接住了。当前先按昵称“${nickName}”为你保留对象信息，后面还可以继续补齐正式姓名。`
        : "我已先把拜访工作区放到前面。请先补一句客户姓名或常用昵称，我再继续帮你把重点沉淀完整。",
  };
}


function createCustomerSeedFromVisit(
  intent: ChatIntent,
  visitSeed: VisitWorkflowDraftSeed,
  options: AssistantWorkflowBuildOptions = {},
): CustomerWorkflowDraftSeed {
  const payload = intent.type === "visit_create"
    ? (intent.payload as {
        customerName?: string;
        nickName?: string;
        profession?: string;
        source?: string;
        corePain?: string;
        methodCommunicate?: string;
        nickname?: string;
      })
    : {};

  const values: CustomerWorkflowDraftValues = {
    name: payload.customerName ?? "",
    nickname: payload.nickName ?? payload.nickname ?? "",

    profession: payload.profession ?? "",
    source: payload.source ?? "",
    coreInteresting: payload.corePain ?? "",
    preferCommunicate: payload.methodCommunicate ?? "",
  };

  const customerDisplayName = values.name?.trim() || values.nickname?.trim() || "这位客户";
  const nextActionHint = visitSeed.values.followWork?.split("\n")[0]?.trim();
  const nicknameLookupMissing = options.visitCustomerLookupField === "nickname" && options.visitCustomerStatus === "missing";
  const possibleExisting = options.visitCustomerStatus === "possible_existing";

  return {
    id: crypto.randomUUID(),
    values,
    suggestedFields: buildSuggestedCustomerFields(values),
    resumeVisitSeed: visitSeed,
    assistantNote: possibleExisting
      ? `我按姓名查到一位可能同名的已有客户，先请你确认是否为同一位；若不是，再继续新建。`
      : nicknameLookupMissing
        ? nextActionHint
          ? `当前还没有查到昵称“${customerDisplayName}”的已保存客户档案。我先把昵称和这次拜访一起接住；你补齐正式姓名后保存，我会自动回到刚才的拜访记录，并继续接上“${nextActionHint}”。`
          : `当前还没有查到昵称“${customerDisplayName}”的已保存客户档案。我先把昵称和这次拜访一起接住；你补齐正式姓名后保存，我会自动回到刚才的拜访记录。`
        : nextActionHint
          ? `当前还没有查到 ${customerDisplayName} 的客户档案。我先带你补一份基础信息，保存后会自动回到刚才的拜访记录，并继续接上“${nextActionHint}”。`
          : `当前还没有查到 ${customerDisplayName} 的客户档案。我先带你补一份基础信息，保存后会自动回到刚才的拜访记录。`,
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
    ? (intent.payload as Partial<CustomerWorkflowDraftValues>)
    : {};

  const values = buildCustomerSeedValues(message, payload);
  const name = values.name?.trim();
  const hasPersonalRemark = Boolean(values.remark?.trim());

  return {
    id: crypto.randomUUID(),
    values,
    suggestedFields: buildSuggestedCustomerFields(values),
    assistantNote: name
      ? hasPersonalRemark
        ? `我已先把 ${name} 的客户建档页准备好，连同个性化备注也一并预填到了表单里。你可以先核对后保存。`
        : `我已先把 ${name} 的客户建档页准备好。你可以先保存最小必填，再决定是否继续补充财富情况与沟通偏好。`
      : hasPersonalRemark
        ? "我已先把客户建档页准备好，并把你刚才提到的个性化信息预填到了备注里。你可以先核对姓名后再保存。"
        : "我已先把客户建档页准备好。你可以先保存最小必填，再继续补充核心关注点与客户来源。",
  };
}


export function buildDefaultAssistantWorkflow(): AssistantWorkflowDirective {
  return {
    preferredSurface: "unknown",
    presentation: "secondary",
    launcher: {
      mood: "执行",
      title: "我会先帮你理解目标，再决定最合适的承接方式",
      description: "你只需要像交代助理一样说出目标；当信息足够明确时，我会把对应工作区放到前面。",
      suggestion: "如果你现在更想自己处理，也可以直接进入客户、记录或任务页面。",
    },
    visitSeed: null,
    activitySeed: null,
    customerSeed: null,
  };
}

export function buildAssistantWorkflow(
  message: string,
  intent: ChatIntent,
  options: AssistantWorkflowBuildOptions = {},
): AssistantWorkflowDirective {
  if (intent.type === "visit_create") {
    const payload = intent.payload as { customerName?: string; nickName?: string; nickname?: string };
    const effectiveNickName = payload.nickName?.trim() || payload.nickname?.trim() || "";
    const hasCustomerName = Boolean(payload.customerName?.trim());
    const hasNickName = Boolean(effectiveNickName);

    const hasCustomer = hasCustomerName || hasNickName;
    const visitSeed = createVisitSeed(message, intent, options);
    const visitCustomerStatus = options.visitCustomerStatus ?? "unknown";
    const nextActionHint = visitSeed.values.followWork?.split("\n")[0]?.trim();
    const displayCustomer = visitSeed.values.name?.trim() || visitSeed.values.nickName?.trim() || "这位客户";
    const routeToCustomerCapture = hasCustomer && (hasCustomerName || options.forceCustomerCapture) && visitCustomerStatus !== "existing";
    const nicknameLookupMissing = options.visitCustomerLookupField === "nickname" && visitCustomerStatus === "missing";
    const possibleExisting = visitCustomerStatus === "possible_existing";

    if (routeToCustomerCapture) {
      return {
        preferredSurface: "customers",
        presentation: "primary",
        launcher: {
          mood: intent.mood,
          title: possibleExisting
            ? `先确认 ${displayCustomer} 是否就是已有客户`
            : nicknameLookupMissing
              ? `先补昵称“${effectiveNickName}”对应的客户信息`
              : visitCustomerStatus === "missing"
                ? `先补 ${displayCustomer} 的客户档案`
                : `先补 ${displayCustomer} 的客户基础信息`,
          description: possibleExisting
            ? `我按姓名查到一位可能同名的已有客户。为避免误建或误关联，先请你确认是否就是这位客户；如果不是，再继续新建。`
            : nicknameLookupMissing
              ? `当前还没有查到昵称“${effectiveNickName}”的已保存客户档案。我先把昵称填到建档页里；你补齐正式姓名后保存，就会自动回到刚才的拜访记录。`
              : visitCustomerStatus === "missing"
                ? `当前还没有查到 ${displayCustomer} 的客户档案。我先带你补一份基础信息，保存后会自动回到刚才的拜访记录。`
                : `我已先把 ${displayCustomer} 可直接保存的客户基础信息整理到前面，保存后会自动回到刚才的拜访记录。`,
          suggestion: possibleExisting
            ? "若确认是同一位，直接继续使用已有客户；若不是，再继续新建。原来的拜访内容我会继续为你保留。"
            : visitCustomerStatus === "missing"
              ? nextActionHint
                ? `你刚才提到的“${nextActionHint}”我会继续为你保留，等客户基础信息补齐后再接着完成。`
                : "这一步只是在补客户基础信息；原来的拜访内容我会继续为你保留。"
              : "当前可以先保存姓名、来源、职业 / 身份与核心关注点；其余资料可以稍后继续补充。",
          secondaryAction: {
            label: "进入完整客户中心",
            href: "/customers",
          },
        },
        visitSeed,
        activitySeed: null,
        customerSeed: createCustomerSeedFromVisit(intent, visitSeed, options),
      };
    }


    return {
      preferredSurface: "visit",
      presentation: "primary",
      launcher: {
        mood: intent.mood,
        title: hasCustomer ? `已切到 ${displayCustomer} 的拜访任务页` : "已切到拜访任务页",
        description: hasCustomer
          ? hasNickName && !hasCustomerName && options.visitMatchedCustomer?.name
            ? `我已按昵称“${effectiveNickName}”核对到 ${options.visitMatchedCustomer.name} 的档案，你现在只需要补齐会谈重点与后续动作。`

            : "我先把这一条拜访任务页准备好，你现在只需要补齐会谈重点与后续动作。"
          : "我先接住这次拜访。你不需要先找模块，直接在任务页补齐客户与沟通重点即可。",
        suggestion: "若客户尚未建档，系统会先带你完成客户基础信息保存，再自动回到当前拜访继续保存。",
        secondaryAction: {
          label: "进入完整记录中心",
          href: "/records?tab=visits",
        },
      },
      visitSeed,
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
