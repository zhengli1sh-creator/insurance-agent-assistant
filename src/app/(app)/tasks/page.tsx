import { Sparkles } from "lucide-react";

import { ChatPanel } from "@/components/chat/chat-panel";
import { LiveInsightsPanel } from "@/components/insights/live-insights-panel";
import { LiveTaskBoard } from "@/components/tasks/live-task-board";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

function FocusTile({ label, title, description }: { label: string; title: string; description: string }) {
  return (
    <div className="advisor-meta-tile rounded-[24px] border border-white/75 p-4">
      <p className="advisor-section-label">{label}</p>
      <p className="mt-3 text-base font-semibold leading-7 text-slate-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}

export default function TasksPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.16fr_0.94fr]">
      <div className="space-y-6">
        <Card className="glass-panel advisor-hero-card rounded-[32px]">
          <CardContent className="space-y-6 p-5 sm:p-7">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-accent-chip rounded-full px-3 py-1">任务与洞察</Badge>
                <span className="advisor-section-label">今日推进工作台</span>
                <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">结构化承接</Badge>
              </div>

              <div className="space-y-3">
                <p className="advisor-kicker">Daily priorities</p>
                <h1 className="max-w-3xl text-[1.95rem] font-semibold leading-tight text-slate-900 sm:text-[2.3rem]">
                  先看今天要推进的事，再看值得统一经营的客户线索。
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600">
                  这个页面不把任务整理、优先级比较和客户群洞察压成单条对话，而是保留任务分栏、结果区和助手入口，方便你边判断边执行。
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <FocusTile label="先看任务" title="按状态分栏处理今天重点" description="待执行、进行中与逾期事项会分开承接，避免节奏混在一起。" />
              <FocusTile label="再看洞察" title="集中发现可统一经营的客户群" description="适合在安排完今天动作后，再决定谁值得做成组沟通。" />
              <FocusTile label="需要澄清时" title="继续交给助手帮你拆解下一步" description="当目标不够清楚时，助手先帮你理解，再把结果送回结构化工作区。" />
            </div>

            <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 text-sm leading-6 text-slate-700 sm:p-5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="advisor-chip-info rounded-full px-3 py-1">1. 先排优先级</span>
                <span className="advisor-chip-info rounded-full px-3 py-1">2. 再看批量机会</span>
                <span className="advisor-chip-info rounded-full px-3 py-1">3. 最后回到助手执行</span>
              </div>
              <p className="mt-3">
                登录后可查看你的真实提醒和客户群分析；未登录时先展示示例内容，方便你预览任务分栏、洞察结果与整体节奏。
              </p>
            </div>
          </CardContent>
        </Card>

        <LiveTaskBoard />
        <LiveInsightsPanel />
      </div>

      <div className="space-y-6 xl:sticky xl:top-28 xl:h-fit">
        <Card className="advisor-soft-card rounded-[30px]">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="space-y-2">
                <p className="advisor-kicker">Assistant guidance</p>
                <p className="text-lg font-semibold text-slate-900">任务页使用说明</p>
                <p className="text-sm leading-6 text-slate-600">
                  如果你现在最急的是补一条拜访或记录活动，可以直接继续对助手交代；如果要比较优先级、看一批客户线索或统一安排节奏，就留在这个页面处理。
                </p>
              </div>
            </div>

            <div className="advisor-hairline" />

            <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 text-sm leading-7 text-slate-700">
              当前页面保留完整任务分栏与洞察结果区，适合做判断、比较与批量承接，不强行压成单主卡流程。
            </div>
          </CardContent>
        </Card>

        <ChatPanel />
      </div>
    </div>
  );
}

