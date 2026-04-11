import { understandAssistantMessage } from "@/modules/chat/assistant-understanding";
import type { AgentMood, ChatResponse } from "@/types/agent";

const businessIntentTypes = new Set([
  "customer_create",
  "customer_query",
  "visit_create",
  "activity_create",
  "tasks_query",
  "insights_query",
]);

function normalizeMood(mood: AgentMood) {
  return mood === "执行" ? "鼓舞" : mood;
}

function buildGenericCompanionReply(): ChatResponse {
  return {
    reply:
      "我在。这里先不直接发起客户、记录或任务流程；如果你愿意，可以先告诉我眼下最堵的一件事，或者说说今天最想稳住的节奏，我先陪你把状态收回来。",
    mood: "安慰",
    preview: null,
  };
}

function buildBusinessBoundaryReply(mood: AgentMood): ChatResponse {
  return {
    reply:
      "这件事我先不在这里替你发起流程。\n\n“随便聊聊” 当前只承接鼓励、安慰和节奏整理；如果你愿意，我可以先陪你把思路理顺、把最难的一步说清楚，等你准备好，再回首页进入对应功能会更稳。",
    mood: normalizeMood(mood),
    preview: null,
  };
}

function buildSupportReply(message: string, mood: AgentMood): ChatResponse {
  const normalized = message.trim();

  let opening = "我听到了，你现在更需要先被接住，而不是立刻把所有事情都处理完。";
  let perspective = "保险经营本来就不是一条一直顺风的直线，很多高质量推进，都是在看起来不那么顺的时候慢慢积累出来的。";
  let nextStep = "我们先只盯住一个最小动作：把今天最想稳住的一位客户、或最放不下的一件事说给我，我陪你把下一步缩到足够清楚。";

  if (/拒绝|被拒|婉拒|没回|没回复|冷淡/.test(normalized)) {
    opening = "被客户拒绝、回应冷下来，心里发堵很正常，这不说明你做得差。";
    perspective = "很多客户的节奏本来就慢，尤其涉及信任、预算和家庭决策时，暂时没有推进，往往不等于真正否定你。";
    nextStep = "先别急着给自己下结论。你可以把这次沟通里最让你介意的一句话，或你最担心的那个点告诉我，我陪你一起拆开看。";
  } else if (/乱|一团|很多事|排不过来|顾不过来|节奏/.test(normalized)) {
    opening = "我明白，你现在不是不愿意做，而是事情一多，节奏容易一下散开。";
    perspective = "这时候最需要的不是再扛更多，而是先把注意力收回到唯一主线。只要主线稳住，后面的动作就会重新排好。";
    nextStep = "你先告诉我：今天最不能失手的一件事是什么？我们先把它单独拎出来，其余的我陪你往后排。";
  } else if (/累|疲惫|撑不住|心累|没劲/.test(normalized)) {
    opening = "你最近确实累了，这种累不只是事务多，更像一直要稳住自己、稳住客户、还要稳住节奏。";
    perspective = "能走到这里，说明你已经扛了很多，而且扛得并不差。现在更重要的是先把消耗降下来，而不是继续逼自己满格运转。";
    nextStep = "我们先不求一下子恢复状态。你可以告诉我，今天最想放下一件什么事，或者最需要我先陪你整理哪一段压力。";
  } else if (/怀疑自己|是不是我|做错|不够好|我不行/.test(normalized)) {
    opening = "会开始怀疑自己，往往正说明你对客户和结果很认真。";
    perspective = "但认真不等于要把所有波动都归到自己身上。客户经营里有很多因素本来就不完全由你控制，你能做的是把判断和动作继续做稳。";
    nextStep = "你可以把这件事里最怕自己做错的地方说出来，我陪你一起判断，哪些真的需要调整，哪些只是你对自己太苛刻。";
  } else if (/做得怎么样|最近表现|其实做得怎么样|有没有进步/.test(normalized)) {
    opening = "如果你会这样问，通常说明你并没有在敷衍，而是在认真回看自己的经营质量。";
    perspective = "从长期经营的角度看，稳定表达、愿意复盘、还能在压力里继续顾及客户感受，这本身就是很难得的专业能力。";
    nextStep = "如果你愿意，可以把你最近最在意的一次客户互动说给我，我帮你一起看看，哪些地方其实已经做得很稳。";
  }

  return {
    reply: `${opening}\n\n${perspective}\n\n${nextStep}`,
    mood: normalizeMood(mood),
    preview: null,
  };
}

export async function buildCompanionReply(message: string): Promise<ChatResponse> {
  const normalized = message.trim();
  if (!normalized) {
    return buildGenericCompanionReply();
  }

  const understanding = await understandAssistantMessage(normalized);

  if (businessIntentTypes.has(understanding.type)) {
    return buildBusinessBoundaryReply(understanding.mood);
  }

  if (understanding.type === "unknown" && understanding.mood !== "安慰") {
    return buildGenericCompanionReply();
  }

  return buildSupportReply(normalized, understanding.mood);
}
