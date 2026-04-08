export type ClientTier = "黑金私享" | "菁英优选" | "稳健成长";

/**
 * 任务状态（展示层）
 * 对应数据库状态：待开始、已完成、已取消
 * 已过期是页面计算分区，不是存储状态
 */
export type TaskStatus = "待开始" | "已完成" | "已取消";

export type RecordKind = "拜访" | "活动";

export interface DashboardMetric {
  label: string;
  value: string;
  delta: string;
  accent: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  tier: ClientTier;
  city: string;
  assetFocus: string;
  tags: string[];
  relationshipStage: string;
  lastContact: string;
  nextAction: string;
  trustScore: number;
  note: string;
}

export interface RecordSummary {
  id: string;
  kind: RecordKind;
  title: string;
  customerNames: string[];
  happenedAt: string;
  summary: string;
  followUps: string[];
  tone: string;
}

/**
 * 任务展示项（前端展示层）
 */
export interface TaskItem {
  id: string;
  title: string;
  plannedAt: string;           // 计划执行时间（ISO 8601）
  remindAt: string | null;     // 提醒时间（ISO 8601）
  status: TaskStatus;
  priority: "高" | "中" | "低";
  customerId: string | null;
  customerName: string | null;
  sourceType: "manual" | "visit" | "activity";
  
  /** @deprecated 使用 sourceType 替代 */
  source?: string;
  /** @deprecated 使用 customerName 替代 */
  ownerHint?: string;
  /** @deprecated 使用 plannedAt 替代 */
  dueDate?: string;
}

export interface InsightGroup {
  id: string;
  title: string;
  description: string;
  count: number;
  tags: string[];
  suggestion: string;
}
