"use client";

import { MessageCircle, Plus, Users, ClipboardList, CheckSquare } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type QuickAction = {
  label: string;
  href: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
};

const quickActions: QuickAction[] = [
  {
    label: "添加客户",
    href: "/customers/new",
    icon: Plus,
    color: "text-white",
    bgColor: "bg-[#123B5D]",
  },
  {
    label: "添加拜访记录",
    href: "/visits/new",
    icon: ClipboardList,
    color: "text-[#123B5D]",
    bgColor: "bg-white",
  },
  {
    label: "任务管理",
    href: "/tasks",
    icon: CheckSquare,
    color: "text-[#123B5D]",
    bgColor: "bg-white",
  },
  {
    label: "随便聊聊",
    href: "/chat",
    icon: MessageCircle,
    color: "text-[#123B5D]",
    bgColor: "bg-white",
  },
];

export function AssistantHome() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-12">
      {/* 主标题区 */}
      <div className="mb-10 text-center">
        <h1 className="text-2xl font-semibold text-[#123B5D]">今天想做什么？</h1>
        <p className="mt-2 text-sm text-slate-500">选择下方功能，快速开始工作</p>
      </div>

      {/* 四个功能按钮 - 2x2 网格布局 */}
      <div className="grid w-full max-w-md grid-cols-2 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.bgColor === "bg-[#123B5D]";

          return (
            <Link
              key={action.label}
              href={action.href}
              className={`
                group flex flex-col items-center justify-center gap-3 
                rounded-2xl border p-6 shadow-sm transition-all
                ${isPrimary 
                  ? "border-transparent bg-[#123B5D] text-white hover:bg-[#0E2E49] hover:shadow-lg" 
                  : "border-slate-200/80 bg-white text-[#123B5D] hover:border-[#123B5D]/30 hover:shadow-md"
                }
              `}
            >
              <div
                className={`
                  flex h-12 w-12 items-center justify-center rounded-xl transition
                  ${isPrimary 
                    ? "bg-white/20" 
                    : "bg-[#123B5D]/10 group-hover:bg-[#123B5D]/15"
                  }
                `}
              >
                <Icon className={`h-6 w-6 ${action.color}`} />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
