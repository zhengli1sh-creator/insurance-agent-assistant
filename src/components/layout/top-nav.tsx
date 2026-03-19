import { BellRing, Compass, LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";


export function TopNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-16 w-full max-w-[1600px] items-center justify-between px-4 md:h-20 lg:px-8">
        <div className="flex items-center gap-2.5 md:gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 md:gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#1E3A8A] via-[#285DA8] to-[#B8894A] text-white shadow-[0_18px_45px_rgba(30,58,138,0.28)] md:h-12 md:w-12 md:rounded-2xl">
              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900 md:text-lg">代理人智能助手</h1>
            </div>
          </Link>


        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-600 lg:flex">
            <Compass className="h-4 w-4 text-[#1E3A8A]" />
            今天的重点客户与待办已准备好
          </div>

          <button type="button" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-slate-200/70 bg-white/80 text-slate-700 transition hover:-translate-y-0.5 hover:border-[#B8894A]/60 hover:text-[#1E3A8A] md:h-11 md:w-11">
            <BellRing className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-1.5 shadow-sm md:gap-3 md:px-2 md:py-2">
            <Avatar className="h-8 w-8 border border-white md:h-9 md:w-9">
              <AvatarFallback className="bg-gradient-to-br from-[#1E3A8A] to-[#B8894A] text-white">林</AvatarFallback>
            </Avatar>
            <div className="hidden pr-2 md:block">
              <p className="text-sm font-medium text-slate-900">欢迎回来</p>
              <p className="text-xs text-slate-500">账号安全保护已开启</p>
            </div>

            <form action={signOutAction}>
              <Button variant="ghost" className="cursor-pointer rounded-full px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:px-3">
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
