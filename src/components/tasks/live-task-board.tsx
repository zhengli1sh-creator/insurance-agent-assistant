/**
 * 实时任务看板组件
 * 基于任务管理设计文档 v1.0
 *
 * 负责：
 * 1. 从 API 获取已分区的任务数据
 * 2. 数据格式转换
 * 3. 渲染 TaskBoard
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskBoard } from "@/components/tasks/task-board";
import { ApiRequestError, fetchJson } from "@/lib/crm-api";
import type { TaskCategorizedResult, TaskEntity } from "@/types/task";

/**
 * 格式化计划执行时间
 */
function formatPlannedAt(task: TaskEntity): string {
  if (!task.planned_at) return "待安排";
  return task.planned_at.replace("T", " ").slice(0, 16);
}

/**
 * 格式化提醒时间
 */
function formatRemindAt(task: TaskEntity): string | null {
  if (!task.remind_at) return null;
  return task.remind_at.replace("T", " ").slice(0, 16);
}

/**
 * 格式化任务来源
 */
function formatTaskSource(task: TaskEntity): string {
  const sourceLabelMap: Record<TaskEntity["source_type"], string> = {
    manual: "手工创建",
    visit: "来自拜访记录",
    activity: "来自客户活动",
  };

  const sourceIdLabel = task.source_id ? ` ${task.source_id.slice(0, 8)}` : "";
  const customerLabel = task.customer_name
    ? `｜${task.customer_name}${task.customer_nickname ? `（${task.customer_nickname}）` : ""}`
    : "";

  return `${sourceLabelMap[task.source_type]}${sourceIdLabel}${customerLabel}`;
}

/**
 * 格式化任务提示
 */
function formatTaskHint(task: TaskEntity): string {
  return task.note ?? "等待进一步安排";
}

/**
 * 获取任务列表（已分区）
 */
function fetchLiveTasks(): Promise<TaskCategorizedResult> {
  return fetchJson<TaskCategorizedResult>("/api/tasks", { cache: "no-store" });
}

/**
 * 判断是否为认证错误
 */
function isAuthError(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.status === 401 || error.status === 403;
  }
  if (error instanceof Response) {
    return error.status === 401 || error.status === 403;
  }
  if (error instanceof Error) {
    return error.message.includes("401") || error.message.includes("403") || error.message.includes("Unauthorized");
  }
  return false;
}

/**
 * 获取错误信息
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof ApiRequestError) {
    if (error.status === 401 || error.status === 403) {
      return "登录状态已失效，请重新登录后查看任务。";
    }

    if (error.status >= 500) {
      return "任务中心暂时无法读取数据，请稍后重试。";
    }

    return error.message || `服务器返回 ${error.status} 错误`;
  }
  if (error instanceof Response) {
    return `服务器返回 ${error.status} 错误`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

/**
 * 将 TaskEntity 映射为 TaskItem
 */
function mapTaskToItem(task: TaskEntity) {
  return {
    id: task.id,
    title: task.title,
    note: task.note,
    plannedAt: formatPlannedAt(task),
    remindAt: formatRemindAt(task),
    completedAt: task.completed_at,
    canceledAt: task.canceled_at,
    status: task.status,
    priority: task.priority,
    customerId: task.customer_id,
    customerName: task.customer_name,
    sourceType: task.source_type,
    // 废弃字段兼容
    source: formatTaskSource(task),
    ownerHint: formatTaskHint(task),
    dueDate: formatPlannedAt(task),
  };
}

export function LiveTaskBoard() {
  const query = useQuery({
    queryKey: ["tasks-live"],
    queryFn: fetchLiveTasks,
    retry: 1,
    refetchOnWindowFocus: true,
  });

  // 调试日志：输出查询状态
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log("[LiveTaskBoard] Query state:", {
      isLoading: query.isLoading,
      isError: query.isError,
      error: query.error,
      hasData: !!query.data,
    });
  }

  // 区分不同类型的错误
  const isAuthError_ = query.isError && isAuthError(query.error);
  const isOtherError = query.isError && !isAuthError_;
  const isDemoMode = false;

  const isLoading = query.isLoading && !query.data;

  // 真实数据映射（已分区）
  const mappedData = query.data
    ? {
        todayReminders: query.data.todayReminders.map(mapTaskToItem),
        pending: query.data.pending.map(mapTaskToItem),
        overdue: query.data.overdue.map(mapTaskToItem),
        completed: query.data.completed.map(mapTaskToItem),
        canceled: query.data.canceled.map(mapTaskToItem),
      }
    : null;

  // 认证错误状态
  if (isAuthError_) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">需要登录</h3>
        <p className="text-sm text-slate-500 mb-4">请先登录后查看您的任务</p>
        <Button onClick={() => (window.location.href = "/login")}>去登录</Button>
      </div>
    );
  }

  // 其他错误状态
  if (isOtherError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">加载失败</h3>
        <p className="text-sm text-slate-500 mb-2">{getErrorMessage(query.error)}</p>
        <p className="text-xs text-slate-400 mb-4">请检查网络连接或稍后重试</p>
        <Button onClick={() => query.refetch()} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <TaskBoard
      data={mappedData}
      isLoading={isLoading}
      isDemoMode={isDemoMode}
      onRefetch={() => query.refetch()}
    />
  );
}
