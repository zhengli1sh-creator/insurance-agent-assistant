import { useState } from "react";
import { AlarmClockCheck, CircleAlert, CircleCheckBig, CircleDashed, CircleX, List, Calendar } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskItem, TaskStatus } from "@/types/domain";
import { TaskCalendar } from "./task-calendar";

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

const statuses: TaskStatus[] = ["待执行", "进行中", "已完成", "已逾期", "已取消"];

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

export function TaskBoard({ tasks, isLoading = false }: TaskBoardProps) {
  const [pendingViewMode, setPendingViewMode] = useState<"list" | "calendar">("calendar");

  const tasksByStatus = statuses.reduce(
    (result, status) => {
      result[status] = tasks.filter((task) => task.status === status);
      return result;
    },
    {} as Record<TaskStatus, TaskItem[]>,
  );

  return (
    <div className="space-y-5">
      {/* 任务状态分栏区域 - 五个状态卡片单列排列 */}
      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
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
        <div className="flex flex-col gap-4">
          {statuses.map((status) => {
            const items = tasksByStatus[status];
            const meta = statusMeta[status];
            const Icon = meta.icon;
            const isPending = status === "待执行";

            return (
              <Card key={status} className={cn(meta.cardClassName, "rounded-[30px]")}>
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className={meta.iconBadgeClassName}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <CardTitle className="text-lg text-slate-900">{meta.title}</CardTitle>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isPending && items.length > 0 && (
                        <div className="flex items-center bg-white/60 rounded-full p-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingViewMode("list")}
                            className={cn(
                              "h-7 px-2 rounded-full text-xs transition-all",
                              pendingViewMode === "list"
                                ? "bg-white text-[#2c3e50] shadow-sm"
                                : "text-[#8b7355] hover:text-[#2c3e50] hover:bg-white/50"
                            )}
                          >
                            <List className="h-3.5 w-3.5 mr-1" />
                            列表
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingViewMode("calendar")}
                            className={cn(
                              "h-7 px-2 rounded-full text-xs transition-all",
                              pendingViewMode === "calendar"
                                ? "bg-white text-[#2c3e50] shadow-sm"
                                : "text-[#8b7355] hover:text-[#2c3e50] hover:bg-white/50"
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            日历
                          </Button>
                        </div>
                      )}
                      <Badge className={cn(meta.badgeClassName, "rounded-full border-0 px-3 py-1")}>{items.length} 项</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    <div className="advisor-empty-state-card rounded-[24px] p-4">
                      <p className="text-sm font-medium text-slate-900">{meta.emptyTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{meta.emptyDescription}</p>
                    </div>
                  ) : isPending && pendingViewMode === "calendar" ? (
                    <TaskCalendar tasks={items} />
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
