import { useEffect, useState } from 'react'
import { customerApi } from '../services/api'
import type { Customer } from '../types'

export default function CustomerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [dialogVisible, setDialogVisible] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [formData, setFormData] = useState<Partial<Customer>>({})

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await customerApi.getList({
        page,
        pageSize,
        keyword: keyword || undefined,
      })
      setCustomers(res.data.data)
      setTotal(res.data.pagination.total)
    } catch (error) {
      alert('获取客户列表失败')
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCustomers()
  }, [page, pageSize])

  const handleSearch = () => {
    setPage(1)
    fetchCustomers()
  }

  const handleAdd = () => {
    setEditingCustomer(null)
    setFormData({})
    setDialogVisible(true)
  }

  const handleEdit = (record: Customer) => {
    setEditingCustomer(record)
    setFormData(record)
    setDialogVisible(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个客户吗？')) return
    try {
      await customerApi.delete(id)
      alert('删除成功')
      fetchCustomers()
    } catch (error) {
      alert('删除失败')
    }
  }

  const handleSubmit = async () => {
    try {
      if (editingCustomer) {
        await customerApi.update(editingCustomer.id, formData)
        alert('更新成功')
      } else {
        await customerApi.create(formData)
        alert('创建成功')
      }
      setDialogVisible(false)
      fetchCustomers()
    } catch (error) {
      alert('操作失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div className="space-y-4">
      {/* 搜索栏 */}
      <div className="bg-white p-4 rounded-lg shadow-sm flex gap-4">
        <input
          type="text"
          placeholder="搜索客户姓名或手机号"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          搜索
        </button>
        <button
          onClick={handleAdd}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          新增客户
        </button>
      </div>

      {/* 表格 */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">性别</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">年龄</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">职业</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">风险等级</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访/活动</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">加载中...</td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">暂无数据</td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{customer.name}</td>
                  <td className="px-4 py-3">{customer.phone || '-'}</td>
                  <td className="px-4 py-3">{customer.gender || '-'}</td>
                  <td className="px-4 py-3">{customer.age || '-'}</td>
                  <td className="px-4 py-3">{customer.job || '-'}</td>
                  <td className="px-4 py-3">
                    {customer.riskLevel ? (
                      <span className={`px-2 py-1 rounded text-xs ${
                        customer.riskLevel === '保守' ? 'bg-gray-100 text-gray-600' :
                        customer.riskLevel === '稳健' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {customer.riskLevel}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    {customer._count?.visitRecords || 0} / {customer._count?.participations || 0}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="text-blue-600 hover:text-blue-800 mr-3"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
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

        {/* 分页 */}
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

      {/* 弹窗 */}
      {dialogVisible && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-medium">
                {editingCustomer ? '编辑客户' : '新增客户'}
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                  <select
                    value={formData.gender || ''}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="男">男</option>
                    <option value="女">女</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
                  <input
                    type="number"
                    value={formData.age || ''}
                    onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">职业</label>
                  <input
                    type="text"
                    value={formData.job || ''}
                    onChange={(e) => setFormData({ ...formData, job: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">工作单位</label>
                  <input
                    type="text"
                    value={formData.company || ''}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                  <select
                    value={formData.riskLevel || ''}
                    onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">请选择</option>
                    <option value="保守">保守</option>
                    <option value="稳健">稳健</option>
                    <option value="积极">积极</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户来源</label>
                  <input
                    type="text"
                    value={formData.source || ''}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">保险需求</label>
                  <input
                    type="text"
                    value={formData.insuranceNeeds || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceNeeds: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                  <textarea
                    value={formData.remark || ''}
                    onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
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
    </div>
  )
}
