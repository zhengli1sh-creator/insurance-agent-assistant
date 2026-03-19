"use client";

import { useQuery } from "@tanstack/react-query";

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

export function LiveTaskBoard() {
  const query = useQuery({ queryKey: ["tasks-live"], queryFn: () => fetchJson<TaskEntity[]>("/api/tasks") });

  const mappedTasks = query.isError
    ? demoTasks
    : (query.data ?? []).map((item) => ({
        id: item.id,
        title: item.title,
        dueDate: formatTaskDueDate(item),
        status: item.status,
        priority: item.priority,
        source: formatTaskSource(item),
        ownerHint: formatTaskHint(item),
      }));

  return <TaskBoard tasks={mappedTasks} />;
}
