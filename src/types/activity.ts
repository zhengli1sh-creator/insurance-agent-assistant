export interface ActivityParticipant {
  customer_id: string;
  name: string;
  nick_name: string | null;
  follow_work: string | null;
  customer?: {
    id: string;
    name: string;
    nickname: string | null;
  } | null;
}

export interface ActivityRecordEntity {
  id: string;
  owner_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  name_activity: string;
  date_activity: string;
  location_activity: string | null;
  customer_profile: string | null;
  effect_profile: string | null;
  lessons_learned: string | null;
  created_at: string;
  updated_at: string;
  activity_participants?: ActivityParticipant[];
}

export interface ActivityParticipantInput {
  customerId: string;
  name: string;
  nickName?: string;
  followWork?: string;
}

export interface ActivityInput {
  nameActivity: string;
  dateActivity: string;
  locationActivity?: string;
  customerProfile?: string;
  effectProfile?: string;
  lessonsLearned?: string;
  participants: ActivityParticipantInput[];
}
