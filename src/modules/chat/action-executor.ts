import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { createActivityService } from "@/modules/activities/activity-service";
import { buildAssistantWorkflow } from "@/modules/chat/workflow-director";
import { detectChatIntent, type ChatIntent } from "@/modules/chat/intent-service";
import { createCustomerService, listCustomersService } from "@/modules/customers/customer-service";
import { listInsightsService } from "@/modules/queries/query-service";
import { listTasksService } from "@/modules/tasks/task-service";
import { createVisitService } from "@/modules/visits/visit-service";
import type { AgentActionPreview, AssistantWorkflowDirective, ChatResponse } from "@/types/agent";

function comfortPrefix(intent: ChatIntent) {
  if (intent.mood !== "安慰") {
    return "";
  }

  return "先别急着否定自己，这类中高资产客户的经营本来就更依赖节奏和信任。我先帮你把下一步整理清楚。\n\n";
}

function previewItemsFromList(items: string[]) {
  return items.slice(0, 6);
}

function withWorkflow(workflow: AssistantWorkflowDirective, result: Omit<ChatResponse, "workflow">): ChatResponse {
  return {
    ...result,
    workflow,
  };
}

function buildPlanningPreview(intent: ChatIntent, message: string): AgentActionPreview | null {
  if (intent.type === "customer_create") {
    const payload = intent.payload as {
      name?: string;
      nickname?: string;
      source?: string;
      coreInteresting?: string;
    };

    return {
      title: "首页已识别为客户建档需求",
      description: "当前建议转入客户中心完成基础档案保存，再返回高频主流程。",
      items: previewItemsFromList([
        `客户姓名：${payload.name || "待补充"}`,
        `客户昵称：${payload.nickname || "待补充"}`,
        `客户来源：${payload.source || "待补充"}`,
        `核心关注点：${payload.coreInteresting || "待补充"}`,
      ]),
      requiresConfirmation: false,
    };
  }

  if (intent.type === "visit_create") {
    const payload = intent.payload as { customerName?: string; timeVisit?: string; summary?: string };
    const followUps = message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+/g) ?? [];

    return {
      title: "首页已切到拜访主工作区",
      description: "这次输入不会直接写库，而是先把单主工作区和待补字段整理到前面。",
      items: previewItemsFromList([
        `客户：${payload.customerName || "待补充"}`,
        `拜访日期：${payload.timeVisit || new Date().toISOString().slice(0, 10)}`,
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

export function planChatMessage(message: string): ChatResponse {
  const intent = detectChatIntent(message);
  const prefix = comfortPrefix(intent);
  const workflow = buildAssistantWorkflow(message, intent);

  if (intent.type === "support") {
    return withWorkflow(workflow, {
      reply: `${prefix}我先把首页保持在一个安静的主工作区，你可以直接在下面记下今天最值得沉淀的一次拜访。`,
      mood: intent.mood,
      preview: null,
    });
  }

  if (intent.type === "visit_create") {
    const payload = intent.payload as { customerName?: string };
    return withWorkflow(workflow, {
      reply: payload.customerName
        ? `${prefix}我已先把 ${payload.customerName} 的拜访工作区放到前面。你可以直接补充地点、核心判断与后续动作。`
        : `${prefix}我已先把拜访工作区放到前面。请先补一句客户姓名，我再继续帮你把重点沉淀完整。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }

  if (intent.type === "customer_create") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已识别为新增客户档案需求，并把客户建档任务页准备好了。你可以先保存最小必填，完成后我会带你回到助手沟通页继续安排下一步。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }


  if (intent.type === "activity_create") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已识别为客户活动补录需求，并把结构化活动承接区准备好了。你可以先补活动效果、参加客户与后续动作；需要批量回看时再展开完整活动视图。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }


  if (intent.type === "tasks_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为任务整理需求。任务与优先级更适合在结构化列表里统一查看和比较。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }

  if (intent.type === "insights_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为客户筛选或共性洞察需求。为了保留结果分组与比较视图，建议转入任务与洞察页继续处理。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }

  if (intent.type === "customer_query") {
    return withWorkflow(workflow, {
      reply: `${prefix}我已理解为客户查询需求。客户摘要和历史上下文更适合在客户中心的结构化结果区里承接。`,
      mood: intent.mood,
      preview: buildPlanningPreview(intent, message),
    });
  }

  return withWorkflow(workflow, {
    reply: `${prefix}我先把最常用的拜访主工作区放在首页前面。你可以直接告诉我今天拜访了谁、客户最在意什么，以及你答应了什么后续动作。`,
    mood: intent.mood,
    preview: null,
  });
}

export async function executeChatMessage(supabase: SupabaseClient, user: User, message: string): Promise<ChatResponse> {
  const intent = detectChatIntent(message);
  const prefix = comfortPrefix(intent);
  const workflow = buildAssistantWorkflow(message, intent);

  if (intent.type === "support") {
    return withWorkflow(workflow, {
      reply: `${prefix}你已经做得很稳了。先把今天最值得推进的一步做出来，剩下的节奏我陪你慢慢排。`,
      mood: intent.mood,
      preview: null,
    });
  }

  if (intent.type === "tasks_query") {
    const result = await listTasksService(supabase, user.id);
    return withWorkflow(workflow, {
      reply: `${prefix}我已经把你的待办提醒整理好了，优先从高优先级和未完成任务开始看。`,
      mood: intent.mood,
      preview: {
        title: "今日任务概览",
        description: "以下是当前按任务服务读取到的提醒。",
        items: previewItemsFromList((result.data ?? []).map((item) => `${item.status}｜${item.title}`)),
        requiresConfirmation: false,
      },
    });
  }

  if (intent.type === "insights_query") {
    const result = await listInsightsService(supabase, user.id);
    return withWorkflow(workflow, {
      reply: `${prefix}我已经按客户共性和当前节奏给你整理出一组经营洞察。`,
      mood: intent.mood,
      preview: {
        title: "共同特点客户洞察",
        description: "适合继续深挖的客户群与服务方向如下。",
        items: previewItemsFromList((result.data ?? []).map((item) => `${item.title}（${item.count}位）`)),
        requiresConfirmation: false,
      },
    });
  }

  if (intent.type === "customer_query") {
    const result = await listCustomersService(supabase, user.id, String(intent.payload.keyword ?? ""));
    return withWorkflow(workflow, {
      reply: `${prefix}我已经根据你的描述检索客户档案。`,
      mood: intent.mood,
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

  if (intent.type === "customer_create") {
    const payload = intent.payload as {
      name?: string;
      nickname?: string;
      profession?: string;
      source?: string;
      coreInteresting?: string;
    };

    if (!payload.name) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已理解为新增客户，但还缺少客户姓名。请直接补一句“客户叫谁，昵称是什么，核心关注点是什么”。`,
        mood: intent.mood,
        preview: null,
      });
    }

    if (!intent.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已整理出新增客户的结构化信息，确认后我再写入档案。`,
        mood: intent.mood,
        preview: {
          title: "待确认：新增客户档案",
          description: "确认后会写入客户基础信息表。",
          items: previewItemsFromList([
            `客户姓名：${payload.name}`,
            `客户昵称：${payload.nickname || "待补充"}`,
            `客户来源：${payload.source || "待补充"}`,
            `核心关注点：${payload.coreInteresting || "待补充"}`,
          ]),
          requiresConfirmation: true,
          confirmCommand: `确认 ${message}`,
        },
      });
    }

    const result = await createCustomerService(supabase, user.id, {
      name: payload.name,
      nickname: payload.nickname,
      profession: payload.profession,
      source: payload.source,
      coreInteresting: payload.coreInteresting,
    });

    return withWorkflow(workflow, {
      reply: result.error || `${prefix}客户档案已创建，后续可以继续补充家庭情况、财富情况与沟通偏好。`,
      mood: intent.mood,
      preview: result.data
        ? {
            title: "已执行：客户创建成功",
            description: "客户基础信息已经写入数据库。",
            items: previewItemsFromList([
              `${result.data.name}｜${result.data.nickname || "无昵称"}｜${result.data.core_interesting || result.data.profession || "待补充核心信息"}`,
            ]),
            requiresConfirmation: false,
          }
        : null,
    });
  }

  if (intent.type === "visit_create") {
    const payload = intent.payload as { customerName?: string; timeVisit?: string; summary?: string };
    if (!payload.customerName) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已理解为新增拜访记录，但还没有识别到明确客户姓名。`,
        mood: intent.mood,
        preview: null,
      });
    }

    const matches = await listCustomersService(supabase, user.id, payload.customerName);
    const targetCustomer = matches.data?.[0];

    if (!targetCustomer) {
      return withWorkflow(workflow, {
        reply: `${prefix}当前还没有找到名为 ${payload.customerName} 的客户档案。请先创建客户，或换一种更完整的客户描述。`,
        mood: intent.mood,
        preview: null,
      });
    }

    const visitDate = payload.timeVisit || new Date().toISOString().slice(0, 10);

    if (!intent.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已经把这次拜访整理成记录草稿，确认后会保存并同步生成后续提醒。`,
        mood: intent.mood,
        preview: {
          title: "待确认：新增拜访记录",
          description: "确认后会写入拜访记录表，并从内容中抽取后续事项。",
          items: previewItemsFromList([`客户：${targetCustomer.name}`, `拜访日期：${visitDate}`, `摘要：${payload.summary || "待补充"}`]),
          requiresConfirmation: true,
          confirmCommand: `确认 ${message}`,
        },
      });
    }

    const followUps = message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+/g) ?? [];
    const result = await createVisitService(supabase, user.id, {
      customerId: targetCustomer.id,
      name: targetCustomer.name,
      nickName: targetCustomer.nickname ?? "",
      timeVisit: visitDate,
      briefContent: payload.summary || message,
      followWork: followUps.join("；"),
      methodCommunicate: "来自 chatbox 录入",
      followUps,
    });

    return withWorkflow(workflow, {
      reply: result.error || `${prefix}拜访记录已保存，后续事项也会同步进入提醒面板。`,
      mood: intent.mood,
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

  if (intent.type === "activity_create") {
    const payload = intent.payload as {
      title?: string;
      dateActivity?: string;
      participantNames?: string[];
      summary?: string;
    };
    const participantNames = payload.participantNames ?? [];

    if (participantNames.length === 0) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已理解为新增客户活动，但还没有识别到参与客户名单。`,
        mood: intent.mood,
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
        mood: intent.mood,
        preview: null,
      });
    }

    const participants = participantNames
      .map((name) => customerPool.find((customer) => customer.name === name))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));

    if (participants.length !== participantNames.length) {
      return withWorkflow(workflow, {
        reply: `${prefix}当前没有完整匹配到参与客户的正式档案，请先确认客户名单是否已录入。`,
        mood: intent.mood,
        preview: null,
      });
    }

    const activityDate = payload.dateActivity || new Date().toISOString().slice(0, 10);
    const followUps = message.match(/发送[^，。；]+|安排[^，。；]+|跟进[^，。；]+|邀请[^，。；]+/g) ?? [];
    const sharedFollowWork = followUps.join("；");

    if (!intent.confirmed) {
      return withWorkflow(workflow, {
        reply: `${prefix}我已经把活动记录整理成草稿，确认后会分别写入活动信息表和客户参加活动表。`,
        mood: intent.mood,
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
      mood: intent.mood,
      preview: result.data
        ? {
            title: "已执行：客户活动创建成功",
            description: "活动信息表与客户参加活动表已经写入数据库。",
            items: previewItemsFromList([
              `${result.data.name_activity}｜${result.data.date_activity}`,
              ...participants.map((item) => (item.nickname ? `${item.name}（${item.nickname}）` : item.name)),
            ]),
            requiresConfirmation: false,
          }
        : null,
    });
  }

  return withWorkflow(workflow, {
    reply: `${prefix}我已经理解到你需要经营协助。可以直接让我新增客户、记录拜访、保存活动，或者查询提醒和共同特点客户。`,
    mood: intent.mood,
    preview: null,
  });
}
