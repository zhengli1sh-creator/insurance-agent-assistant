"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Circle,
  Lightbulb,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { fetchJson } from "@/lib/crm-api";
import { cn } from "@/lib/utils";
import type { CustomerRecord } from "@/types/customer";

const customerFields = [
  { key: "name", label: "姓名", required: true },
  { key: "nickname", label: "昵称", required: false },
  { key: "age", label: "年龄", required: false },
  { key: "sex", label: "性别", required: false },
  { key: "profession", label: "职业", required: false },
  { key: "familyProfile", label: "家庭情况", required: false },
  { key: "wealthProfile", label: "财富情况", required: false },
  { key: "coreInteresting", label: "核心关注点", required: false },
  { key: "preferCommunicate", label: "沟通偏好", required: false },
  { key: "source", label: "客户来源", required: false },
  { key: "recentMoney", label: "近期资金情况", required: false },
  { key: "remark", label: "备注", required: false },
] as const;

type CustomerFieldKey = (typeof customerFields)[number]["key"];

const labelToKeyMap: Record<string, CustomerFieldKey> = {
  客户姓名: "name",
  姓名: "name",
  客户昵称: "nickname",
  昵称: "nickname",
  年龄: "age",
  性别: "sex",
  "职业 / 身份": "profession",
  职业: "profession",
  家庭情况: "familyProfile",
  财富情况: "wealthProfile",
  财富状况: "wealthProfile",
  核心关注点: "coreInteresting",
  沟通偏好: "preferCommunicate",
  客户来源: "source",
  资金情况: "recentMoney",
  近期资金情况: "recentMoney",
  备注: "remark",
};

const infoCategories = [
  {
    title: "基础信息",
    items: [
      { label: "姓名", required: true },
      { label: "昵称" },
      { label: "年龄" },
      { label: "性别" },
      { label: "职业" },
    ],
  },
  {
    title: "家庭与财富",
    items: [{ label: "家庭情况" }, { label: "财富情况" }, { label: "近期资金情况" }],
  },
  {
    title: "经营相关",
    items: [{ label: "核心关注点" }, { label: "沟通偏好" }, { label: "客户来源" }],
  },
  {
    title: "其他",
    items: [{ label: "备注及其他任意信息" }],
  },
] as const;

const DESKTOP_CUSTOMERS_PAGE_SIZE = 5;

type ChatMessageType = "welcome" | "user-input" | "extracted-summary" | "save-success" | "error-hint";


type ExtractedFieldItem = { label: string; value: string };

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  type: ChatMessageType;
  content: string;
  timestamp: string;
  rawInput?: string;
  extractedFields?: ExtractedFieldItem[];
  currentFields?: Record<CustomerFieldKey, string>;
  savedCustomer?: CustomerRecord;
};

type CustomerDraftExtractResponse = {
  fields: Record<string, string>;
  extractedFields: Array<{ label: string; value: string }>;
  message: string;
};

function createEmptyDraft(): Record<CustomerFieldKey, string> {
  return {
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
}

function formatTime() {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
}

function formatShortDate(dateString?: string | null) {
  if (!dateString) {
    return "";
  }

  return new Date(dateString).toLocaleDateString("zh-CN", {
    month: "numeric",
    day: "numeric",
  });
}

function getCustomerSortTime(customer: CustomerRecord) {
  const timestamp = customer.created_at ? new Date(customer.created_at).getTime() : 0;
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getHintMeta(message: string) {

  if (message.includes("相近客户") || message.includes("同名客户") || message.includes("已有客户")) {
    return {
      title: "已检测到可能重复的客户档案",
      helper: "如为另一位同名客户，建议补充昵称后再继续保存。",
    };
  }

  if (message.includes("不完整")) {
    return {
      title: "当前姓名可能还不完整",
      helper: "为避免后续识别混淆，建议先补充完整姓名。",
    };
  }

  if (message.includes("客户姓名") || message.includes("姓名")) {
    return {
      title: "还缺少客户姓名",
      helper: "客户姓名是建档必填信息，补充后我会继续承接当前流程。",
    };
  }

  return {
    title: "还需要你确认一下",
    helper: "你可以继续补充信息，我会按新的内容重新整理。",
  };
}

function getSavedGroups(customer: CustomerRecord) {
  return [
    {
      title: "基础信息",
      items: [
        { label: "年龄", value: customer.age },
        { label: "性别", value: customer.sex },
        { label: "职业", value: customer.profession },
      ].filter((item) => item.value),
    },
    {
      title: "家庭与财富",
      items: [
        { label: "家庭情况", value: customer.family_profile },
        { label: "财富情况", value: customer.wealth_profile },
        { label: "近期资金情况", value: customer.recent_money },
      ].filter((item) => item.value),
    },
    {
      title: "经营相关",
      items: [
        { label: "核心关注点", value: customer.core_interesting },
        { label: "沟通偏好", value: customer.prefer_communicate },
        { label: "客户来源", value: customer.source },
      ].filter((item) => item.value),
    },
    {
      title: "其他信息",
      items: [{ label: "备注", value: customer.remark }].filter((item) => item.value),
    },
  ].filter((group) => group.items.length > 0);
}

function getCustomerMetaLine(customer: CustomerRecord) {
  const meta = [customer.profession, customer.source].filter(Boolean);
  if (meta.length > 0) {
    return meta.join(" · ");
  }

  if (customer.nickname) {
    return `昵称：${customer.nickname}`;
  }

  return "已建档客户";
}

function validateNameComplete(name: string) {
  return name.trim().length >= 2;
}

function WelcomeMessageCard({ compact = false }: { compact?: boolean }) {
  const [isCardExpanded, setIsCardExpanded] = useState(false);
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);

  const condensedCard = (
    <div className="w-full rounded-[22px] border border-[#0F766E]/12 bg-[linear-gradient(180deg,rgba(244,250,248,0.96)_0%,rgba(250,252,251,0.96)_100%)] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:px-4 sm:py-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex flex-1 items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/10 sm:h-8 sm:w-8">
            <Lightbulb className="h-3.5 w-3.5 text-[#0F766E] sm:h-4 sm:w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-[#123B5D]">直接描述客户</h3>
          </div>

        </div>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsCardExpanded(true)}
          className="h-8 shrink-0 rounded-full px-3 text-xs text-[#123B5D] hover:bg-white/80 hover:text-[#0F766E]"
        >
          说明
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );

  const expandedCard = (
    <div className="w-full rounded-[24px] border border-[#0F766E]/14 bg-[linear-gradient(180deg,rgba(238,247,245,0.98)_0%,rgba(248,252,251,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex flex-1 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/12">
            <Lightbulb className="h-4 w-4 text-[#0F766E]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold text-[#123B5D] sm:text-[15px]">直接描述客户</h3>
          </div>

        </div>

        {compact || isCardExpanded ? (
          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsCardExpanded(false)}
            className="h-8 shrink-0 rounded-full px-3 text-xs text-slate-500 hover:bg-white/70 hover:text-slate-700"
          >
            收起
            <ChevronUp className="ml-1 h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>


      <div className="mt-4 space-y-2.5">
        <div className="rounded-2xl border border-white/75 bg-white/72 px-3.5 py-3 text-sm leading-6 text-slate-600">
          <span className="font-medium text-[#123B5D]">已支持整理：</span>
          姓名、昵称、年龄、职业、家庭情况、财富情况、核心关注点、沟通偏好、客户来源等。
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-2xl border border-[#B8894A]/14 bg-[#FFF8EE]/72 px-3.5 py-3 text-sm leading-6 text-slate-600">
            <span className="font-medium text-[#8B6A32]">最小必填：</span>
            客户姓名
          </div>
          <div className="rounded-2xl border border-white/75 bg-white/72 px-3.5 py-3 text-sm leading-6 text-slate-600">
            不需要一次说全，先说你现在记得的内容即可。
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-dashed border-[#123B5D]/14 bg-white/55 px-3.5 py-3">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setIsDetailsExpanded((prev) => !prev)}
          className="h-auto w-full justify-between rounded-2xl px-0 py-0 text-left text-sm font-medium text-[#123B5D] hover:bg-transparent hover:text-[#0F766E]"
        >
          <span>查看全部可保存信息项</span>
          {isDetailsExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        {isDetailsExpanded ? (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {infoCategories.map((category) => (
              <div
                key={category.title}
                className="rounded-2xl border border-white/80 bg-white/82 px-3.5 py-3"
              >
                <p className="text-sm font-medium text-slate-700">{category.title}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                  {category.items.map((item) => (
                    <li key={item.label} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#B8894A]/80" />
                      <span>{item.label}</span>
                      {"required" in item && item.required ? (
                        <span className="rounded-full bg-[#123B5D]/8 px-2 py-0.5 text-[11px] text-[#123B5D]">
                          必填
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        例如：王敏，35岁，私营业主，已婚，有一个孩子，最近比较关注教育金和家庭保障。
      </p>
    </div>
  );

  if (!isCardExpanded) {
    if (compact) {
      return condensedCard;
    }

    return (
      <>
        <div className="md:hidden">{condensedCard}</div>
        <div className="hidden md:block">{expandedCard}</div>
      </>
    );
  }

  return expandedCard;
}


function ExtractedSummaryCard({
  extractedFields,
  currentFields,
}: {
  extractedFields: ExtractedFieldItem[];
  currentFields: Record<CustomerFieldKey, string>;
}) {
  const filledFields = customerFields.filter((field) => currentFields[field.key]?.trim());
  const suggestedFields = customerFields.filter((field) => !currentFields[field.key]?.trim());
  const nameReady = validateNameComplete(currentFields.name);

  return (
    <div className="rounded-[26px] border border-[#B8894A]/20 bg-[linear-gradient(180deg,rgba(255,248,238,0.98)_0%,rgba(255,252,247,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B8894A]/12">
            <Sparkles className="h-4 w-4 text-[#B8894A]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#123B5D] sm:text-[15px]">已为你整理出以下客户信息</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              当前以顾问简报方式呈现，保存前仍可继续补充。
            </p>
          </div>
        </div>
        <Badge className="rounded-full border-0 bg-[#B8894A]/12 px-3 py-1 text-[#8B6A32]">
          已具备 {filledFields.length} 项
        </Badge>
      </div>

      {extractedFields.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-white/80 bg-white/78 p-3.5 sm:p-4">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-[#8B6A32]">本次整理出</p>
          <div className="mt-3 space-y-2.5">
            {extractedFields.map((field, index) => (
              <div key={`${field.label}-${index}`} className="flex gap-3 text-sm leading-6">
                <span className="w-20 shrink-0 text-slate-500">{field.label}</span>
                <span className="flex-1 text-slate-700">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/74 p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <Circle className="h-4 w-4 text-[#B8894A]" />
          <p className="text-sm font-medium text-slate-700">可继续补充</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2.5 text-sm leading-6 text-slate-600">
          {suggestedFields.length > 0 ? (
            suggestedFields.map((field) => (
              <span
                key={field.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#B8894A]/18 bg-[#FFF8EE]/82 px-3 py-1.5 text-[#7A5328]"
              >
                <span>{field.label}</span>
                {field.required ? (
                  <span className="rounded-full bg-[#123B5D]/8 px-1.5 py-0.5 text-[11px] leading-4 text-[#123B5D]">必填</span>
                ) : null}
              </span>
            ))
          ) : (
            <p>当前信息已相当完整，可以直接保存当前客户档案。</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
        <span
          className={cn(
            "rounded-full px-3 py-1",
            nameReady ? "bg-[#0F766E]/10 text-[#0F766E]" : "bg-[#B8894A]/12 text-[#8B6A32]",
          )}
        >
          {nameReady ? "当前已具备保存条件" : "还需先补充客户姓名"}
        </span>
        <span>你可以继续补充信息，或直接保存当前客户档案。</span>
      </div>
    </div>
  );
}

function SaveSuccessCard({ customer }: { customer: CustomerRecord }) {
  const groups = getSavedGroups(customer);

  return (
    <div className="rounded-[26px] border border-[#0F766E]/16 bg-[linear-gradient(180deg,rgba(238,247,245,0.98)_0%,rgba(249,252,251,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#0F766E]/12">
          <CheckCircle className="h-4 w-4 text-[#0F766E]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-[#123B5D]">客户档案已保存</h3>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            已完成当前建档，后续仍可继续补充经营相关内容。
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/80 bg-white/80 px-4 py-3.5">
        <p className="text-lg font-semibold text-slate-900">{customer.name}</p>
        {customer.nickname ? (
          <p className="mt-1 text-sm text-slate-500">昵称：{customer.nickname}</p>
        ) : null}
      </div>

      {groups.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {groups.map((group) => (
            <div key={group.title} className="rounded-2xl border border-white/80 bg-white/74 p-3.5 sm:p-4">
              <p className="text-sm font-medium text-slate-700">{group.title}</p>
              <div className="mt-3 space-y-2.5">
                {group.items.map((item) => (
                  <div key={item.label} className="flex gap-3 text-sm leading-6">
                    <span className="w-20 shrink-0 text-slate-500">{item.label}</span>
                    <span className="flex-1 text-slate-700">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-slate-500">已完成当前建档。你可以继续补充下一位客户。</p>
    </div>
  );
}

function ErrorHintCard({ message }: { message: string }) {
  const hintMeta = getHintMeta(message);

  return (
    <div className="rounded-[24px] border border-[#D9A35F]/22 bg-[linear-gradient(180deg,rgba(255,249,240,0.98)_0%,rgba(255,253,248,0.98)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D9A35F]/14">
          <AlertCircle className="h-4 w-4 text-[#B06E20]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#7A5328]">{hintMeta.title}</p>
          <p className="mt-1 text-sm leading-6 text-slate-600">{message}</p>
          <p className="mt-2 text-xs leading-5 text-slate-500">{hintMeta.helper}</p>
        </div>
      </div>
    </div>
  );
}

function CustomerPreviewCard({
  customer,
  onClick,
}: {
  customer: CustomerRecord;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[20px] border border-white/75 bg-white/82 p-2.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:bg-white"
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-9 w-9 border border-[#E8E4DE]">
          <AvatarFallback className="bg-[#F0F4F8] text-[13px] font-medium text-[#123B5D]">
            {customer.name.slice(0, 1)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-medium leading-5 text-slate-900">{customer.name}</p>
            {customer.nickname ? (
              <span className="rounded-full bg-[#123B5D]/8 px-1.5 py-0.5 text-[10px] text-[#123B5D]">
                {customer.nickname}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{getCustomerMetaLine(customer)}</p>
          {customer.created_at ? (
            <p className="mt-1 text-[10px] text-slate-400">建档于 {formatShortDate(customer.created_at)}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}


function MobileCustomerEntryButton({
  customerCount,
  relatedCount,
  onOpen,
}: {
  customerCount: number;
  relatedCount: number;
  onOpen: () => void;
}) {
  const label = relatedCount > 0 ? "先核对相近客户" : "查看现有客户";
  const helper = relatedCount > 0 ? `已发现 ${relatedCount} 位相近客户` : customerCount > 0 ? `已保存 ${customerCount} 位客户` : "暂无已建档客户";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex items-center gap-2.5 rounded-full border border-white/75 bg-white/82 px-3 py-1.5 text-left shadow-[0_10px_24px_rgba(15,23,42,0.04)] transition hover:bg-white lg:hidden"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#123B5D]/10">
        <Users className="h-4 w-4 text-[#123B5D]" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#123B5D]">{label}</p>
        <p className="text-[10px] leading-4 text-slate-400">{helper}</p>
      </div>
    </button>
  );
}

function DuplicateReviewCard({
  relatedCustomers,
  hasBlockingDuplicate,
  onOpenSheet,
  onViewAll,
}: {
  relatedCustomers: CustomerRecord[];
  hasBlockingDuplicate: boolean;
  onOpenSheet: () => void;
  onViewAll: () => void;
}) {
  const title = hasBlockingDuplicate ? "检测到高度相似的已有客户，请先核对" : "保存前建议先核对相近客户";
  const description = hasBlockingDuplicate
    ? "这可能是同一位客户。你可以先打开抽屉核对，也可以先在上方补充昵称、职业等区分信息后再保存。"
    : "已根据当前草稿筛出可能相关的客户，可先核对，再决定是否继续新建。";

  return (
    <div className="mt-3 rounded-[20px] border border-[#B8894A]/16 bg-[linear-gradient(180deg,rgba(255,248,238,0.96)_0%,rgba(255,252,247,0.98)_100%)] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)] lg:hidden">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#B8894A]/12">
          <Users className="h-4 w-4 text-[#8B6A32]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-[#7A5328]">{title}</p>
          <p className="mt-1 text-[12px] leading-5 text-slate-600">{description}</p>
        </div>
      </div>

      <div className="mt-3 rounded-[18px] border border-white/80 bg-white/84 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#123B5D]/8 px-2 py-1 text-[11px] font-medium text-[#123B5D]">
            已发现 {relatedCustomers.length} 位相近客户
          </span>
          <span className="text-[11px] leading-5 text-slate-500">建议先打开抽屉核对；如仍是不同客户，再补充区分信息。</span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          onClick={onOpenSheet}
          className="h-9 flex-1 rounded-full bg-[#123B5D] text-sm text-white hover:bg-[#0E2E49]"
        >
          打开客户抽屉核对
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onViewAll}
          className="h-9 rounded-full border-slate-300 bg-white/84 px-3 text-[12px] text-slate-700"
        >
          客户中心
        </Button>
      </div>
    </div>
  );
}

function CustomerDirectoryPanelContent({
  relatedHint,
  pagedCustomers,
  totalCustomerCount,
  totalCustomerPages,
  currentCustomerPage,
  onPrevPage,
  onNextPage,
  onViewAll,
  scrollAreaClassName,
  footerClassName,
}: {
  relatedHint: string;
  pagedCustomers: CustomerRecord[];
  totalCustomerCount: number;
  totalCustomerPages: number;
  currentCustomerPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewAll: () => void;
  scrollAreaClassName?: string;
  footerClassName?: string;
}) {
  return (
    <>
      <ScrollArea className={cn("min-h-0 flex-1 px-4 py-3", scrollAreaClassName)}>
        <div className="space-y-2.5">
          {relatedHint ? (
            <div className="rounded-[20px] border border-[#B8894A]/16 bg-[#FFF8EE]/76 px-3.5 py-3 text-[13px] leading-5 text-[#7A5328]">
              {relatedHint}
            </div>
          ) : null}

          {pagedCustomers.length > 0 ? (
            pagedCustomers.map((customer) => (
              <CustomerPreviewCard key={customer.id} customer={customer} onClick={onViewAll} />
            ))
          ) : (
            <div className="rounded-[24px] border border-white/80 bg-white/80 px-4 py-6 text-center text-sm text-slate-500">
              暂无客户数据
            </div>
          )}
        </div>
      </ScrollArea>

      <div className={cn("shrink-0 border-t border-slate-200/70 bg-white/88 px-4 py-2.5", footerClassName)}>
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 text-[12px] leading-5 text-slate-500">
            <p>已保存 {totalCustomerCount} 位客户</p>
            <p>共 {totalCustomerPages} 页 · 当前第 {currentCustomerPage} 页</p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onPrevPage}
              disabled={currentCustomerPage <= 1}
              className="h-8 rounded-full border-slate-300 bg-white/86 px-3 text-[11px] text-slate-700 disabled:opacity-45"
            >
              上一页
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onNextPage}
              disabled={currentCustomerPage === 0 || currentCustomerPage >= totalCustomerPages}
              className="h-8 rounded-full border-slate-300 bg-white/86 px-3 text-[11px] text-slate-700 disabled:opacity-45"
            >
              下一页
            </Button>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onViewAll}
          className="mt-2.5 h-9 w-full rounded-full border-slate-300 bg-white/86 text-sm text-slate-700"
        >
          前往客户中心查看全部
        </Button>
      </div>
    </>
  );
}

function MobileCustomersSheet({
  open,
  onOpenChange,
  relatedHint,
  pagedCustomers,
  totalCustomerCount,
  totalCustomerPages,
  currentCustomerPage,
  onPrevPage,
  onNextPage,
  onViewAll,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  relatedHint: string;
  pagedCustomers: CustomerRecord[];
  totalCustomerCount: number;
  totalCustomerPages: number;
  currentCustomerPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewAll: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[82dvh] flex-col rounded-t-[32px] border-x-0 border-b-0 border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,249,252,0.98)_100%)] p-0 lg:hidden"
      >
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300/80" />
        <SheetHeader className="px-4 pb-2 pt-4">
          <div className="pr-10">
            <SheetTitle className="text-[17px] font-semibold text-[#123B5D]">现有客户</SheetTitle>
          </div>
        </SheetHeader>


        <CustomerDirectoryPanelContent
          relatedHint={relatedHint}
          pagedCustomers={pagedCustomers}
          totalCustomerCount={totalCustomerCount}
          totalCustomerPages={totalCustomerPages}
          currentCustomerPage={currentCustomerPage}
          onPrevPage={onPrevPage}
          onNextPage={onNextPage}
          onViewAll={() => {
            onOpenChange(false);
            onViewAll();
          }}
          footerClassName="bg-white/92 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom)+12px)] pt-2.5"
        />
      </SheetContent>
    </Sheet>
  );
}



export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentDraft, setCurrentDraft] = useState<Record<CustomerFieldKey, string>>(createEmptyDraft());
  const [isExistingCustomersOpen, setIsExistingCustomersOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [desktopCustomerPage, setDesktopCustomerPage] = useState(1);

  const customersQuery = useQuery({

    queryKey: ["customers-list"],
    queryFn: async () => {
      const data = await fetchJson<CustomerRecord[]>("/api/customers");
      return data.sort((a, b) => getCustomerSortTime(b) - getCustomerSortTime(a));
    },
  });

  const customers = customersQuery.data ?? [];
  const sortedCustomers = useMemo(() => [...customers].sort((a, b) => getCustomerSortTime(b) - getCustomerSortTime(a)), [customers]);
  const totalCustomerCount = sortedCustomers.length;
  const totalCustomerPages = totalCustomerCount === 0 ? 0 : Math.ceil(totalCustomerCount / DESKTOP_CUSTOMERS_PAGE_SIZE);
  const currentDesktopCustomerPage = totalCustomerPages === 0 ? 0 : Math.min(desktopCustomerPage, totalCustomerPages);
  const desktopPagedCustomers = useMemo(() => {
    if (totalCustomerPages === 0) {
      return [];
    }

    const startIndex = (currentDesktopCustomerPage - 1) * DESKTOP_CUSTOMERS_PAGE_SIZE;
    return sortedCustomers.slice(startIndex, startIndex + DESKTOP_CUSTOMERS_PAGE_SIZE);
  }, [currentDesktopCustomerPage, sortedCustomers, totalCustomerPages]);


  useEffect(() => {
    if (!isInitialized && !customersQuery.isLoading) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "welcome",
          content: "",
          timestamp: formatTime(),
        },
      ]);
      setIsInitialized(true);
    }
  }, [customersQuery.isLoading, isInitialized]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    setDesktopCustomerPage((prev) => {
      if (totalCustomerPages === 0) {
        return 1;
      }

      return Math.min(prev, totalCustomerPages);
    });
  }, [totalCustomerPages]);

  const addMessage = (message: ChatMessage) => {

    setMessages((prev) => [...prev, message]);
  };

  const filledDraftCount = useMemo(
    () => Object.values(currentDraft).filter((value) => value.trim() !== "").length,
    [currentDraft],
  );

  const hasAnyExtractedData = filledDraftCount > 0;
  const isReadyToSave = validateNameComplete(currentDraft.name);

  const relatedCustomers = useMemo(() => {
    const name = currentDraft.name.trim();
    const nickname = currentDraft.nickname.trim();

    if (!name && !nickname) {
      return [];
    }

    return customers
      .filter((customer) => {
        const customerName = customer.name.trim();
        const customerNickname = customer.nickname?.trim() ?? "";

        const sameName = name ? customerName === name : false;
        const fuzzyName = name ? customerName.includes(name) || name.includes(customerName) : false;
        const sameNickname = nickname ? customerNickname === nickname : false;

        return sameName || fuzzyName || sameNickname;
      })
      .slice(0, 5);
  }, [currentDraft.name, currentDraft.nickname, customers]);

  const exactDuplicateCustomer = useMemo(() => {
    const name = currentDraft.name.trim();
    const nickname = currentDraft.nickname.trim();

    if (!name) {
      return null;
    }

    return customers.find((customer) => {
      const sameName = customer.name.trim() === name;
      const sameNickname = (customer.nickname ?? "").trim() === nickname;
      return sameName && sameNickname;
    }) ?? null;
  }, [currentDraft.name, currentDraft.nickname, customers]);
  const hasBlockingDuplicate = Boolean(exactDuplicateCustomer);

  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<CustomerDraftExtractResponse>("/api/customers/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          currentName: currentDraft.name,
          currentRemark: currentDraft.remark,
        }),
      }),
    onSuccess: (result) => {
      const newData: Record<CustomerFieldKey, string> = { ...currentDraft };

      result.extractedFields.forEach((field) => {
        const key = labelToKeyMap[field.label] || (field.label as CustomerFieldKey);
        if (key in newData) {
          newData[key] = field.value;
        }
      });

      setCurrentDraft(newData);
      setInputText("");

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "extracted-summary",
        content: "已为你整理出当前客户信息。",
        timestamp: formatTime(),
        extractedFields: result.extractedFields,
        currentFields: newData,
      });
    },
    onError: (error: Error) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: error.message || "这次还没能稳定整理出可保存内容，请换一种更自然的说法继续补充。",
        timestamp: formatTime(),
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<CustomerFieldKey, string>) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          nickname: data.nickname,
          age: data.age,
          sex: data.sex,
          profession: data.profession,
          familyProfile: data.familyProfile,
          wealthProfile: data.wealthProfile,
          coreInteresting: data.coreInteresting,
          preferCommunicate: data.preferCommunicate,
          source: data.source,
          recentMoney: data.recentMoney,
          remark: data.remark,
        }),
      }),
    onSuccess: async (savedCustomer) => {
      await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      await queryClient.refetchQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "save-success",
        content: "已为你保存客户档案。",
        timestamp: formatTime(),
        savedCustomer,
      });
      setDesktopCustomerPage(1);
      setCurrentDraft(createEmptyDraft());
      setInputText("");
      setIsExistingCustomersOpen(false);

      setTimeout(() => {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          type: "welcome",
          content: "可以继续录入下一位客户。",
          timestamp: formatTime(),
        });
      }, 1200);
    },
    onError: (error: Error) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: error.message || "这次还没有保存成功，请稍后重试。",
        timestamp: formatTime(),
      });
    },
  });

  const handleExtract = () => {
    if (!inputText.trim()) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: "请先输入客户信息，我再帮你整理。",
        timestamp: formatTime(),
      });
      return;
    }

    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      type: "user-input",
      content: inputText.trim(),
      timestamp: formatTime(),
      rawInput: inputText.trim(),
    });

    extractMutation.mutate(inputText.trim());
  };

  const handleClear = () => {
    setInputText("");
    setCurrentDraft(createEmptyDraft());
    setIsExistingCustomersOpen(false);
  };

  const handleSave = () => {
    const name = currentDraft.name.trim();

    if (!name) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: "客户姓名是建档必填信息。请先补充姓名，例如：客户叫王伟。",
        timestamp: formatTime(),
      });
      return;
    }

    if (!validateNameComplete(name)) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: `当前姓名“${name}”可能还不完整。建议先补充完整姓名，例如：客户全名是王建国。`,
        timestamp: formatTime(),
      });
      return;
    }

    if (exactDuplicateCustomer) {
      const nicknameText = exactDuplicateCustomer.nickname ? `（昵称：${exactDuplicateCustomer.nickname}）` : "";
      const createdAt = exactDuplicateCustomer.created_at ? `，建档于 ${formatShortDate(exactDuplicateCustomer.created_at)}` : "";

      if (globalThis.matchMedia("(min-width: 1024px)").matches) {
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          type: "error-hint",
          content: `已检测到相近客户：${exactDuplicateCustomer.name}${nicknameText}${createdAt}。如为同一位客户，请前往客户中心更新；如为另一位同名客户，请补充昵称后再保存。`,
          timestamp: formatTime(),
        });
        return;
      }

      setIsExistingCustomersOpen(true);
      return;
    }

    saveMutation.mutate(currentDraft);
  };

  const renderMessage = (message: ChatMessage) => {
    const isAssistant = message.role === "assistant";
    const bubbleContent = message.type === "user-input" ? message.rawInput : message.content;
    const hasBubbleContent = Boolean(bubbleContent?.trim());
    const showTextBubble = !(isAssistant && message.type === "error-hint") && hasBubbleContent;
    const isWelcomeMessage = isAssistant && message.type === "welcome";

    const textBubble = showTextBubble ? (
      <div
        className={cn(
          "rounded-[22px] px-4 py-3 text-sm shadow-[0_12px_30px_rgba(15,23,42,0.04)]",
          isAssistant ? "border border-white/80 bg-white/86 text-slate-700" : "bg-gradient-to-br from-[#123B5D] to-[#0E2E49] text-white",
        )}
      >
        <p className="leading-7">{bubbleContent}</p>
      </div>
    ) : null;

    if (isWelcomeMessage) {
      return (
        <div key={message.id} className="space-y-2">
          <div className="flex gap-3 justify-start">
            <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/80 shadow-sm">
              <AvatarFallback className="bg-gradient-to-br from-[#123B5D] to-[#0F766E] text-xs text-white">
                AI
              </AvatarFallback>
            </Avatar>
            <div className="max-w-[88%] space-y-2">
              {showTextBubble ? <span className="px-1 text-xs text-slate-400">{message.timestamp}</span> : null}
              {textBubble}
            </div>
          </div>
          <WelcomeMessageCard compact={shouldCompactWelcome} />
        </div>
      );
    }

    return (
      <div key={message.id} className={cn("flex gap-3", isAssistant ? "justify-start" : "justify-end")}>
        {isAssistant ? (
          <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/80 shadow-sm">
            <AvatarFallback className="bg-gradient-to-br from-[#123B5D] to-[#0F766E] text-xs text-white">
              AI
            </AvatarFallback>
          </Avatar>
        ) : null}

        <div className={cn("max-w-[88%] space-y-2", isAssistant ? "items-start" : "items-end text-right")}>
          <span className="px-1 text-xs text-slate-400">{message.timestamp}</span>
          {textBubble}

          {isAssistant && message.type === "extracted-summary" && message.currentFields ? (
            <ExtractedSummaryCard
              extractedFields={message.extractedFields ?? []}
              currentFields={message.currentFields}
            />
          ) : null}

          {isAssistant && message.type === "save-success" && message.savedCustomer ? (
            <SaveSuccessCard customer={message.savedCustomer} />
          ) : null}

          {isAssistant && message.type === "error-hint" ? <ErrorHintCard message={message.content} /> : null}
        </div>
      </div>
    );
  };


  const shouldCompactWelcome = messages.some((message) => message.type !== "welcome");
  const mobileInputHint = hasAnyExtractedData
    ? "继续补充客户信息，助手会按最新内容整理。"
    : "直接描述客户情况，助手会先帮你整理。";


  const desktopPanelTitle = "现有客户";
  const desktopRelatedHint = relatedCustomers.length > 0 ? `已发现 ${relatedCustomers.length} 位相近客户，建议优先核对。` : "";



  return (
    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col gap-1.5 md:h-[calc(100dvh-8rem)] md:gap-3">
      <Card className="glass-panel hidden shrink-0 rounded-[28px] border-white/60 bg-white/82 shadow-[0_24px_80px_rgba(15,23,42,0.1)] md:block">
        <CardContent className="flex items-start gap-3 p-3.5 sm:p-4 md:px-5 md:py-3.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/customers")}
            className="mt-0.5 h-9 w-9 shrink-0 rounded-full border border-white/70 bg-white/75 text-[#123B5D] hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-[#123B5D] md:text-[1.35rem]">添加客户档案</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-600 sm:text-sm">
              先保存基础信息，后续可继续补充；最小必填：客户姓名。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="glass-panel flex min-h-0 flex-col overflow-hidden rounded-[32px] border-white/60 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.1)]">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="shrink-0 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(247,249,252,0.9)_100%)] px-4 py-2.5 sm:px-5 md:px-6">
              <div className="flex flex-col gap-2 md:gap-2.5">
                <div className="flex items-center gap-3 md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/customers")}
                    className="h-8 w-8 shrink-0 rounded-full border border-white/70 bg-white/80 text-[#123B5D] hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />

                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-semibold text-[#123B5D]">添加客户档案</h1>
                      <span className="rounded-full bg-[#B8894A]/12 px-2 py-1 text-[11px] font-medium text-[#8B6A32]">
                        最小必填：客户姓名
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">先保存基础信息，后续可继续补充。</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-[0.14em] text-[#123B5D]/72">助手主流程</p>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <MobileCustomerEntryButton
                      customerCount={totalCustomerCount}
                      relatedCount={relatedCustomers.length}
                      onOpen={() => setIsExistingCustomersOpen(true)}
                    />
                  </div>
                </div>
              </div>
            </div>



            <div
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5 md:px-6"
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-5">
                {messages.map(renderMessage)}

                {extractMutation.isPending || saveMutation.isPending ? (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/80 shadow-sm">
                      <AvatarFallback className="bg-gradient-to-br from-[#123B5D] to-[#0F766E] text-xs text-white">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-[22px] border border-white/80 bg-white/86 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 animate-pulse text-[#B8894A]" />
                        {extractMutation.isPending ? "正在为你整理客户信息…" : "正在为你保存客户档案…"}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="h-2" />
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,250,252,0.98)_100%)] px-2.5 pb-[calc(0.65rem+env(safe-area-inset-bottom))] pt-2 sm:px-4 md:px-5 lg:px-6">
              <div className="mx-auto max-w-3xl rounded-[22px] border border-white/75 bg-white/86 p-2.5 shadow-[0_18px_55px_rgba(15,23,42,0.06)] sm:rounded-[24px] sm:p-3.5">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#123B5D]/10 sm:h-7 sm:w-7">

                      <UserPlus className="h-3.5 w-3.5 text-[#123B5D]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="hidden text-[13px] font-medium text-[#123B5D] sm:block sm:text-sm">输入客户信息</p>
                      <p className="text-[12px] leading-5 text-slate-500 sm:mt-0.5 sm:text-[13px]">{mobileInputHint}</p>
                    </div>
                  </div>

                  {hasAnyExtractedData || inputText ? (
                    <Button
                      variant="ghost"
                      onClick={handleClear}
                      className="h-7 rounded-full px-2.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:h-8 sm:px-3 sm:text-xs"
                    >
                      清空
                    </Button>
                  ) : null}
                </div>

                <Textarea
                  value={inputText}
                  onChange={(event) => setInputText(event.target.value)}
                  placeholder="例如：王敏，35岁，私营业主，已婚，有一个孩子，最近关注教育金和家庭保障。"
                  className="mt-2.5 min-h-[60px] resize-none rounded-[16px] border-slate-200/80 bg-slate-50/70 px-3 py-2.5 text-sm leading-6 placeholder:text-slate-400 focus-visible:ring-[#123B5D]/20 sm:mt-3 sm:min-h-[72px] sm:rounded-[18px] md:min-h-[84px]"
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                      handleExtract();
                    }
                  }}
                />

                {relatedCustomers.length > 0 ? (
                  <DuplicateReviewCard
                    relatedCustomers={relatedCustomers}
                    hasBlockingDuplicate={hasBlockingDuplicate}
                    onOpenSheet={() => setIsExistingCustomersOpen(true)}
                    onViewAll={() => router.push("/customers")}
                  />
                ) : null}

                <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3">
                  <Button
                    onClick={handleExtract}
                    disabled={extractMutation.isPending || !inputText.trim()}
                    className="h-9 rounded-full bg-[#123B5D] text-sm text-white hover:bg-[#0E2E49] sm:h-10"
                  >
                    {extractMutation.isPending ? "整理中…" : "交给助手"}
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className={cn(
                      "h-9 rounded-full text-sm text-white sm:h-10",
                      isReadyToSave
                        ? "bg-[#0F766E] hover:bg-[#0B5F59]"
                        : "bg-[#123B5D]/82 hover:bg-[#123B5D]",
                    )}
                  >
                    {saveMutation.isPending ? "保存中…" : hasBlockingDuplicate ? "先核对后保存" : "保存客户"}
                  </Button>
                </div>

                <p className="mt-2 hidden text-[11px] leading-5 text-slate-400 md:block">
                  需要确认的内容会先提醒你，不会直接误写客户资料。支持 `Ctrl/Cmd + Enter` 快速整理。
                </p>
              </div>
            </div>


          </CardContent>
        </Card>

        <MobileCustomersSheet
          open={isExistingCustomersOpen}
          onOpenChange={setIsExistingCustomersOpen}
          relatedHint={desktopRelatedHint}
          pagedCustomers={desktopPagedCustomers}
          totalCustomerCount={totalCustomerCount}
          totalCustomerPages={totalCustomerPages}
          currentCustomerPage={currentDesktopCustomerPage}
          onPrevPage={() => setDesktopCustomerPage((prev) => Math.max(prev - 1, 1))}
          onNextPage={() => setDesktopCustomerPage((prev) => Math.min(prev + 1, totalCustomerPages || 1))}
          onViewAll={() => router.push("/customers")}
        />

        <Card className="glass-panel hidden h-full min-h-0 overflow-hidden rounded-[32px] border-white/60 bg-white/84 shadow-[0_24px_80px_rgba(15,23,42,0.08)] lg:flex lg:flex-col">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(247,249,252,0.92)_100%)] px-4 py-2.5">
              <p className="text-[11px] font-medium tracking-[0.14em] text-[#123B5D]/72">{desktopPanelTitle}</p>
            </div>

            <CustomerDirectoryPanelContent
              relatedHint={desktopRelatedHint}
              pagedCustomers={desktopPagedCustomers}
              totalCustomerCount={totalCustomerCount}
              totalCustomerPages={totalCustomerPages}
              currentCustomerPage={currentDesktopCustomerPage}
              onPrevPage={() => setDesktopCustomerPage((prev) => Math.max(prev - 1, 1))}
              onNextPage={() => setDesktopCustomerPage((prev) => Math.min(prev + 1, totalCustomerPages || 1))}
              onViewAll={() => router.push("/customers")}
            />
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
