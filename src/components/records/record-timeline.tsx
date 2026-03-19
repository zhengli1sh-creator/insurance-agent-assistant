import { CalendarRange, Handshake, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecordSummary } from "@/types/domain";

export function RecordTimeline({ records }: { records: RecordSummary[] }) {
  return (
    <div className="space-y-4">
      {records.map((record) => {
        const activity = record.kind === "活动";
        const Icon = activity ? UsersRound : Handshake;

        return (
          <Card key={record.id} className="glass-panel border-white/55 bg-white/82 shadow-[0_16px_50px_rgba(15,23,42,0.07)]">
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${activity ? "bg-[#0F766E]/12 text-[#0F766E]" : "bg-[#1E3A8A]/10 text-[#1E3A8A]"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-slate-900">{record.title}</CardTitle>
                    <p className="mt-2 text-sm text-slate-500">涉及客户：{record.customerNames.join("、")}</p>
                  </div>
                </div>
                <Badge className="w-fit rounded-full border-0 bg-slate-100 px-3 py-1 text-slate-600">
                  <CalendarRange className="mr-1 h-3.5 w-3.5" />
                  {record.happenedAt}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-slate-600">
              <p>{record.summary}</p>
              <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/85 p-4">
                <p className="mb-3 text-xs uppercase tracking-[0.26em] text-slate-400">自动识别的后续工作</p>
                <div className="space-y-2">
                  {record.followUps.map((item) => (
                    <div key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B8894A]" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="rounded-2xl bg-[#F7F4EE] px-4 py-3 text-slate-700">{record.tone}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
