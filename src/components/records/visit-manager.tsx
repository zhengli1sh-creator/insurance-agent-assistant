"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FolderHeart, RefreshCcw, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";


import { CustomerProfileFields, emptyCustomerProfileForm, type CustomerProfileFormValue } from "@/components/customers/customer-profile-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, fetchJson } from "@/lib/crm-api";
import { customers as demoCustomers, records as demoRecords } from "@/lib/demo-data";
import type { VisitDraftExtraction } from "@/modules/visits/visit-draft-extractor";
import type { VisitWorkflowDraftSeed } from "@/types/agent";
import type { CustomerRecord } from "@/types/customer";
import type { VisitRecordEntity } from "@/types/visit";


export type VisitFormState = {
  customerId: string;
  name: string;
  nickName: string;
  timeVisit: string;
  location: string;
  corePain: string;
  briefContent: string;
  followWork: string;
  methodCommunicate: string;
};

type SaveVisitVariables = {

  form: VisitFormState;
  editingId: string;
  resumed?: boolean;
};

type ResumeContext = {
  form: VisitFormState;
  editingId: string;
};

type VisitManagerProps = {
  variant?: "full" | "embedded";
  source?: "assistant-home" | "assistant-task" | "records";
  draftSeed?: VisitWorkflowDraftSeed | null;
  expandHref?: string;
  onSaved?: (message: string) => void;
};

type FeedbackTone = "info" | "success" | "warning";

const emptyForm: VisitFormState = {

  customerId: "",
  name: "",
  nickName: "",
  timeVisit: "",
  location: "",
  corePain: "",
  briefContent: "",
  followWork: "",
  methodCommunicate: "",
};

function normalizeOptionalText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function getFeedbackToneClassName(tone: FeedbackTone) {
  switch (tone) {
    case "success":
      return "advisor-notice-card-success";
    case "warning":
      return "advisor-notice-card-warning";
    default:
      return "advisor-notice-card-info";
  }
}

function getVisitFieldCardClassName(highlighted: boolean) {
  return highlighted
    ? "advisor-review-card advisor-review-highlight rounded-[24px] p-3"
    : "advisor-field-card rounded-[24px] p-3";
}

function getVisitInputClassName(highlighted = false) {
  return `advisor-form-control h-11 rounded-2xl focus-visible:ring-0 ${highlighted ? "advisor-form-control-highlighted" : ""}`.trim();
}

function getVisitTextareaClassName(highlighted = false, minHeightClassName = "min-h-24") {
  return `advisor-form-control advisor-form-textarea ${minHeightClassName} rounded-[24px] focus-visible:ring-0 ${highlighted ? "advisor-form-control-highlighted" : ""}`.trim();
}

function findExactCustomerMatch(form: VisitFormState, options: Array<{ id: string; name: string; nickname: string | null }>) {

  const name = form.name.trim();
  const nickname = normalizeOptionalText(form.nickName);

  if (!name) {
    return null;
  }

  const matches = options.filter(
    (item) => item.name.trim() === name && normalizeOptionalText(item.nickname) === nickname,
  );

  return matches.length === 1 ? matches[0] : null;
}

export function VisitManager({
  variant = "full",
  source = "records",
  draftSeed = null,
  expandHref = "/records?tab=visits",
  onSaved,
}: VisitManagerProps) {

  const embedded = variant === "embedded";
  const initialDraftValues = draftSeed?.values ?? null;
  const initialAssistantNote = draftSeed?.assistantNote ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VisitFormState>(() => ({ ...emptyForm, ...(initialDraftValues ?? {}) }));
  const [editingId, setEditingId] = useState("");
  const [feedback, setFeedback] = useState(() => initialAssistantNote);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>(initialAssistantNote ? "info" : "success");
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);


  const [customerForm, setCustomerForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm });
  const [resumeContext, setResumeContext] = useState<ResumeContext | null>(null);

  const [assistantDetailInput, setAssistantDetailInput] = useState("");
  const [assistantReviewPrompt, setAssistantReviewPrompt] = useState("");
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);

  const customersQuery = useQuery({ queryKey: ["customers-options"], queryFn: () => fetchJson<CustomerRecord[]>("/api/customers") });
  const visitsQuery = useQuery({ queryKey: ["visits-crm"], queryFn: () => fetchJson<VisitRecordEntity[]>("/api/visits") });

  const fallbackCustomers = useMemo(
    () =>
      demoCustomers.map((item) => ({
        id: item.id,
        name: item.name,
        nickname: "",
      })),
    [],
  );

  const fallbackVisits = useMemo(
    () =>
      demoRecords
        .filter((item) => item.kind === "拜访")
        .map((item) => ({
          id: item.id,
          owner_id: "demo",
          customer_id: item.id,
          sys_platform: "demo",
          uuid: `visit-${item.id}`,
          bstudio_create_time: "",
          name: item.customerNames[0] ?? "",
          time_visit: item.happenedAt.slice(0, 10),
          location: "",
          core_pain: item.tone,
          brief_content: item.summary,
          follow_work: item.followUps.join("；"),
          method_communicate: "线下面谈",
          nick_name: "",
          title: item.title,
          summary: item.summary,
          happened_at: item.happenedAt,
          tone: item.tone,
          follow_ups: item.followUps,
          created_at: "",
          updated_at: "",
          customer: { id: item.id, name: item.customerNames[0] ?? "", nickname: null },
        })),
    [],
  );

  const customerOptions = customersQuery.isError
    ? fallbackCustomers
    : (customersQuery.data ?? []).map((item) => ({ id: item.id, name: item.name, nickname: item.nickname }));
  const visits = visitsQuery.isError ? fallbackVisits : visitsQuery.data ?? [];
  const assistantTaskMode = embedded && source === "assistant-task";
  const visibleVisits = assistantTaskMode ? [] : embedded ? visits.slice(0, 2) : visits;
  const selectedCustomer = customerOptions.find((item) => item.id === form.customerId) ?? null;
  const originBadgeLabel = assistantTaskMode ? "" : source === "assistant-home" ? "来自助手" : "";


  const saveMutation = useMutation({

    mutationFn: (variables: SaveVisitVariables) => {
      const matchedCustomer = findExactCustomerMatch(variables.form, customerOptions);
      return fetchJson<VisitRecordEntity>("/api/visits", {
        method: variables.editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(variables.editingId ? { id: variables.editingId } : {}),
          customerId: variables.form.customerId || matchedCustomer?.id || undefined,
          name: variables.form.name,
          nickName: variables.form.nickName,
          timeVisit: variables.form.timeVisit,
          location: variables.form.location,
          corePain: variables.form.corePain,
          briefContent: variables.form.briefContent,
          followWork: variables.form.followWork,
          methodCommunicate: variables.form.methodCommunicate,
        }),
      });
    },
    onSuccess: (_, variables) => {
      const successMessage = variables.resumed ? "客户档案已保存，并已继续完成刚才的拜访记录" : variables.editingId ? "拜访记录已更新" : "拜访记录已保存";
      setFeedback(successMessage);
      setFeedbackTone("success");
      setEditingId("");
      setForm({ ...emptyForm });
      setResumeContext(null);
      queryClient.invalidateQueries({ queryKey: ["visits-crm"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-live"] });
      onSaved?.(successMessage);
    },

    onError: (error, variables) => {
      if (error instanceof ApiRequestError && error.code === "CUSTOMER_NOT_FOUND") {
        const draft = { ...variables.form };
        setResumeContext({ form: draft, editingId: variables.editingId });
        setCustomerForm({
          ...emptyCustomerProfileForm,
          name: draft.name.trim(),
          nickname: draft.nickName.trim(),
          coreInteresting: draft.corePain.trim(),
          preferCommunicate: draft.methodCommunicate.trim(),
        });
        setCustomerSheetOpen(true);
        setFeedback("还没有这位客户的资料。请先补齐，我会继续保存这次拜访。");
        setFeedbackTone("warning");
        return;

      }

      setFeedback(error.message);
      setFeedbackTone("warning");
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
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });

      const resumed = resumeContext;
      if (!resumed) {
        setCustomerSheetOpen(false);
        setCustomerForm({ ...emptyCustomerProfileForm });
        setFeedback("客户档案已创建");
        setFeedbackTone("success");
        return;
      }

      const nextForm: VisitFormState = {
        ...resumed.form,
        customerId: customer.id,
        name: customer.name,
        nickName: customer.nickname ?? resumed.form.nickName,
      };

      setForm(nextForm);
      setEditingId(resumed.editingId);
      setCustomerSheetOpen(false);
      setCustomerForm({ ...emptyCustomerProfileForm });
      setFeedback("客户档案已保存，正在继续完成刚才的拜访记录…");
      setFeedbackTone("success");
      saveMutation.mutate({ form: nextForm, editingId: resumed.editingId, resumed: true });
    },
    onError: (error) => {
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson<{ id: string }>(`/api/visits?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFeedback("拜访记录已删除");
      setFeedbackTone("success");
      queryClient.invalidateQueries({ queryKey: ["visits-crm"] });
    },
    onError: (error) => {
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });

  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<{ fields: VisitDraftExtraction; extractedFields: Array<{ label: string; value: string }>; message: string }>("/api/visits/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      }),
    onSuccess: (data) => {
      const extractedFieldKeys: string[] = [];

      if (data.fields.name) {
        patchForm({ name: data.fields.name, customerId: "" });
        extractedFieldKeys.push("name");
      }
      if (data.fields.nickName) {
        patchForm({ nickName: data.fields.nickName, customerId: "" });
        extractedFieldKeys.push("nickName");
      }
      if (data.fields.timeVisit) {
        patchForm({ timeVisit: data.fields.timeVisit });
        extractedFieldKeys.push("timeVisit");
      }

      if (data.fields.location) {
        patchForm({ location: data.fields.location });
        extractedFieldKeys.push("location");
      }
      if (data.fields.methodCommunicate) {
        patchForm({ methodCommunicate: data.fields.methodCommunicate });
        extractedFieldKeys.push("methodCommunicate");
      }
      if (data.fields.corePain) {
        patchForm({ corePain: data.fields.corePain });
        extractedFieldKeys.push("corePain");
      }
      if (data.fields.briefContent) {
        patchForm({ briefContent: data.fields.briefContent });
        extractedFieldKeys.push("briefContent");
      }
      if (data.fields.followWork) {
        patchForm({ followWork: data.fields.followWork });
        extractedFieldKeys.push("followWork");
      }

      setHighlightedFields(extractedFieldKeys);
      setFeedback(data.message);
      setFeedbackTone(extractedFieldKeys.length > 0 ? "success" : "info");

      if (extractedFieldKeys.length > 0) {
        setAssistantDetailInput("");
        setAssistantReviewPrompt("已根据你的补充更新拜访信息，请核对绿色标记项；如还需补充，可继续输入。");
      } else {
        setAssistantReviewPrompt(data.message);
      }
    },
    onError: (error) => {
      setAssistantReviewPrompt("");
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });


  function patchForm(patch: Partial<VisitFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function patchCustomerForm(patch: Partial<CustomerProfileFormValue>) {
    setCustomerForm((current) => ({ ...current, ...patch }));
  }

  function syncCustomerSelection(customerId: string) {
    const customer = customerOptions.find((item) => item.id === customerId);
    patchForm({
      customerId,
      name: customer?.name ?? form.name,
      nickName: customer?.nickname ?? "",
    });
  }

  function handleNameChange(value: string) {
    const shouldClearSelection = selectedCustomer && value.trim() !== selectedCustomer.name;
    patchForm({ name: value, customerId: shouldClearSelection ? "" : form.customerId });
  }

  function handleNickNameChange(value: string) {
    const selectedNickname = normalizeOptionalText(selectedCustomer?.nickname);
    const shouldClearSelection = selectedCustomer && value.trim() !== selectedNickname;
    patchForm({ nickName: value, customerId: shouldClearSelection ? "" : form.customerId });
  }

  function startEdit(record: VisitRecordEntity) {
    setEditingId(record.id);
    setResumeContext(null);
    setForm({
      customerId: record.customer_id,
      name: record.name,
      nickName: record.nick_name ?? "",
      timeVisit: record.time_visit,
      location: record.location ?? "",
      corePain: record.core_pain ?? "",
      briefContent: record.brief_content ?? "",
      followWork: record.follow_work ?? record.follow_ups.join("\n"),
      methodCommunicate: record.method_communicate ?? "",
    });

    if (embedded && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyForm });
    setResumeContext(null);
    setFeedback("");
    setFeedbackTone("info");
    setAssistantDetailInput("");
    setAssistantReviewPrompt("");
    setHighlightedFields([]);
  }

  function openCustomerSheetFromVisit() {
    const draft = { ...form };
    setResumeContext({ form: draft, editingId });
    setCustomerForm({
      ...emptyCustomerProfileForm,
      name: draft.name.trim(),
      nickname: draft.nickName.trim(),
      coreInteresting: draft.corePain.trim(),
      preferCommunicate: draft.methodCommunicate.trim(),
    });
    setCustomerSheetOpen(true);
    setFeedback("请先补客户信息，保存后会继续当前拜访。");
    setFeedbackTone("warning");
  }


  function submitVisit() {
    saveMutation.mutate({ form: { ...form }, editingId });
  }

  const formCardTone = embedded ? "advisor-soft-card" : "glass-panel advisor-glass-surface";
  const primaryActionClassName = "advisor-primary-button cursor-pointer rounded-full text-white transition-all duration-200 hover:brightness-[1.03] disabled:shadow-none";
  const outlineActionClassName = "advisor-outline-button cursor-pointer rounded-full";



  return (
    <>
      <div className={embedded ? "space-y-4" : "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"}>
        <Card className={formCardTone}>
          <CardHeader className={assistantTaskMode ? "pb-3" : undefined}>
            <div className="flex flex-col gap-3">
              {!assistantTaskMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">拜访记录</Badge>
                  {originBadgeLabel && <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">{originBadgeLabel}</Badge>}
                  {resumeContext && <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">待继续</Badge>}
                </div>

              )}
              <div>
                <CardTitle className={assistantTaskMode ? "text-2xl text-slate-900" : "text-lg text-slate-900"}>
                  {editingId ? (assistantTaskMode ? "修改拜访" : "继续修改这次拜访") : assistantTaskMode ? "记录拜访" : embedded ? "记录这次拜访" : "新增拜访"}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {assistantTaskMode ? "补充客户、时间和沟通重点即可。" : "如果还没有这位客户的资料，会先帮你补齐，再继续保存这次拜访。"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {embedded && !assistantTaskMode && (
              <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="advisor-chip-info rounded-full px-3 py-1">1. 选客户</span>
                  <span className="advisor-chip-info rounded-full px-3 py-1">2. 记重点</span>
                  <span className="advisor-chip-info rounded-full px-3 py-1">3. 写下一步</span>
                </div>
                <p className="mt-3">先把这次拜访记下来。保存后，如果你想查看历史记录或继续修改，也可以进入记录中心。</p>
              </div>
            )}

            {resumeContext && (
              <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <RefreshCcw className="h-4 w-4 text-[var(--advisor-gold)]" />
                  刚才的内容已保留
                </div>
                <p className="mt-2">补完客户信息后，会继续保存这次拜访，不需要重新填写。</p>
              </div>
            )}


            <div className="advisor-soft-card rounded-[24px] p-4">
              <p className="text-sm font-medium text-slate-900">{assistantTaskMode ? "客户" : "先选客户"}</p>
              <p className="mt-1 text-sm text-slate-500">{assistantTaskMode ? "可直接选择已有客户，或先填写姓名。" : "可直接选择已有客户；如果还没有客户资料，也可以先填写姓名，保存时会继续引导你补齐。"}</p>

              <div className="mt-4 space-y-3">
                <select
                  value={form.customerId}
                  onChange={(event) => syncCustomerSelection(event.target.value)}
                  className="advisor-form-control advisor-form-select h-11 w-full rounded-2xl text-sm text-slate-700 focus-visible:ring-0"
                >
                  <option value="">选择一位已建档客户（可选）</option>
                  {customerOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.nickname ? `${item.name}（${item.nickname}）` : item.name}</option>
                  ))}
                </select>
                <Input value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="客户姓名（必填）" className={getVisitInputClassName()} />
                <Input value={form.nickName} onChange={(event) => handleNickNameChange(event.target.value)} placeholder="客户昵称（可选）" className={getVisitInputClassName()} />
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <Button type="button" variant="outline" onClick={openCustomerSheetFromVisit} className={outlineActionClassName}>
                    <UserRoundPlus className="h-4 w-4" />
                    {assistantTaskMode ? "先补客户信息" : "找不到客户，先保存客户基础信息"}
                  </Button>

                  {selectedCustomer && <span>已匹配：{selectedCustomer.nickname ? `${selectedCustomer.name}（${selectedCustomer.nickname}）` : selectedCustomer.name}</span>}
                </div>
              </div>
            </div>

            {assistantTaskMode ? (
              <div className="space-y-5">
                <div className="advisor-soft-card rounded-[26px] p-5">
                  {assistantReviewPrompt && (
                    <div className="advisor-review-card advisor-review-card-success mb-5 rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="advisor-kicker">Review prompted</p>
                        <span className="advisor-review-chip rounded-full px-3 py-1 text-xs font-medium">待你核对</span>
                      </div>
                      <p className="mt-2 text-base font-medium text-slate-900">助手已整理到拜访信息</p>
                      <p className="mt-2">{assistantReviewPrompt}</p>
                    </div>
                  )}

                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <p className="advisor-section-label">拜访信息</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">请核对已填入内容，绿色字段为助手整理或更新。</p>
                    </div>
                    <span className="advisor-review-chip rounded-full px-3 py-1 text-xs font-medium">已填信息区</span>
                  </div>

                  <div className="space-y-4">
                    <div className={getVisitFieldCardClassName(highlightedFields.includes("timeVisit"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">拜访日期</p>
                      <Input value={form.timeVisit} onChange={(event) => patchForm({ timeVisit: event.target.value })} type="date" className={getVisitInputClassName(highlightedFields.includes("timeVisit"))} />
                    </div>

                    <div className={getVisitFieldCardClassName(highlightedFields.includes("location"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">地点</p>
                      <Input value={form.location} onChange={(event) => patchForm({ location: event.target.value })} placeholder="请输入拜访地点" className={getVisitInputClassName(highlightedFields.includes("location"))} />
                    </div>

                    <div className={getVisitFieldCardClassName(highlightedFields.includes("methodCommunicate"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">沟通方式</p>
                      <Input value={form.methodCommunicate} onChange={(event) => patchForm({ methodCommunicate: event.target.value })} placeholder="例如：面谈、电话、微信" className={getVisitInputClassName(highlightedFields.includes("methodCommunicate"))} />
                    </div>

                    <div className={getVisitFieldCardClassName(highlightedFields.includes("corePain"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">客户当下最在意的问题 / 核心痛点</p>
                      <Textarea value={form.corePain} onChange={(event) => patchForm({ corePain: event.target.value })} placeholder="请描述客户当前最关注的问题" className={getVisitTextareaClassName(highlightedFields.includes("corePain"))} />
                    </div>

                    <div className={getVisitFieldCardClassName(highlightedFields.includes("briefContent"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">沟通关键信息</p>
                      <Textarea value={form.briefContent} onChange={(event) => patchForm({ briefContent: event.target.value })} placeholder="把这次沟通的关键信息沉淀下来" className={getVisitTextareaClassName(highlightedFields.includes("briefContent"), "min-h-28")} />
                    </div>

                    <div className={getVisitFieldCardClassName(highlightedFields.includes("followWork"))}>
                      <p className="mb-2 text-sm font-medium text-slate-700">后续动作</p>
                      <Textarea value={form.followWork} onChange={(event) => patchForm({ followWork: event.target.value })} placeholder="后续需要跟进的事项，可用换行或分号分隔" className={getVisitTextareaClassName(highlightedFields.includes("followWork"))} />
                    </div>
                  </div>
                </div>

                <div className="advisor-review-card rounded-[26px] p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="advisor-section-label">继续补充</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">核对完上方已填入信息后，如需补充和修改，可以在下面输入框中继续描述。</p>
                    </div>
                  </div>
                  <Textarea
                    value={assistantDetailInput}
                    onChange={(event) => {
                      setAssistantDetailInput(event.target.value);
                      if (assistantReviewPrompt) {
                        setAssistantReviewPrompt("");
                      }
                    }}
                    disabled={extractMutation.isPending || saveMutation.isPending}
                    className="advisor-form-control advisor-form-textarea mt-4 min-h-24 rounded-[24px] focus-visible:ring-0"
                    placeholder="例如：今天3月15日在客户公司面谈，客户主要想了解教育金规划，后续需要跟进方案..."
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => extractMutation.mutate(assistantDetailInput.trim())}
                      disabled={!assistantDetailInput.trim() || extractMutation.isPending || saveMutation.isPending}
                      className={primaryActionClassName}
                    >
                      {extractMutation.isPending ? "正在整理" : "交给助手"}
                    </Button>
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-200/70 pt-4">
                  <Button onClick={submitVisit} disabled={saveMutation.isPending || createCustomerMutation.isPending} className={primaryActionClassName}>
                    {saveMutation.isPending ? "正在保存" : "保存并返回"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className={embedded ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
                  <Input value={form.timeVisit} onChange={(event) => patchForm({ timeVisit: event.target.value })} type="date" className={getVisitInputClassName()} />
                  <Input value={form.location} onChange={(event) => patchForm({ location: event.target.value })} placeholder="地点" className={getVisitInputClassName()} />
                </div>
                <Input value={form.methodCommunicate} onChange={(event) => patchForm({ methodCommunicate: event.target.value })} placeholder="沟通方式，例如：面谈、电话、微信" className={getVisitInputClassName()} />
                <Textarea value={form.corePain} onChange={(event) => patchForm({ corePain: event.target.value })} placeholder="客户当下最在意的问题 / 核心痛点" className={getVisitTextareaClassName()} />
                <Textarea value={form.briefContent} onChange={(event) => patchForm({ briefContent: event.target.value })} placeholder="把这次沟通的关键信息沉淀下来" className={getVisitTextareaClassName(false, "min-h-28")} />
                <Textarea value={form.followWork} onChange={(event) => patchForm({ followWork: event.target.value })} placeholder="后续动作，可用换行或分号分隔" className={getVisitTextareaClassName()} />
                <div className="flex flex-wrap gap-3">
                  <Button onClick={submitVisit} disabled={saveMutation.isPending || createCustomerMutation.isPending} className={primaryActionClassName}>
                    {saveMutation.isPending ? "正在保存" : editingId ? "保存修改" : embedded ? "保存这次拜访" : "保存记录"}
                  </Button>

                  <Button variant="outline" onClick={resetForm} className={outlineActionClassName}>清空</Button>
                </div>
              </>
            )}

            {feedback && (
              <div className={`advisor-notice-card mt-4 rounded-[22px] px-4 py-3 text-sm leading-6 text-slate-700 ${getFeedbackToneClassName(feedbackTone)}`}>
                {feedback}
              </div>
            )}

          </CardContent>
        </Card>

        {embedded && !assistantTaskMode ? (
          <Card className="glass-panel advisor-glass-surface">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">全部记录</Badge>
                <Badge className="advisor-chip-success rounded-full border-0 px-3 py-1">最近拜访</Badge>
              </div>
              <CardTitle className="text-lg text-slate-900">需要时再去记录中心</CardTitle>
              <p className="text-sm leading-6 text-slate-500">这里先帮你完成当前这次拜访；如果想回看历史或继续修改旧记录，可以再去记录中心。</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <FolderHeart className="h-4 w-4 text-[var(--advisor-gold)]" />
                  想回看时再打开
                </div>
                <p className="mt-2">历史记录和统一修改都放在记录中心，手机上看会更清楚。</p>
              </div>

              {visibleVisits.length === 0 ? (
                <div className="advisor-module-placeholder-card rounded-[24px] p-5 text-sm text-slate-500">还没有拜访记录，保存第一条后就能在这里继续查看。</div>
              ) : (
                visibleVisits.map((record) => (
                  <div key={record.id} className="advisor-record-card rounded-[24px] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{record.name}{record.nick_name ? `（${record.nick_name}）` : ""}</p>
                        <p className="mt-1 text-sm text-slate-500">{record.time_visit} · {record.location || "待补充地点"}</p>
                      </div>
                      <Button variant="outline" onClick={() => startEdit(record)} className="advisor-outline-button cursor-pointer rounded-full">继续修改</Button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{record.brief_content || "待补充拜访摘要"}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">下一步：{record.follow_ups[0] || record.follow_work || "待补充后续动作"}</p>
                  </div>
                ))
              )}

              <Link href={expandHref} className="advisor-primary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition hover:brightness-[1.03]">
                去记录中心查看全部拜访
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleVisits.map((record) => (
              <div key={record.id} className="advisor-list-item-card rounded-[28px] p-5">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{record.name}{record.nick_name ? `（${record.nick_name}）` : ""}</p>
                    <p className="mt-2 text-sm text-slate-500">拜访日期：{record.time_visit} · {record.location || "待补充地点"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => startEdit(record)} className="advisor-outline-button cursor-pointer rounded-full">编辑</Button>
                    <Button variant="outline" onClick={() => globalThis.confirm("确认删除这条拜访记录吗？") && deleteMutation.mutate(record.id)} className="cursor-pointer rounded-full border-rose-200 bg-transparent text-rose-600 hover:bg-rose-50 hover:text-rose-700">删除</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="advisor-meta-tile rounded-[24px] p-4 md:col-span-2">核心痛点：{record.core_pain || "待补充"}</div>
                  <div className="advisor-meta-tile rounded-[24px] p-4 md:col-span-2">谈话摘要：{record.brief_content || "待补充"}</div>
                  <div className="advisor-meta-tile rounded-[24px] p-4">沟通方式：{record.method_communicate || "待补充"}</div>
                  <div className="advisor-meta-tile rounded-[24px] p-4">待办事项：{record.follow_work || "暂无"}</div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <SheetContent side="bottom" className="advisor-sheet-surface max-h-[92vh] rounded-t-[32px] p-0 sm:max-w-none">
          <div className="overflow-y-auto">
            <SheetHeader className="advisor-sheet-header-surface px-5 py-5">
              <div className="space-y-2">
                <p className="advisor-kicker">Resume workflow</p>
                <SheetTitle className="text-xl text-slate-900">先补客户信息</SheetTitle>
                <SheetDescription className="text-sm leading-6 text-slate-500">保存客户档案后，会自动返回刚才的拜访记录，不需要重新填写。</SheetDescription>
              </div>
            </SheetHeader>
            <div className="space-y-4 px-5 py-5">
              <div className="advisor-soft-card rounded-[28px] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="advisor-kicker">Pending task</p>
                        <p className="text-base font-medium">当前待完成</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">保存拜访记录：{resumeContext?.form.name || form.name || "待填写客户"}</p>
                  </div>
                  <Badge className="advisor-accent-chip rounded-full border-0">支持自动返回</Badge>
                </div>
              </div>

              <div className="advisor-subtle-card rounded-[28px] p-4 text-sm leading-6 text-slate-600">
                先补最小客户档案，再继续当前拜访。你现在填写的拜访内容会保留，不会丢失。
              </div>

              <CustomerProfileFields value={customerForm} onChange={patchCustomerForm} disabled={createCustomerMutation.isPending} variant="compact" />

              <div className="flex flex-wrap gap-3 pb-5">
                <Button onClick={() => createCustomerMutation.mutate(customerForm)} disabled={createCustomerMutation.isPending} className={`${primaryActionClassName} px-5`}>
                  {createCustomerMutation.isPending ? "正在保存客户档案" : "保存客户档案并继续拜访"}
                </Button>
                <Button variant="outline" onClick={() => setCustomerSheetOpen(false)} className={outlineActionClassName}>
                  稍后再说
                </Button>
              </div>

            </div>
          </div>
        </SheetContent>
      </Sheet>


    </>
  );
}
