import { useState } from 'react'
import { queryApi } from '../services/api'
import type { Customer, VisitRecord, Activity, FollowUp } from '../types'

export default function QueryPage() {
  const [activeTab, setActiveTab] = useState('customer')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // 查询参数
  const [customerKeyword, setCustomerKeyword] = useState('')
  const [visitKeyword, setVisitKeyword] = useState('')
  const [activityKeyword, setActivityKeyword] = useState('')
  const [followUpStatus, setFollowUpStatus] = useState('')
  const [featureRiskLevel, setFeatureRiskLevel] = useState('')
  const [featureIncome, setFeatureIncome] = useState('')
  const [ageMin, setAgeMin] = useState('')
  const [ageMax, setAgeMax] = useState('')

  const handleSearch = async (type: string) => {
    setLoading(true)
    try {
      let res
      switch (type) {
        case 'customer':
          res = await queryApi.search({ type: 'customer', keyword: customerKeyword, page, pageSize })
          break
        case 'visit':
          res = await queryApi.search({ type: 'visit', keyword: visitKeyword, page, pageSize })
          break
        case 'activity':
          res = await queryApi.search({ type: 'activity', keyword: activityKeyword, page, pageSize })
          break
        case 'followup':
          res = await queryApi.search({ type: 'followup', status: followUpStatus, page, pageSize })
          break
        case 'customer-features':
          res = await queryApi.getCustomerFeatures({ 
            riskLevel: featureRiskLevel, 
            income: featureIncome,
            ageMin: ageMin ? parseInt(ageMin) : undefined,
            ageMax: ageMax ? parseInt(ageMax) : undefined,
            page, 
            pageSize 
          })
          break
      }
      setResults(res?.data?.data || [])
      setTotal(res?.data?.pagination?.total || 0)
    } catch (error) {
      alert('查询失败')
    }
    setLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  const tabs = [
    { key: 'customer', label: '客户查询' },
    { key: 'visit', label: '拜访记录查询' },
    { key: 'activity', label: '活动查询' },
    { key: 'followup', label: '跟进工作查询' },
    { key: 'customer-features', label: '特征客户查询' },
  ]

  const renderQueryForm = () => {
    switch (activeTab) {
      case 'customer':
        return (
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="搜索姓名、手机号、邮箱"
              value={customerKeyword}
              onChange={(e) => setCustomerKeyword(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSearch('customer')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        )
      case 'visit':
        return (
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="搜索拜访内容、结果"
              value={visitKeyword}
              onChange={(e) => setVisitKeyword(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSearch('visit')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        )
      case 'activity':
        return (
          <div className="flex gap-4 mb-4">
            <input
              type="text"
              placeholder="搜索活动标题、描述"
              value={activityKeyword}
              onChange={(e) => setActivityKeyword(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSearch('activity')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        )
      case 'followup':
        return (
          <div className="flex gap-4 mb-4">
            <select
              value={followUpStatus}
              onChange={(e) => setFollowUpStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有状态</option>
              <option value="pending">待跟进</option>
              <option value="completed">已完成</option>
              <option value="overdue">已逾期</option>
            </select>
            <button
              onClick={() => handleSearch('followup')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        )
      case 'customer-features':
        return (
          <div className="flex gap-4 mb-4 flex-wrap">
            <select
              value={featureRiskLevel}
              onChange={(e) => setFeatureRiskLevel(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">风险等级</option>
              <option value="保守">保守</option>
              <option value="稳健">稳健</option>
              <option value="积极">积极</option>
            </select>
            <select
              value={featureIncome}
              onChange={(e) => setFeatureIncome(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">收入范围</option>
              <option value="10万以下">10万以下</option>
              <option value="10-30万">10-30万</option>
              <option value="30-50万">30-50万</option>
              <option value="50万以上">50万以上</option>
            </select>
            <input
              type="number"
              placeholder="最小年龄"
              value={ageMin}
              onChange={(e) => setAgeMin(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              placeholder="最大年龄"
              value={ageMax}
              onChange={(e) => setAgeMax(e.target.value)}
              className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSearch('customer-features')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              查询
            </button>
          </div>
        )
    }
  }

  const renderResults = () => {
    if (results.length === 0) {
      return <div className="text-center py-8 text-gray-500">暂无数据，请先进行查询</div>
    }

    switch (activeTab) {
      case 'customer':
      case 'customer-features':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">姓名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">手机号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">性别</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">年龄</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">职业</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">风险等级</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">保险需求</th>
              </tr>
            </thead>
            <tbody>
              {results.map((customer: Customer) => (
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
                  <td className="px-4 py-3 max-w-xs truncate">{customer.insuranceNeeds || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      case 'visit':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">拜访内容</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">结果</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">情绪</th>
              </tr>
            </thead>
            <tbody>
              {results.map((visit: VisitRecord) => (
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
                </tr>
              ))}
            </tbody>
          </table>
        )
      case 'activity':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动标题</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">开始时间</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">活动地点</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
              </tr>
            </thead>
            <tbody>
              {results.map((activity: Activity) => (
                <tr key={activity.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{activity.title}</td>
                  <td className="px-4 py-3">{activity.type}</td>
                  <td className="px-4 py-3">{new Date(activity.startTime).toLocaleString()}</td>
                  <td className="px-4 py-3">{activity.location || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      activity.status === 'upcoming' ? 'bg-blue-100 text-blue-600' :
                      activity.status === 'ongoing' ? 'bg-green-100 text-green-600' :
                      activity.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {activity.status === 'upcoming' ? '即将开始' :
                       activity.status === 'ongoing' ? '进行中' :
                       activity.status === 'completed' ? '已结束' : '已取消'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      case 'followup':
        return (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">客户</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">跟进类型</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">跟进内容</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">截止日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">状态</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">优先级</th>
              </tr>
            </thead>
            <tbody>
              {results.map((followUp: FollowUp) => (
                <tr key={followUp.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{followUp.customer?.name || '-'}</td>
                  <td className="px-4 py-3">{followUp.type}</td>
                  <td className="px-4 py-3 max-w-xs truncate">{followUp.content}</td>
                  <td className="px-4 py-3">{new Date(followUp.dueDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      followUp.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                      followUp.status === 'completed' ? 'bg-green-100 text-green-600' :
                      'bg-red-100 text-red-600'
                    }`}>
                      {followUp.status === 'pending' ? '待跟进' :
                       followUp.status === 'completed' ? '已完成' : '已逾期'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      followUp.priority === 'high' ? 'bg-red-100 text-red-600' :
                      followUp.priority === 'normal' ? 'bg-yellow-100 text-yellow-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {followUp.priority === 'high' ? '高' :
                       followUp.priority === 'normal' ? '中' : '低'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm">
        {/* 标签页 */}
        <div className="border-b">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* 查询表单 */}
        <div className="p-4 border-b">
          {renderQueryForm()}
        </div>

        {/* 结果表格 */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          ) : (
            renderResults()
          )}

          {/* 分页 */}
          {results.length > 0 && (
            <div className="mt-4 flex items-center justify-between">
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
          )}
        </div>
      </div>
    </div>
  )
}
