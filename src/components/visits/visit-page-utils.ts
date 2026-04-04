import type { VisitChatMessage, VisitCustomerStatus, VisitDraftFieldKey, VisitDraftState } from "@/components/visits/visit-page-types";
import type { CustomerRecord } from "@/types/customer";

export const visitComposerFields: Array<{ key: VisitDraftFieldKey; label: string; required?: boolean }> = [
  { key: "customer", label: "客户", required: true },
  { key: "timeVisit", label: "拜访日期", required: true },
  { key: "location", label: "地点" },
  { key: "methodCommunicate", label: "沟通方式" },
  { key: "corePain", label: "客户关注点" },
  { key: "briefContent", label: "沟通摘要" },
  { key: "followWork", label: "后续事项" },
];

export function createEmptyVisitDraft(): VisitDraftState {
  return {
    customerId: "",
    name: "",
    nickName: "",
    timeVisit: "",
    location: "",
    methodCommunicate: "",
    corePain: "",
    briefContent: "",
    followWork: "",
  };
}

export function formatMessageTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

export function createVisitWelcomeMessage(content = "") {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    type: "welcome",
    content,
    timestamp: formatMessageTime(),
  } satisfies VisitChatMessage;
}

function resolvedDraftValue(currentValue: string, nextValue?: string) {
  const normalizedNextValue = normalizeText(nextValue);
  return normalizedNextValue || currentValue;
}

export function mergeVisitDraft(currentDraft: VisitDraftState, nextFields: Partial<VisitDraftState>) {
  const nextName = normalizeText(nextFields.name);
  const nextNickName = normalizeText(nextFields.nickName);
  const shouldResetCustomerId =
    (nextName && nextName !== normalizeText(currentDraft.name)) ||
    (nextNickName && nextNickName !== normalizeText(currentDraft.nickName));

  return {
    ...currentDraft,
    customerId: shouldResetCustomerId ? "" : currentDraft.customerId,
    name: resolvedDraftValue(currentDraft.name, nextFields.name),
    nickName: resolvedDraftValue(currentDraft.nickName, nextFields.nickName),
    timeVisit: resolvedDraftValue(currentDraft.timeVisit, nextFields.timeVisit),
    location: resolvedDraftValue(currentDraft.location, nextFields.location),
    methodCommunicate: resolvedDraftValue(currentDraft.methodCommunicate, nextFields.methodCommunicate),
    corePain: resolvedDraftValue(currentDraft.corePain, nextFields.corePain),
    briefContent: resolvedDraftValue(currentDraft.briefContent, nextFields.briefContent),
    followWork: resolvedDraftValue(currentDraft.followWork, nextFields.followWork),
  } satisfies VisitDraftState;
}


function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

export function findExactCustomerMatch(draft: VisitDraftState, customers: CustomerRecord[]) {
  const name = normalizeText(draft.name);
  const nickname = normalizeText(draft.nickName);

  if (!name && !nickname) {
    return null;
  }

  const matches = customers.filter((customer) => {
    const sameName = name ? normalizeText(customer.name) === name : false;
    // 只要姓名精确匹配，即视为精确匹配（昵称不作为必要条件）
    return sameName;
  });

  return matches.length === 1 ? matches[0] : null;
}

export function findRelatedCustomers(draft: VisitDraftState, customers: CustomerRecord[]) {
  const name = normalizeText(draft.name);
  const nickname = normalizeText(draft.nickName);

  if (!name && !nickname) {
    return [] as CustomerRecord[];
  }

  return customers
    .filter((customer) => {
      const customerName = normalizeText(customer.name);
      const customerNickname = normalizeText(customer.nickname);
      const sameName = name ? customerName === name : false;
      const fuzzyName = name ? customerName.includes(name) || name.includes(customerName) : false;
      const sameNickname = nickname ? customerNickname === nickname : false;
      return sameName || fuzzyName || sameNickname;
    })
    .slice(0, 5);
}

export function resolveCustomerStatus(
  draft: VisitDraftState,
  exactCustomer: CustomerRecord | null,
  relatedCustomers: CustomerRecord[],
): VisitCustomerStatus {
  if (exactCustomer) {
    return {
      tone: "matched",
      title: "已匹配现有客户",
      description: "当前会直接绑定这位已建档客户，你可以继续核对拜访内容。",
      customer: exactCustomer,
    };
  }

  if (normalizeText(draft.name) || normalizeText(draft.nickName)) {
    if (relatedCustomers.length > 0) {
      return {
        tone: "review",
        title: "发现相近客户",
        description: "为避免误写，建议先核对是否已有现成档案；如没有，再补最小客户信息。",
        customer: null,
      };
    }

    return {
      tone: "missing",
      title: "需先补客户档案",
      description: "当前未查到这位客户。保存前可先补最小客户信息，完成后会继续回到这次拜访。",
      customer: null,
    };
  }

  return {
    tone: "pending",
    title: "待补充客户",
    description: "先告诉我客户姓名或昵称，我会继续帮你核对并整理本次拜访。",
    customer: null,
  };
}
