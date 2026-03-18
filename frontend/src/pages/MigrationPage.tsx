import { useState, useRef } from 'react'
import { migrationApi } from '../services/api'
import * as XLSX from 'xlsx'

interface MigrationResult {
  success: number
  failed: number
  errors: string[]
}

export default function MigrationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<MigrationResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 下载模板
  const downloadTemplate = () => {
    const template = [
      {
        name: '张三',
        age: '30',
        sex: '男',
        profession: '工程师',
        family_profile: '已婚，有一个孩子',
        core_interesting: '重疾险、医疗险',
        prefer_communicate: '微信',
        recent_money: '5-10万',
        nickname: '三哥',
        phone: '13800138000',
        email: 'zhangsan@example.com',
        insurance_needs: '需要重疾险保额50万，医疗险',
        customer_stage: 'potential',
        tags: ['VIP客户', '意向客户'],
        sys_platform: '扣子',
        uuid: 'uuid-001'
      }
    ]

    const ws = XLSX.utils.json_to_sheet(template)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '客户数据')
    XLSX.writeFile(wb, '客户导入模板.xlsx')
  }

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await migrationApi.importData(formData)
      setResult(res.data)
    } catch (error: any) {
      console.error('导入失败:', error)
      setResult({
        success: 0,
        failed: 0,
        errors: [error.response?.data?.error || '导入失败，请检查文件格式']
      })
    } finally {
      setLoading(false)
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">数据导入</h2>
          <p className="text-gray-500 mb-6">
            从 Excel 文件批量导入客户数据。支持 .xlsx 和 .xls 格式。
          </p>

          {/* 操作按钮 */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>📤</span>
              <span>{loading ? '导入中...' : '选择文件导入'}</span>
            </button>

            <button
              onClick={downloadTemplate}
              className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <span>📥</span>
              <span>下载导入模板</span>
            </button>
          </div>

          {/* 隐藏的文件输入 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* 导入结果 */}
          {result && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold text-gray-800 mb-3">导入结果</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{result.success}</div>
                  <div className="text-sm text-gray-600">成功导入</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{result.failed}</div>
                  <div className="text-sm text-gray-600">导入失败</div>
                </div>
              </div>

              {result.errors.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">错误详情:</h4>
                  <div className="max-h-60 overflow-y-auto">
                    {result.errors.map((error, idx) => (
                      <div key={idx} className="text-sm text-red-600 py-1 border-b border-red-100">
                        {idx + 1}. {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 字段说明 */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-3">字段说明</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="font-medium text-red-600">*</span>
                <span className="text-gray-700"> name（姓名）- 必填</span>
              </div>
              <div className="text-gray-600">age（年龄）</div>
              <div className="text-gray-600">sex（性别：男/女）</div>
              <div className="text-gray-600">profession（职业）</div>
              <div className="text-gray-600">family_profile（家庭情况）</div>
              <div className="text-gray-600">core_interesting（核心关注点）</div>
              <div className="text-gray-600">prefer_communicate（沟通偏好）</div>
              <div className="text-gray-600">recent_money（资金情况）</div>
              <div className="text-gray-600">nickname（客户昵称）</div>
              <div className="text-gray-600">phone（电话）</div>
              <div className="text-gray-600">email（邮箱）</div>
              <div className="text-gray-600">insurance_needs（保险需求）</div>
              <div className="text-gray-600">customer_stage（客户阶段）</div>
              <div className="text-gray-600">tags（标签，多个用逗号分隔）</div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              注意：客户姓名是必填字段，其他字段均为可选。去重判断依据是"姓名+昵称"组合。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
