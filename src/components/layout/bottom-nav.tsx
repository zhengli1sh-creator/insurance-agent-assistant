"use client";

import { LayoutDashboard, ListChecks, NotebookPen, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard", label: "助手", icon: LayoutDashboard },
  { href: "/customers", label: "客户", icon: Users },
  { href: "/records", label: "记录", icon: NotebookPen },
  { href: "/tasks", label: "任务", icon: ListChecks },
];


export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/35 bg-white/85 px-4 py-3 backdrop-blur-2xl lg:hidden">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-[72px] flex-1 cursor-pointer flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs transition ${
                active
                  ? "bg-gradient-to-br from-[#1E3A8A] to-[#285DA8] text-white shadow-lg"
                  : "text-slate-500 hover:bg-slate-100/80 hover:text-slate-900"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
