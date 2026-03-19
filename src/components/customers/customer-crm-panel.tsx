"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  CustomerProfileFields,
  emptyCustomerProfileForm,
  type CustomerProfileFormValue,
} from "@/components/customers/customer-profile-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { customers as demoCustomers } from "@/lib/demo-data";
import { fetchJson } from "@/lib/crm-api";
import type { CustomerWorkflowDraftSeed } from "@/types/agent";
import type { CustomerRecord } from "@/types/customer";

type CustomerCrmPanelProps = {
  variant?: "full" | "assistant";
  draftSeed?: CustomerWorkflowDraftSeed | null;
  onSaved?: (message: string) => void;
};

export function CustomerCrmPanel({ variant = "full", draftSeed = null, onSaved }: CustomerCrmPanelProps) {
  const assistantMode = variant === "assistant";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm, ...(draftSeed?.values ?? {}) });
  const [editingId, setEditingId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [feedback, setFeedback] = useState(draftSeed?.assistantNote ?? "");

  const effectiveKeyword = assistantMode ? form.name.trim() || form.nickname.trim() : keyword.trim();
  const shouldSearch = !assistantMode || Boolean(effectiveKeyword);

  const query = useQuery({
    queryKey: ["customers-crm", effectiveKeyword],
    queryFn: () => fetchJson<CustomerRecord[]>(`/api/customers?search=${encodeURIComponent(effectiveKeyword)}`),
    enabled: shouldSearch,
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
        }),
      }),
    onSuccess: () => {
      const message = editingId ? "已为你更新客户档案" : "已为你保存客户档案";
      setFeedback(assistantMode ? `${message}，正在返回助手…` : editingId ? "客户信息已更新" : "客户档案已创建");
      setForm({ ...emptyCustomerProfileForm });
      setEditingId("");
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      onSaved?.(message);
    },
    onError: (error) => setFeedback(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson<{ id: string }>(`/api/customers?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFeedback("客户档案已删除");
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
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
        created_at: "",
        updated_at: "",
      })),
    [],
  );

  const items = query.isError ? fallbackCustomers : query.data ?? [];
  const similarCustomers = assistantMode && effectiveKeyword ? items.slice(0, 3) : [];
  const showAssistantMatches = assistantMode && (Boolean(effectiveKeyword) || query.isLoading || query.isError);
  const listItems = assistantMode ? similarCustomers : items;

  function patchForm(patch: Partial<CustomerProfileFormValue>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function startEdit(customer: CustomerRecord) {
    setEditingId(customer.id);
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
    });
  }

  function resetForm() {
    setEditingId("");
    setForm({ ...emptyCustomerProfileForm });
    setFeedback(assistantMode ? draftSeed?.assistantNote ?? "" : "");
  }

  const contentClass = assistantMode
    ? showAssistantMatches
      ? "grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]"
      : "space-y-6"
    : "grid gap-6 xl:grid-cols-[0.98fr_1.02fr]";

  return (
    <Card className="glass-panel border-white/60 bg-white/92 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
      <CardHeader className="pb-4">
        <div className={`flex flex-col gap-4 ${assistantMode ? "" : "xl:flex-row xl:items-end xl:justify-between"}`}>
          <div>
            <CardTitle className="text-2xl text-slate-900">{assistantMode ? (editingId ? "修改客户" : "新增客户") : "客户资料"}</CardTitle>
            <p className="mt-2 text-sm text-slate-500">
              {assistantMode ? "先保存基础信息，后续还可以继续补充。" : "按姓名、昵称、职业、来源或关注点查找客户。"}
            </p>

          </div>
          {!assistantMode && (
            <Input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="按姓名、昵称、职业、客户来源或核心关注点检索"
              className="h-11 max-w-md rounded-2xl border-slate-200/80 bg-white"
            />
          )}
        </div>
      </CardHeader>

      <CardContent className={contentClass}>
        <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/90 p-5">
          <p className="text-lg font-semibold text-slate-900">{editingId ? "编辑客户" : assistantMode ? "客户信息" : "新增客户"}</p>
          <div className="mt-4">
            <CustomerProfileFields
              value={form}
              onChange={patchForm}
              disabled={saveMutation.isPending}
              variant={assistantMode ? "compact" : "full"}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} className="cursor-pointer rounded-full bg-[#123B5D] text-white hover:bg-[#0E2E49]">
              {saveMutation.isPending ? "正在保存" : editingId ? "保存修改" : assistantMode ? "保存并返回" : "创建客户"}
            </Button>
            <Button variant="outline" onClick={resetForm} className="cursor-pointer rounded-full border-slate-300 bg-transparent">
              {assistantMode ? "清空" : "重置表单"}
            </Button>
          </div>
          {feedback && <p className="mt-4 text-sm leading-6 text-slate-600">{feedback}</p>}
        </div>

        {(assistantMode ? showAssistantMatches : true) && (
          <div className="space-y-4">
            {assistantMode && (
              <div className="rounded-[24px] border border-[#B8894A]/18 bg-[#FFF8EE] p-4 text-sm leading-6 text-slate-700">
                <p className="font-medium text-slate-900">相似客户</p>
                <p className="mt-2">保存前先核对，避免重复建档。</p>
              </div>
            )}

            {query.isLoading && shouldSearch && (
              <div className="rounded-[24px] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">正在查找客户…</div>
            )}

            {query.isError && assistantMode && shouldSearch && (
              <div className="rounded-[24px] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">暂时无法核对相似客户，你可以先保存当前档案。</div>
            )}

            {!query.isLoading && !query.isError && listItems.length === 0 && shouldSearch && (
              <div className="rounded-[24px] bg-slate-50/90 px-4 py-6 text-sm text-slate-500">
                {assistantMode ? "没有发现相似客户，可以直接保存。" : "还没有匹配到客户。"}
              </div>
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
                  {!assistantMode && (
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => startEdit(customer)} className="cursor-pointer rounded-full border-slate-300 bg-transparent">编辑</Button>
                      <Button variant="outline" onClick={() => globalThis.confirm("确认删除这位客户档案吗？") && deleteMutation.mutate(customer.id)} className="cursor-pointer rounded-full border-rose-200 bg-transparent text-rose-600 hover:bg-rose-50 hover:text-rose-700">删除</Button>
                    </div>
                  )}
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50/90 p-3">核心关注点：{customer.core_interesting || "待补充"}</div>
                  <div className="rounded-2xl bg-slate-50/90 p-3">资金情况：{customer.recent_money || "待补充"}</div>
                  {!assistantMode && (
                    <>
                      <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">财富情况：{customer.wealth_profile || "待补充"}</div>
                      <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">家庭情况：{customer.family_profile || "待补充"}</div>
                      <div className="rounded-2xl bg-slate-50/90 p-3 md:col-span-2">沟通偏好：{customer.prefer_communicate || "待补充"}</div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
