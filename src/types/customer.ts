export interface CustomerRecord {
  id: string;
  owner_id: string;
  sys_platform: string;
  uuid: string;
  bstudio_create_time: string;
  name: string;
  age: string | null;
  sex: string | null;
  profession: string | null;
  family_profile: string | null;
  wealth_profile: string | null;
  core_interesting: string | null;
  prefer_communicate: string | null;
  source: string | null;
  nickname: string | null;
  recent_money: string | null;
  remark: string | null;
  created_at: string;

  updated_at: string;
}

export interface CustomerSnapshot {
  id: string;
  name: string;
  nickname: string | null;
}

export interface CustomerInput {
  name: string;
  age?: string;
  sex?: string;
  profession?: string;
  familyProfile?: string;
  wealthProfile?: string;
  coreInteresting?: string;
  preferCommunicate?: string;
  source?: string;
  nickname?: string;
  recentMoney?: string;
  remark?: string;
}


export interface CustomerCreatePayload {
  owner_id: string;
  sys_platform?: string;
  name: string;
  age?: string | null;
  sex?: string | null;
  profession?: string | null;
  family_profile?: string | null;
  wealth_profile?: string | null;
  core_interesting?: string | null;
  prefer_communicate?: string | null;
  source?: string | null;
  nickname?: string | null;
  recent_money?: string | null;
  remark?: string | null;
}


export interface CustomerUpdatePayload {
  name?: string;
  age?: string | null;
  sex?: string | null;
  profession?: string | null;
  family_profile?: string | null;
  wealth_profile?: string | null;
  core_interesting?: string | null;
  prefer_communicate?: string | null;
  source?: string | null;
  nickname?: string | null;
  recent_money?: string | null;
  remark?: string | null;
}

