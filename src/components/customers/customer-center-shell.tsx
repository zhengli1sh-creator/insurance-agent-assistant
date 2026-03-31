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
    <div className="advisor-subtle-card rounded-[26px] p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="advisor-section-label max-w-[10rem]">{label}</p>
        <p className="font-accent text-[2rem] leading-none text-[var(--advisor-ink)]">{value}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
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
      <Card className="glass-panel advisor-hero-card rounded-[32px]">
        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-accent-chip w-fit rounded-full px-3 py-1">客户中心</Badge>
                <span className="advisor-section-label">单列经营入口</span>
                {isDemoMode ? <Badge className="rounded-full border-0 bg-slate-100 text-slate-600">示例预览</Badge> : null}
              </div>

              <div className="space-y-3">
                <p className="advisor-kicker">Customer dossier</p>
                <h1 className="max-w-3xl text-[1.95rem] font-semibold leading-tight text-slate-900 sm:text-[2.3rem]">
                  按客户查看基础资料，并逐步沉淀后续经营记录。
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[0.95rem]">
                  列表页只负责找到客户、查看资料提醒并进入详情。后续的拜访、活动和提醒任务，会逐步沉淀到客户详情页中。
                </p>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/70 bg-white/72 p-3 shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-md">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="按姓名、昵称、职业、来源或核心关注点检索"
                    className="h-12 rounded-full border-white/90 bg-white/92 pl-11 pr-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.72),0_8px_20px_rgba(15,23,42,0.04)]"
                  />
                </div>

                <Link href="/customers/new" className="w-full sm:w-auto">
                  <Button className="advisor-primary-button h-12 w-full cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] sm:w-auto">
                    <Plus className="mr-2 h-4 w-4" />
                    新增客户
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="advisor-soft-card rounded-[30px]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-[var(--advisor-gold-soft)] p-2 text-[var(--advisor-gold)]">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <p className="advisor-kicker">Profile reminder</p>
              <p className="text-lg font-semibold text-slate-900">资料提醒</p>
              <p className="text-sm leading-6 text-slate-600">
                当前阶段先以客户基础资料完整度作为轻量提醒，帮助你优先补齐后续经营所需的关键字段。
              </p>
            </div>
          </div>

          <div className="advisor-hairline" />

          <div className="grid gap-3 sm:grid-cols-3">
            <ReminderMetric label="缺少沟通偏好" value={reminders.missingCommunicationCount} hint="建议优先补齐，便于后续联系更自然。" />
            <ReminderMetric label="缺少核心关注点" value={reminders.missingFocusCount} hint="补齐后，客户详情页里的经营简报会更聚焦。" />
            <ReminderMetric label="资料仍较薄" value={reminders.thinProfileCount} hint="这些客户目前只有基础建档，适合后续继续完善。" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {customersQuery.isLoading ? (
          <Card className="advisor-subtle-card rounded-[28px]">
            <CardContent className="p-5 text-sm text-slate-500">正在整理客户资料…</CardContent>
          </Card>
        ) : null}

        {!customersQuery.isLoading && filteredCustomers.length === 0 ? (
          <Card className="advisor-subtle-card rounded-[28px]">
            <CardContent className="p-5 sm:p-6">
              <p className="text-base font-medium text-slate-900">当前没有匹配到客户</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">可以换一个关键词继续查找，或先新增客户档案。</p>
            </CardContent>
          </Card>
        ) : null}

        {filteredCustomers.map((customer) => {
          const status = getCustomerProfileStatus(customer);

          return (
            <Card
              key={customer.id}
              className="glass-panel advisor-soft-card rounded-[30px] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_56px_rgba(15,23,42,0.09)]"
            >
              <CardContent className="space-y-5 p-5 sm:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[1.35rem] font-semibold text-slate-900">{customer.name}</h2>
                      {customer.nickname ? <Badge className="advisor-accent-chip rounded-full border-0">{customer.nickname}</Badge> : null}
                      <Badge className={`rounded-full ${status.badgeClassName}`}>{status.label}</Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm leading-6 text-slate-600">
                      <span>{displayCustomerValue(customer.profession)} · {displayCustomerValue(customer.source)}</span>
                      <span className="hidden h-1 w-1 rounded-full bg-slate-300 sm:block" />
                      <span className="text-slate-500">{status.hint}</span>
                    </div>
                  </div>

                  <Link href={`/customers/${customer.id}`} className="w-full sm:w-auto">
                    <Button variant="outline" className="advisor-outline-button h-11 w-full cursor-pointer rounded-full sm:w-auto">
                      查看详情
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="advisor-hairline" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="advisor-field-card rounded-[24px] p-4">
                    <p className="advisor-section-label">核心关注点</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{displayCustomerValue(customer.core_interesting)}</p>
                  </div>
                  <div className="advisor-field-card rounded-[24px] p-4">
                    <p className="advisor-section-label">沟通偏好</p>
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
