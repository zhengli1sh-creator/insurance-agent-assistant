import { ChatPanel } from "@/components/chat/chat-panel";
import { LiveInsightsPanel } from "@/components/insights/live-insights-panel";
import { LiveTaskBoard } from "@/components/tasks/live-task-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function TasksPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.16fr_0.94fr]">
      <div className="space-y-6">
        <Card className="glass-panel border-white/55 bg-white/84">
          <CardContent className="p-6">
            <Badge className="mb-4 rounded-full border-0 bg-[#1E3A8A]/10 px-3 py-1 text-[#1E3A8A]">任务与洞察</Badge>
            <h2 className="text-3xl font-semibold text-slate-900">把今天要跟进的事和重点客户整理清楚。</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              登录后可查看你的提醒和客户群分析；未登录时先展示示例内容，方便你预览。
            </p>

          </CardContent>
        </Card>
        <LiveTaskBoard />
        <LiveInsightsPanel />
      </div>
      <div className="space-y-6 xl:sticky xl:top-28 xl:h-fit">
        <ChatPanel />
      </div>
    </div>
  );
}
