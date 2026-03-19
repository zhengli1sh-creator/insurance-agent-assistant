import { BellRing, Compass, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-20 w-full max-w-[1600px] items-center justify-between px-4 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E3A8A] via-[#285DA8] to-[#B8894A] text-white shadow-[0_18px_45px_rgba(30,58,138,0.28)]">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs tracking-[0.28em] text-slate-500">客户经营助手</p>
              <h1 className="text-lg font-semibold text-slate-900">保险代理人智能助手</h1>
            </div>
          </Link>
          <Badge className="hidden rounded-full border-0 bg-emerald-100 px-3 py-1 text-emerald-700 md:inline-flex">
            今天先看重点
          </Badge>

        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-600 lg:flex">
            <Compass className="h-4 w-4 text-[#1E3A8A]" />
            今天的重点客户与待办已准备好
          </div>

          <button type="button" className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-700 transition hover:-translate-y-0.5 hover:border-[#B8894A]/60 hover:text-[#1E3A8A]">
            <BellRing className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white/80 px-2 py-2 shadow-sm">
            <Avatar className="h-9 w-9 border border-white">
              <AvatarFallback className="bg-gradient-to-br from-[#1E3A8A] to-[#B8894A] text-white">林</AvatarFallback>
            </Avatar>
            <div className="hidden pr-2 md:block">
              <p className="text-sm font-medium text-slate-900">欢迎回来</p>
              <p className="text-xs text-slate-500">账号安全保护已开启</p>
            </div>

            <form action={signOutAction}>
              <Button variant="ghost" className="cursor-pointer rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">退出</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </header>
  );
}
