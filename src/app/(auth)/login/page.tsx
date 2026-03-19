import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInAction } from "@/features/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type LoginPageProps = {
  searchParams?: Promise<{ message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = (await searchParams) ?? {};
  const message = params.message ? decodeURIComponent(params.message) : "";
  const configured = hasSupabaseEnv();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#F7F4EE_0%,#EEF3F8_50%,#F8FBFF_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(30,58,138,0.18),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(184,137,74,0.18),transparent_22%)]" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="glass-panel border-white/55 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardContent className="p-0">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">保险代理人智能助手</p>
            <h1 className="mt-5 max-w-xl text-4xl font-semibold leading-tight text-slate-900">把客户、记录和提醒放在一个顺手的助手里。</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-slate-600">
              登录后，你可以更从容地维护客户资料、补充拜访和活动记录，并理清每天最值得推进的事。
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600">
              <span className="rounded-full bg-slate-100 px-4 py-2">邮箱密码登录</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">安全登录保护</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">你的资料仅自己可见</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-white/55 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardHeader>
            <Badge className="mb-3 w-fit rounded-full border-0 bg-[#1E3A8A]/10 px-3 py-1 text-[#1E3A8A]">安全登录</Badge>
            <CardTitle className="text-2xl text-slate-900">登录后开始使用</CardTitle>

          </CardHeader>
          <CardContent className="space-y-5">
            {!configured && (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                当前服务正在准备中，暂时还不能登录。
              </div>
            )}

            {message && (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {message}
              </div>
            )}
            <form action={signInAction} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱账号</Label>
                <Input id="email" name="email" type="email" placeholder="linadvisor@servicecrm.cn" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">登录密码</Label>
                <Input id="password" name="password" type="password" placeholder="请输入你的安全登录密码" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <Button className="h-12 w-full cursor-pointer rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#285DA8] to-[#B8894A] text-white shadow-lg shadow-[#1E3A8A]/25 hover:opacity-95">
                安全登录
              </Button>
            </form>
            <p className="text-sm text-slate-500">
              还没有账号？
              <Link href="/register" className="ml-2 font-medium text-[#1E3A8A]">
                立即注册
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
