"use client";

import { CheckSquare, ClipboardList, ListTodo, MessageCircle, type LucideIcon, UserRoundPlus, Users } from "lucide-react";

import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";

type ActionCard = {
  label: string;
  href: string;
  icon: LucideIcon;
  iconClassName: string;
};

const quickActions: ActionCard[] = [
  {
    label: "添加客户档案",
    href: "/customers/new",
    icon: UserRoundPlus,
    iconClassName: "bg-[#123B5D]/10 text-[#123B5D]",
  },
  {
    label: "客户中心",
    href: "/customers",
    icon: Users,
    iconClassName: "bg-[#184A3B]/10 text-[#184A3B]",
  },
  {
    label: "添加拜访记录",
    href: "/visits/new",
    icon: ClipboardList,
    iconClassName: "bg-[#7C5A16]/12 text-[#7C5A16]",
  },
  {
    label: "添加任务",
    href: "/tasks/new",
    icon: CheckSquare,
    iconClassName: "bg-[#5B4A9A]/10 text-[#5B4A9A]",
  },
  {
    label: "任务管理",
    href: "/tasks",
    icon: ListTodo,
    iconClassName: "bg-[#0F4C5C]/10 text-[#0F4C5C]",
  },
  {
    label: "随便聊聊",
    href: "/chat",
    icon: MessageCircle,
    iconClassName: "bg-[#8B4C5A]/10 text-[#8B4C5A]",
  },
];

export function AssistantHome({ returnMessage = "" }: { returnMessage?: string }) {
  return (
    <div className="space-y-4">
      {returnMessage ? (
        <Card className="advisor-notice-card advisor-notice-card-success rounded-[28px]">
          <CardContent className="p-5 text-sm leading-7 text-slate-700">{returnMessage}</CardContent>
        </Card>
      ) : null}

      <Card className="glass-panel advisor-glass-surface-strong rounded-[32px]">
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group flex min-h-[118px] flex-col items-center justify-center rounded-[28px] border border-white/80 bg-white/92 px-3 py-4 text-center text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-[#123B5D]/20 hover:bg-white hover:shadow-[0_24px_70px_rgba(15,23,42,0.12)] sm:min-h-[140px] sm:px-4 sm:py-5"
                >
                  <div className={`flex h-12 w-12 items-center justify-center rounded-[18px] ${action.iconClassName} sm:h-14 sm:w-14`}>
                    <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <p className="mt-3 text-[13px] font-semibold leading-5 text-slate-900 sm:mt-4 sm:text-[15px] sm:leading-6">{action.label}</p>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

