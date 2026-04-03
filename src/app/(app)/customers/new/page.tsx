"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle, ChevronLeft, Sparkles, Users } from "lucide-react";


import { CustomerEntryComposer } from "@/components/customers/customer-entry-composer";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  customerCardHeadingClassName,
  customerEmptyPanelClassName,
  customerEntryButtonClassName,
  customerHintBannerClassName,
  customerNoticeCardClassName,
  customerNoticeCardCompactClassName,
  customerOutlineActionClassName,
  customerPreviewCardClassName,
  customerPrimaryActionClassName,
  customerReviewCardClassName,
  customerReviewCardCompactClassName,
  customerSheetTitleClassName,
} from "@/components/customers/customer-style";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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

const DESKTOP_CUSTOMERS_PAGE_SIZE = 5;

const EMPTY_CUSTOMERS: CustomerRecord[] = [];
const primaryActionClassName = customerPrimaryActionClassName;
const outlineActionClassName = customerOutlineActionClassName;


type ChatMessageType = "welcome" | "user-input" | "extracted-summary" | "save-success" | "error-hint";

type MobileCustomersSheetMode = "all" | "related";

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

function createWelcomeMessage(content = ""): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    type: "welcome",
    content,
    timestamp: formatTime(),
  };
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
  return (
    <div className={cn(customerReviewCardCompactClassName, "advisor-review-card-success", compact ? "" : "md:px-4 md:py-4")}>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="advisor-notice-card advisor-notice-card-warning rounded-2xl px-3.5 py-3 text-sm leading-6 text-slate-600">
          <span className="font-medium text-slate-900">最小必填：</span>
          客户姓名
        </div>
        <div className="advisor-meta-tile rounded-2xl border border-white/75 px-3.5 py-3 text-sm leading-6 text-slate-600">
          不需要一次说全，先输入你当前记得的内容即可。
        </div>
      </div>
    </div>
  );
}



function ExtractedSummaryCard({
  extractedFields,
  currentFields,
}: {
  extractedFields: ExtractedFieldItem[];
  currentFields: Record<CustomerFieldKey, string>;
}) {
  const filledFields = customerFields.filter((field) => currentFields[field.key]?.trim());
  const nameReady = validateNameComplete(currentFields.name);

  return (
    <div className={cn(customerNoticeCardClassName, "advisor-notice-card-warning")}>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="advisor-icon-badge advisor-icon-badge-warning mt-0.5 h-9 w-9 shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className={customerCardHeadingClassName}>已为你整理出以下客户信息</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">当前以顾问简报方式呈现，保存前仍可继续补充。</p>
          </div>
        </div>
        <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">已具备 {filledFields.length} 项</Badge>
      </div>

      {extractedFields.length > 0 ? (
        <div className="advisor-subtle-card mt-4 rounded-2xl p-3.5 sm:p-4">
          <p className="advisor-kicker">本次整理出</p>
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

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs leading-5 text-slate-500">
        <span className={cn("rounded-full px-3 py-1", nameReady ? "advisor-status-healthy" : "advisor-status-pending")}>
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
    <div className={cn(customerNoticeCardClassName, "advisor-notice-card-success")}>

      <div className="flex items-start gap-3">
        <div className="advisor-icon-badge advisor-icon-badge-success mt-0.5 h-9 w-9 shrink-0">
          <CheckCircle className="h-4 w-4" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">客户档案已保存</h3>
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
    <div className={cn(customerNoticeCardCompactClassName, "advisor-notice-card-warning")}>

      <div className="flex items-start gap-3">
        <div className="advisor-icon-badge advisor-icon-badge-warning mt-0.5 h-8 w-8 shrink-0">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-900">{hintMeta.title}</p>
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
      className={customerPreviewCardClassName}

    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-9 w-9 border border-slate-200/80">
          <AvatarFallback className="bg-slate-100 text-[13px] font-medium text-slate-800">{customer.name.slice(0, 1)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-medium leading-5 text-slate-900">{customer.name}</p>
            {customer.nickname ? <Badge className="advisor-chip-info rounded-full border-0 px-1.5 py-0.5 text-[10px]">{customer.nickname}</Badge> : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{getCustomerMetaLine(customer)}</p>
          {customer.created_at ? <p className="mt-1 text-[10px] text-slate-400">建档于 {formatShortDate(customer.created_at)}</p> : null}
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
      className={customerEntryButtonClassName}

    >
      <div className="advisor-icon-badge advisor-icon-badge-info flex h-8 w-8 shrink-0 items-center justify-center">
        <Users className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-slate-900">{label}</p>
        <p className="text-[10px] leading-4 text-slate-400">{helper}</p>
      </div>
    </button>
  );
}

function DuplicateReviewCard({
  relatedCustomers,
  hasBlockingDuplicate,
  onOpenSheet,
  onDismiss,
  emphasized = false,
}: {
  relatedCustomers: CustomerRecord[];
  hasBlockingDuplicate: boolean;
  onOpenSheet: () => void;
  onDismiss: () => void;
  emphasized?: boolean;
}) {
  const title = hasBlockingDuplicate ? "检测到高度相似的已有客户，请先核对" : "保存前建议先核对相近客户";
  const description = hasBlockingDuplicate
    ? "这可能是同一位客户。你可以先打开抽屉核对，也可以先在上方补充昵称、职业等区分信息后再保存。"
    : "已根据当前草稿筛出可能相关的客户，可先核对，再决定是否继续新建。";

  return (
    <div className={cn("advisor-notice-card advisor-notice-card-warning rounded-[20px] lg:hidden", emphasized ? "min-h-[220px] p-4" : "mt-3 p-3")}>
      <div className="flex items-start gap-3">
        <div className={cn("advisor-icon-badge advisor-icon-badge-warning mt-0.5 flex shrink-0 items-center justify-center", emphasized ? "h-9 w-9" : "h-8 w-8")}>
          <Users className={cn(emphasized ? "h-[18px] w-[18px]" : "h-4 w-4")} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-medium text-slate-900", emphasized ? "text-[16px] leading-7" : "text-sm")}>{title}</p>
          <p className={cn("mt-1 text-slate-600", emphasized ? "text-[13px] leading-6" : "text-[12px] leading-5")}>{description}</p>
        </div>
      </div>

      <div className={cn("advisor-subtle-card rounded-[18px]", emphasized ? "mt-4 px-3.5 py-3" : "mt-3 px-3 py-2.5")}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="advisor-chip-info rounded-full px-2 py-1 text-[11px] font-medium">已发现 {relatedCustomers.length} 位相近客户</span>
          <span className="text-[11px] leading-5 text-slate-500">建议先打开抽屉核对；如仍是不同客户，再补充区分信息。</span>
        </div>
      </div>

      <div className={cn("flex gap-2", emphasized ? "mt-4" : "mt-3")}>
        <Button type="button" onClick={onOpenSheet} className={cn(primaryActionClassName, "h-9 flex-1 px-4 text-sm")}>
          打开客户抽屉核对
        </Button>
        <Button type="button" variant="outline" onClick={onDismiss} className={cn(outlineActionClassName, "h-9 px-4 text-[12px]")}>
          知道了
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
          {relatedHint ? <div className={customerHintBannerClassName}>{relatedHint}</div> : null}


          {pagedCustomers.length > 0 ? (
            pagedCustomers.map((customer) => <CustomerPreviewCard key={customer.id} customer={customer} onClick={onViewAll} />)
          ) : (
            <div className={customerEmptyPanelClassName}>暂无客户数据</div>
          )}

        </div>
      </ScrollArea>

      <div className={cn("advisor-panel-footer-surface shrink-0 px-4 py-2.5", footerClassName)}>
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
              className={cn(outlineActionClassName, "h-8 px-3 text-[11px]")}
            >
              上一页
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={onNextPage}
              disabled={currentCustomerPage === 0 || currentCustomerPage >= totalCustomerPages}
              className={cn(outlineActionClassName, "h-8 px-3 text-[11px]")}
            >

              下一页
            </Button>
          </div>
        </div>

        <Button variant="outline" onClick={onViewAll} className={cn(outlineActionClassName, "mt-2.5 h-9 w-full text-sm")}>
          前往客户中心查看全部
        </Button>

      </div>
    </>
  );
}

function MobileCustomersSheet({
  open,
  mode,
  onOpenChange,
  relatedHint,
  relatedCustomers,
  pagedCustomers,
  totalCustomerCount,
  totalCustomerPages,
  currentCustomerPage,
  onPrevPage,
  onNextPage,
  onViewAll,
}: {
  open: boolean;
  mode: MobileCustomersSheetMode;
  onOpenChange: (open: boolean) => void;
  relatedHint: string;
  relatedCustomers: CustomerRecord[];
  pagedCustomers: CustomerRecord[];
  totalCustomerCount: number;
  totalCustomerPages: number;
  currentCustomerPage: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onViewAll: () => void;
}) {
  const isRelatedMode = mode === "related";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="advisor-sheet-surface flex max-h-[82dvh] flex-col rounded-t-[32px] border-x-0 border-b-0 p-0 lg:hidden">
        <div className="mx-auto mt-3 h-1.5 w-12 rounded-full bg-slate-300/80" />
        <SheetHeader className="advisor-sheet-header-surface px-4 pb-2 pt-4">
          <div className="pr-10">
            <SheetTitle className={customerSheetTitleClassName}>{isRelatedMode ? "相近客户核对" : "现有客户"}</SheetTitle>

          </div>
        </SheetHeader>

        {isRelatedMode ? (
          <ScrollArea className="min-h-0 flex-1 px-4 py-3">
            <div className="space-y-2.5">
              {relatedHint ? <div className={customerHintBannerClassName}>{relatedHint}</div> : null}


              {relatedCustomers.length > 0 ? (
                relatedCustomers.map((customer) => (
                  <CustomerPreviewCard
                    key={customer.id}
                    customer={customer}
                    onClick={() => {
                      onOpenChange(false);
                      onViewAll();
                    }}
                  />
                ))
              ) : (
                <div className={customerEmptyPanelClassName}>当前没有需要核对的相近客户</div>
              )}

            </div>
          </ScrollArea>
        ) : (
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
            footerClassName="px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom)+12px)] pt-2.5"
          />
        )}
      </SheetContent>
    </Sheet>
  );
}




export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => [createWelcomeMessage()]);
  const [inputText, setInputText] = useState("");
  const [currentDraft, setCurrentDraft] = useState<Record<CustomerFieldKey, string>>(createEmptyDraft());
  const [isExistingCustomersOpen, setIsExistingCustomersOpen] = useState(false);
  const [mobileCustomersSheetMode, setMobileCustomersSheetMode] = useState<MobileCustomersSheetMode>("all");
  const [dismissedDuplicateNoticeKey, setDismissedDuplicateNoticeKey] = useState("");
  const [desktopCustomerPage, setDesktopCustomerPage] = useState(1);
  const [mobileComposerHeight, setMobileComposerHeight] = useState(0);


  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const data = await fetchJson<CustomerRecord[]>("/api/customers");
      return data.sort((a, b) => getCustomerSortTime(b) - getCustomerSortTime(a));
    },
  });

  const customers = customersQuery.data ?? EMPTY_CUSTOMERS;

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
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: ChatMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  const isReadyToSave = validateNameComplete(currentDraft.name);
  const suggestedComposerFields = useMemo(
    () => customerFields.filter((field) => !currentDraft[field.key]?.trim()),
    [currentDraft],
  );

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
  const relatedCustomersFingerprint = useMemo(() => relatedCustomers.map((customer) => customer.id).join(","), [relatedCustomers]);
  const duplicateNoticeKey = `${currentDraft.name.trim()}|${currentDraft.nickname.trim()}|${relatedCustomersFingerprint}`;
  const isDuplicateNoticeDismissed = dismissedDuplicateNoticeKey === duplicateNoticeKey;
  const shouldShowDuplicateReviewCard = relatedCustomers.length > 0 && !isDuplicateNoticeDismissed;
  const shouldCoverInputAreaWithDuplicateReview =
    hasBlockingDuplicate && shouldShowDuplicateReviewCard && !inputText.trim();
  const shouldShowPrimaryActions = !shouldCoverInputAreaWithDuplicateReview;


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

  const openAllCustomersSheet = () => {
    setMobileCustomersSheetMode("all");
    setIsExistingCustomersOpen(true);
  };

  const openRelatedCustomersSheet = () => {
    setMobileCustomersSheetMode("related");
    setIsExistingCustomersOpen(true);
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

      openRelatedCustomersSheet();
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
          "rounded-[22px] px-4 py-3 text-sm",
          isAssistant ? "advisor-assistant-bubble text-slate-700" : "advisor-user-bubble",
        )}
      >
        <p className="leading-7">{bubbleContent}</p>
      </div>
    ) : null;

    if (isWelcomeMessage) {
      return (
        <div key={message.id} className="space-y-2">
          <div className="flex justify-start gap-3">
            <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/80 shadow-sm">
              <AvatarFallback className="advisor-user-bubble text-xs text-white">AI</AvatarFallback>
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
            <AvatarFallback className="advisor-user-bubble text-xs text-white">AI</AvatarFallback>
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
  const desktopPanelTitle = "现有客户";
  const desktopRelatedHint = relatedCustomers.length > 0 ? `已发现 ${relatedCustomers.length} 位相近客户，建议优先核对。` : "";
  const mobileRelatedHint = relatedCustomers.length > 0 ? `以下仅展示当前筛出的 ${relatedCustomers.length} 位相近客户，用于核对是否重复建档。` : "";
  const duplicateReviewCard = shouldShowDuplicateReviewCard ? (
    <DuplicateReviewCard
      relatedCustomers={relatedCustomers}
      hasBlockingDuplicate={hasBlockingDuplicate}
      onOpenSheet={openRelatedCustomersSheet}
      onDismiss={() => setDismissedDuplicateNoticeKey(duplicateNoticeKey)}
      emphasized={shouldCoverInputAreaWithDuplicateReview}
    />
  ) : null;


  return (

    <div className="flex h-[calc(100dvh-7rem)] min-h-0 flex-col gap-1.5 md:h-[calc(100dvh-8rem)] md:gap-3">
      <Card className="glass-panel advisor-glass-surface-strong hidden shrink-0 rounded-[28px] md:block">
        <CardContent className="flex items-start gap-3 p-3.5 sm:p-4 md:px-5 md:py-3.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/customers")}
            className="advisor-outline-button mt-0.5 h-9 w-9 shrink-0 rounded-full hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-semibold text-slate-900 md:text-[1.35rem]">添加客户档案</h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-5 text-slate-600 sm:text-sm">
              先保存基础信息，后续可继续补充；最小必填：客户姓名。
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="glass-panel advisor-glass-surface-strong flex min-h-0 flex-col overflow-hidden rounded-[32px]">
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            <div className="advisor-panel-header-surface shrink-0 px-4 py-2.5 sm:px-5 md:px-6">
              <div className="flex flex-col gap-2 md:gap-2.5">
                <div className="flex items-center gap-3 md:hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push("/customers")}
                    className="advisor-outline-button h-8 w-8 shrink-0 rounded-full hover:bg-white"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-base font-semibold text-slate-900">添加客户档案</h1>
                      <span className="advisor-chip-warning rounded-full px-2 py-1 text-[11px] font-medium">最小必填：客户姓名</span>
                    </div>
                    <p className="mt-1 text-[12px] leading-5 text-slate-500">先保存基础信息，后续可继续补充。</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[11px] font-medium tracking-[0.14em] text-slate-500">助手主流程</p>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    <MobileCustomerEntryButton
                      customerCount={totalCustomerCount}
                      relatedCount={relatedCustomers.length}
                      onOpen={relatedCustomers.length > 0 ? openRelatedCustomersSheet : openAllCustomersSheet}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={scrollAreaRef}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-5 md:px-6"
              style={mobileComposerHeight > 0 ? { paddingBottom: mobileComposerHeight + 12 } : undefined}
            >

              <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-5">
                {messages.map(renderMessage)}

                {extractMutation.isPending || saveMutation.isPending ? (
                  <div className="flex justify-start gap-3">
                    <Avatar className="mt-1 h-8 w-8 shrink-0 border border-white/80 shadow-sm">
                      <AvatarFallback className="advisor-user-bubble text-xs text-white">AI</AvatarFallback>
                    </Avatar>
                    <div className="advisor-assistant-bubble rounded-[22px] px-4 py-3 text-sm text-slate-600">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 animate-pulse text-amber-600" />
                        {extractMutation.isPending ? "正在为你整理客户信息…" : "正在为你保存客户档案…"}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="h-2" />
              </div>
            </div>

            <CustomerEntryComposer
              inputText={inputText}
              onInputTextChange={setInputText}
              onExtract={handleExtract}
              onSave={handleSave}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  handleExtract();
                }
              }}
              suggestedFields={suggestedComposerFields}
              duplicateReview={duplicateReviewCard}
              shouldCoverInputAreaWithDuplicateReview={shouldCoverInputAreaWithDuplicateReview}
              shouldShowPrimaryActions={shouldShowPrimaryActions}
              isReadyToSave={isReadyToSave}
              isExtractPending={extractMutation.isPending}
              isSavePending={saveMutation.isPending}
              onHeightChange={setMobileComposerHeight}
            />

          </CardContent>
        </Card>

        <MobileCustomersSheet
          open={isExistingCustomersOpen}
          mode={mobileCustomersSheetMode}
          onOpenChange={setIsExistingCustomersOpen}
          relatedHint={mobileRelatedHint}
          relatedCustomers={relatedCustomers}
          pagedCustomers={desktopPagedCustomers}
          totalCustomerCount={totalCustomerCount}
          totalCustomerPages={totalCustomerPages}
          currentCustomerPage={currentDesktopCustomerPage}
          onPrevPage={() => setDesktopCustomerPage((prev) => Math.max(prev - 1, 1))}
          onNextPage={() => setDesktopCustomerPage((prev) => Math.min(prev + 1, totalCustomerPages || 1))}
          onViewAll={() => router.push("/customers")}
        />

        <Card className="glass-panel advisor-glass-surface hidden h-full min-h-0 overflow-hidden rounded-[32px] lg:flex lg:flex-col">
          <CardContent className="flex h-full min-h-0 flex-col p-0">
            <div className="advisor-panel-header-surface px-4 py-2.5">
              <p className="text-[11px] font-medium tracking-[0.14em] text-slate-500">{desktopPanelTitle}</p>
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
