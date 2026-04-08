"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { TaskBoard } from "@/components/tasks/task-board";
import { tasks as demoTasks } from "@/lib/demo-data";
import { fetchJson } from "@/lib/crm-api";
import type { TaskEntity } from "@/types/task";

function formatTaskDueDate(task: TaskEntity) {
  if (task.remind_at) {
    return task.remind_at.replace("T", " ").slice(0, 16);
  }

  if (task.due_at) {
    return task.due_at.replace("T", " ").slice(0, 16);
  }

  return task.due_date ?? "待安排";
}

function formatTaskSource(task: TaskEntity) {
  const sourceLabelMap: Record<TaskEntity["source_type"], string> = {
    manual: "手工提醒",
    customer: "来自客户档案",
    visit: "来自拜访记录",
    activity: "来自客户活动",
    activity_event: "来自活动信息",
    activity_participant: "来自活动参与客户",
  };
  const sourceIdLabel = task.source_id ? ` ${task.source_id.slice(0, 8)}` : "";
  const customerLabel = task.customer_name
    ? `｜${task.customer_name}${task.customer_nickname ? `（${task.customer_nickname}）` : ""}`
    : "";

  return `${sourceLabelMap[task.source_type]}${sourceIdLabel}${customerLabel}`;
}

function formatTaskHint(task: TaskEntity) {
  return task.result_note ?? task.description ?? task.note ?? "等待进一步安排";
}

// 判断是否为认证相关错误
function isAuthError(error: unknown): boolean {
  if (error instanceof Response) {
    return error.status === 401 || error.status === 403;
  }
  if (error instanceof Error) {
    return error.message.includes("401") || error.message.includes("403") || error.message.includes("Unauthorized");
  }
  return false;
}

// 获取错误信息
function getErrorMessage(error: unknown): string {
  if (error instanceof Response) {
    return `服务器返回 ${error.status} 错误`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "未知错误";
}

export function LiveTaskBoard() {
  const query = useQuery({ 
    queryKey: ["tasks-live"], 
    queryFn: () => fetchJson<TaskEntity[]>("/api/tasks"),
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
      dataLength: query.data?.length,
    });
  }

  // 区分不同类型的错误
  const isAuthError_ = query.isError && isAuthError(query.error);
  const isOtherError = query.isError && !isAuthError_;
  const isDemoMode = false; // 不再因错误而自动进入演示模式

  const isLoading = query.isLoading && !query.data;

  // 真实数据映射
  const mappedTasks = (query.data ?? []).map((item) => ({
    id: item.id,
    title: item.title,
    dueDate: formatTaskDueDate(item),
    status: item.status,
    priority: item.priority,
    source: formatTaskSource(item),
    ownerHint: formatTaskHint(item),
  }));

  // 认证错误状态
  if (isAuthError_) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
        <h3 className="text-lg font-medium text-slate-800 mb-2">需要登录</h3>
        <p className="text-sm text-slate-500 mb-4">请先登录后查看您的任务</p>
        <Button onClick={() => window.location.href = "/login"}>
          去登录
        </Button>
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

  return <TaskBoard tasks={mappedTasks} isLoading={isLoading} isDemoMode={isDemoMode} />;
}
