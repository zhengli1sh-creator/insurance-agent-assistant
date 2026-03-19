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
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

  const [customerForm, setCustomerForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm });
  const [resumeContext, setResumeContext] = useState<ResumeContext | null>(null);

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
        return;

      }

      setFeedback(error.message);
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
      saveMutation.mutate({ form: nextForm, editingId: resumed.editingId, resumed: true });
    },
    onError: (error) => setFeedback(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson<{ id: string }>(`/api/visits?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFeedback("拜访记录已删除");
      queryClient.invalidateQueries({ queryKey: ["visits-crm"] });
    },
    onError: (error) => setFeedback(error.message),
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
  }


  function submitVisit() {
    saveMutation.mutate({ form: { ...form }, editingId });
  }

  const formCardTone = embedded
    ? "border-[#123B5D]/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.96))]"
    : "border-white/55 bg-slate-50/90";

  return (
    <>
      <div className={embedded ? "space-y-4" : "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"}>
        <Card className={formCardTone}>
          <CardHeader className={assistantTaskMode ? "pb-3" : undefined}>
            <div className="flex flex-col gap-3">
              {!assistantTaskMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`rounded-full border-0 px-3 py-1 ${embedded ? "bg-[#123B5D]/10 text-[#123B5D]" : "bg-[#1E3A8A]/10 text-[#1E3A8A]"}`}>
                    拜访记录
                  </Badge>
                  {originBadgeLabel && (
                    <Badge className="rounded-full border-0 bg-[#FFF8EE] px-3 py-1 text-[#8A6A3E]">{originBadgeLabel}</Badge>
                  )}
                  {resumeContext && <Badge className="rounded-full border-0 bg-[#FFF8EE] px-3 py-1 text-[#8A6A3E]">待继续</Badge>}
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
              <div className="rounded-[24px] border border-slate-200/70 bg-white/88 p-4 text-sm leading-6 text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-full bg-[#123B5D]/8 px-3 py-1 text-[#123B5D]">1. 选客户</span>
                  <span className="rounded-full bg-[#123B5D]/8 px-3 py-1 text-[#123B5D]">2. 记重点</span>
                  <span className="rounded-full bg-[#123B5D]/8 px-3 py-1 text-[#123B5D]">3. 写下一步</span>
                </div>
                <p className="mt-3">先把这次拜访记下来。保存后，如果你想查看历史记录或继续修改，也可以进入记录中心。</p>
              </div>
            )}



            {resumeContext && (
              <div className="rounded-[24px] border border-[#B8894A]/20 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <RefreshCcw className="h-4 w-4 text-[#B8894A]" />
                  刚才的内容已保留
                </div>
                <p className="mt-2">补完客户信息后，会继续保存这次拜访，不需要重新填写。</p>
              </div>
            )}

            <div className="rounded-[24px] border border-slate-200/70 bg-white/90 p-4">
              <p className="text-sm font-medium text-slate-900">{assistantTaskMode ? "客户" : "先选客户"}</p>
              <p className="mt-1 text-sm text-slate-500">{assistantTaskMode ? "可直接选择已有客户，或先填写姓名。" : "可直接选择已有客户；如果还没有客户资料，也可以先填写姓名，保存时会继续引导你补齐。"}</p>

              <div className="mt-4 space-y-3">
                <select
                  value={form.customerId}
                  onChange={(event) => syncCustomerSelection(event.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700"
                >
                  <option value="">选择一位已建档客户（可选）</option>
                  {customerOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.nickname ? `${item.name}（${item.nickname}）` : item.name}</option>
                  ))}
                </select>
                <Input value={form.name} onChange={(event) => handleNameChange(event.target.value)} placeholder="客户姓名（必填）" className="h-11 rounded-2xl border-white bg-white" />
                <Input value={form.nickName} onChange={(event) => handleNickNameChange(event.target.value)} placeholder="客户昵称（可选）" className="h-11 rounded-2xl border-white bg-white" />
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <Button type="button" variant="outline" onClick={openCustomerSheetFromVisit} className="cursor-pointer rounded-full border-slate-300 bg-transparent">
                    <UserRoundPlus className="h-4 w-4" />
                    {assistantTaskMode ? "先补客户信息" : "找不到客户，先保存客户基础信息"}
                  </Button>

                  {selectedCustomer && <span>已匹配：{selectedCustomer.nickname ? `${selectedCustomer.name}（${selectedCustomer.nickname}）` : selectedCustomer.name}</span>}
                </div>
              </div>
            </div>

            <div className={embedded ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
              <Input value={form.timeVisit} onChange={(event) => patchForm({ timeVisit: event.target.value })} type="date" className="h-11 rounded-2xl border-white bg-white" />
              <Input value={form.location} onChange={(event) => patchForm({ location: event.target.value })} placeholder="地点" className="h-11 rounded-2xl border-white bg-white" />
            </div>
            <Input value={form.methodCommunicate} onChange={(event) => patchForm({ methodCommunicate: event.target.value })} placeholder="沟通方式，例如：面谈、电话、微信" className="h-11 rounded-2xl border-white bg-white" />
            <Textarea value={form.corePain} onChange={(event) => patchForm({ corePain: event.target.value })} placeholder="客户当下最在意的问题 / 核心痛点" className="min-h-24 rounded-[24px] border-white bg-white" />
            <Textarea value={form.briefContent} onChange={(event) => patchForm({ briefContent: event.target.value })} placeholder="把这次沟通的关键信息沉淀下来" className="min-h-28 rounded-[24px] border-white bg-white" />
            <Textarea value={form.followWork} onChange={(event) => patchForm({ followWork: event.target.value })} placeholder="后续动作，可用换行或分号分隔" className="min-h-24 rounded-[24px] border-white bg-white" />
            <div className="flex flex-wrap gap-3">
              <Button onClick={submitVisit} disabled={saveMutation.isPending || createCustomerMutation.isPending} className={`cursor-pointer rounded-full text-white ${embedded ? "bg-[#123B5D] hover:bg-[#0E2E49]" : "bg-[#1E3A8A] hover:bg-[#17306F]"}`}>
                {saveMutation.isPending ? "正在保存" : editingId ? "保存修改" : embedded ? source === "assistant-task" ? "保存并返回" : "保存这次拜访" : "保存记录"}
              </Button>

              <Button variant="outline" onClick={resetForm} className="cursor-pointer rounded-full border-slate-300 bg-transparent">清空</Button>
              {embedded && (
                <Link href={expandHref} className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 transition hover:border-[#123B5D]/30 hover:text-[#123B5D]">
                  {assistantTaskMode ? "查看全部记录" : "进入记录中心"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

            </div>

            {feedback && <p className="text-sm leading-6 text-slate-600">{feedback}</p>}
          </CardContent>
        </Card>

        {embedded && !assistantTaskMode ? (

          <Card className="border-white/60 bg-white/88 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="rounded-full border-0 bg-[#F7F4EE] px-3 py-1 text-[#8A6A3E]">全部记录</Badge>
                <Badge className="rounded-full border-0 bg-[#0F766E]/10 px-3 py-1 text-[#0F766E]">最近拜访</Badge>
              </div>
              <CardTitle className="text-lg text-slate-900">需要时再去记录中心</CardTitle>
              <p className="text-sm leading-6 text-slate-500">这里先帮你完成当前这次拜访；如果想回看历史或继续修改旧记录，可以再去记录中心。</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-[24px] border border-[#B8894A]/18 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <FolderHeart className="h-4 w-4 text-[#B8894A]" />
                  想回看时再打开
                </div>
                <p className="mt-2">历史记录和统一修改都放在记录中心，手机上看会更清楚。</p>
              </div>

              {visibleVisits.length === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">还没有拜访记录，保存第一条后就能在这里继续查看。</div>
              ) : (

                visibleVisits.map((record) => (
                  <div key={record.id} className="rounded-[24px] border border-slate-200/70 bg-slate-50/90 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="font-medium text-slate-900">{record.name}{record.nick_name ? `（${record.nick_name}）` : ""}</p>
                        <p className="mt-1 text-sm text-slate-500">{record.time_visit} · {record.location || "待补充地点"}</p>
                      </div>
                      <Button variant="outline" onClick={() => startEdit(record)} className="cursor-pointer rounded-full border-slate-300 bg-white">继续修改</Button>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{record.brief_content || "待补充拜访摘要"}</p>
                    <p className="mt-3 text-xs leading-5 text-slate-500">下一步：{record.follow_ups[0] || record.follow_work || "待补充后续动作"}</p>
                  </div>
                ))
              )}

              <Link href={expandHref} className="inline-flex items-center gap-2 rounded-full bg-[#123B5D] px-4 py-2 text-sm text-white transition hover:opacity-95">
                去记录中心查看全部拜访
                <ArrowRight className="h-4 w-4" />
              </Link>

            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleVisits.map((record) => (
              <div key={record.id} className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-slate-900">{record.name}{record.nick_name ? `（${record.nick_name}）` : ""}</p>
                    <p className="mt-2 text-sm text-slate-500">拜访日期：{record.time_visit} · {record.location || "待补充地点"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => startEdit(record)} className="cursor-pointer rounded-full border-slate-300 bg-transparent">编辑</Button>
                    <Button variant="outline" onClick={() => globalThis.confirm("确认删除这条拜访记录吗？") && deleteMutation.mutate(record.id)} className="cursor-pointer rounded-full border-rose-200 bg-transparent text-rose-600 hover:bg-rose-50 hover:text-rose-700">删除</Button>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-[24px] bg-slate-50/90 p-4 md:col-span-2">核心痛点：{record.core_pain || "待补充"}</div>
                  <div className="rounded-[24px] bg-slate-50/90 p-4 md:col-span-2">谈话摘要：{record.brief_content || "待补充"}</div>
                  <div className="rounded-[24px] bg-slate-50/90 p-4">沟通方式：{record.method_communicate || "待补充"}</div>
                  <div className="rounded-[24px] bg-slate-50/90 p-4">待办事项：{record.follow_work || "暂无"}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <SheetContent side="bottom" className="max-h-[92vh] rounded-t-[32px] border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,251,255,0.98))] p-0 sm:max-w-none">
          <div className="overflow-y-auto">
            <SheetHeader className="border-b border-slate-200/70 px-5 py-5">
              <SheetTitle className="text-xl text-slate-900">先补客户信息</SheetTitle>
              <SheetDescription className="mt-2 text-sm leading-6 text-slate-500">保存后会继续当前拜访，不需要重新填写。</SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-5 py-5">
              <div className="rounded-[24px] border border-[#B8894A]/18 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <AlertTriangle className="h-4 w-4 text-[#B8894A]" />
                  当前待完成
                </div>
                <p className="mt-2">保存拜访记录：{resumeContext?.form.name || form.name || "待填写客户"}</p>
              </div>
              <CustomerProfileFields value={customerForm} onChange={patchCustomerForm} disabled={createCustomerMutation.isPending} variant="compact" />

              <div className="flex flex-wrap gap-3 pb-5">
                <Button onClick={() => createCustomerMutation.mutate(customerForm)} disabled={createCustomerMutation.isPending} className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]">
                  {createCustomerMutation.isPending ? "正在保存客户档案" : "保存客户档案并继续拜访"}
                </Button>
                <Button variant="outline" onClick={() => setCustomerSheetOpen(false)} className="cursor-pointer rounded-full border-slate-300 bg-transparent">稍后再说</Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
