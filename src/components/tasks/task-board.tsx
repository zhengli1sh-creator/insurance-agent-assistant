import { AlarmClockCheck, CircleAlert, CircleCheckBig, CircleDashed, CircleX } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TaskItem, TaskStatus } from "@/types/domain";

const statusMeta: Record<TaskStatus, { icon: typeof CircleDashed; tone: string; title: string }> = {
  待执行: { icon: CircleDashed, tone: "bg-[#1E3A8A]/10 text-[#1E3A8A]", title: "待执行" },
  进行中: { icon: AlarmClockCheck, tone: "bg-[#0F766E]/10 text-[#0F766E]", title: "进行中" },
  已完成: { icon: CircleCheckBig, tone: "bg-emerald-100 text-emerald-700", title: "已完成" },
  已取消: { icon: CircleX, tone: "bg-slate-200 text-slate-600", title: "已取消" },
  已逾期: { icon: CircleAlert, tone: "bg-rose-100 text-rose-700", title: "已逾期" },
};

export function TaskBoard({ tasks }: { tasks: TaskItem[] }) {
  const statuses: TaskStatus[] = ["待执行", "进行中", "已逾期", "已完成", "已取消"];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {statuses.map((status) => {
        const items = tasks.filter((task) => task.status === status);
        const meta = statusMeta[status];
        const Icon = meta.icon;

        return (
          <Card key={status} className="glass-panel border-white/55 bg-white/82 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-900">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${meta.tone}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  {meta.title}
                </CardTitle>
                <Badge className="rounded-full border-0 bg-slate-100 px-3 py-1 text-slate-600">{items.length} 项</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((task) => (
                <div key={task.id} className="rounded-[24px] border border-slate-200/70 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-slate-900">{task.title}</p>
                    <Badge className="rounded-full border-0 bg-[#FFF8EE] text-[#B8894A]">{task.priority}优先</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-500">{task.source}</p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                    <span>到期时间：{task.dueDate}</span>
                    <span>{task.ownerHint}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
