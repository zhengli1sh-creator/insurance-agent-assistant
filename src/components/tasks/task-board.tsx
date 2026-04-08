/**
 * 任务看板组件
 * 基于任务管理设计文档 v1.0
 *
 * 展示结构：
 * 1. 顶部：今日提醒聚焦区
 * 2. 主分区：待开始 / 已过期 / 已完成 / 已取消
 */

import { useState } from "react";
import { AlarmClock, CircleAlert, CircleCheckBig, CircleDashed, CircleX, List, Calendar, Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/domain";
import { TaskCalendar } from "./task-calendar";

/**
 * 任务看板数据
 */
interface TaskBoardData {
  todayReminders: TaskItem[];  // 今日提醒聚焦区
  pending: TaskItem[];         // 待开始任务区
  overdue: TaskItem[];         // 已过期任务区
  completed: TaskItem[];       // 已完成任务区
  canceled: TaskItem[];        // 已取消任务区
}

interface TaskBoardProps {
  data: TaskBoardData | null;
  isLoading?: boolean;
  isDemoMode?: boolean;
  onRefetch?: () => void;
}

/**
 * 分区元数据
 */
type ZoneMeta = {
  icon: typeof CircleDashed;
  title: string;
  description: string;
  badgeClassName: string;
  iconBadgeClassName: string;
  cardClassName: string;
  emptyTitle: string;
  emptyDescription: string;
};

/**
 * 主分区配置
 */
const mainZones: { key: keyof TaskBoardData; meta: ZoneMeta }[] = [
  {
    key: "pending",
    meta: {
      icon: CircleDashed,
      title: "待开始",
      description: "计划执行时间未到，可按计划节奏准备。",
      badgeClassName: "advisor-chip-info",
      iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-md",
      cardClassName: "advisor-soft-card",
      emptyTitle: "当前没有待开始任务",
      emptyDescription: "新的任务创建后会出现在这里，按时间自动排序。",
    },
  },
  {
    key: "overdue",
    meta: {
      icon: CircleAlert,
      title: "已过期",
      description: "计划执行时间已到或已过，建议优先处理。",
      badgeClassName: "advisor-chip-warning",
      iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md",
      cardClassName: "advisor-soft-card",
      emptyTitle: "当前没有过期任务",
      emptyDescription: "节奏良好，可以继续按计划推进今日任务。",
    },
  },
  {
    key: "completed",
    meta: {
      icon: CircleCheckBig,
      title: "已完成",
      description: "已完成的任务记录，方便回看执行成果。",
      badgeClassName: "advisor-chip-success",
      iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-success advisor-icon-badge-md",
      cardClassName: "advisor-subtle-card",
      emptyTitle: "今天还没有完成项",
      emptyDescription: "完成的任务会沉淀在这里，记录你的执行成果。",
    },
  },
  {
    key: "canceled",
    meta: {
      icon: CircleX,
      title: "已取消",
      description: "已取消的任务，保留历史轨迹。",
      badgeClassName: "advisor-chip-neutral",
      iconBadgeClassName: "advisor-icon-badge advisor-icon-badge-neutral advisor-icon-badge-md",
      cardClassName: "advisor-subtle-card",
      emptyTitle: "当前没有已取消任务",
      emptyDescription: "无需继续推进的任务会统一沉淀在这里。",
    },
  },
];

/**
 * 优先级样式
 */
const priorityMeta: Record<TaskItem["priority"], { className: string; label: string }> = {
  高: { className: "advisor-chip-warning", label: "高优先" },
  中: { className: "advisor-chip-info", label: "中优先" },
  低: { className: "advisor-chip-neutral", label: "低优先" },
};

/**
 * 骨架屏
 */
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

/**
 * 今日提醒聚焦区组件
 */
function TodayRemindersSection({ reminders }: { reminders: TaskItem[] }) {
  if (reminders.length === 0) return null;

  return (
    <Card className="rounded-[30px] border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/60">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md shrink-0">
              <Bell className="h-4 w-4" />
            </span>
            <div>
              <CardTitle className="text-lg text-slate-900">今日提醒</CardTitle>
              <p className="text-sm text-slate-600 mt-1">需要今天关注和处理的任务</p>
            </div>
          </div>
          <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">
            {reminders.length} 项
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.map((task) => {
          const priority = priorityMeta[task.priority];
          return (
            <div
              key={task.id}
              className="advisor-list-item-card rounded-[26px] p-4 sm:p-5 bg-white/80"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-slate-900 truncate">{task.title}</p>
                    {task.customerName && (
                      <p className="text-sm text-slate-500 mt-1">关联客户：{task.customerName}</p>
                    )}
                  </div>
                  <Badge className={cn(priority.className, "shrink-0 rounded-full border-0 px-3 py-1")}>
                    {priority.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-600">
                  {task.remindAt && (
                    <span className="flex items-center gap-1.5">
                      <AlarmClock className="h-3.5 w-3.5" />
                      提醒时间：{task.remindAt}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    计划执行：{task.plannedAt}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * 任务卡片组件
 */
function TaskCard({ task, zoneMeta }: { task: TaskItem; zoneMeta: ZoneMeta }) {
  const priority = priorityMeta[task.priority];

  return (
    <div
      className={cn(
        "advisor-list-item-card rounded-[26px] p-4 sm:p-5",
        (task.status === "已完成" || task.status === "已取消") && "bg-white/72"
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2 flex-1 min-w-0">
            <p className="advisor-section-label">任务内容</p>
            <p className="text-base font-semibold leading-7 text-slate-900">{task.title}</p>
            {task.customerName && (
              <p className="text-sm leading-6 text-slate-500">关联客户：{task.customerName}</p>
            )}
          </div>
          <Badge className={cn(priority.className, "w-fit shrink-0 rounded-full border-0 px-3 py-1")}>
            {priority.label}
          </Badge>
        </div>

        <div className="advisor-hairline" />

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="advisor-meta-tile rounded-[22px] border border-white/75 p-4">
            <p className="advisor-section-label">计划执行时间</p>
            <p className="mt-3 text-sm font-medium text-slate-900">{task.plannedAt}</p>
            {task.remindAt && (
              <p className="mt-2 text-xs text-slate-500">提醒：{task.remindAt}</p>
            )}
          </div>
          <div className="advisor-field-card rounded-[22px] p-4">
            <p className="advisor-section-label">任务状态</p>
            <Badge className={cn(zoneMeta.badgeClassName, "mt-3 rounded-full border-0 px-3 py-1")}>
              {zoneMeta.title}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 主看板组件
 */
export function TaskBoard({ data, isLoading = false }: TaskBoardProps) {
  const [pendingViewMode, setPendingViewMode] = useState<"list" | "calendar">("calendar");

  // 计算总任务数
  const totalTasks = data
    ? data.todayReminders.length +
      data.pending.length +
      data.overdue.length +
      data.completed.length +
      data.canceled.length
    : 0;

  return (
    <div className="space-y-5">
      {isLoading ? (
        // 加载状态
        <div className="flex flex-col gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <TaskColumnSkeleton key={index} />
          ))}
        </div>
      ) : totalTasks === 0 ? (
        // 空状态
        <Card className="advisor-empty-state-card rounded-[30px]">
          <CardContent className="p-6 sm:p-7">
            <p className="text-lg font-semibold text-slate-900">当前还没有任务</p>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              当你保存拜访记录、活动记录或手动创建任务后，需要跟进的事项会自动沉淀到这里，方便你统一查看与安排。
            </p>
          </CardContent>
        </Card>
      ) : (
        // 正常展示
        <div className="flex flex-col gap-4">
          {/* 今日提醒聚焦区 */}
          {data && <TodayRemindersSection reminders={data.todayReminders} />}

          {/* 主分区 */}
          {mainZones.map(({ key, meta }) => {
            const items = data?.[key] ?? [];
            const Icon = meta.icon;
            const isPending = key === "pending";

            return (
              <Card key={key} className={cn(meta.cardClassName, "rounded-[30px]")}>
                <CardHeader className="space-y-4 pb-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className={cn(meta.iconBadgeClassName, "shrink-0")}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <CardTitle className="whitespace-nowrap text-lg text-slate-900">
                          {meta.title}
                        </CardTitle>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {/* 待开始区支持切换视图 */}
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
                      <Badge className={cn(meta.badgeClassName, "rounded-full border-0 px-3 py-1")}>
                        {items.length} 项
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{meta.description}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  {items.length === 0 ? (
                    // 空状态
                    <div className="advisor-empty-state-card rounded-[24px] p-4">
                      <p className="text-sm font-medium text-slate-900">{meta.emptyTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{meta.emptyDescription}</p>
                    </div>
                  ) : isPending && pendingViewMode === "calendar" ? (
                    // 日历视图（仅待开始区）
                    <TaskCalendar tasks={items} />
                  ) : (
                    // 列表视图
                    items.map((task) => <TaskCard key={task.id} task={task} zoneMeta={meta} />)
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
