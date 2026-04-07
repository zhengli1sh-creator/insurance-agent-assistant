import { LogOut, Sparkles } from "lucide-react";
import Link from "next/link";

import { signOutAction } from "@/features/auth/actions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { requireUserContext } from "@/lib/supabase/require-user";


export async function TopNav() {
  // 获取当前登录用户信息
  const { user } = await requireUserContext();

  // 获取显示名称：优先使用 display_name，其次是邮箱，最后是默认值
  const displayName = user?.user_metadata?.display_name as string | undefined;
  const email = user?.email;
  const fallbackText = displayName
    ? displayName.charAt(0)
    : email
      ? email.charAt(0).toUpperCase()
      : "U";

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/30 bg-white/75 backdrop-blur-2xl">
      <div className="mx-auto flex h-12 w-full max-w-[1600px] items-center justify-between px-4 md:h-14 lg:px-8">
        <div className="flex items-center gap-2 md:gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 md:gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E3A8A] via-[#285DA8] to-[#B8894A] text-white shadow-[0_8px_20px_rgba(30,58,138,0.24)] md:h-9 md:w-9 md:rounded-xl">
              <Sparkles className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-slate-900">代理人智能助手</h1>
            </div>
          </Link>


        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-1 shadow-sm md:gap-2.5 md:px-2 md:py-1.5">
            <Avatar className="h-7 w-7 border border-white md:h-8 md:w-8">
              <AvatarFallback className="bg-gradient-to-br from-[#1E3A8A] to-[#B8894A] text-xs text-white">
                {fallbackText}
              </AvatarFallback>
            </Avatar>
            <div className="hidden pr-2 md:block">
              <p className="text-sm font-medium text-slate-900">
                {displayName || "欢迎回来"}
              </p>
              <p className="text-xs text-slate-500 truncate max-w-[150px]">
                {email || "账号安全保护已开启"}
              </p>
            </div>

            <form action={signOutAction}>
              <Button type="submit" variant="ghost" className="cursor-pointer rounded-full px-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 md:px-3">
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
