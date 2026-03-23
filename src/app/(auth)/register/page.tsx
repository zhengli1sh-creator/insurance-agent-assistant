import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signUpAction } from "@/features/auth/actions";
import { hasSupabaseEnv } from "@/lib/supabase/config";

type RegisterPageProps = {
  searchParams?: Promise<{ message?: string }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const params = (await searchParams) ?? {};
  const message = params.message ? decodeURIComponent(params.message) : "";
  const configured = hasSupabaseEnv();

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[linear-gradient(135deg,#F7F4EE_0%,#EEF3F8_50%,#F8FBFF_100%)] px-4 py-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,rgba(15,118,110,0.16),transparent_24%),radial-gradient(circle_at_85%_12%,rgba(184,137,74,0.16),transparent_22%)]" />
      <div className="relative grid w-full max-w-6xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="glass-panel border-white/55 bg-white/88 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardHeader>
            <Badge className="mb-3 w-fit rounded-full border-0 bg-[#0F766E]/10 px-3 py-1 text-[#0F766E]">创建账户</Badge>
            <CardTitle className="text-2xl text-slate-900">创建你的专属助手</CardTitle>
          </CardHeader>

          <CardContent className="space-y-5">
            {!configured && (
              <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                当前服务正在准备中，暂时还不能注册。
              </div>
            )}

            {message && (
              <div className="rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                {message}
              </div>
            )}
            <form action={signUpAction} className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="displayName">姓名</Label>
                <Input id="displayName" name="displayName" placeholder="例如：林顾问" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">工作邮箱</Label>
                <Input id="email" name="email" type="email" placeholder="linadvisor@servicecrm.cn" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">手机号码</Label>
                <Input id="phone" name="phone" type="tel" placeholder="138 8888 6666" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">设置密码</Label>
                <Input id="password" name="password" type="password" placeholder="设置一个安全且便于记忆的密码" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="region">服务城市</Label>
                <Input id="region" name="region" placeholder="例如：上海 / 杭州" className="h-12 rounded-2xl border-slate-200/80 bg-white" />
              </div>
              <Button type="submit" className="h-12 cursor-pointer rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-[#285DA8] to-[#B8894A] text-white shadow-lg shadow-[#1E3A8A]/25 hover:opacity-95 md:col-span-2">
                创建账户并开始使用
              </Button>


            </form>
            <p className="text-sm text-slate-500">
              已有账号？
              <Link href="/login" className="ml-2 font-medium text-[#1E3A8A]">
                返回登录
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card className="glass-panel border-white/55 bg-white/82 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <CardContent className="space-y-5 p-0">
            <p className="text-xs uppercase tracking-[0.32em] text-slate-500">开始使用</p>
            <h1 className="text-4xl font-semibold leading-tight text-slate-900">客户、拜访、活动和提醒，都会在这里更清楚地整理出来。</h1>
            <p className="text-sm leading-7 text-slate-600">
              创建账户后，你可以用同一个入口维护客户资料、记录拜访与活动，并查看每天的重点事项。
            </p>
            <div className="grid gap-3 pt-2">
              <div className="rounded-[24px] bg-[#F7F4EE] p-4 text-sm leading-7 text-slate-700">和助手聊一聊：像聊天一样完成新增、查询、记录和提醒。</div>
              <div className="rounded-[24px] bg-[#EEF5F4] p-4 text-sm leading-7 text-slate-700">重点更清楚：先看当前最需要处理的内容。</div>
              <div className="rounded-[24px] bg-[#EEF3FA] p-4 text-sm leading-7 text-slate-700">资料更安心：你的客户和记录仅你自己可见。</div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
