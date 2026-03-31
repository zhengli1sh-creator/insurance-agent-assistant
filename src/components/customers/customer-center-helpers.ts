import { customers as demoCustomers } from "@/lib/demo-data";
import type { CustomerProfileFormValue } from "@/components/customers/customer-profile-fields";
import type { CustomerRecord } from "@/types/customer";

export type CustomerProfileSection = {
  title: string;
  fields: Array<{ label: string; value: string }>;
};

function hasText(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function textOrEmpty(value: string | null | undefined) {
  return value?.trim() ?? "";
}

export function displayCustomerValue(value: string | null | undefined, fallback = "尚未补充") {
  return hasText(value) ? value!.trim() : fallback;
}

export function mapCustomerRecordToFormValue(customer: CustomerRecord): CustomerProfileFormValue {
  return {
    name: customer.name,
    nickname: customer.nickname ?? "",
    age: customer.age ?? "",
    sex: customer.sex ?? "",
    profession: customer.profession ?? "",
    familyProfile: customer.family_profile ?? "",
    wealthProfile: customer.wealth_profile ?? "",
    coreInteresting: customer.core_interesting ?? "",
    preferCommunicate: customer.prefer_communicate ?? "",
    source: customer.source ?? "",
    recentMoney: customer.recent_money ?? "",
    remark: customer.remark ?? "",
  };
}

export function createFallbackCustomerRecords(): CustomerRecord[] {
  return demoCustomers.map((item) => ({
    id: item.id,
    owner_id: "demo",
    sys_platform: "demo",
    uuid: `demo-${item.id}`,
    bstudio_create_time: "",
    name: item.name,
    age: "",
    sex: "女",
    profession: item.tags[0] ?? "",
    family_profile: item.note,
    wealth_profile: item.assetFocus,
    core_interesting: item.assetFocus,
    prefer_communicate: item.note,
    source: "示例客户",
    nickname: "",
    recent_money: item.nextAction,
    remark: item.note,
    created_at: "",
    updated_at: "",
  }));
}

export function getCustomerSortTime(customer: CustomerRecord) {
  const timestamp = Date.parse(customer.bstudio_create_time || customer.created_at || customer.updated_at || "");
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function countProfileSignals(customer: CustomerRecord) {
  const values = [
    customer.nickname,
    customer.profession,
    customer.source,
    customer.core_interesting,
    customer.prefer_communicate,
    customer.recent_money,
    customer.wealth_profile,
    customer.family_profile,
    customer.remark,
  ];

  return values.filter((value) => hasText(value)).length;
}

export function getCustomerProfileStatus(customer: CustomerRecord) {
  const signalCount = countProfileSignals(customer);

  if (signalCount >= 7) {
    return {
      label: "已具备基础画像",
      hint: "当前基础资料已经较完整，可作为后续经营承接的稳定起点。",
      badgeClassName: "advisor-status-healthy border-0",

    };
  }

  if (signalCount >= 4) {
    return {
      label: "资料待继续完善",
      hint: "已形成基础经营画像，建议继续补充沟通偏好与近期资金情况。",
      badgeClassName: "advisor-status-progress border-0",

    };
  }

  return {
    label: "基础已建，待继续完善",
    hint: "当前以基础身份信息为主，建议尽快补齐核心关注点与沟通偏好。",
    badgeClassName: "advisor-status-pending border-0",

  };
}

export function getCustomerBriefing(customer: CustomerRecord) {
  const known: string[] = [];
  const missing: string[] = [];
  const nextSteps: string[] = [];

  if (hasText(customer.profession)) {
    known.push(`已记录职业 / 身份：${textOrEmpty(customer.profession)}`);
  }

  if (hasText(customer.source)) {
    known.push(`已记录客户来源：${textOrEmpty(customer.source)}`);
  }

  if (hasText(customer.core_interesting)) {
    known.push(`已沉淀核心关注点：${textOrEmpty(customer.core_interesting)}`);
  }

  if (hasText(customer.prefer_communicate)) {
    known.push(`已记录沟通偏好：${textOrEmpty(customer.prefer_communicate)}`);
  }

  if (hasText(customer.recent_money)) {
    known.push(`已记录近期资金情况：${textOrEmpty(customer.recent_money)}`);
  }

  if (!hasText(customer.core_interesting)) {
    missing.push("尚未补充核心关注点，后续经营判断还不够聚焦。");
  }

  if (!hasText(customer.prefer_communicate)) {
    missing.push("尚未补充沟通偏好，联系节奏与表达方式还缺少依据。");
  }

  if (!hasText(customer.recent_money)) {
    missing.push("尚未补充近期资金情况，后续经营建议还不够具体。");
  }

  if (!hasText(customer.family_profile)) {
    missing.push("尚未补充家庭情况，家庭责任与成员结构仍待了解。");
  }

  if (!hasText(customer.wealth_profile)) {
    missing.push("尚未补充财富情况，资产配置与风险承受判断仍较粗略。");
  }

  if (!hasText(customer.prefer_communicate)) {
    nextSteps.push("建议先补充沟通偏好，便于后续联系更自然、更稳妥。");
  }

  if (!hasText(customer.recent_money)) {
    nextSteps.push("建议补充近期资金情况，让后续经营建议更贴近真实安排。");
  }

  if (!hasText(customer.core_interesting)) {
    nextSteps.push("建议先明确当前核心关注点，方便后续围绕单一主题持续推进。");
  }

  if (nextSteps.length === 0) {
    nextSteps.push("当前基础画像已较完整，后续可等待拜访、活动和提醒能力接入后继续沉淀经营上下文。");
  }

  return {
    known: known.length > 0 ? known : ["当前已沉淀的信息以基础身份信息为主，经营画像仍可继续完善。"],
    missing: missing.length > 0 ? missing.slice(0, 4) : ["当前基础资料已较完整，暂无明显缺口。"],
    nextSteps: nextSteps.slice(0, 3),
  };
}

export function getCustomerProfileSections(customer: CustomerRecord): CustomerProfileSection[] {
  return [
    {
      title: "基本身份",
      fields: [
        { label: "姓名", value: customer.name },
        { label: "昵称", value: displayCustomerValue(customer.nickname) },
        { label: "年龄", value: displayCustomerValue(customer.age) },
        { label: "性别", value: displayCustomerValue(customer.sex) },
        { label: "职业 / 身份", value: displayCustomerValue(customer.profession) },
        { label: "客户来源", value: displayCustomerValue(customer.source) },
      ],
    },
    {
      title: "经营画像",
      fields: [
        { label: "核心关注点", value: displayCustomerValue(customer.core_interesting) },
        { label: "近期资金情况", value: displayCustomerValue(customer.recent_money) },
        { label: "财富情况", value: displayCustomerValue(customer.wealth_profile) },
        { label: "家庭情况", value: displayCustomerValue(customer.family_profile) },
      ],
    },
    {
      title: "沟通与备注",
      fields: [
        { label: "沟通偏好", value: displayCustomerValue(customer.prefer_communicate) },
        { label: "备注", value: displayCustomerValue(customer.remark) },
      ],
    },
  ];
}

export function getCustomerReminderStats(customers: CustomerRecord[]) {
  return {
    missingCommunicationCount: customers.filter((customer) => !hasText(customer.prefer_communicate)).length,
    missingFocusCount: customers.filter((customer) => !hasText(customer.core_interesting)).length,
    thinProfileCount: customers.filter((customer) => countProfileSignals(customer) <= 3).length,
  };
}

export function filterCustomers(customers: CustomerRecord[], keyword: string) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!normalizedKeyword) {
    return [...customers].sort((left, right) => getCustomerSortTime(right) - getCustomerSortTime(left));
  }

  return customers
    .filter((customer) => {
      const haystack = [
        customer.name,
        customer.nickname,
        customer.profession,
        customer.source,
        customer.core_interesting,
        customer.prefer_communicate,
        customer.remark,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedKeyword);
    })
    .sort((left, right) => getCustomerSortTime(right) - getCustomerSortTime(left));
}
