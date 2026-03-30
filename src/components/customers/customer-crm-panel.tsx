"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";


import {
  CustomerProfileFields,
  emptyCustomerProfileForm,
  type CustomerProfileFieldKey,
  type CustomerProfileFormValue,
} from "@/components/customers/customer-profile-fields";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { customers as demoCustomers } from "@/lib/demo-data";
import { fetchJson } from "@/lib/crm-api";
import type { CustomerWorkflowDraftSeed } from "@/types/agent";
import type { CustomerRecord } from "@/types/customer";


type CustomerCrmPanelProps = {
  variant?: "full" | "assistant";
  draftSeed?: CustomerWorkflowDraftSeed | null;
  onSaved?: (message: string, customer?: CustomerRecord) => void;
};

type CustomerDraftExtractResponse = {
  fields: Partial<CustomerProfileFormValue>;
  extractedFields: Array<{ label: string; value: string }>;
  message: string;
};

type PendingExistingCustomerConfirmation = {
  customer: CustomerRecord;
  proposedNickname: string;
  existingNickname: string;
};

function normalizeDuplicateToken(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function normalizeOptionalText(value: string | null | undefined) {
  return (value ?? "").trim();
}


function collectFilledFieldKeys(fields: Partial<CustomerProfileFormValue> | null | undefined): CustomerProfileFieldKey[] {
  if (!fields) {
    return [];
  }

  return (Object.entries(fields) as Array<[CustomerProfileFieldKey, string | undefined]>).flatMap(([key, value]) =>
    typeof value === "string" && value.trim() ? [key] : [],
  );
}

export function CustomerCrmPanel({ variant = "full", draftSeed = null, onSaved }: CustomerCrmPanelProps) {



  const assistantMode = variant === "assistant";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm, ...(draftSeed?.values ?? {}) });
  const [editingId, setEditingId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [feedback, setFeedback] = useState(draftSeed?.assistantNote ?? "");
  const [assistantDetailInput, setAssistantDetailInput] = useState("");
  const [assistantReviewPrompt, setAssistantReviewPrompt] = useState("");
  const [highlightedFields, setHighlightedFields] = useState<CustomerProfileFieldKey[]>(() => collectFilledFieldKeys(draftSeed?.values));
  const [duplicatePromptDismissed, setDuplicatePromptDismissed] = useState(false);
  const [pendingExistingCustomerConfirmation, setPendingExistingCustomerConfirmation] = useState<PendingExistingCustomerConfirmation | null>(null);
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const profileCardRef = useRef<HTMLDivElement | null>(null);





  const effectiveKeyword = assistantMode ? form.name.trim() || form.nickname.trim() : keyword.trim();
  const shouldSearch = !assistantMode || Boolean(effectiveKeyword);


  const query = useQuery({
    queryKey: ["customers-crm", effectiveKeyword],
    queryFn: () => fetchJson<CustomerRecord[]>(`/api/customers?search=${encodeURIComponent(effectiveKeyword)}`),
    enabled: shouldSearch,
  });

  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<CustomerDraftExtractResponse>("/api/customers/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          currentName: form.name,
        }),
      }),
    onSuccess: (result) => {
      const extractedFieldKeys = collectFilledFieldKeys(result.fields);

      setForm((current) => ({
        ...current,
        ...Object.fromEntries(
          Object.entries(result.fields).filter(([, value]) => typeof value === "string" && value.trim()),
        ),
      }));
      setHighlightedFields((current) => Array.from(new Set([...current, ...extractedFieldKeys])));
      setFeedback(result.message);

      if (extractedFieldKeys.length > 0) {
        setAssistantDetailInput("");
        setAssistantReviewPrompt("已根据你刚才的补充更新当前客户信息，请先核对绿色标记项；如还需补充，可直接在这张卡片底部继续输入。");

        globalThis.requestAnimationFrame(() => {
          profileCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        return;
      }

      setAssistantReviewPrompt("");
    },

    onError: (error) => {
      setAssistantReviewPrompt("");
      setFeedback(error.message);
    },

  });

  const saveMutation = useMutation({
    mutationFn: () =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingId ? { id: editingId } : {}),
          name: form.name,
          nickname: form.nickname,
          age: form.age,
          sex: form.sex,
          profession: form.profession,
          familyProfile: form.familyProfile,
          wealthProfile: form.wealthProfile,
          coreInteresting: form.coreInteresting,
          preferCommunicate: form.preferCommunicate,
          source: form.source,
          recentMoney: form.recentMoney,
          remark: form.remark,
        }),
      }),


    onSuccess: (customer) => {
      const message = editingId ? "已为你更新客户档案" : "已为你保存客户档案";
      const nextFeedback = assistantMode
        ? draftSeed?.resumeVisitSeed
          ? `${message}，正在继续刚才的拜访记录…`
          : `${message}，正在返回助手…`
        : editingId
          ? "客户信息已更新"
          : "客户档案已创建";

      setFeedback(nextFeedback);
      setAssistantReviewPrompt("");
      setForm({ ...emptyCustomerProfileForm });
      setEditingId("");
      setAssistantDetailInput("");
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });



      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      onSaved?.(message, customer);
    },
    onError: (error) => setFeedback(error.message),
  });

  const syncExistingCustomerNicknameMutation = useMutation({
    mutationFn: ({ customerId, nickname }: { customerId: string; nickname: string }) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId, nickname }),
      }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      setPendingExistingCustomerConfirmation(null);
      setAssistantReviewPrompt("");
      setFeedback(`已将昵称“${customer.nickname ?? ""}”补充到客户档案，正在继续刚才的拜访记录…`);
      onSaved?.("已更新客户昵称并继续使用已有客户档案", customer);
    },
    onError: (error) => setFeedback(error.message),
  });

  const fallbackCustomers = useMemo(

    () =>
      demoCustomers.map((item) => ({
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
      })),
    [],
  );

  const items = query.isError ? fallbackCustomers : query.data ?? [];
  const effectiveKeywordToken = normalizeDuplicateToken(effectiveKeyword);
  const duplicateCandidates = assistantMode && effectiveKeywordToken && !query.isLoading && !query.isError
    ? items.filter((customer) => {
        const customerTokens = [customer.name, customer.nickname].map(normalizeDuplicateToken).filter(Boolean);
        return customerTokens.some((token) => token === effectiveKeywordToken || token.includes(effectiveKeywordToken) || effectiveKeywordToken.includes(token));
      }).slice(0, 2)
    : [];
  const showAssistantDuplicateNotice = assistantMode && duplicateCandidates.length > 0 && !duplicatePromptDismissed;
  const listItems = assistantMode ? [] : items;
  const resumeVisitName = draftSeed?.resumeVisitSeed?.values.name?.trim() || form.name.trim();
  const resumeVisitFollowUp = draftSeed?.resumeVisitSeed?.values.followWork?.split("\n")[0]?.trim();
  const assistantTitle = assistantMode
    ? showAssistantDuplicateNotice
      ? "确认客户"
      : editingId
        ? "修改客户"
        : "新增客户"
    : "客户资料";


  useEffect(() => {

    setDuplicatePromptDismissed(false);
    setPendingExistingCustomerConfirmation(null);
  }, [effectiveKeyword]);


  function patchForm(patch: Partial<CustomerProfileFormValue>) {
    setAssistantReviewPrompt("");
    setForm((current) => ({ ...current, ...patch }));
  }

  function saveCustomer() {
    if (!form.name.trim()) {
      const message = assistantMode ? "还缺少客户姓名，请先补充姓名后再保存并继续。" : "客户姓名不能为空";
      setFeedback(message);
      setAssistantReviewPrompt(assistantMode ? "请先回到上方客户信息区补充姓名，再继续保存。" : "");

      globalThis.requestAnimationFrame(() => {
        profileCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }

    saveMutation.mutate();
  }

  function startEdit(customer: CustomerRecord) {

    setEditingId(customer.id);
    setAssistantReviewPrompt("");
    setHighlightedFields([]);
    setForm({

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
    });

  }


  function resetForm() {
    setEditingId("");
    setForm({ ...emptyCustomerProfileForm, ...(draftSeed?.values ?? {}) });
    setAssistantDetailInput("");
    setAssistantReviewPrompt("");
    setDuplicatePromptDismissed(false);
    setPendingExistingCustomerConfirmation(null);
    setShowNewCustomerForm(false);
    setFeedback(assistantMode ? draftSeed?.assistantNote ?? "" : "");
  }

  function completeUseExistingCustomer(customer: CustomerRecord, message = "已识别到已有客户档案") {
    const nextFeedback = draftSeed?.resumeVisitSeed
      ? `已识别到 ${customer.name} 已有档案，正在继续刚才的拜访记录…`
      : `已识别到 ${customer.name} 已有档案，正在返回助手…`;

    setPendingExistingCustomerConfirmation(null);
    setAssistantReviewPrompt("");
    setFeedback(nextFeedback);
    onSaved?.(message, customer);
  }

  function handleUseExistingCustomer(customer: CustomerRecord) {
    const proposedNickname = normalizeOptionalText(form.nickname);
    const existingNickname = normalizeOptionalText(customer.nickname);

    if (assistantMode && proposedNickname && proposedNickname !== existingNickname) {
      setAssistantReviewPrompt("");
      setFeedback(existingNickname
        ? `你刚补充的昵称是“${proposedNickname}”，但当前客户档案里记录的是“${existingNickname}”。为避免误改，我先请你确认是否同步更新。`
        : `你刚补充了昵称“${proposedNickname}”。如确认无误，我可以在继续拜访前一并写入这位客户的客户档案。`);
      setPendingExistingCustomerConfirmation({ customer, proposedNickname, existingNickname });
      return;
    }

    completeUseExistingCustomer(customer);
  }

  function confirmExistingCustomerNicknameSync() {
    if (!pendingExistingCustomerConfirmation) {
      return;
    }

    syncExistingCustomerNicknameMutation.mutate({
      customerId: pendingExistingCustomerConfirmation.customer.id,
      nickname: pendingExistingCustomerConfirmation.proposedNickname,
    });
  }

  function continueWithoutNicknameSync() {
    if (!pendingExistingCustomerConfirmation) {
      return;
    }

    completeUseExistingCustomer(pendingExistingCustomerConfirmation.customer, "已继续使用已有客户档案（未修改客户昵称）");
  }



  const contentClass = assistantMode ? "space-y-6" : "grid gap-6 xl:grid-cols-[0.98fr_1.02fr]";


  return (
    <Card className="glass-panel border-white/60 bg-white/92 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <CardHeader className="pb-4">
        <div className={`flex flex-col gap-4 ${assistantMode ? "" : "xl:flex-row xl:items-end xl:justify-between"}`}>
          <div>
            <CardTitle className="text-2xl text-slate-900">{assistantTitle}</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {assistantMode
                ? showAssistantDuplicateNotice
                  ? "系统已查到可能同一位客户，请先确认是否继续使用已有客户；若不是，再继续新建。"
                  : draftSeed?.resumeVisitSeed
                    ? "先保存客户基础信息，系统会自动带你回到刚才的拜访记录。"
                    : "先保存基础信息，后续还可以继续补充。"
                : "按姓名、昵称、职业、来源或关注点查找客户。"}
            </p>

          </div>
          {!assistantMode && (
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按姓名、昵称、职业、客户来源、核心关注点或备注检索"

              className="h-11 max-w-md rounded-2xl border-slate-200/80 bg-white"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className={contentClass}>
        <div className="space-y-4">
          {assistantMode && draftSeed?.resumeVisitSeed && (
            <div className="rounded-[24px] border border-[#B8894A]/18 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-900">当前待完成</p>
              <p className="mt-2">
                {showAssistantDuplicateNotice
                  ? `我已先查到一位可能同名的已有客户。请先确认是否就是这位客户；若不是，再继续新建。当前这条拜访我会继续为你保留${resumeVisitFollowUp ? `，并继续接上“${resumeVisitFollowUp}”` : ""}。`
                  : `当前还没有查到 ${resumeVisitName || "这位客户"} 的客户档案。我先带你补一份基础信息，保存后会自动回到刚才的拜访记录${resumeVisitFollowUp ? `，并继续接上“${resumeVisitFollowUp}”` : ""}。`}
              </p>
            </div>
          )}





          {showAssistantDuplicateNotice && (
            <div className="rounded-[24px] border border-[#B8894A]/18 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-900">系统发现可能已有同一位客户</p>
              <p className="mt-2">我已自动帮你核对到相近档案。若确认是同一位，可直接继续使用已有客户；若不是，再继续新建即可。</p>
              <div className="mt-4 space-y-3">
                {duplicateCandidates.map((customer) => (
                  <div key={customer.id} className="rounded-2xl bg-white/90 p-4 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{customer.name}</p>
                      {customer.nickname && <Badge className="rounded-full border-0 bg-[#FFF3DC] text-[#B8894A]">{customer.nickname}</Badge>}
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{customer.profession || "待补充职业"} · {customer.source || "待补充来源"}</p>
                    <p className="mt-2 text-sm text-slate-500">核心关注：{customer.core_interesting || "待补充"}</p>
                    <p className="mt-2 text-sm text-slate-500">财富情况：{customer.wealth_profile || "待补充"}</p>
                    <p className="mt-2 text-sm text-slate-500">资金情况：{customer.recent_money || "待补充"}</p>
                    <div className="mt-3 flex flex-wrap gap-3">
                      <Button type="button" onClick={() => handleUseExistingCustomer(customer)} className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]">
                        就是这位客户
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => {
                    setPendingExistingCustomerConfirmation(null);
                    setDuplicatePromptDismissed(true);
                    setShowNewCustomerForm(true);
                  }}
                  className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]"
                >
                  不是同一人，继续新建
                </Button>
              </div>
            </div>
          )}

          {pendingExistingCustomerConfirmation && (
            <div className="rounded-[24px] border border-[#123B5D]/14 bg-[#F6FAFD] p-4 text-sm leading-6 text-slate-700">
              <p className="font-medium text-slate-900">确认是否同步更新客户昵称</p>
              <p className="mt-2">
                {pendingExistingCustomerConfirmation.existingNickname
                  ? `当前客户档案中的昵称是“${pendingExistingCustomerConfirmation.existingNickname}”，而你刚补充的是“${pendingExistingCustomerConfirmation.proposedNickname}”。如确认是同一称呼，我可以先把客户昵称更新为“${pendingExistingCustomerConfirmation.proposedNickname}”，再继续刚才的拜访记录。`
                  : `你刚补充了昵称“${pendingExistingCustomerConfirmation.proposedNickname}”。如确认无误，我可以先把它写入 ${pendingExistingCustomerConfirmation.customer.name} 的客户档案，再继续刚才的拜访记录。`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={confirmExistingCustomerNicknameSync}
                  disabled={syncExistingCustomerNicknameMutation.isPending}
                  className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]"
                >
                  {syncExistingCustomerNicknameMutation.isPending ? "正在更新昵称" : "继续并同步客户昵称"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={continueWithoutNicknameSync}
                  disabled={syncExistingCustomerNicknameMutation.isPending}
                  className="cursor-pointer rounded-full border-slate-300 bg-transparent"
                >
                  只继续拜访，不修改昵称
                </Button>
              </div>
            </div>
          )}

          {(!showAssistantDuplicateNotice || showNewCustomerForm) && (
          <div ref={profileCardRef} className={`rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-5 ${assistantReviewPrompt ? "ring-1 ring-[#0F766E]/15" : ""}`}>

            {assistantMode && assistantReviewPrompt && (
              <div className="mb-5 rounded-[24px] border border-[#0F766E]/16 bg-[#F3FBF8] p-4 text-sm leading-6 text-slate-700">
                <p className="font-medium text-slate-900">助手已整理到当前客户信息</p>
                <p className="mt-2">{assistantReviewPrompt}</p>
              </div>
            )}


            {!assistantMode && <p className="text-lg font-semibold text-slate-900">{editingId ? "编辑客户" : "新增客户"}</p>}
            {assistantMode ? (
              <div className="space-y-5">
                <div className="rounded-[26px] border border-white/85 bg-white/96 p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-slate-500 uppercase">客户信息</p>
                      <p className="mt-1 text-sm leading-6 text-slate-500">请先核对已填入内容，绿色字段为本轮助手整理或更新。</p>
                    </div>
                    <span className="rounded-full border border-[#0F766E]/14 bg-[#F3FBF8] px-3 py-1 text-xs font-medium text-[#0F766E]">
                      已填信息区
                    </span>
                  </div>
                  <CustomerProfileFields
                    value={form}
                    onChange={patchForm}
                    disabled={saveMutation.isPending}
                    variant="full"
                    highlightedFields={highlightedFields}
                  />
                </div>

                <div className="rounded-[26px] border border-[#0F766E]/16 bg-[linear-gradient(180deg,rgba(238,247,245,0.95)_0%,rgba(248,252,251,0.98)_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.18em] text-[#0F766E] uppercase">继续补充</p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">核对完上方已填入信息后，如需补充和修改，可以在下面输入框中输入</p>
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
                    className="mt-4 min-h-24 rounded-[24px] border-white/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.04)]"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => extractMutation.mutate(assistantDetailInput.trim())}
                      disabled={!assistantDetailInput.trim() || extractMutation.isPending || saveMutation.isPending}
                      className="cursor-pointer rounded-full bg-[#0F766E] text-white hover:bg-[#0B5F59]"
                    >
                      {extractMutation.isPending ? "正在整理" : "让助手整理并填写"}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <CustomerProfileFields
                  value={form}
                  onChange={patchForm}
                  disabled={saveMutation.isPending}
                  variant="full"
                  highlightedFields={highlightedFields}
                />
              </div>
            )}

            <div className={assistantMode ? "mt-5 flex flex-wrap gap-3 border-t border-slate-200/70 pt-4" : "mt-4 flex flex-wrap gap-3"}>
              <Button onClick={saveCustomer} disabled={saveMutation.isPending} className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]">
                {saveMutation.isPending ? "正在保存" : editingId ? "保存修改" : assistantMode ? "保存并继续" : "创建客户"}
              </Button>
              {!assistantMode && (
                <Button variant="outline" onClick={resetForm} className="cursor-pointer rounded-full border-slate-300 bg-transparent">
                  重置表单
                </Button>
              )}
            </div>
            {feedback && (
              <p className={`mt-4 text-sm leading-6 ${assistantMode ? "text-slate-700" : "text-slate-600"}`}>
                {feedback}
              </p>
            )}



          </div>
          )}
        </div>

        {!assistantMode && (
          <div className="space-y-4">
            {query.isLoading && shouldSearch && (
              <div className="rounded-[24px] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">正在查找客户…</div>
            )}

            {!query.isLoading && !query.isError && listItems.length === 0 && shouldSearch && (
              <div className="rounded-[24px] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">还没有匹配到客户。</div>
            )}

            {listItems.map((customer) => (
              <div key={customer.id} className="rounded-[28px] border border-slate-200/70 bg-white/90 p-5 shadow-sm">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-slate-900">{customer.name}</p>
                      {customer.nickname && <Badge className="rounded-full border-0 bg-[#FFF8EE] text-[#B8894A]">{customer.nickname}</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{customer.profession || "待补充职业"} · {customer.source || "待补充来源"}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => startEdit(customer)} className="cursor-pointer rounded-full border-slate-300 bg-transparent">编辑</Button>
                  </div>

                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50/90 p-3">核心关注点：{customer.core_interesting || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3">资金情况：{customer.recent_money || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">财富情况：{customer.wealth_profile || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">家庭情况：{customer.family_profile || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">沟通偏好：{customer.prefer_communicate || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">备注：{customer.remark || "待补充"}</div>
                </div>

              </div>
            ))}
          </div>
        )}

      </CardContent>
    </Card>
  );
}