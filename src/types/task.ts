export type TaskSourceTypeValue = "manual" | "customer" | "visit" | "activity" | "activity_event" | "activity_participant";
export type TaskStatusValue = "待执行" | "进行中" | "已完成" | "已取消" | "已逾期";
export type TaskPriorityValue = "高" | "中" | "低";

export interface TaskEntity {
  id: string;
  owner_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  source_type: TaskSourceTypeValue;
  source_id: string | null;
  title: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  description: string | null;
  category: string | null;
  customer_id: string | null;
  customer_name: string | null;
  customer_nickname: string | null;
  due_date: string | null;
  remind_at: string | null;
  completed_at: string | null;
  result_note: string | null;
  due_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSyncPayload {
  owner_id: string;
  sys_platform?: string;
  source_type: TaskSourceTypeValue;
  source_id: string | null;
  title: string;
  status: TaskStatusValue;
  priority: TaskPriorityValue;
  description?: string | null;
  category?: string | null;
  customer_id?: string | null;
  customer_name?: string | null;
  customer_nickname?: string | null;
  due_date?: string | null;
  remind_at?: string | null;
  completed_at?: string | null;
  result_note?: string | null;
  due_at?: string | null;
  note?: string | null;
}
