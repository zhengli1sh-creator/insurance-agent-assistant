import axios from 'axios'

// 根据环境获取 API 基础 URL
const getBaseURL = () => {
  // 生产环境使用完整 URL
  if (import.meta.env.PROD && import.meta.env.VITE_API_URL) {
    return `${import.meta.env.VITE_API_URL}/api`
  }
  // 开发环境使用相对路径（通过代理）
  return '/api'
}

const api = axios.create({
  baseURL: getBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
})

// 客户 API
export const customerApi = {
  getList: (params?: { page?: number; pageSize?: number; keyword?: string; status?: string }) =>
    api.get('/customers', { params }),
  getById: (id: string) => api.get(`/customers/${id}`),
  create: (data: any) => api.post('/customers', data),
  update: (id: string, data: any) => api.put(`/customers/${id}`, data),
  delete: (id: string) => api.delete(`/customers/${id}`),
}

// 拜访记录 API
export const visitApi = {
  getList: (params?: { page?: number; pageSize?: number; customerId?: string; startDate?: string; endDate?: string }) =>
    api.get('/visits', { params }),
  getById: (id: string) => api.get(`/visits/${id}`),
  create: (data: any) => api.post('/visits', data),
  update: (id: string, data: any) => api.put(`/visits/${id}`, data),
  delete: (id: string) => api.delete(`/visits/${id}`),
}

// 活动 API
export const activityApi = {
  getList: (params?: { page?: number; pageSize?: number; status?: string; type?: string }) =>
    api.get('/activities', { params }),
  getById: (id: string) => api.get(`/activities/${id}`),
  create: (data: any) => api.post('/activities', data),
  update: (id: string, data: any) => api.put(`/activities/${id}`, data),
  delete: (id: string) => api.delete(`/activities/${id}`),
  addParticipant: (id: string, customerId: string) =>
    api.post(`/activities/${id}/participants`, { customerId }),
  updateParticipant: (id: string, customerId: string, data: any) =>
    api.put(`/activities/${id}/participants/${customerId}`, data),
  removeParticipant: (id: string, customerId: string) =>
    api.delete(`/activities/${id}/participants/${customerId}`),
}

// 查询 API
export const queryApi = {
  search: (params: { type: string; keyword?: string; status?: string; startDate?: string; endDate?: string; page?: number; pageSize?: number }) =>
    api.get('/query/search', { params }),
  getCustomerOverview: (id: string) => api.get(`/query/customer-overview/${id}`),
  getCustomerFeatures: (params?: { riskLevel?: string; ageMin?: number; ageMax?: number; income?: string; insuranceNeeds?: string; page?: number; pageSize?: number }) =>
    api.get('/query/customer-features', { params }),
}

// 对话 API
export const chatApi = {
  getHistory: (params?: { page?: number; pageSize?: number }) =>
    api.get('/chat/history', { params }),
  sendMessage: (content: string) => api.post('/chat/message', { content }),
  clearHistory: () => api.delete('/chat/history'),
}

// 数据迁移 API
export const migrationApi = {
  importCustomers: (customers: any[]) => api.post('/migration/customers', { customers }),
  importVisits: (visits: any[]) => api.post('/migration/visits', { visits }),
  importActivities: (activities: any[]) => api.post('/migration/activities', { customers: activities }),
  getTemplate: (type: string) => api.get(`/migration/template/${type}`),
}

export default api
