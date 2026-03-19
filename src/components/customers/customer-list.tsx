import { Crown, Gem, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CustomerSummary } from "@/types/domain";

function tierIcon(tier: CustomerSummary["tier"]) {
  if (tier === "黑金私享") return Crown;
  if (tier === "菁英优选") return Gem;
  return Sparkles;
}

export function CustomerList({ customers }: { customers: CustomerSummary[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {customers.map((customer) => {
        const Icon = tierIcon(customer.tier);

        return (
          <Card key={customer.id} className="glass-panel border-white/55 bg-white/80 shadow-[0_18px_55px_rgba(15,23,42,0.08)] transition hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-xl text-slate-900">{customer.name}</CardTitle>
                  <p className="mt-2 text-sm text-slate-500">
                    {customer.city} · {customer.assetFocus}
                  </p>
                </div>
                <Badge className="rounded-full border-0 bg-[#1E3A8A]/10 px-3 py-1 text-[#1E3A8A]">
                  <Icon className="mr-1 h-3.5 w-3.5" />
                  {customer.tier}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-[#F8FAFC] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">经营阶段</p>
                  <p className="mt-2 font-medium text-slate-900">{customer.relationshipStage}</p>
                </div>
                <div className="rounded-2xl bg-[#F8FAFC] p-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">信任温度</p>
                  <p className="mt-2 font-medium text-slate-900">{customer.trustScore} / 100</p>
                </div>
              </div>
              <div className="rounded-[24px] border border-[#B8894A]/20 bg-[#FFF8EE] p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-[#B8894A]">下一步经营动作</p>
                <p className="mt-2 font-medium text-slate-900">{customer.nextAction}</p>
                <p className="mt-2 leading-6">{customer.note}</p>
              </div>
              <p className="text-xs text-slate-500">最近联系：{customer.lastContact}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
