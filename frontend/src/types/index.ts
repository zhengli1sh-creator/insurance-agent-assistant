// 客户类型
export interface Customer {
  id: string
  name: string
  phone?: string
  email?: string
  gender?: string
  age?: number
  idCard?: string
  address?: string
  company?: string
  job?: string
  income?: string
  familyStatus?: string
  insuranceNeeds?: string
  riskLevel?: string
  source?: string
  status: string
  remark?: string
  createdAt: string
  updatedAt: string
  _count?: {
    visitRecords: number
    participations: number
  }
}

// 拜访记录类型
export interface VisitRecord {
  id: string
  customerId: string
  visitTime: string
  visitType: string
  content: string
  result?: string
  nextPlan?: string
  location?: string
  duration?: number
  sentiment?: string
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    phone?: string
  }
}

// 活动类型
export interface Activity {
  id: string
  title: string
  type: string
  startTime: string
  endTime?: string
  location?: string
  description?: string
  maxParticipants?: number
  status: string
  createdAt: string
  updatedAt: string
  _count?: {
    participations: number
  }
  participations?: ActivityParticipation[]
}

// 活动参与记录类型
export interface ActivityParticipation {
  id: string
  activityId: string
  customerId: string
  registerTime: string
  attendTime?: string
  status: string
  feedback?: string
  satisfaction?: number
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    phone?: string
  }
  activity?: Activity
}

// 跟进工作类型
export interface FollowUp {
  id: string
  customerId: string
  visitRecordId?: string
  type: string
  content: string
  dueDate: string
  completedAt?: string
  status: string
  priority: string
  reminder: boolean
  createdAt: string
  updatedAt: string
  customer?: {
    id: string
    name: string
    phone?: string
  }
}

// 对话消息类型
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  emotion?: string
  createdAt: string
}

// 分页类型
export interface Pagination {
  page: number
  pageSize: number
  total: number
}

// API 响应类型
export interface ApiResponse<T> {
  data: T
  pagination?: Pagination
}
