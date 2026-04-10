/**
 * 任务管理类型定义
 * 基于任务管理设计文档 v1.0
 */

// ============================================
// 基础枚举类型
// ============================================

/**
 * 任务来源类型
 * - manual: 手工创建
 * - visit: 来源于拜访记录
 * - activity: 来源于活动记录
 */
export type TaskSourceTypeValue = "manual" | "visit" | "activity";

/**
 * 任务状态
 * - 待开始: 初始状态
 * - 已完成: 用户标记完成
 * - 已取消: 用户标记取消
 * @note 已过期是页面计算分区，不是存储状态
 */
export type TaskStatusValue = "待开始" | "已完成" | "已取消";

/**
 * 任务优先级
 */
export type TaskPriorityValue = "高" | "中" | "低";

// ============================================
// 数据库实体层
// ============================================

/**
 * 任务数据库实体
 * 对应 public.tasks 表
 */
export interface TaskEntity {
  // 核心字段
  id: string;
  owner_id: string;
  title: string;
  note: string | null;
  status: TaskStatusValue;
  priority: TaskPriorityValue;

  // 时间字段（均为 ISO 8601 格式时间戳）
  planned_at: string;           // 计划执行时间（必填）
  remind_at: string | null;     // 提醒时间（可空）
  completed_at: string | null;  // 完成时间（标记完成时自动填写）
  canceled_at: string | null;   // 取消时间（标记取消时自动填写）
  created_at: string;           // 创建时间
  updated_at: string;           // 更新时间

  // 关联字段
  customer_id: string | null;   // 关联客户 ID（可空）
  source_type: TaskSourceTypeValue;
  source_id: string | null;     // 来源记录 ID（可空）

  // 冗余字段（便于展示）
  customer_name: string | null;
  customer_nickname: string | null;

  // ============================================
  // 废弃字段（第一阶段保留兼容，第二阶段清理）
  // ============================================
  /** @deprecated 使用 planned_at 替代 */
  due_date?: string | null;
  /** @deprecated 使用 planned_at 替代 */
  due_at?: string | null;
  /** @deprecated 使用 note 替代 */
  description?: string | null;
  /** @deprecated 不再使用 */
  category?: string | null;
  /** @deprecated 不再使用 */
  result_note?: string | null;

  // 系统字段（保留但不直接使用）
  sys_platform?: string;
  uuid?: string;
  bstudio_create_time?: string;
}

// ============================================
// 业务操作层
// ============================================

/**
 * 创建任务请求参数
 */
export interface TaskCreatePayload {
  title: string;
  plannedAt: string;            // ISO 8601 格式
  remindAt?: string | null;     // ISO 8601 格式
  priority?: TaskPriorityValue; // 默认 "中"
  note?: string | null;
  customerId?: string | null;
  customerName?: string | null;      // 服务层按 customerId 回查后补齐
  customerNickname?: string | null;  // 服务层按 customerId 回查后补齐
  sourceType?: TaskSourceTypeValue; // 默认 "manual"
  sourceId?: string | null;
}

/**
 * 更新任务请求参数
 * 只允许修改特定字段，且只允许修改 "待开始" 状态的任务
 */
export interface TaskUpdatePayload {
  id: string;
  title?: string;
  plannedAt?: string;
  remindAt?: string | null;
  priority?: TaskPriorityValue;
  note?: string | null;
}

/**
 * 变更任务状态请求参数
 * 只允许从 "待开始" 改为 "已完成" 或 "已取消"
 */
export interface TaskStatusChangePayload {
  id: string;
  status: "已完成" | "已取消";
}

/**
 * 任务草稿项（用于拜访/活动来源的任务草稿）
 */
export interface TaskDraftItem {
  id: string;                   // 草稿项 ID
  title: string;
  priority: TaskPriorityValue;
  plannedAt: string;            // 使用 plannedAt 替代 dueDate
  remindAt: string | null;
  note: string | null;
  customerId: string | null;
  customerName: string | null;
}

/**
 * 任务草稿种子（来源于拜访/活动）
 */
export interface TaskDraftSeed {
  from: "visit" | "activity";
  sourceId: string;             // 拜访/活动记录 ID
  sourceDate: string;
  customerId: string | null;
  customerName: string | null;
  customerNickname: string | null;
  sourceSummary: string;
  drafts: TaskDraftItem[];
}

/**
 * 任务草稿确认会话
 * 用于支持中断恢复
 */
export interface TaskDraftSession {
  id: string;
  ownerId: string;
  sourceType: "visit" | "activity";
  sourceId: string;
  drafts: TaskDraftItem[];
  createdAt: string;
  confirmedAt: string | null;
  expiresAt: string;            // 草稿过期时间
}

/**
 * 任务分区查询结果
 * 服务端计算后的分区数据
 */
export interface TaskCategorizedResult {
  todayReminders: TaskEntity[];  // 今日提醒聚焦区
  pending: TaskEntity[];         // 待开始任务区
  overdue: TaskEntity[];         // 已过期任务区
  completed: TaskEntity[];       // 已完成任务区
  canceled: TaskEntity[];        // 已取消任务区
}

// ============================================
// 废弃类型（保留兼容）
// ============================================

/** @deprecated 使用 TaskCreatePayload 替代 */
export interface TaskSyncPayload {
  owner_id: string;
  sys_platform?: string;
  source_type: TaskSourceTypeValue | "customer" | "activity_event" | "activity_participant";
  source_id: string | null;
  title: string;
  status: TaskStatusValue | "待执行" | "进行中" | "已逾期";
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
