import { Crown, Gem, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  customerListCardClassName,
  customerMetaPanelClassName,
  customerMetaPillClassName,
} from "@/components/customers/customer-style";
import type { CustomerSummary } from "@/types/domain";


type TierMeta = {
  icon: typeof Crown;
  badgeClassName: string;
  iconToneClassName: string;
};

function getTierMeta(tier: CustomerSummary["tier"]): TierMeta {
  if (tier === "黑金私享") {
    return {
      icon: Crown,
      badgeClassName: "advisor-chip-warning",
      iconToneClassName: "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm",
    };
  }

  if (tier === "菁英优选") {
    return {
      icon: Gem,
      badgeClassName: "advisor-chip-info",
      iconToneClassName: "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-sm",
    };
  }

  return {
    icon: Sparkles,
    badgeClassName: "advisor-chip-neutral",
    iconToneClassName: "advisor-icon-badge advisor-icon-badge-neutral advisor-icon-badge-sm",
  };
}

function getTrustScoreClassName(score: number) {
  if (score >= 92) {
    return "advisor-chip-success";
  }

  if (score >= 85) {
    return "advisor-chip-info";
  }

  return "advisor-chip-warning";
}

export function CustomerList({ customers }: { customers: CustomerSummary[] }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {customers.map((customer) => {
        const tierMeta = getTierMeta(customer.tier);
        const TierIcon = tierMeta.icon;

        return (
          <Card key={customer.id} className={customerListCardClassName}>

            <CardHeader className="space-y-4 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-xl text-slate-900">{customer.name}</CardTitle>
                    <Badge className={`${tierMeta.badgeClassName} rounded-full border-0 px-3 py-1`}>
                      <TierIcon className="mr-1 h-3.5 w-3.5" />
                      {customer.tier}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-sm leading-6 text-slate-600">
                    <span className={customerMetaPillClassName}>{customer.city}</span>
                    <span className={customerMetaPillClassName}>{customer.assetFocus}</span>

                  </div>
                </div>

                <div className={tierMeta.iconToneClassName}>
                  <TierIcon className="h-4 w-4" />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {customer.tags.map((tag) => (
                  <span key={tag} className="advisor-chip-neutral rounded-full px-3 py-1 text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </CardHeader>

            <CardContent className="space-y-4 text-sm text-slate-600">
              <div className="grid gap-3 md:grid-cols-3">
                <div className={customerMetaPanelClassName}>
                  <p className="advisor-section-label">经营阶段</p>
                  <p className="mt-3 font-medium text-slate-900">{customer.relationshipStage}</p>
                </div>
                <div className={customerMetaPanelClassName}>
                  <p className="advisor-section-label">信任温度</p>
                  <div className="mt-3 flex items-center gap-2">
                    <p className="font-medium text-slate-900">{customer.trustScore} / 100</p>
                    <span className={`${getTrustScoreClassName(customer.trustScore)} rounded-full px-2.5 py-1 text-[11px] font-medium`}>
                      {customer.trustScore >= 92 ? "关系稳固" : customer.trustScore >= 85 ? "持续升温" : "需要经营"}
                    </span>
                  </div>
                </div>
                <div className={customerMetaPanelClassName}>
                  <p className="advisor-section-label">最近联系</p>
                  <p className="mt-3 font-medium text-slate-900">{customer.lastContact}</p>
                </div>
              </div>


              <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4">
                <p className="advisor-kicker">Next step</p>
                <p className="mt-2 text-base font-semibold text-slate-900">{customer.nextAction}</p>
                <p className="mt-2 leading-6 text-slate-600">{customer.note}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
