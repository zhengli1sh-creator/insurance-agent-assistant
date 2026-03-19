export interface VisitRecordEntity {
  id: string;
  owner_id: string;
  customer_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  name: string;
  time_visit: string;
  location: string | null;
  core_pain: string | null;
  brief_content: string | null;
  follow_work: string | null;
  method_communicate: string | null;
  nick_name: string | null;
  title: string;
  summary: string;
  happened_at: string;
  tone: string | null;
  follow_ups: string[];
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    nickname: string | null;
  } | null;
}

export interface VisitInput {
  customerId?: string;
  name: string;
  timeVisit: string;
  location?: string;
  corePain?: string;
  briefContent?: string;
  followWork?: string;
  methodCommunicate?: string;
  nickName?: string;
  title?: string;
  summary?: string;
  happenedAt?: string;
  tone?: string;
  followUps?: string[];
}
