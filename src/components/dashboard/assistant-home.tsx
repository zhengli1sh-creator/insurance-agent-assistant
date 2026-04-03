"use client";

import { ClipboardList, Plus, type LucideIcon, CheckSquare, Users } from "lucide-react";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type ActionCard = {
  kicker: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  featured?: boolean;
};

const primaryActions: ActionCard[] = [
  {
    kicker: "客户建档",
    label: "新增客户档案",
    description: "先保存最小必填信息，后续再继续补充，避免拜访和任务挂空。",
    href: "/customers/new",
    icon: Plus,
  },
  {
    kicker: "高频起步",
    label: "记录拜访",
    description: "直接进入新的拜访录入页；识别到后续事项后，会继续带你确认任务。",
    href: "/visits/new",
    icon: ClipboardList,
    featured: true,
  },
  {
    kicker: "手工补充",
    label: "新增任务",
    description: "直接打开任务确认页，适合手工补一条今天要推进的事项。",
    href: "/tasks/new",
    icon: CheckSquare,
  },
  {
    kicker: "今日节奏",
    label: "查看任务工作台",
    description: "进入完整任务总览，处理今日重点、逾期事项和统一经营线索。",
    href: "/tasks",
    icon: Users,
  },
];

const secondaryActions = [
  {
    label: "客户中心",
    description: "查看已有客户与详情页。",
    href: "/customers",
  },
  {
    label: "记录中心",
    description: "进入完整拜访记录视图。",
    href: "/records?tab=visits&source=assistant-home",
  },
  {
    label: "随便聊聊",
    description: "先把目标交给助手，再进入对应工作区。",
    href: "/chat",
  },
];

export function AssistantHome({ returnMessage = "" }: { returnMessage?: string }) {
  return (
    <div className="space-y-6">
      <Card className="glass-panel advisor-hero-card rounded-[32px]">
        <CardContent className="space-y-5 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="advisor-accent-chip rounded-full px-3 py-1">首页工作台</Badge>
            <span className="advisor-section-label">高频入口已统一</span>
          </div>

          <div className="space-y-3">
            <p className="advisor-kicker">Daily start</p>
            <h1 className="max-w-3xl text-[1.95rem] font-semibold leading-tight text-slate-900 sm:text-[2.3rem]">
              先从眼前这一步开始，首页只保留最常用的起步入口。
            </h1>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              记录拜访会进入新的单列录入流程；如果识别到后续事项，会继续带你到任务确认页。若你只是想手工补任务，也可以直接从这里进入同一套确认流程。
            </p>
          </div>
        </CardContent>
      </Card>

      {returnMessage ? (
        <Card className="advisor-notice-card advisor-notice-card-success rounded-[28px]">
          <CardContent className="p-5 text-sm leading-7 text-slate-700">{returnMessage}</CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {primaryActions.map((action) => {
          const Icon = action.icon;

          return (
            <Link
              key={action.label}
              href={action.href}
              className={action.featured
                ? "group rounded-[28px] bg-[#123B5D] p-5 text-white shadow-[0_20px_60px_rgba(18,59,93,0.18)] transition hover:-translate-y-0.5 hover:bg-[#0E2E49]"
                : "group rounded-[28px] border border-white/80 bg-white/92 p-5 text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#123B5D]/20 hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)]"
              }
            >
              <div className={action.featured ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-white/16" : "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#123B5D]/10 text-[#123B5D]"}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="mt-5 space-y-2">
                <p className={action.featured ? "text-xs uppercase tracking-[0.18em] text-white/72" : "advisor-section-label"}>{action.kicker}</p>
                <p className="text-lg font-semibold leading-7">{action.label}</p>
                <p className={action.featured ? "text-sm leading-6 text-white/78" : "text-sm leading-6 text-slate-600"}>{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Card className="advisor-soft-card rounded-[30px]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="advisor-kicker">Complete views</p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">需要看全量信息时，再进入对应工作台</h2>
            </div>
            <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">结构化兜底</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {secondaryActions.map((action) => (
              <Link
                key={action.label}
                href={action.href}
                className="rounded-[24px] border border-white/80 bg-white/80 p-4 transition hover:border-[#123B5D]/20 hover:bg-white"
              >
                <p className="text-base font-semibold text-slate-900">{action.label}</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{action.description}</p>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
