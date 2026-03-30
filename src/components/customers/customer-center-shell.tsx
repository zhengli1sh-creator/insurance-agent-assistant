"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { fetchJson } from "@/lib/crm-api";
import type { CustomerRecord } from "@/types/customer";

import {
  createFallbackCustomerRecords,
  displayCustomerValue,
  filterCustomers,
  getCustomerProfileStatus,
  getCustomerReminderStats,
} from "@/components/customers/customer-center-helpers";

function ReminderMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-[24px] border border-white/70 bg-white/88 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{hint}</p>
    </div>
  );
}

export function CustomerCenterShell() {
  const [keyword, setKeyword] = useState("");

  const customersQuery = useQuery({
    queryKey: ["customers-center-list"],
    queryFn: async () => {
      const data = await fetchJson<CustomerRecord[]>("/api/customers");
      return data;
    },
  });

  const isDemoMode = customersQuery.isError;
  const customers = useMemo(
    () => (isDemoMode ? createFallbackCustomerRecords() : customersQuery.data ?? []),
    [customersQuery.data, isDemoMode],
  );
  const filteredCustomers = useMemo(() => filterCustomers(customers, keyword), [customers, keyword]);
  const reminders = useMemo(() => getCustomerReminderStats(customers), [customers]);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Card className="glass-panel border-white/55 bg-white/86 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-5">
            <div className="space-y-4">
              <Badge className="w-fit rounded-full border-0 bg-[#B8894A]/12 px-3 py-1 text-[#B8894A]">客户中心</Badge>
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[1.85rem] font-semibold leading-tight text-slate-900 sm:text-[2.05rem]">按客户查看基础资料，并逐步沉淀后续经营记录。</h1>
                  {isDemoMode ? <Badge className="rounded-full border-0 bg-slate-100 text-slate-600">示例预览</Badge> : null}
                </div>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  列表页只负责找到客户、查看资料提醒并进入详情。后续的拜访、活动和提醒任务，会逐步沉淀到客户详情页中。
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="按姓名、昵称、职业、来源或核心关注点检索"
                  className="h-12 rounded-[22px] border-slate-200/80 bg-white pl-11 shadow-[0_6px_20px_rgba(15,23,42,0.04)]"
                />
              </div>

              <Link href="/customers/new" className="w-full sm:w-auto">
                <Button className="h-12 w-full rounded-full bg-[#123B5D] px-5 text-white hover:bg-[#0E2E49] sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  新增客户
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/55 bg-[linear-gradient(180deg,rgba(250,248,244,0.95)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-[#B8894A]/12 p-2 text-[#B8894A]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">资料提醒</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">当前阶段先以客户基础资料完整度作为轻量提醒，帮助你优先补齐后续经营所需的关键字段。</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <ReminderMetric label="缺少沟通偏好" value={reminders.missingCommunicationCount} hint="建议优先补齐，便于后续联系更自然。" />
            <ReminderMetric label="缺少核心关注点" value={reminders.missingFocusCount} hint="补齐后，客户详情页里的经营简报会更聚焦。" />
            <ReminderMetric label="资料仍较薄" value={reminders.thinProfileCount} hint="这些客户目前只有基础建档，适合后续继续完善。" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {customersQuery.isLoading ? (
          <Card className="border-white/60 bg-white/88 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5 text-sm text-slate-500">正在整理客户资料…</CardContent>
          </Card>
        ) : null}

        {!customersQuery.isLoading && filteredCustomers.length === 0 ? (
          <Card className="border-white/60 bg-white/88 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-5 sm:p-6">
              <p className="text-base font-medium text-slate-900">当前没有匹配到客户</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">可以换一个关键词继续查找，或先新增客户档案。</p>
            </CardContent>
          </Card>
        ) : null}

        {filteredCustomers.map((customer) => {
          const status = getCustomerProfileStatus(customer);

          return (
            <Card key={customer.id} className="border-white/60 bg-white/90 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-slate-900">{customer.name}</h2>
                      {customer.nickname ? <Badge className="rounded-full border-0 bg-[#FFF8EE] text-[#B8894A]">{customer.nickname}</Badge> : null}
                      <Badge className={`rounded-full ${status.badgeClassName}`}>{status.label}</Badge>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {displayCustomerValue(customer.profession)} · {displayCustomerValue(customer.source)}
                    </p>
                    <p className="text-sm leading-6 text-slate-500">{status.hint}</p>
                  </div>

                  <Link href={`/customers/${customer.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" className="h-11 w-full rounded-full border-slate-300 bg-transparent sm:w-auto">
                      查看详情
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">核心关注点</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{displayCustomerValue(customer.core_interesting)}</p>
                  </div>
                  <div className="rounded-[24px] bg-slate-50/90 p-4">
                    <p className="text-xs font-semibold tracking-[0.18em] text-slate-400 uppercase">沟通偏好</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{displayCustomerValue(customer.prefer_communicate)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
