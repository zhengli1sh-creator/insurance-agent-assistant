/**
 * 任务看板组件
 * 基于任务管理设计文档 v1.0
 *
 * 展示结构：
 * 1. 顶部：今日提醒聚焦区
 * 2. 主分区：待开始 / 已过期 / 已完成 / 已取消
 */

import { useState } from "react";
import {
  Bell,
  Calendar,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  CircleCheckBig,
  CircleDashed,
  CircleX,
  List,
} from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/domain";
import { TaskCalendar } from "./task-calendar";
import { TaskItemCard } from "./task-item-card";


/**
 * 变更任务状态 API
 */
async function changeTaskStatus(taskId: string, status: "已完成" | "已取消") {
  const response = await fetch(`/api/tasks/${taskId}/status`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "状态变更失败");
  }

  return response.json();
}

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
interface TodayRemindersSectionProps {
  reminders: TaskItem[];
  onStatusChange?: (taskId: string, status: "已完成" | "已取消") => void;
}

function TodayRemindersSection({ reminders, onStatusChange }: TodayRemindersSectionProps) {
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
              <p className="mt-1 text-sm text-slate-600">需要今天关注和处理的任务</p>
            </div>
          </div>
          <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">
            {reminders.length} 项
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {reminders.length === 0 ? (
          <div className="advisor-empty-state-card rounded-[24px] p-4">
            <p className="text-sm font-medium text-slate-900">今天没有需要提醒的任务</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              如需提前提醒，可在创建任务时补充提醒时间，今天命中的提醒会展示在这里。
            </p>
          </div>
        ) : (
          reminders.map((task) => (
            <TaskItemCard
              key={task.id}
              task={task}
              isActionable
              onStatusChange={onStatusChange}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

/**
 * 主看板组件
 */
export function TaskBoard({ data, isLoading = false, onRefetch }: TaskBoardProps) {
  const [pendingViewMode, setPendingViewMode] = useState<"list" | "calendar">("calendar");
  const queryClient = useQueryClient();

  // 历史区域折叠状态：默认收起
  const [expandedZones, setExpandedZones] = useState<{
    completed: boolean;
    canceled: boolean;
  }>({ completed: false, canceled: false });

  // 历史区域懒加载状态
  const [historyDisplayCount, setHistoryDisplayCount] = useState<{
    completed: number;
    canceled: number;
  }>({ completed: 5, canceled: 5 });

  // 历史任务时间窗口：默认7天（单位：毫秒）
  const HISTORY_WINDOW_DAYS = 7;
  const HISTORY_WINDOW_MS = HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // 每次懒加载增加的数量
  const LAZY_LOAD_BATCH_SIZE = 5;

  // 状态变更 mutation - 乐观更新
  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: "已完成" | "已取消" }) =>
      changeTaskStatus(taskId, status),

    // 乐观更新：立即修改本地数据，让用户立刻看到变化
    onMutate: async ({ taskId, status }) => {
      // 1. 取消正在进行的重新获取，避免覆盖我们的乐观更新
      await queryClient.cancelQueries({ queryKey: ["tasks-live"] });

      // 2. 保存当前数据快照，用于错误回滚
      const previousData = queryClient.getQueryData<TaskBoardData>(["tasks-live"]);

      // 3. 立即更新本地数据
      if (previousData) {
        queryClient.setQueryData<TaskBoardData>(["tasks-live"], (old) => {
          if (!old) return old;

          // 找到任务并从原区域移除
          let targetTask: TaskItem | undefined;
          const newData: TaskBoardData = {
            todayReminders: old.todayReminders.filter(t => {
              if (t.id === taskId) { targetTask = t; return false; }
              return true;
            }),
            pending: old.pending.filter(t => {
              if (t.id === taskId) { targetTask = t; return false; }
              return true;
            }),
            overdue: old.overdue.filter(t => {
              if (t.id === taskId) { targetTask = t; return false; }
              return true;
            }),
            completed: [...old.completed],
            canceled: [...old.canceled],
          };

          // 将任务添加到目标区域（如果找到了任务）
          if (targetTask) {
            const now = new Date().toISOString();
            const updatedTask = {
              ...targetTask,
              status,
              ...(status === "已完成" ? { completedAt: now } : {}),
              ...(status === "已取消" ? { canceledAt: now } : {})
            };
            if (status === "已完成") {
              newData.completed = [updatedTask, ...newData.completed];
            } else {
              newData.canceled = [updatedTask, ...newData.canceled];
            }
          }

          return newData;
        });
      }

      return { previousData };
    },

    // 错误时回滚到之前的状态
    onError: (error: Error, _variables, context) => {
      // eslint-disable-next-line no-console
      console.error("状态变更失败，回滚本地状态:", error.message);
      if (context?.previousData) {
        queryClient.setQueryData(["tasks-live"], context.previousData);
      }
    },

    // 完成后统一刷新，确保与服务器一致
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks-live"] });
      onRefetch?.();
    },
  });

  const handleStatusChange = (taskId: string, status: "已完成" | "已取消") => {
    statusMutation.mutate({ taskId, status });
  };

  // 切换历史区域展开/折叠
  const toggleZone = (zone: "completed" | "canceled") => {
    setExpandedZones((prev) => ({ ...prev, [zone]: !prev[zone] }));
  };

  // 加载更多历史任务
  const loadMoreHistory = (zone: "completed" | "canceled") => {
    setHistoryDisplayCount((prev) => ({
      ...prev,
      [zone]: prev[zone] + LAZY_LOAD_BATCH_SIZE,
    }));
  };

  // 时间筛选：筛选最近 N 天的历史任务
  const filterRecentTasks = (tasks: TaskItem[], zone: "completed" | "canceled") => {
    const now = Date.now();
    return tasks.filter((task) => {
      const timeField = zone === "completed" ? task.completedAt : task.canceledAt;
      if (!timeField) return false;
      const taskTime = new Date(timeField).getTime();
      return now - taskTime <= HISTORY_WINDOW_MS;
    });
  };

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
          {data && (
            <TodayRemindersSection
              reminders={data.todayReminders}
              onStatusChange={handleStatusChange}
            />
          )}

          {/* 主分区 */}
          {mainZones.map(({ key, meta }) => {
            const allItems = data?.[key] ?? [];
            const Icon = meta.icon;
            const isPendingZone = key === "pending";
            const isActionableZone = key === "pending" || key === "overdue";
            const isHistoryZone = key === "completed" || key === "canceled";


            // 历史区域：时间筛选 + 懒加载
            let displayItems = allItems;
            let recentCount = allItems.length;
            let hasMore = false;

            if (isHistoryZone) {
              const zone = key as "completed" | "canceled";
              const recentItems = filterRecentTasks(allItems, zone);
              recentCount = recentItems.length;
              const limit = historyDisplayCount[zone];
              displayItems = expandedZones[zone] ? recentItems.slice(0, limit) : [];
              hasMore = expandedZones[zone] && limit < recentItems.length;
            }

            return (
              <Card
                key={key}
                className={cn(
                  meta.cardClassName,
                  "rounded-[30px]",
                  isHistoryZone && "transition-all duration-200"
                )}
              >
                <CardHeader
                  className={cn(
                    "pb-4",
                    isHistoryZone && "cursor-pointer hover:bg-slate-50/50 transition-colors"
                  )}
                  onClick={isHistoryZone ? () => toggleZone(key as "completed" | "canceled") : undefined}
                >
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
                      {isPendingZone && allItems.length > 0 && (
                        <div className="flex items-center bg-white/60 rounded-full p-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingViewMode("list");
                            }}
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
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingViewMode("calendar");
                            }}
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
                      {/* 历史区域：显示最近7天数量 / 全部数量 */}
                      {isHistoryZone ? (
                        <Badge className={cn(meta.badgeClassName, "rounded-full border-0 px-3 py-1")}>
                          {recentCount > 0 ? `最近7天 ${recentCount} 项` : `${allItems.length} 项`}
                        </Badge>
                      ) : (
                        <Badge className={cn(meta.badgeClassName, "rounded-full border-0 px-3 py-1")}>
                          {allItems.length} 项
                        </Badge>
                      )}
                      {/* 历史区域：折叠/展开图标 */}
                      {isHistoryZone && (
                        <span className="text-slate-400">
                          {expandedZones[key as "completed" | "canceled"] ? (
                            <ChevronUp className="h-5 w-5" />
                          ) : (
                            <ChevronDown className="h-5 w-5" />
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{meta.description}</p>
                  {/* 历史区域：折叠状态提示 */}
                  {isHistoryZone && !expandedZones[key as "completed" | "canceled"] && recentCount > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      点击展开查看最近 {HISTORY_WINDOW_DAYS} 天的 {recentCount} 条记录
                    </p>
                  )}
                </CardHeader>
                {/* 历史区域：仅展开时显示内容 */}
                {(!isHistoryZone || expandedZones[key as "completed" | "canceled"]) && (
                  <CardContent className="space-y-3">
                    {allItems.length === 0 ? (
                      // 空状态
                      <div className="advisor-empty-state-card rounded-[24px] p-4">
                        <p className="text-sm font-medium text-slate-900">{meta.emptyTitle}</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">{meta.emptyDescription}</p>
                      </div>
                    ) : isHistoryZone && recentCount === 0 ? (
                      // 历史区域：最近7天无数据
                      <div className="advisor-empty-state-card rounded-[24px] p-4">
                        <p className="text-sm font-medium text-slate-900">最近 {HISTORY_WINDOW_DAYS} 天无记录</p>
                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          共 {allItems.length} 条历史记录，超过 {HISTORY_WINDOW_DAYS} 天的任务已归档。
                        </p>
                      </div>
                    ) : isPendingZone && pendingViewMode === "calendar" ? (
                      // 日历视图（仅待开始区）
                      <TaskCalendar tasks={allItems} onStatusChange={handleStatusChange} />
                    ) : (
                      // 列表视图
                      <>
                        {displayItems.map((task) => (
                          <TaskItemCard
                            key={task.id}
                            task={task}
                            isActionable={isActionableZone}
                            statusLabel={meta.title}
                            statusBadgeClassName={meta.badgeClassName}
                            onStatusChange={isActionableZone ? handleStatusChange : undefined}
                          />
                        ))}

                        {/* 懒加载更多按钮 */}
                        {isHistoryZone && hasMore && (
                          <Button
                            variant="ghost"
                            className="w-full mt-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100/50 rounded-full"
                            onClick={() => loadMoreHistory(key as "completed" | "canceled")}
                          >
                            加载更多（还剩 {recentCount - historyDisplayCount[key as "completed" | "canceled"]} 条）
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
