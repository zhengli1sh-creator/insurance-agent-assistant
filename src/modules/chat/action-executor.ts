import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createActivityService } from "@/modules/activities/activity-service";
import { understandAssistantMessage, type AssistantUnderstandingResult } from "@/modules/chat/assistant-understanding";
import { resolveWorkflowBuildOptions, type AssistantWorkflowBuildOptions } from "@/modules/chat/workflow-context";
import { buildAssistantWorkflow } from "@/modules/chat/workflow-director";


import { createCustomerService, listCustomersService } from "@/modules/customers/customer-service";
import { listInsightsService } from "@/modules/queries/query-service";
import { listTasksService } from "@/modules/tasks/task-service";
import { createVisitService } from "@/modules/visits/visit-service";
import type { AgentActionPreview, AssistantWorkflowDirective, ChatResponse, CustomerWorkflowDraftValues } from "@/types/agent";
import type { TaskCategorizedResult } from "@/types/task";




function comfortPrefix(intent: Pick<AssistantUnderstandingResult, "mood">) {
  if (intent.mood !== "安慰") {
    return "";
  }

  return "先别急着否定自己，这类中高资产客户的经营本来就更依赖节奏和信任。我先陪你把重点理顺。\n\n";
}

function previewItemsFromList(items: string[]) {
  return items.slice(0, 6);
}

function previewTaskItems(result: TaskCategorizedResult | null | undefined) {
  if (!result) {
    return [];
  }

  return previewItemsFromList(
    [
      ...result.todayReminders,
      ...result.overdue,
      ...result.pending,
      ...result.completed,
      ...result.canceled,
    ].map((item) => `${item.status}｜${item.title}`),
  );
}

function normalizeTextField(value: unknown) {

  return typeof value === "string" ? value.trim() : "";
}

function resolveCustomerDraftValues(
  workflow: AssistantWorkflowDirective | undefined,
  payload: Record<string, unknown>,
): CustomerWorkflowDraftValues {
  const seededValues = workflow?.customerSeed?.values;

  return {
    name: normalizeTextField(seededValues?.name ?? payload.name),
    nickname: normalizeTextField(seededValues?.nickname ?? payload.nickname),
    age: normalizeTextField(seededValues?.age ?? payload.age),
    sex: normalizeTextField(seededValues?.sex ?? payload.sex),
    profession: normalizeTextField(seededValues?.profession ?? payload.profession),
    familyProfile: normalizeTextField(seededValues?.familyProfile ?? payload.familyProfile),
    wealthProfile: normalizeTextField(seededValues?.wealthProfile ?? payload.wealthProfile),
    source: normalizeTextField(seededValues?.source ?? payload.source),
    coreInteresting: normalizeTextField(seededValues?.coreInteresting ?? payload.coreInteresting),
    preferCommunicate: normalizeTextField(seededValues?.preferCommunicate ?? payload.preferCommunicate),
    recentMoney: normalizeTextField(seededValues?.recentMoney ?? payload.recentMoney),
    remark: normalizeTextField(seededValues?.remark ?? payload.remark),
  };
}

function buildCustomerPreviewItems(values: CustomerWorkflowDraftValues) {
  return previewItemsFromList([
    `客户姓名：${values.name || "待补充"}`,
    `客户昵称：${values.nickname || "待补充"}`,
    `客户来源：${values.source || "待补充"}`,
    `核心关注点：${values.coreInteresting || values.profession || "待补充"}`,
    ...(values.recentMoney ? [`资金情况：${values.recentMoney}`] : []),
    ...(values.remark ? [`备注：${values.remark}`] : []),
  ]);
}

function withWorkflow(workflow: AssistantWorkflowDirective | undefined, result: Omit<ChatResponse, "workflow">): ChatResponse {

  if (!workflow) {
    return result;
  }

  return {
    ...result,
    workflow,
  };
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function isNicknameLookupConversationStep(
  understanding: AssistantUnderstandingResult,
  options: AssistantWorkflowBuildOptions,
) {
  if (understanding.type !== "visit_create") {
    return false;
  }

  const payload = understanding.payload as { customerName?: string; nickName?: string; nickname?: string };
  return !payload.customerName?.trim()
    && Boolean(payload.nickName?.trim() || payload.nickname?.trim())

    && (options.visitCustomerStatus === "missing" || options.visitCustomerStatus === "ambiguous");
}

async function resolveWorkflowState(
  message: string,
  understanding: AssistantUnderstandingResult,
  supabase?: SupabaseClient | null,
  userId?: string | null,
) {
  if (understanding.clarification) {
    return { workflow: undefined, options: {} as AssistantWorkflowBuildOptions };
  }

  const options = await resolveWorkflowBuildOptions(supabase ?? null, userId ?? null, understanding);
  if (isNicknameLookupConversationStep(understanding, options)) {
    return { workflow: undefined, options };
  }

  return {
    workflow: buildAssistantWorkflow(message, understanding, options),
    options,
  };
}



function normalizeFollowUpLines(value: unknown, message: string) {
  if (Array.isArray(value)) {
    const items = value.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean);
    if (items.length > 0) {
      return items;
    }
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/[\n；;]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+|再约[^，。；]+|联系[^，。；]+/g) ?? [];
}

function buildVisitFollowupContinuationContext(nickName: string, payload: { timeVisit?: string; followWork?: string | string[] }, message: string) {
  const followUps = normalizeFollowUpLines(payload.followWork, message);
  const followUp = followUps[0]?.trim() || "待补充";
  const timeVisit = payload.timeVisit || todayString();
  return `继续刚才的拜访核对。当前昵称是${nickName}。待继续的拜访日期是${timeVisit}。待继续的后续动作是${followUp}。`;
}


function buildClarificationResponse(understanding: AssistantUnderstandingResult): ChatResponse {
  const prefix = comfortPrefix(understanding);

  return {
    reply: `${prefix}${understanding.clarification?.question || "我还没完全听明白你的目标，想先和你确认一下。"}`,
    mood: understanding.mood,
    preview: null,
  };
}

function buildVisitNicknameLookupResponse(

  message: string,
  understanding: AssistantUnderstandingResult,
  options: AssistantWorkflowBuildOptions,
): ChatResponse | null {
  if (!isNicknameLookupConversationStep(understanding, options)) {
    return null;
  }

  const prefix = comfortPrefix(understanding);
  const payload = understanding.payload as {
    nickName?: string;
    nickname?: string;
    timeVisit?: string;
    followWork?: string | string[];
  };
  const nickName = payload.nickName?.trim() || payload.nickname?.trim() || "这位客户";
  const continuationContext = buildVisitFollowupContinuationContext(nickName, payload, message);
  const followUps = normalizeFollowUpLines(payload.followWork, message);


  if (options.visitCustomerStatus === "ambiguous") {
    return {
      reply: `${prefix}我按昵称“${nickName}”查到不止一位已保存客户。为避免记错对象，你可以补一句这位客户的姓名、来源或职业，我再帮你继续核对。`,
      mood: understanding.mood,
      preview: {
        title: "先补一条线索，再继续核对",
        description: "当前昵称命中了多位客户，我会先留住这次拜访内容，等你补一条线索后继续收口到唯一客户。",
        items: previewItemsFromList([
          `当前昵称：${nickName}`,
          `待继续的拜访日期：${payload.timeVisit || todayString()}`,
          `待继续的后续动作：${followUps[0] || "待补充"}`,
        ]),
        requiresConfirmation: false,
        actions: [
          {
            label: "补充客户信息后核对",
            draft: "",
            continuationContext,
            variant: "primary",
          },
        ],
      },
    };
  }

  const directCreateWorkflow = buildAssistantWorkflow(message, understanding, {
    ...options,
    forceCustomerCapture: true,
  });

  return {
    reply: `${prefix}我先没查到昵称“${nickName}”的已保存客户档案。为避免重复建档，你可以补一句这位客户的姓名、来源或职业，我再帮你核对一次；如果确定是新客户，我也可以直接把建档页打开，并先把昵称填好。`,
    mood: understanding.mood,
    preview: {
      title: "先核对，再决定是否新建",
      description: "这次拜访内容我已经先替你接住。你可以补一条线索继续核对，或直接转入新客户建档。",
      items: previewItemsFromList([
        `当前昵称：${nickName}`,
        `待继续的拜访日期：${payload.timeVisit || todayString()}`,
        `待继续的后续动作：${followUps[0] || "待补充"}`,
      ]),
      requiresConfirmation: false,
      actions: [
        {
          label: "补充客户信息后核对",
          draft: "",
          continuationContext,
          variant: "primary",
        },
        {
          label: "直接新建客户",
          workflow: directCreateWorkflow,
          variant: "primary",
        },
      ],
    },
  };
}

function buildPlanningPreview(

  intent: AssistantUnderstandingResult,
  message: string,
  workflow?: AssistantWorkflowDirective,
): AgentActionPreview | null {
  if (intent.type === "customer_create") {
    const payload = intent.payload as Record<string, unknown>;
    const values = resolveCustomerDraftValues(workflow, payload);

    return {
      title: "首页已识别为客户建档需求",
      description: values.remark
        ? "当前建议转入客户中心完成基础档案保存；你刚才补充的个性化信息也会一并预填到备注。"
        : "当前建议转入客户中心完成基础档案保存，再返回高频主流程。",
      items: buildCustomerPreviewItems(values),
      requiresConfirmation: false,
    };
  }


  if (intent.type === "visit_create") {
    const payload = intent.payload as {
      customerName?: string;
      nickName?: string;
      timeVisit?: string;
      summary?: string;
      corePain?: string;
      followWork?: string | string[];
    };
    const followUps = normalizeFollowUpLines(payload.followWork, message);
    const displayCustomer = workflow?.visitSeed?.values.name?.trim()
      || workflow?.visitSeed?.values.nickName?.trim()
      || payload.customerName
      || payload.nickName
      || "待补充";


    if (workflow?.preferredSurface === "customers" && workflow.customerSeed) {
      const suggestedFields = (workflow.customerSeed.suggestedFields ?? []).map((item) => `${item.label}：${item.value}`);

      return {
        title: "先补客户档案，再继续这次拜访",
        description: "当前未查到匹配档案。客户基础信息补齐后，我会把刚才的拜访和后续动作继续接回去。",
        items: previewItemsFromList([

          ...suggestedFields,
          `待继续的拜访日期：${payload.timeVisit || new Date().toISOString().slice(0, 10)}`,
          `待继续的后续动作：${followUps[0] || "待补充"}`,
        ]),
        requiresConfirmation: false,
      };
    }

    return {
      title: "首页已切到拜访主工作区",
      description: "这次输入不会直接写库，而是先把单主工作区和待补字段整理到前面。",
      items: previewItemsFromList([
        `客户：${displayCustomer}`,

        `拜访日期：${payload.timeVisit || new Date().toISOString().slice(0, 10)}`,
        `核心关注：${payload.corePain || "待补充"}`,
        `沟通摘要：${payload.summary || message}`,
        `后续动作：${followUps[0] || "待补充"}`,
      ]),
      requiresConfirmation: false,
    };
  }

  if (intent.type === "activity_create") {

    const payload = intent.payload as { title?: string; dateActivity?: string; participantNames?: string[] };
    return {
      title: "首页已切到客户活动承接区",
      description: "你可以先在结构化承接区补活动摘要、参加客户与后续动作；需要批量回看时再展开完整活动视图。",
      items: previewItemsFromList([
        `活动名称：${payload.title || "客户活动记录"}`,
        `活动日期：${payload.dateActivity || new Date().toISOString().slice(0, 10)}`,
        `参与客户：${(payload.participantNames ?? []).join("、") || "待补充"}`,
      ]),
      requiresConfirmation: false,
    };
  }


  if (intent.type === "tasks_query" || intent.type === "insights_query" || intent.type === "customer_query") {
    return {
      title: "建议转入结构化结果区",
      description: "这类目标更适合列表、排序与结果区承接，不建议挤占首页单主工作区。",
      items: previewItemsFromList([message]),
      requiresConfirmation: false,
    };
  }

  return null;
}

export async function planChatMessage(
  message: string,
  supabase?: SupabaseClient | null,
  userId?: string | null,
): Promise<ChatResponse> {
  const understanding = await understandAssistantMessage(message);
  if (understanding.clarification) {
    return buildClarificationResponse(understanding);
  }

  const prefix = comfortPrefix(understanding);
  const { workflow, options } = await resolveWorkflowState(message, understanding, supabase, userId);
  const nicknameLookupResponse = buildVisitNicknameLookupResponse(message, understanding, options);
  if (nicknameLookupResponse) {
    return nicknameLookupResponse;
  }


  if (understanding.type === "support") {
    return withWorkflow(workflow, {
      reply: `${prefix}我先把首页保持在一个安静的主工作区，你可以直接在下面记下今天最值得沉淀的一次拜访。`,
      mood: understanding.mood,
      preview: null,
    });
  }

  if (understanding.type === "visit_create") {
    const payload = understanding.payload as { customerName?: string; nickName?: string; nickname?: string; followWork?: string | string[] };
    const followUps = normalizeFollowUpLines(payload.followWork, message);
    const primaryFollowUp = followUps[0];
    const displayCustomer = workflow?.visitSeed?.values.name?.trim() || workflow?.visitSeed?.values.nickName?.trim() || payload.customerName || payload.nickName || payload.nickname || "这位客户";
    const possibleExisting = options.visitCustomerStatus === "possible_existing";

    const reply = workflow?.preferredSurface === "customers"
      ? possibleExisting
        ? `${prefix}我按姓名先核到一位可能同名的已有客户。为避免误建档或误关联，我先请你确认是否就是这位客户；如果不是，再继续新建，原来的拜访内容我会继续为你保留${primaryFollowUp ? `，并继续把“${primaryFollowUp}”接上。` : "。"}`
        : `${prefix}我先帮你记下这次拜访。当前还没有查到 ${displayCustomer} 的客户档案，我先带你补一份基础信息；保存后会自动回到刚才这条拜访记录${primaryFollowUp ? `，并继续把“${primaryFollowUp}”接上。` : "。"}`
      : `${prefix}我已先把 ${displayCustomer} 的拜访工作区放到前面。你可以直接补充地点、核心判断与后续动作。`;



    return withWorkflow(workflow, {

      reply,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }

  if (understanding.type === "customer_create") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已识别为新增客户档案需求，并把客户建档任务页准备好了。你可以先保存最小必填，完成后我会带你回到助手沟通页继续安排下一步。`,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }

  if (understanding.type === "activity_create") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已识别为客户活动补录需求，并把结构化活动承接区准备好了。你可以先补活动效果、参加客户与后续动作；需要批量回看时再展开完整活动视图。`,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }

  if (understanding.type === "tasks_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为任务整理需求。任务与优先级更适合在结构化列表里统一查看和比较。`,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }

  if (understanding.type === "insights_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为客户筛选或共性洞察需求。为了保留结果分组与比较视图，建议转入任务与洞察页继续处理。`,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }

  if (understanding.type === "customer_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为客户查询需求。客户摘要和历史上下文更适合在客户中心的结构化结果区里承接。`,
      mood: understanding.mood,
      preview: buildPlanningPreview(understanding, message, workflow),
    });
  }


  return {
    reply: `${prefix}我还需要先和你确认一下目标，再替你安排后续动作。`,
    mood: understanding.mood,
    preview: null,
  };
}


export async function executeChatMessage(supabase: SupabaseClient, user: User, message: string): Promise<ChatResponse> {
  const understanding = await understandAssistantMessage(message);
  if (understanding.clarification) {
    return buildClarificationResponse(understanding);
  }

  const prefix = comfortPrefix(understanding);
  const { workflow, options } = await resolveWorkflowState(message, understanding, supabase, user.id);
  const nicknameLookupResponse = buildVisitNicknameLookupResponse(message, understanding, options);
  if (nicknameLookupResponse) {
    return nicknameLookupResponse;
  }



  if (understanding.type === "support") {
    return withWorkflow(workflow, {
      reply: `${prefix}你已经做得很稳了。先把今天最值得推进的一步做出来，剩下的节奏我陪你慢慢排。`,
      mood: understanding.mood,
      preview: null,
    });
  }

  if (understanding.type === "tasks_query") {
    const result = await listTasksService(supabase, user.id);
    return withWorkflow(workflow, {
      reply: `${prefix}我已经把你的待办提醒整理好了，优先从高优先级和未完成任务开始看。`,
      mood: understanding.mood,
      preview: {
        title: "今日任务概览",
        description: "以下是当前按任务服务读取到的提醒。",
        items: previewTaskItems(result.data),

        requiresConfirmation: false,
      },
    });
  }

  if (understanding.type === "insights_query") {
    const result = await listInsightsService(supabase, user.id);
    return withWorkflow(workflow, {
      reply: `${prefix}我已经按客户共性和当前节奏给你整理出一组经营洞察。`,
      mood: understanding.mood,
      preview: {
        title: "共同特点客户洞察",
        description: "适合继续深挖的客户群与服务方向如下。",
        items: previewItemsFromList((result.data ?? []).map((item) => `${item.title}（${item.count}位）`)),
        requiresConfirmation: false,
      },
    });
  }

  if (understanding.type === "customer_query") {
    const result = await listCustomersService(supabase, user.id, String(understanding.payload.keyword ?? ""));
    return withWorkflow(workflow, {
      reply: `${prefix}我已经根据你的描述检索客户档案。`,
      mood: understanding.mood,
      preview: {
        title: "客户查询结果",
        description: "以下是匹配到的客户。",
        items: previewItemsFromList(
          (result.data ?? []).map(
            (item) => `${item.name}｜${item.nickname || "无昵称"}｜${item.core_interesting ?? item.profession ?? "待补充核心信息"}`,
          ),
        ),
        requiresConfirmation: false,
      },
    });
  }

  if (understanding.type === "customer_create") {
    const payload = understanding.payload as Record<string, unknown>;
    const values = resolveCustomerDraftValues(workflow, payload);

    if (!values.name) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已理解为新增客户，但还缺少客户姓名。请直接补一句“客户叫谁，昵称是什么，核心关注点是什么”。`,
        mood: understanding.mood,
        preview: null,
      });
    }

    if (!understanding.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已整理出新增客户的结构化信息，确认后我再写入档案。`,
        mood: understanding.mood,
        preview: {
          title: "待确认：新增客户档案",
          description: values.remark ? "确认后会写入客户基础信息表，并保留备注里的个性化信息。" : "确认后会写入客户基础信息表。",
          items: buildCustomerPreviewItems(values),
          requiresConfirmation: true,
          confirmCommand: `确认 ${message}`,
        },
      });
    }

    const result = await createCustomerService(supabase, user.id, {
      name: values.name,
      nickname: values.nickname,
      age: values.age,
      sex: values.sex,
      profession: values.profession,
      familyProfile: values.familyProfile,
      wealthProfile: values.wealthProfile,
      source: values.source,
      coreInteresting: values.coreInteresting,
      preferCommunicate: values.preferCommunicate,
      recentMoney: values.recentMoney,
      remark: values.remark,
    });

    return withWorkflow(workflow, {
      reply: result.error || `${prefix}客户档案已创建，后续可以继续补充家庭情况、财富情况与沟通偏好。`,
      mood: understanding.mood,
      preview: result.data
        ? {
            title: "已执行：客户创建成功",
            description: result.data.remark ? "客户基础信息和备注都已经写入数据库。" : "客户基础信息已经写入数据库。",
            items: previewItemsFromList([
              `${result.data.name}｜${result.data.nickname || "无昵称"}｜${result.data.core_interesting || result.data.profession || "待补充核心信息"}`,
              ...(result.data.remark ? [`备注：${result.data.remark}`] : []),
            ]),
            requiresConfirmation: false,
          }
        : null,
    });
  }


  if (understanding.type === "visit_create") {
    const payload = understanding.payload as {
      customerName?: string;
      nickName?: string;
      nickname?: string;
      timeVisit?: string;
      summary?: string;
      location?: string;
      corePain?: string;
      followWork?: string | string[];
      methodCommunicate?: string;
    };
    const visitNickName = payload.nickName || payload.nickname || "";

    if (!payload.customerName && !visitNickName) {

      return buildClarificationResponse({
        ...understanding,
        clarification: {
          reason: "missing_information",
          question: "可以，我先帮你接住这次拜访。请告诉我客户姓名或常用昵称，我再继续为你整理记录。",
        },
      });
    }

    const matchedCustomer = options.visitMatchedCustomer;
    const matches = matchedCustomer
      ? { data: [matchedCustomer] }
      : await listCustomersService(supabase, user.id, payload.customerName || visitNickName || "");

    const targetCustomer = matches.data?.[0];

    if (!targetCustomer) {
      const customerLabel = payload.customerName || visitNickName || "这位客户";

      return withWorkflow(workflow, {
        reply: `${prefix}当前还没有找到 ${customerLabel} 对应的客户档案。请先创建客户，或换一种更完整的客户描述。`,
        mood: understanding.mood,
        preview: null,
      });
    }


    const visitDate = payload.timeVisit || new Date().toISOString().slice(0, 10);
    const followUps = normalizeFollowUpLines(payload.followWork, message);

    if (!understanding.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已经把这次拜访整理成记录草稿，确认后会保存并同步生成后续提醒。`,
        mood: understanding.mood,
        preview: {
          title: "待确认：新增拜访记录",
          description: "确认后会写入拜访记录表，并从内容中抽取后续事项。",
          items: previewItemsFromList([
            `客户：${targetCustomer.name}`,
            `拜访日期：${visitDate}`,
            `核心关注：${payload.corePain || "待补充"}`,
            `摘要：${payload.summary || "待补充"}`,
            `后续动作：${followUps[0] || "待补充"}`,
          ]),
          requiresConfirmation: true,
          confirmCommand: `确认 ${message}`,
        },
      });
    }

    const result = await createVisitService(supabase, user.id, {
      customerId: targetCustomer.id,
      name: targetCustomer.name,
      nickName: targetCustomer.nickname ?? "",
      timeVisit: visitDate,
      location: payload.location || "",
      corePain: payload.corePain || "",
      briefContent: payload.summary || message,
      followWork: followUps.join("；"),
      methodCommunicate: payload.methodCommunicate || "来自 chatbox 录入",
      followUps,
    });

    return withWorkflow(workflow, {
      reply: result.error || `${prefix}拜访记录已保存，后续事项也会同步进入提醒面板。`,
      mood: understanding.mood,
      preview: result.data
        ? {
            title: "已执行：拜访记录创建成功",
            description: "记录已写入数据库。",
            items: previewItemsFromList([`${targetCustomer.name}｜${result.data.time_visit}`, ...result.data.follow_ups]),
            requiresConfirmation: false,
          }
        : null,
    });
  }

  if (understanding.type === "activity_create") {
    const payload = understanding.payload as {
      title?: string;
      dateActivity?: string;
      participantNames?: string[];
      summary?: string;
    };
    const participantNames = payload.participantNames ?? [];

    if (participantNames.length === 0) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已理解为新增客户活动，但还没有识别到参与客户名单。`,
        mood: understanding.mood,
        preview: null,
      });
    }

    const customersResult = await listCustomersService(supabase, user.id, "");
    const customerPool = customersResult.data ?? [];
    const ambiguousNames = participantNames.filter(
      (name, index, list) => list.indexOf(name) === index && customerPool.filter((customer) => customer.name === name).length > 1,
    );

    if (ambiguousNames.length > 0) {
      return withWorkflow(workflow, {
        reply: `${prefix}我找到了同名客户：${ambiguousNames.join("、")}。为避免误写，请补充客户昵称后再记录这场活动。`,
        mood: understanding.mood,
        preview: null,
      });
    }

    const participants = participantNames
      .map((name) => customerPool.find((customer) => customer.name === name))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (participants.length !== participantNames.length) {
      return withWorkflow(workflow, {
        reply: `${prefix}当前没有完整匹配到参与客户的正式档案，请先确认客户名单是否已录入。`,
        mood: understanding.mood,
        preview: null,
      });
    }

    const activityDate = payload.dateActivity || new Date().toISOString().slice(0, 10);
    const followUps = message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+/g) ?? [];
    const sharedFollowWork = followUps.join("；");

    if (!understanding.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已经把活动记录整理成草稿，确认后会分别写入活动信息表和客户参加活动表。`,
        mood: understanding.mood,
        preview: {
          title: "待确认：新增客户活动",
          description: "确认后会保存活动信息、参加客户以及待办事项。",
          items: previewItemsFromList([
            `活动名称：${payload.title || "客户活动记录"}`,
            `活动日期：${activityDate}`,
            `参加客户：${participants.map((item) => (item.nickname ? `${item.name}（${item.nickname}）` : item.name)).join("、")}`,
          ]),
          requiresConfirmation: true,
          confirmCommand: `确认 ${message}`,
        },
      });
    }

    const result = await createActivityService(supabase, user.id, {
      nameActivity: payload.title || "客户活动记录",
      dateActivity: activityDate,
      effectProfile: payload.summary || message,
      participants: participants.map((item) => ({
        customerId: item.id,
        name: item.name,
        nickName: item.nickname ?? "",
        followWork: sharedFollowWork,
      })),
    });

    return withWorkflow(workflow, {
      reply: result.error || `${prefix}活动记录已保存，活动信息、参加客户与待办事项都已归档。`,
      mood: understanding.mood,
      preview: result.data
        ? {
            title: "已执行：客户活动创建成功",
            description: "活动信息表与客户参加活动表已经写入数据库。",
            items: previewItemsFromList([
              `${result.data.activity.name_activity}｜${result.data.activity.date_activity}`,
              ...participants.map((item) => (item.nickname ? `${item.name}（${item.nickname}）` : item.name)),
            ]),

            requiresConfirmation: false,
          }
        : null,
    });
  }

  return {
    reply: `${prefix}我已经理解到你需要经营协助。可以直接让我新增客户、记录拜访、保存活动，或者查询提醒和共同特点客户。`,
    mood: understanding.mood,
    preview: null,
  };
}

