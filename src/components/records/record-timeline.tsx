import { CalendarRange, Handshake, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordSummary } from "@/types/domain";

function getKindChipClassName(activity: boolean) {
  return activity ? "advisor-chip-warning" : "advisor-chip-info";
}

function getKindIconClassName(activity: boolean) {
  return activity
    ? "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md"
    : "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-md";
}

export function RecordTimeline({ records }: { records: RecordSummary[] }) {
  return (
    <div className="space-y-4">
      {records.map((record) => {
        const activity = record.kind === "活动";
        const Icon = activity ? UsersRound : Handshake;

        return (
          <Card key={record.id} className="advisor-list-item-card rounded-[28px]">
            <CardHeader className="space-y-4 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`${getKindChipClassName(activity)} rounded-full border-0 px-3 py-1`}>
                  {record.kind}
                </Badge>
                <Badge className="advisor-chip-neutral rounded-full border-0 px-3 py-1">
                  涉及 {record.customerNames.length} 位客户
                </Badge>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={getKindIconClassName(activity)}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-2">
                    <CardTitle className="text-lg text-slate-900">{record.title}</CardTitle>
                    <p className="text-sm leading-6 text-slate-500">
                      涉及客户：{record.customerNames.join("、") || "待补充客户"}
                    </p>
                  </div>
                </div>

                <Badge className="advisor-chip-neutral w-fit rounded-full border-0 px-3 py-1 text-slate-600">
                  <CalendarRange className="mr-1 h-3.5 w-3.5" />
                  {record.happenedAt}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4 pt-0 text-sm leading-6 text-slate-600">
              <div className="advisor-record-card rounded-[24px] p-4">
                <p className="advisor-kicker">Record summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">{record.summary || "待补充记录摘要"}</p>
              </div>

              <div className="advisor-field-card rounded-[24px] p-4">
                <p className="advisor-section-label">自动识别的后续工作</p>
                {record.followUps.length > 0 ? (
                  <div className="mt-3 space-y-2.5">
                    {record.followUps.map((item) => (
                      <div key={`${record.id}-${item}`} className="advisor-list-item-card flex items-start gap-3 rounded-[20px] px-3 py-3">
                        <span className="advisor-accent-chip mt-0.5 inline-flex rounded-full px-2 py-0.5 text-[11px]">
                          跟进
                        </span>
                        <span className="flex-1 text-slate-700">{item}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">暂未识别出后续动作，可在编辑时继续补充。</p>
                )}
              </div>

              <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] px-4 py-3 text-sm leading-6 text-slate-700">
                <p className="font-medium text-slate-900">客户反馈与氛围</p>
                <p className="mt-1">{record.tone || "待补充客户反馈"}</p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

