"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useDeferredValue } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronLeft, Search, Sparkles, UserRoundPlus, X } from "lucide-react";

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
import {
  customerHeroCardClassName,
  customerHeroTitleClassName,
  customerListCardClassName,
  customerMetaPanelClassName,
  customerOutlineActionClassName,
  customerPrimaryActionClassName,
  customerStateCardClassName,
} from "@/components/customers/customer-style";


function ReminderMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="advisor-meta-tile rounded-[26px] border border-white/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="advisor-section-label max-w-[10rem]">{label}</p>
        <p className="font-accent text-[2rem] leading-none text-slate-900">{value}</p>

      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

function CenterStateCard({ title, description }: { title: string; description?: string }) {
  return (
    <Card className={customerStateCardClassName}>
      <CardContent className="p-5 sm:p-6">

        <p className="text-base font-medium text-slate-900">{title}</p>
        {description ? <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p> : null}
      </CardContent>
    </Card>
  );
}


export function CustomerCenterShell() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");
  const deferredKeyword = useDeferredValue(keyword);

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
  const filteredCustomers = useMemo(() => filterCustomers(customers, deferredKeyword), [customers, deferredKeyword]);
  const reminders = useMemo(() => getCustomerReminderStats(customers), [customers]);
  
  const isSearching = keyword.trim().length > 0;

  return (
    <div className="mx-auto h-full max-w-4xl space-y-5 overflow-y-auto overscroll-contain">
      {/* 顶部返回栏 - 桌面端和手机端都显示 */}
      <div className="flex items-center gap-3 px-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/dashboard")}
          className="advisor-outline-button h-9 w-9 shrink-0 rounded-full hover:bg-white"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span className="text-sm font-medium text-slate-600">返回首页</span>
      </div>

      <Card className={customerHeroCardClassName}>

        <CardContent className="p-5 sm:p-7">
          <div className="flex flex-col gap-6">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-accent-chip w-fit rounded-full px-3 py-1">客户中心</Badge>
                {isDemoMode ? <Badge className="advisor-chip-neutral rounded-full border-0 px-3 py-1">示例预览</Badge> : null}
              </div>

              <div className="space-y-3">
                <p className="advisor-kicker">Customer dossier</p>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-[0.95rem]">
                  列表页只负责找到客户、查看资料提醒并进入详情。后续的拜访、活动和提醒任务，会逐步沉淀到客户详情页中。
                </p>
              </div>
            </div>

            <div className="advisor-input-dock rounded-[28px] p-3">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">搜索客户</p>
                  <Link href="/customers/new?from=customers">
                    <Button variant="ghost" size="sm" className="h-8 gap-1.5 rounded-full text-slate-600 hover:bg-white/70 hover:text-slate-900">
                      <UserRoundPlus className="h-4 w-4" />
                      <span className="text-sm">添加客户档案</span>
                    </Button>
                  </Link>
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                  }}
                  className="relative w-full sm:max-w-md"
                >
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    placeholder="按姓名或昵称检索"
                    className="advisor-form-control h-12 rounded-full pl-11 pr-10 focus-visible:ring-0"
                  />
                  {isSearching && (
                    <button
                      type="button"
                      onClick={() => setKeyword("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </form>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="advisor-soft-card rounded-[30px]">
        <CardContent className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
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
        {customersQuery.isLoading ? <CenterStateCard title="正在整理客户资料…" /> : null}

        {isSearching && !customersQuery.isLoading && filteredCustomers.length > 0 ? (
          <div className="px-1 text-sm text-slate-500">
            找到 {filteredCustomers.length} 位匹配的客户
          </div>
        ) : null}

        {!customersQuery.isLoading && filteredCustomers.length === 0 ? (
          <CenterStateCard 
            title={isSearching ? "未找到匹配的客户" : "当前暂无客户档案"} 
            description={isSearching ? `没有找到与 "${keyword}" 匹配的客户，可以尝试其他关键词或添加新客户。` : "可以点击下方按钮新增客户档案，开始建立客户基础信息。"} 
          />
        ) : null}


        {filteredCustomers.map((customer) => {
          const status = getCustomerProfileStatus(customer);

          return (
            <Card key={customer.id} className={customerListCardClassName}>


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
                    <Button variant="outline" className={`${customerOutlineActionClassName} h-11 w-full sm:w-auto`}>

                      查看详情
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>

                <div className="advisor-hairline" />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={customerMetaPanelClassName}>
                    <p className="advisor-section-label">核心关注点</p>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{displayCustomerValue(customer.core_interesting)}</p>
                  </div>
                  <div className={customerMetaPanelClassName}>
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
