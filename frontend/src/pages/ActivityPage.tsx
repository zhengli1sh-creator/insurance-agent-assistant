import { useEffect, useState } from 'react'
import { activityApi, customerApi } from '../services/api'
import type { Activity, Customer } from '../types'

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null)
  const [formData, setFormData] = useState<Partial<Activity>>({})
  const [participantCustomerId, setParticipantCustomerId] = useState('')

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const res = await activityApi.getList({ page, pageSize })
      setActivities(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (error) {
      alert('获取活动列表失败')
    }
    setLoading(false)
  }

  const fetchCustomers = async () => {
    try {
      const res = await customerApi.getList({ pageSize: 1000 })
      setCustomers(res.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchActivities()
    fetchCustomers()
  }, [page, pageSize])

  const handleAdd = () => {
    setEditingActivity(null)
    setFormData({})
    setDialogVisible(true)
  }

  const handleEdit = (record: Activity) => {
    setEditingActivity(record)
    setFormData(record)
    setDialogVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个活动吗？')) return
    try {
      await activityApi.delete(id)
      alert('删除成功')
      fetchActivities()
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingActivity) {
        await activityApi.update(editingActivity.id, formData)
        alert('更新成功')
      } else {
        await activityApi.create(formData)
        alert('创建成功')
      }
      setDialogVisible(false)
      fetchActivities()
    } catch (error) {
      alert('操作失败')
    }
  }

  const handleViewDetail = async (record: Activity) => {
    try {
      const res = await activityApi.getById(record.id)
      setSelectedActivity(res.data)
      setDetailVisible(true)
    } catch (error) {
      alert('获取活动详情失败')
    }
  }

  const handleAddParticipant = async () => {
    if (!participantCustomerId || !selectedActivity) return
    try {
      await activityApi.addParticipant(selectedActivity.id, participantCustomerId)
      alert('添加成功')
      setParticipantCustomerId('')
      handleViewDetail(selectedActivity)
    } catch (error) {
      alert('添加失败')
    }
  }

  const handleRemoveParticipant = async (customerId: string) => {
    if (!selectedActivity) return
    try {
      await activityApi.removeParticipant(selectedActivity.id, customerId)
      alert('删除成功')
      handleViewDetail(selectedActivity)
    } catch (error) {
      alert('删除失败')
    }
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, { text: string; className: string }> = {
      upcoming: { text: '即将开始', className: 'bg-blue-100 text-blue-600' },
      ongoing: { text: '进行中', className: 'bg-green-100 text-green-600' },
      completed: { text: '已结束', className: 'bg-gray-100 text-gray-600' },
      cancelled: { text: '已取消', className: 'bg-red-100 text-red-600' },
    }
    return statusMap[status] || { text: status, className: 'bg-gray-100 text-gray-600' }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
        <h2 className="text-lg font-medium">客户活动管理</h2>
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          新增活动
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动标题</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">开始时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动地点</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">参与人数</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              activities.map((activity) => (
                <tr key={activity.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{activity.title}</td>
                  <td className="px-4 py-3">{activity.type}</td>
                  <td className="px-4 py-3">{new Date(activity.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3">{activity.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusText(activity.status).className}`}>
                      {getStatusText(activity.status).text}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {activity._count?.participations || 0}{activity.maxParticipants ? `/${activity.maxParticipants}` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewDetail(activity)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      详情
                    </button>
                    <button
                      onClick={() => handleEdit(activity)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(activity.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      删除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="px-4 py-3 border-t flex items-center justify-between">
          <span className="text-sm text-gray-600">
            共 {total} 条记录，第 {page} / {totalPages} 页
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* 编辑弹窗 */}
      {dialogVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {editingActivity ? '编辑活动' : '新增活动'}
              </h3>
              <button
                onClick={() => setDialogVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动标题 *</label>
                  <input
                    type="text"
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动类型 *</label>
                  <select
                    value={formData.type || ''}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="沙龙">沙龙</option>
                    <option value="讲座">讲座</option>
                    <option value="答谢会">答谢会</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动状态 *</label>
                  <select
                    value={formData.status || 'upcoming'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="upcoming">即将开始</option>
                    <option value="ongoing">进行中</option>
                    <option value="completed">已结束</option>
                    <option value="cancelled">已取消</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">开始时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.startTime ? new Date(formData.startTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, startTime: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">结束时间</label>
                  <input
                    type="datetime-local"
                    value={formData.endTime ? new Date(formData.endTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, endTime: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动地点</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">最大人数</label>
                  <input
                    type="number"
                    value={formData.maxParticipants || ''}
                    onChange={(e) => setFormData({ ...formData, maxParticipants: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">活动描述</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t">
              <button
                onClick={() => setDialogVisible(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 详情弹窗 */}
      {detailVisible && selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">活动详情</h3>
              <button
                onClick={() => setDetailVisible(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* 活动信息 */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <span className="text-gray-500">活动标题：</span>
                  <span className="font-medium">{selectedActivity.title}</span>
                </div>
                <div>
                  <span className="text-gray-500">活动类型：</span>
                  <span className="font-medium">{selectedActivity.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">开始时间：</span>
                  <span className="font-medium">{new Date(selectedActivity.startTime).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-gray-500">活动地点：</span>
                  <span className="font-medium">{selectedActivity.location || '-'}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-500">活动描述：</span>
                  <span className="font-medium">{selectedActivity.description || '-'}</span>
                </div>
              </div>

              {/* 添加参与者 */}
              <div className="flex gap-4">
                <select
                  value={participantCustomerId}
                  onChange={(e) => setParticipantCustomerId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">选择客户</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                </select>
                <button
                  onClick={handleAddParticipant}
                  disabled={!participantCustomerId}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  添加参与
                </button>
              </div>

              {/* 参与者列表 */}
              <div>
                <h4 className="font-medium mb-3">参与客户</h4>
                <table className="w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">客户姓名</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">手机号</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">报名时间</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">状态</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">满意度</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedActivity.participations?.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">暂无参与客户</td>
                      </tr>
                    ) : (
                      selectedActivity.participations?.map((p) => (
                        <tr key={p.id} className="border-t">
                          <td className="px-4 py-2">{p.customer?.name || '-'}</td>
                          <td className="px-4 py-2">{p.customer?.phone || '-'}</td>
                          <td className="px-4 py-2">{new Date(p.registerTime).toLocaleString()}</td>
                          <td className="px-4 py-2">
                            <span className={`px-2 py-1 rounded text-xs ${
                              p.status === 'attended' ? 'bg-green-100 text-green-600' :
                              p.status === 'absent' ? 'bg-red-100 text-red-600' :
                              'bg-blue-100 text-blue-600'
                            }`}>
                              {p.status === 'registered' ? '已报名' :
                               p.status === 'attended' ? '已参加' :
                               p.status === 'absent' ? '未参加' : '已取消'}
                            </span>
                          </td>
                          <td className="px-4 py-2">{p.satisfaction ? `${p.satisfaction}星` : '-'}</td>
                          <td className="px-4 py-2">
                            <button
                              onClick={() => handleRemoveParticipant(p.customerId)}
                              className="text-red-600 hover:text-red-800"
                            >
                              删除
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
