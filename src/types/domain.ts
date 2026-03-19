export type ClientTier = "黑金私享" | "菁英优选" | "稳健成长";
export type TaskStatus = "待执行" | "进行中" | "已完成" | "已取消" | "已逾期";
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

export interface TaskItem {
  id: string;
  title: string;
  dueDate: string;
  status: TaskStatus;
  priority: "高" | "中" | "低";
  source: string;
  ownerHint: string;
}

export interface InsightGroup {
  id: string;
  title: string;
  description: string;
  count: number;
  tags: string[];
  suggestion: string;
}
