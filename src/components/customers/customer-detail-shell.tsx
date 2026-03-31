"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BellRing, ClipboardList, PencilLine, Sparkles, Users } from "lucide-react";

import {
  CustomerProfileFields,
  emptyCustomerProfileForm,
  type CustomerProfileFormValue,
} from "@/components/customers/customer-profile-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchJson } from "@/lib/crm-api";
import type { CustomerRecord } from "@/types/customer";

import {
  createFallbackCustomerRecords,
  getCustomerBriefing,
  getCustomerProfileSections,
  getCustomerProfileStatus,
  mapCustomerRecordToFormValue,
} from "@/components/customers/customer-center-helpers";

const futureModules = [
  {
    title: "拜访记录",
    description: "后续将在这里沉淀这位客户的每次拜访内容、关键判断与后续动作。",
    icon: ClipboardList,
  },
  {
    title: "活动参与",
    description: "后续将在这里查看这位客户参与过的活动及活动后的经营线索。",
    icon: Users,
  },
  {
    title: "提醒任务",
    description: "后续将在这里承接与这位客户相关的提醒、跟进任务与处理状态。",
    icon: BellRing,
  },
] as const;

function BriefingColumn({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "known" | "missing" | "next";
}) {
  const toneClassName = {
    known: "advisor-briefing-panel advisor-briefing-panel-known",
    missing: "advisor-briefing-panel advisor-briefing-panel-missing",
    next: "advisor-briefing-panel advisor-briefing-panel-next",
  }[tone];

  return (
    <div className={`rounded-[26px] p-4 ${toneClassName}`}>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-[0.58rem] h-1.5 w-1.5 rounded-full bg-[var(--advisor-gold)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProfileSectionCard({ title, fields }: { title: string; fields: Array<{ label: string; value: string }> }) {
  return (
    <Card className="advisor-soft-card rounded-[30px]">
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="space-y-2">
          <p className="advisor-kicker">Profile section</p>
          <p className="text-lg font-semibold text-slate-900">{title}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {fields.map((field) => (
            <div
              key={`${title}-${field.label}`}
              className="advisor-field-card rounded-[24px] p-4 text-sm leading-6 text-slate-600 sm:[&:last-child:nth-child(odd)]:col-span-2"
            >
              <p className="advisor-section-label">{field.label}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">{field.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FutureModuleCard({ title, description, icon: Icon }: { title: string; description: string; icon: typeof ClipboardList }) {
  return (
    <Card className="advisor-subtle-card advisor-module-placeholder-card rounded-[28px]">
      <CardContent className="flex items-start gap-4 p-5 sm:p-6">
        <div className="advisor-icon-badge advisor-icon-badge-md">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-base font-medium text-slate-900">{title}</p>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}


export function CustomerDetailShell({ customerId }: { customerId: string }) {
  const queryClient = useQueryClient();
  const profileSectionRef = useRef<HTMLDivElement | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm });
  const [feedback, setFeedback] = useState("");

  const fallbackCustomers = useMemo(() => createFallbackCustomerRecords(), []);

  const customerQuery = useQuery({
    queryKey: ["customer-detail", customerId],
    queryFn: () => fetchJson<CustomerRecord>(`/api/customers?id=${encodeURIComponent(customerId)}`),
    enabled: Boolean(customerId),
    retry: false,
  });

  const fallbackCustomer = useMemo(
    () => fallbackCustomers.find((customer) => customer.id === customerId) ?? null,
    [customerId, fallbackCustomers],
  );

  const customer = customerQuery.data ?? (customerQuery.isError ? fallbackCustomer : null);
  const isDemoMode = Boolean(!customerQuery.data && fallbackCustomer);

  useEffect(() => {
    if (!customer) {
      return;
    }

    setForm(mapCustomerRecordToFormValue(customer));
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: (payload: CustomerProfileFormValue) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: customerId,
          ...payload,
        }),
      }),
    onSuccess: (updatedCustomer) => {
      setFeedback("");
      queryClient.setQueryData(["customer-detail", customerId], updatedCustomer);
      queryClient.invalidateQueries({ queryKey: ["customer-detail", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers-center-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      setEditOpen(false);
    },
    onError: (error) => {
      setFeedback(error.message);
    },
  });

  const status = useMemo(() => (customer ? getCustomerProfileStatus(customer) : null), [customer]);
  const briefing = useMemo(() => (customer ? getCustomerBriefing(customer) : null), [customer]);
  const sections = useMemo(() => (customer ? getCustomerProfileSections(customer) : []), [customer]);

  function openEditDialog() {
    if (!customer || isDemoMode) {
      return;
    }

    setFeedback("");
    setForm(mapCustomerRecordToFormValue(customer));
    setEditOpen(true);
  }

  function scrollToProfileSection() {
    profileSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (customerQuery.isLoading && !customer) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Card className="advisor-subtle-card rounded-[28px]">
          <CardContent className="p-6 text-sm text-slate-500">正在整理客户详情…</CardContent>
        </Card>
      </div>
    );
  }

  if (!customer || !status || !briefing) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          返回客户列表
        </Link>
        <Card className="advisor-subtle-card rounded-[28px]">
          <CardContent className="space-y-3 p-6">
            <p className="text-lg font-semibold text-slate-900">当前未找到这位客户</p>
            <p className="text-sm leading-6 text-slate-500">可能是客户尚未保存，或当前账号下没有该客户档案。</p>
            <Link href="/customers">
              <Button className="advisor-primary-button cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:brightness-[1.03]">
                返回客户列表
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-4xl space-y-5">
        <Link href="/customers" className="inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          返回客户列表
        </Link>

        <Card className="glass-panel advisor-hero-card rounded-[32px]">
          <CardContent className="space-y-6 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="advisor-accent-chip rounded-full px-3 py-1">客户档案</Badge>
                  <span className="advisor-section-label">经营简报入口</span>
                  {isDemoMode ? <Badge className="rounded-full border-0 bg-slate-100 text-slate-600">示例预览</Badge> : null}
                </div>

                <div className="space-y-3">
                  <p className="advisor-kicker">Client briefing</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[1.95rem] font-semibold leading-tight text-slate-900 sm:text-[2.3rem]">{customer.name}</h1>
                    {customer.nickname ? <Badge className="advisor-accent-chip rounded-full border-0">{customer.nickname}</Badge> : null}
                    <Badge className={`rounded-full ${status.badgeClassName}`}>{status.label}</Badge>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-sm leading-6 text-slate-600">
                  <span className="advisor-field-card rounded-full px-3 py-1.5">{customer.profession ?? "待补充职业 / 身份"}</span>
                  <span className="advisor-field-card rounded-full px-3 py-1.5">{customer.source ?? "待补充客户来源"}</span>
                </div>

                <div className="advisor-subtle-card rounded-[24px] px-4 py-3 text-sm leading-6 text-slate-600">
                  {status.hint}
                </div>
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:min-w-[13rem]">
                <Button
                  type="button"
                  onClick={openEditDialog}
                  disabled={isDemoMode}
                  className="advisor-primary-button h-11 cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:-translate-y-0.5 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                >
                  <PencilLine className="mr-2 h-4 w-4" />
                  编辑客户资料
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={scrollToProfileSection}
                  className="advisor-outline-button h-11 cursor-pointer rounded-full"
                >
                  查看完整资料
                </Button>
              </div>
            </div>

            {isDemoMode ? (
              <div className="advisor-preview-notice rounded-[24px] p-4 text-sm leading-6 text-slate-500">
                当前为示例预览。登录后可查看真实客户详情并编辑基础资料。
              </div>
            ) : null}

          </CardContent>
        </Card>

        <Card className="advisor-soft-card rounded-[30px]">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="advisor-icon-badge advisor-icon-badge-sm mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>

              <div className="space-y-2">
                <p className="advisor-kicker">Customer briefing</p>
                <p className="text-lg font-semibold text-slate-900">经营简报</p>
                <p className="text-sm leading-6 text-slate-600">
                  当前阶段先根据真实存在的客户基础信息生成经营摘要，并预留后续拜访、活动与提醒的承接位置。
                </p>
              </div>
            </div>

            <div className="advisor-hairline" />

            <div className="grid gap-3 lg:grid-cols-3">
              <BriefingColumn title="当前已掌握" items={briefing.known} tone="known" />
              <BriefingColumn title="当前仍缺" items={briefing.missing} tone="missing" />
              <BriefingColumn title="建议下一步" items={briefing.nextSteps} tone="next" />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                onClick={openEditDialog}
                disabled={isDemoMode}
                className="advisor-primary-button h-11 cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:brightness-[1.03] disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
              >
                去补充关键信息
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={scrollToProfileSection}
                className="advisor-outline-button h-11 cursor-pointer rounded-full"
              >
                查看完整资料
              </Button>
            </div>
          </CardContent>
        </Card>

        <div ref={profileSectionRef} className="space-y-4">
          {sections.map((section) => (
            <ProfileSectionCard key={section.title} title={section.title} fields={section.fields} />
          ))}
        </div>

        <div className="space-y-4">
          {futureModules.map((module) => (
            <FutureModuleCard key={module.title} title={module.title} description={module.description} icon={module.icon} />
          ))}
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open);
          if (!open) {
            setFeedback("");
          }
        }}
      >
        <DialogContent className="advisor-dialog-surface max-w-[min(48rem,calc(100%-1.5rem))] overflow-hidden rounded-[32px] p-0 sm:max-w-3xl">

          <div className="p-5 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-slate-900">编辑客户资料</DialogTitle>
              <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                当前阶段先维护真实存在的客户基础信息。保存后，经营简报和资料状态会同步更新。
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5">
              <CustomerProfileFields
                value={form}
                onChange={(patch) => {
                  setFeedback("");
                  setForm((current) => ({ ...current, ...patch }));
                }}
                disabled={saveMutation.isPending}
                variant="full"
              />
            </div>

            {feedback ? <p className="mt-4 text-sm leading-6 text-rose-600">{feedback}</p> : null}
          </div>

          <DialogFooter className="advisor-dialog-footer-surface gap-3 border-t border-slate-200/70 sm:justify-between">

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setForm(mapCustomerRecordToFormValue(customer));
                setEditOpen(false);
                setFeedback("");
              }}
              disabled={saveMutation.isPending}
              className="advisor-outline-button cursor-pointer rounded-full"
            >
              取消
            </Button>
            <Button
              type="button"
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
              className="advisor-primary-button cursor-pointer rounded-full px-5 text-white transition-all duration-200 hover:brightness-[1.03] disabled:shadow-none"
            >
              {saveMutation.isPending ? "正在保存" : "保存修改"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
