import { useState } from 'react'
import { migrationApi } from '../services/api'
import * as XLSX from 'xlsx'

export default function MigrationPage() {
  const [activeTab, setActiveTab] = useState('customers')
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<any>(null)

  const handleFileUpload = async (file: File, type: string) => {
    setImporting(true)
    setImportResults(null)

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        let res
        switch (type) {
          case 'customers':
            res = await migrationApi.importCustomers(jsonData)
            break
          case 'visits':
            res = await migrationApi.importVisits(jsonData)
            break
          case 'activities':
            res = await migrationApi.importActivities(jsonData)
            break
          default:
            throw new Error('未知的数据类型')
        }

        setImportResults(res.data)
        alert('导入完成')
      }
      reader.readAsArrayBuffer(file)
    } catch (error: any) {
      alert('导入失败：' + error.message)
    }
    setImporting(false)
  }

  const downloadTemplate = (type: string) => {
    const templates: Record<string, any[]> = {
      customers: [
        {
          name: '张三',
          phone: '13800138000',
          email: 'zhangsan@example.com',
          gender: '男',
          age: 35,
          idCard: '110101199001011234',
          address: '北京市朝阳区xxx街道',
          company: '某科技公司',
          job: '工程师',
          income: '30-50万',
          familyStatus: '已婚，有一子',
          insuranceNeeds: '重疾险、医疗险',
          riskLevel: '稳健',
          source: '转介绍',
          remark: '重点客户',
        },
      ],
      visits: [
        {
          customerPhone: '13800138000',
          customerName: '张三',
          visitTime: '2024-01-15 14:30',
          visitType: '面谈',
          content: '介绍新产品，了解客户需求',
          result: '客户有兴趣，约定下次详谈',
          nextPlan: '一周后电话跟进',
          location: '客户公司',
          duration: 60,
          sentiment: '积极',
        },
      ],
      activities: [
        {
          title: '2024年新春客户答谢会',
          type: '答谢会',
          startTime: '2024-02-10 14:00',
          endTime: '2024-02-10 17:00',
          location: '某酒店宴会厅',
          description: '感谢客户一年来的支持',
          maxParticipants: 100,
          status: 'upcoming',
        },
      ],
    }

    const template = templates[type]
    const worksheet = XLSX.utils.json_to_sheet(template)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template')
    XLSX.writeFile(workbook, `${type}_template.xlsx`)
  }

  const tabs = [
    { key: 'customers', label: '客户数据导入' },
    { key: 'visits', label: '拜访记录导入' },
    { key: 'activities', label: '活动数据导入' },
  ]

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-4 border-b">
          <h2 className="text-lg font-medium">数据迁移</h2>
          <p className="text-gray-500 text-sm mt-1">
            您可以通过上传 Excel 文件的方式将现有数据导入系统。请先下载对应的数据模板，
            按照模板格式填写数据后再上传。
          </p>
        </div>

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

        {/* 导入区域 */}
        <div className="p-6 space-y-4">
          <button
            onClick={() => downloadTemplate(activeTab)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <span>📥</span>
            <span>下载{activeTab === 'customers' ? '客户' : activeTab === 'visits' ? '拜访记录' : '活动'}模板</span>
          </button>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  handleFileUpload(file, activeTab)
                }
              }}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <span className="text-4xl mb-2">📤</span>
              <p className="text-gray-600">点击上传 Excel 文件</p>
              <p className="text-gray-400 text-sm mt-1">支持 .xlsx, .xls 格式</p>
            </label>
          </div>

          {importing && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="text-gray-500 mt-2">导入中...</p>
            </div>
          )}

          {importResults && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">导入结果</h4>
              <div className="flex gap-4 mb-2">
                <span className="px-2 py-1 bg-green-100 text-green-600 rounded text-sm">成功: {importResults.success}</span>
                <span className="px-2 py-1 bg-red-100 text-red-600 rounded text-sm">失败: {importResults.failed}</span>
              </div>
              {importResults.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-500 text-sm">错误详情：</p>
                  <ul className="text-sm text-red-500 mt-1 max-h-32 overflow-y-auto">
                    {importResults.errors.map((error: string, index: number) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 导入说明 */}
        <div className="p-4 bg-blue-50 m-4 rounded-lg">
          <h4 className="font-medium mb-2">导入说明</h4>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>请使用系统提供的模板文件，确保数据格式正确</li>
            <li>客户姓名和拜访记录中的客户信息会自动关联</li>
            <li>日期格式请使用：YYYY-MM-DD HH:mm</li>
            <li>导入过程中如有错误，系统会显示详细的错误信息</li>
            <li>建议先导入客户数据，再导入拜访记录和活动数据</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
