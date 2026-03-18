import { useEffect, useState } from 'react'
import { visitApi, customerApi } from '../services/api'
import type { VisitRecord, Customer } from '../types'

export default function VisitPage() {
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingVisit, setEditingVisit] = useState<VisitRecord | null>(null)
  const [formData, setFormData] = useState<Partial<VisitRecord>>({})

  const fetchVisits = async () => {
    setLoading(true)
    try {
      const res = await visitApi.getList({ page, pageSize })
      setVisits(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (error) {
      alert('获取拜访记录失败')
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
    fetchVisits()
    fetchCustomers()
  }, [page, pageSize])

  const handleAdd = () => {
    setEditingVisit(null)
    setFormData({ visitTime: new Date().toISOString() })
    setDialogVisible(true)
  }

  const handleEdit = (record: VisitRecord) => {
    setEditingVisit(record)
    setFormData(record)
    setDialogVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条拜访记录吗？')) return
    try {
      await visitApi.delete(id)
      alert('删除成功')
      fetchVisits()
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingVisit) {
        await visitApi.update(editingVisit.id, formData)
        alert('更新成功')
      } else {
        await visitApi.create(formData)
        alert('创建成功')
      }
      setDialogVisible(false)
      fetchVisits()
    } catch (error) {
      alert('操作失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-lg shadow-sm flex justify-between items-center">
        <h2 className="text-lg font-medium">拜访记录管理</h2>
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          新增拜访
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访时间</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访类型</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访内容</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">结果</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">情绪</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              visits.map((visit) => (
                <tr key={visit.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{visit.customer?.name || '-'}</td>
                  <td className="px-4 py-3">{new Date(visit.visitTime).toLocaleString()}</td>
                  <td className="px-4 py-3">{visit.visitType}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{visit.content}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{visit.result || '-'}</td>
                  <td className="px-4 py-3">
                    {visit.sentiment ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        visit.sentiment === '积极' ? 'bg-green-100 text-green-600' :
                        visit.sentiment === '消极' ? 'bg-red-100 text-red-600' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {visit.sentiment}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(visit)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(visit.id)}
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

      {dialogVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {editingVisit ? '编辑拜访记录' : '新增拜访记录'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户 *</label>
                  <select
                    value={formData.customerId || ''}
                    onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择客户</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访时间 *</label>
                  <input
                    type="datetime-local"
                    value={formData.visitTime ? new Date(formData.visitTime).toISOString().slice(0, 16) : ''}
                    onChange={(e) => setFormData({ ...formData, visitTime: new Date(e.target.value).toISOString() })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访类型 *</label>
                  <select
                    value={formData.visitType || ''}
                    onChange={(e) => setFormData({ ...formData, visitType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="面谈">面谈</option>
                    <option value="电话">电话</option>
                    <option value="微信">微信</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访地点</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访时长(分钟)</label>
                  <input
                    type="number"
                    value={formData.duration || ''}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户情绪</label>
                  <select
                    value={formData.sentiment || ''}
                    onChange={(e) => setFormData({ ...formData, sentiment: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="积极">积极</option>
                    <option value="中性">中性</option>
                    <option value="消极">消极</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访内容 *</label>
                  <textarea
                    value={formData.content || ''}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">拜访结果</label>
                  <textarea
                    value={formData.result || ''}
                    onChange={(e) => setFormData({ ...formData, result: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">下一步计划</label>
                  <textarea
                    value={formData.nextPlan || ''}
                    onChange={(e) => setFormData({ ...formData, nextPlan: e.target.value })}
                    rows={2}
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
    </div>
  )
}
