"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Sparkles, Users } from "lucide-react";


import { emptyCustomerProfileForm, type CustomerProfileFormValue } from "@/components/customers/customer-profile-fields";
import { customerEntryButtonClassName } from "@/components/customers/customer-style";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";


import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VisitCustomerSheet, type VisitCustomerSheetMode } from "@/components/visits/visit-customer-sheet";
import { VisitEntryComposer } from "@/components/visits/visit-entry-composer";
import { VisitErrorHintCard, VisitExtractedSummaryCard, VisitSaveSuccessCard } from "@/components/visits/visit-page-cards";
import type { VisitChatMessage, VisitDraftState } from "@/components/visits/visit-page-types";
import {
  createEmptyVisitDraft,
  createVisitWelcomeMessage,
  findExactCustomerMatch,
  findRelatedCustomers,
  formatMessageTime,
  mergeVisitDraft,
  resolveCustomerStatus,
  visitComposerFields,
} from "@/components/visits/visit-page-utils";

import { ApiRequestError, fetchJson } from "@/lib/crm-api";
import { cn } from "@/lib/utils";
import { buildTaskDraftSeedFromVisit } from "@/modules/tasks/task-draft";
import { persistTaskDraftSeed } from "@/modules/tasks/task-draft-session";
import type { VisitDraftExtraction } from "@/modules/visits/visit-draft-extractor";
import type { CustomerRecord } from "@/types/customer";
import type { VisitRecordEntity } from "@/types/visit";



type VisitExtractResponse = {
  fields: VisitDraftExtraction;
  extractedFields: Array<{ label: string; value: string }>;
  message: string;
};

type SaveVisitVariables = { draft: VisitDraftState; resumed?: boolean };

function createErrorMessage(content: string): VisitChatMessage {
  return { id: crypto.randomUUID(), role: "assistant", type: "error-hint", content, timestamp: formatMessageTime() };
}

function buildHelperAction(
  mode: VisitCustomerSheetMode,
  onOpen: (mode: VisitCustomerSheetMode) => void,
  label: string,
  muted = false,
) {
  return (
    <button
      type="button"
      onClick={() => onOpen(mode)}
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
        muted ? "advisor-chip-info text-slate-600" : "advisor-chip-warning text-slate-700",
      )}
    >
      {label}
    </button>
  );
}

function ExistingCustomersButton({ count, compact = false, onOpen }: { count: number; compact?: boolean; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(customerEntryButtonClassName, compact ? "gap-2 rounded-[18px] px-3 py-2" : "")}


    >
      <div className={cn("advisor-icon-badge advisor-icon-badge-info flex shrink-0 items-center justify-center", compact ? "h-7 w-7" : "h-8 w-8")}>
        <Users className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
      </div>
      <div className="min-w-0">
        <p className={cn("font-medium text-slate-900", compact ? "text-[11px] leading-4" : "text-[12px]")}>选择现有客户</p>

        {compact ? null : <p className="text-[10px] leading-4 text-slate-400">{count > 0 ? `已保存 ${count} 位客户` : "暂无已建档客户"}</p>}
      </div>
    </button>
  );
}


export function VisitRecordPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<VisitChatMessage[]>(() => [createVisitWelcomeMessage()]);
  const [inputText, setInputText] = useState("");
  const [currentDraft, setCurrentDraft] = useState<VisitDraftState>(createEmptyVisitDraft());
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  const [customerSheetMode, setCustomerSheetMode] = useState<VisitCustomerSheetMode>("related");
  const [customerForm, setCustomerForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm });
  const [resumeDraft, setResumeDraft] = useState<VisitDraftState | null>(null);

  const customersQuery = useQuery({ queryKey: ["customers-list"], queryFn: () => fetchJson<CustomerRecord[]>("/api/customers") });
  const customers = useMemo(() => customersQuery.data ?? [], [customersQuery.data]);
  const totalCustomerCount = customers.length;


  const exactCustomer = useMemo(() => findExactCustomerMatch(currentDraft, customers), [currentDraft, customers]);
  const relatedCustomers = useMemo(() => findRelatedCustomers(currentDraft, customers), [currentDraft, customers]);
  const customerStatus = useMemo(() => resolveCustomerStatus(currentDraft, exactCustomer, relatedCustomers), [currentDraft, exactCustomer, relatedCustomers]);
  const suggestedComposerFields = useMemo(
    () =>
      visitComposerFields.filter((field) => {
        if (field.key === "customer") {
          return !(currentDraft.customerId || currentDraft.name.trim() || currentDraft.nickName.trim());
        }
        return !currentDraft[field.key].trim();
      }),
    [currentDraft],
  );

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const addMessage = (message: VisitChatMessage) => setMessages((prev) => [...prev, message]);
  const openCustomerSheet = (mode: VisitCustomerSheetMode) => {
    setCustomerSheetMode(mode);
    setCustomerSheetOpen(true);
  };
  const openAllCustomersSheet = () => openCustomerSheet("all");


  const saveMutation = useMutation({
    mutationFn: ({ draft }: SaveVisitVariables) => {
      const matchedCustomer = findExactCustomerMatch(draft, customers);
      return fetchJson<VisitRecordEntity>("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...draft, customerId: draft.customerId || matchedCustomer?.id || undefined, skipTaskSync: true }),
      });
    },
    onSuccess: async (savedVisit, variables) => {
      setResumeDraft(null);
      setCustomerSheetOpen(false);
      setCustomerForm({ ...emptyCustomerProfileForm });
      setCurrentDraft(createEmptyVisitDraft());
      setInputText("");
      await queryClient.invalidateQueries({ queryKey: ["visits-crm"] });

      const taskSeed = buildTaskDraftSeedFromVisit({ visit: savedVisit, sourceSummary: variables.draft.briefContent || variables.draft.followWork });

      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "save-success",
        content: "已为你保存拜访记录。",
        timestamp: formatMessageTime(),
        savedVisit,
        pendingTaskCount: taskSeed?.drafts.length ?? 0,
      });

      if (taskSeed) {
        persistTaskDraftSeed(taskSeed);
        window.setTimeout(() => router.push("/tasks/new?from=visit"), 650);
        return;
      }

      window.setTimeout(() => addMessage(createVisitWelcomeMessage("可以继续录入下一次拜访。")), 900);
    },
    onError: (error, variables) => {
      if (error instanceof ApiRequestError && error.code === "CUSTOMER_NOT_FOUND") {
        setResumeDraft(variables.draft);
        setCustomerForm({
          ...emptyCustomerProfileForm,
          name: variables.draft.name.trim(),
          nickname: variables.draft.nickName.trim(),
          coreInteresting: variables.draft.corePain.trim(),
          preferCommunicate: variables.draft.methodCommunicate.trim(),
        });
        openCustomerSheet(relatedCustomers.length > 0 ? "related" : "create");
      }

      if (error instanceof ApiRequestError && (error.code === "CUSTOMER_AMBIGUOUS" || error.code === "CUSTOMER_MISMATCH") && relatedCustomers.length > 0) {
        setResumeDraft(variables.draft);
        openCustomerSheet("related");
      }


      addMessage(createErrorMessage(error.message || "这次还没有保存成功，请稍后重试。"));
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: CustomerProfileFormValue) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (customer) => {
      const nextDraft = {
        ...(resumeDraft ?? currentDraft),
        customerId: customer.id,
        name: customer.name,
        nickName: customer.nickname ?? "",
      };
      setCurrentDraft(nextDraft);
      setCustomerSheetOpen(false);
      setCustomerForm({ ...emptyCustomerProfileForm });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      if (resumeDraft) {
        saveMutation.mutate({ draft: nextDraft, resumed: true });
      }
    },
    onError: (error) => addMessage(createErrorMessage(error.message || "客户档案暂未保存成功，请再试一次。")),
  });

  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<VisitExtractResponse>("/api/visits/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, currentDraft }),
      }),

    onSuccess: (result) => {
      const nextDraft = mergeVisitDraft(currentDraft, result.fields);
      setCurrentDraft(nextDraft);
      setInputText("");
      addMessage({

        id: crypto.randomUUID(),
        role: "assistant",
        type: "extracted-summary",
        content: result.message,
        timestamp: formatMessageTime(),
        extractedFields: result.extractedFields,
        currentDraft: nextDraft,
        customerStatus: resolveCustomerStatus(nextDraft, findExactCustomerMatch(nextDraft, customers), findRelatedCustomers(nextDraft, customers)),
      });
    },
    onError: (error) => addMessage(createErrorMessage(error.message || "我还没稳定提取到更多信息，请换一种说法继续补充。")),
  });

  const handleExtract = () => {
    if (!inputText.trim()) {
      addMessage(createErrorMessage("请先输入这次拜访的情况，我再帮你整理。"));
      return;
    }

    addMessage({ id: crypto.randomUUID(), role: "user", type: "user-input", content: inputText.trim(), rawInput: inputText.trim(), timestamp: formatMessageTime() });
    extractMutation.mutate(inputText.trim());
  };

  const handleSave = () => {
    if (!(currentDraft.customerId || currentDraft.name.trim() || currentDraft.nickName.trim())) {
      addMessage(createErrorMessage("请先补一句客户姓名或昵称，例如：今天见了王姐。"));
      return;
    }
    if (!currentDraft.timeVisit.trim()) {
      addMessage(createErrorMessage("拜访日期还没有整理出来。你可以补一句今天、昨天或具体日期。"));
      return;
    }
    if (customerStatus.tone === "review") {
      setResumeDraft(currentDraft);
      openCustomerSheet("related");
      return;
    }

    saveMutation.mutate({ draft: currentDraft });
  };

  const helperSlot = customerStatus.tone === "matched"
    ? buildHelperAction("related", openCustomerSheet, `已匹配：${customerStatus.customer?.name ?? "现有客户"}`, true)
    : customerStatus.tone === "review"
      ? buildHelperAction("related", openCustomerSheet, "先核对相近客户")
      : customerStatus.tone === "missing"
        ? buildHelperAction("create", openCustomerSheet, "先补客户档案")
        : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 md:gap-3">

      <Card className="glass-panel advisor-glass-surface-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px]">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="advisor-panel-header-surface shrink-0 px-4 py-2.5 sm:px-5 md:px-6">
            <div className="flex flex-col gap-2 md:gap-2.5">
              <div className="flex items-center gap-3 md:hidden">
                <Button variant="ghost" size="icon" onClick={() => router.push("/records?tab=visits")} className="advisor-outline-button h-8 w-8 rounded-full hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                  <h1 className="min-w-0 text-base font-semibold text-slate-900">添加拜访记录</h1>
                  <ExistingCustomersButton compact count={totalCustomerCount} onOpen={openAllCustomersSheet} />
                </div>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <Button variant="ghost" size="icon" onClick={() => router.push("/records?tab=visits")} className="advisor-outline-button h-9 w-9 rounded-full hover:bg-white">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-0 flex-1">
                  <h1 className="text-lg font-semibold text-slate-900 md:text-[1.35rem]">添加拜访记录</h1>
                </div>
                <ExistingCustomersButton count={totalCustomerCount} onOpen={openAllCustomersSheet} />
              </div>
            </div>
          </div>

          <div
            ref={scrollAreaRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 [touch-action:pan-y] [webkit-overflow-scrolling:touch] sm:px-5 md:px-6"
            style={{ WebkitOverflowScrolling: "touch" }}
          >

            <div className="mx-auto flex max-w-3xl flex-col gap-4 md:gap-5">
              {messages.map((message) => {
                const isAssistant = message.role === "assistant";
                const bubble = message.type === "user-input" ? message.rawInput : message.content;
                const hasBubbleContent = Boolean(bubble?.trim());

                if (!isAssistant) {
                  return <div key={message.id} className="ml-auto max-w-[88%] rounded-[22px] px-4 py-3 text-sm advisor-user-bubble">{bubble}</div>;
                }

                const shouldShowTextBubble = message.type !== "error-hint" && hasBubbleContent;
                const hasCardContent = message.type === "extracted-summary" || message.type === "save-success" || message.type === "error-hint";
                if (!shouldShowTextBubble && !hasCardContent) {
                  return null;
                }

                return (
                  <div key={message.id} className="space-y-2 text-left">
                    <div className="flex items-center gap-2 pl-1"><Avatar className="h-7 w-7 border border-white/80 shadow-sm"><AvatarFallback className="advisor-user-bubble text-[11px] text-white">AI</AvatarFallback></Avatar><span className="text-xs text-slate-400">{message.timestamp}</span></div>
                    {shouldShowTextBubble ? <div className="w-fit max-w-[min(100%,34rem)] rounded-[22px] px-4 py-3 text-sm advisor-assistant-bubble text-slate-700">{bubble}</div> : null}
                    {message.type === "extracted-summary" && message.currentDraft && message.customerStatus ? <VisitExtractedSummaryCard extractedFields={message.extractedFields ?? []} currentDraft={message.currentDraft} customerStatus={message.customerStatus} /> : null}
                    {message.type === "save-success" && message.savedVisit ? <VisitSaveSuccessCard visit={message.savedVisit} pendingTaskCount={message.pendingTaskCount} /> : null}
                    {message.type === "error-hint" ? <VisitErrorHintCard message={message.content} /> : null}
                  </div>
                );
              })}

              {extractMutation.isPending || saveMutation.isPending || createCustomerMutation.isPending ? <div className="flex w-fit items-center gap-2 rounded-[22px] px-4 py-3 text-sm advisor-assistant-bubble text-slate-600"><Sparkles className="h-4 w-4 animate-pulse text-amber-600" />{createCustomerMutation.isPending ? "正在保存客户档案并继续当前拜访…" : saveMutation.isPending ? "正在为你保存拜访记录…" : "正在为你整理拜访信息…"}</div> : null}
              <div className="h-2" />
            </div>
          </div>

          <VisitEntryComposer
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
            helperSlot={helperSlot}
            isReadyToSave={Boolean(currentDraft.timeVisit.trim() && (currentDraft.customerId || currentDraft.name.trim() || currentDraft.nickName.trim()))}
            isExtractPending={extractMutation.isPending}
            isSavePending={saveMutation.isPending || createCustomerMutation.isPending}
            saveLabel={currentDraft.followWork.trim() ? "保存并继续确认任务" : "保存拜访记录"}
          />

        </CardContent>
      </Card>

      <VisitCustomerSheet


        open={customerSheetOpen}
        mode={customerSheetMode}
        customers={customers}
        relatedCustomers={relatedCustomers}
        customerForm={customerForm}
        isCreatePending={createCustomerMutation.isPending}
        onOpenChange={setCustomerSheetOpen}
        onModeChange={setCustomerSheetMode}
        onCustomerFormChange={(patch) => setCustomerForm((prev) => ({ ...prev, ...patch }))}

        onSelectCustomer={(customer) => {
          const nextDraft = {
            ...(resumeDraft ?? currentDraft),
            customerId: customer.id,
            name: customer.name,
            nickName: customer.nickname ?? "",
          };
          setCurrentDraft(nextDraft);
          setCustomerSheetOpen(false);
          if (resumeDraft) {
            saveMutation.mutate({ draft: nextDraft, resumed: true });
          }
        }}

        onCreateCustomer={() => createCustomerMutation.mutate(customerForm)}
      />
    </div>
  );
}
