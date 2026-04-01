import { AlarmClockCheck, CircleAlert, CircleCheckBig, CircleDashed, CircleX, Sparkles } from "lucide-react";


import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskItem, TaskStatus } from "@/types/domain";

type TaskBoardProps = {
  tasks: TaskItem[];
  isLoading?: boolean;
  isDemoMode?: boolean;
};

type StatusMeta = {
  icon: typeof CircleDashed;
  title: string;
  description: string;
  badgeClassName: string;
  iconBadgeClassName: string;
  cardClassName: string;
  emptyTitle: string;
  emptyDescription: string;
};

const statuses: TaskStatus[] = ["待执行", "进行中", "已逾期", "已完成", "已取消"];

const statusMeta: Record<TaskStatus, StatusMeta> = {
  待执行: {
    icon: CircleDashed,
    title: "待执行",
    description: "已确认但尚未启动，适合按优先级顺序推进。",
    badgeClassName: "advisor-chip-warning",
    iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md",
    cardClassName: "advisor-soft-card",
    emptyTitle: "当前没有待执行任务",
    emptyDescription: "新的待办出现后，会先沉淀在这里，便于你按节奏展开。",
  },
  进行中: {
    icon: AlarmClockCheck,
    title: "进行中",
    description: "已经进入推进阶段，建议沿当前沟通链路持续跟进。",
    badgeClassName: "advisor-chip-info",
    iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-md",
    cardClassName: "advisor-soft-card",
    emptyTitle: "当前没有进行中的任务",
    emptyDescription: "如需持续推进某位客户，可从待执行区直接承接。",
  },
  已逾期: {
    icon: CircleAlert,
    title: "已逾期",
    description: "存在时效压力，建议优先清理，避免打乱后续经营节奏。",
    badgeClassName: "advisor-chip-warning",
    iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md",
    cardClassName: "advisor-soft-card",
    emptyTitle: "当前没有逾期任务",
    emptyDescription: "当前节奏相对稳定，可以继续按计划推进今日任务。",
  },
  已完成: {
    icon: CircleCheckBig,
    title: "已完成",
    description: "可作为今天节奏收口的记录，也方便你回看已交付事项。",
    badgeClassName: "advisor-chip-success",
    iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-success advisor-icon-badge-md",
    cardClassName: "advisor-subtle-card",
    emptyTitle: "今天还没有完成项",
    emptyDescription: "完成后的任务会沉淀在这里，方便回看执行成果。",
  },
  已取消: {
    icon: CircleX,
    title: "已取消",
    description: "保留历史轨迹，避免与仍需推进的任务混淆。",
    badgeClassName: "advisor-chip-neutral",
    iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-neutral advisor-icon-badge-md",
    cardClassName: "advisor-subtle-card",
    emptyTitle: "当前没有已取消任务",
    emptyDescription: "如后续有无需继续推进的事项，会统一沉淀在这里。",
  },
};

const priorityMeta: Record<TaskItem["priority"], { className: string; label: string }> = {
  高: { className: "advisor-chip-warning", label: "高优先" },
  中: { className: "advisor-chip-info", label: "中优先" },
  低: { className: "advisor-chip-neutral", label: "低优先" },
};

function TaskMetric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="advisor-meta-tile rounded-[24px] border border-white/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="advisor-section-label max-w-[9rem]">{label}</p>
        <p className="font-accent text-[1.8rem] leading-none text-[var(--advisor-ink)]">{value}</p>
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-600">{hint}</p>
    </div>
  );
}

function TaskColumnSkeleton() {
  return (
    <Card className="advisor-soft-card rounded-[30px]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-full bg-slate-100" />
            <div className="space-y-2">
              <div className="h-4 w-20 rounded-full bg-slate-100" />
              <div className="h-3 w-36 rounded-full bg-slate-100" />
            </div>
          </div>
          <div className="h-7 w-14 rounded-full bg-slate-100" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className="advisor-list-item-card rounded-[24px] p-4">
            <div className="space-y-3 animate-pulse">
              <div className="h-4 w-2/3 rounded-full bg-slate-100" />
              <div className="h-3 w-1/2 rounded-full bg-slate-100" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="h-24 rounded-[20px] bg-slate-100" />
                <div className="h-24 rounded-[20px] bg-slate-100" />
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function TaskBoard({ tasks, isLoading = false, isDemoMode = false }: TaskBoardProps) {
  const tasksByStatus = statuses.reduce(
    (result, status) => {
      result[status] = tasks.filter((task) => task.status === status);
      return result;
    },
    {} as Record<TaskStatus, TaskItem[]>,
  );

  const overdueCount = tasksByStatus["已逾期"].length;
  const pendingCount = tasksByStatus["待执行"].length;
  const inProgressCount = tasksByStatus["进行中"].length;
  const activeCount = pendingCount + inProgressCount + overdueCount;
  const highPriorityCount = tasks.filter((task) => task.priority === "高").length;
  const now = new Date();
  const todayKey = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}-${`${now.getDate()}`.padStart(2, "0")}`;

  const dueTodayCount = tasks.filter((task) => task.dueDate.includes("今天") || task.dueDate.startsWith(todayKey)).length;

  const batchSuggestions = [
    overdueCount > 0
      ? {
          id: "overdue",
          chipClassName: "advisor-chip-warning",
          label: `先处理 ${overdueCount} 项逾期任务`,
          description: "先把已超时事项清掉，再回到今天的新推进任务，节奏会更稳。",
        }
      : null,
    highPriorityCount > 0
      ? {
          id: "priority",
          chipClassName: "advisor-chip-info",
          label: `优先盯住 ${highPriorityCount} 项高优先级`,
          description: "高优先级任务建议集中安排在前半天或沟通状态更好的时间段。",
        }
      : null,
    pendingCount > 1
      ? {
          id: "pending",
          chipClassName: "advisor-chip-neutral",
          label: `待执行 ${pendingCount} 项，适合成组处理`,
          description: "可按客户、来源记录或同类资料整理为一批，减少反复切换。",
        }
      : null,
    inProgressCount > 0
      ? {
          id: "progress",
          chipClassName: "advisor-chip-success",
          label: `继续推进 ${inProgressCount} 条既有链路`,
          description: "已经启动的任务更适合持续推进，避免沟通热度中断。",
        }
      : null,
  ].filter((item): item is { id: string; chipClassName: string; label: string; description: string } => Boolean(item));

  return (
    <div className="space-y-5">
      <Card className="advisor-soft-card rounded-[30px]">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="advisor-accent-chip rounded-full px-3 py-1">任务看板</Badge>
              <span className="advisor-section-label">今日优先级与批量整理</span>
              {isDemoMode ? <Badge className="advisor-chip-neutral rounded-full border-0 px-3 py-1">示例预览</Badge> : null}
              {!isDemoMode && !isLoading ? <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">实时同步</Badge> : null}
              {overdueCount > 0 ? <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">{overdueCount} 项需尽快处理</Badge> : null}
            </div>

            <div className="space-y-3">
              <p className="advisor-kicker">Task cadence</p>
              <h2 className="max-w-3xl text-[1.7rem] font-semibold leading-tight text-slate-900 sm:text-[2rem]">
                先把今天该推进的事排好顺序，再进入执行。
              </h2>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                任务区保留完整分栏，方便你既能快速看清今天重点，也能在需要时统一清理逾期与批量处理同类事项。
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <TaskMetric label="当前待处理" value={activeCount} hint="包含待执行、进行中与已逾期事项。" />
            <TaskMetric label="高优先级" value={highPriorityCount} hint="优先放在精神状态更稳定的时间段推进。" />
            <TaskMetric label="今天相关" value={dueTodayCount} hint="今天到期或今天需要盯住的任务数量。" />
            <TaskMetric label="正在推进" value={inProgressCount} hint="已经开启的事项建议保持连续跟进。" />
          </div>

          <div className="advisor-hairline" />

          <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-sm mt-0.5">
                <Sparkles className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <p className="advisor-kicker">Batch guidance</p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">批量处理建议</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    当任务较多时，先按同类来源或相近节奏成组处理，会比逐条来回切换更稳、更省力。
                  </p>
                </div>

                <div className="grid gap-3 lg:grid-cols-3">
                  {batchSuggestions.length > 0 ? (
                    batchSuggestions.slice(0, 3).map((item) => (
                      <div key={item.id} className="advisor-list-item-card rounded-[22px] p-4">
                        <Badge className={cn(item.chipClassName, "rounded-full border-0 px-3 py-1")}>{item.label}</Badge>
                        <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>
                      </div>
                    ))
                  ) : (
                    <div className="advisor-list-item-card rounded-[22px] p-4 lg:col-span-3">
                      <Badge className="advisor-chip-success rounded-full border-0 px-3 py-1">当前节奏稳定</Badge>
                      <p className="mt-3 text-sm leading-6 text-slate-600">目前没有明显的积压风险，可以继续按既定节奏推进今日任务。</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <TaskColumnSkeleton key={index} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <Card className="advisor-empty-state-card rounded-[30px]">
          <CardContent className="p-6 sm:p-7">
            <p className="text-lg font-semibold text-slate-900">当前还没有需要推进的任务</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              当你保存拜访记录、活动记录或手动补充提醒后，需要跟进的事项会自动沉淀到这里，方便你统一查看与安排。
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {statuses.map((status) => {
            const items = tasksByStatus[status];
            const meta = statusMeta[status];
            const Icon = meta.icon;

            return (
              <Card key={status} className={cn(meta.cardClassName, "rounded-[30px]")}>
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={meta.iconBadgeClassName}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="space-y-1">
                        <CardTitle className="text-lg text-slate-900">{meta.title}</CardTitle>
                        <p className="text-sm leading-6 text-slate-600">{meta.description}</p>
                      </div>
                    </div>
                    <Badge className={cn(meta.badgeClassName, "rounded-full border-0 px-3 py-1")}>{items.length} 项</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <div className="advisor-empty-state-card rounded-[24px] p-4">
                      <p className="text-sm font-medium text-slate-900">{meta.emptyTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{meta.emptyDescription}</p>
                    </div>
                  ) : (
                    items.map((task) => {
                      const priority = priorityMeta[task.priority];

                      return (
                        <div
                          key={task.id}
                          className={cn(
                            "advisor-list-item-card rounded-[26px] p-4 sm:p-5",
                            (task.status === "已完成" || task.status === "已取消") && "bg-white/72",
                          )}
                        >
                          <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <p className="advisor-section-label">任务内容</p>
                                <p className="text-base font-semibold leading-7 text-slate-900">{task.title}</p>
                                <p className="text-sm leading-6 text-slate-500">{task.source}</p>
                              </div>
                              <Badge className={cn(priority.className, "w-fit rounded-full border-0 px-3 py-1")}>{priority.label}</Badge>
                            </div>

                            <div className="advisor-hairline" />

                            <div className="grid gap-3 sm:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]">
                              <div className="advisor-meta-tile rounded-[22px] border border-white/75 p-4">
                                <p className="advisor-section-label">到期安排</p>
                                <p className="mt-3 text-sm font-medium text-slate-900">{task.dueDate}</p>
                                <Badge className={cn(meta.badgeClassName, "mt-3 rounded-full border-0 px-3 py-1")}>{meta.title}</Badge>
                              </div>
                              <div className="advisor-field-card rounded-[22px] p-4">
                                <p className="advisor-section-label">执行提醒</p>
                                <p className="mt-3 text-sm leading-6 text-slate-700">{task.ownerHint}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
