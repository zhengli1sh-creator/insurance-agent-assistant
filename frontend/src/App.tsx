import { useState, useRef, useEffect } from 'react'
import { chatApi, customerApi, visitApi, activityApi, queryApi } from './services/api'
import type { ChatMessage, Customer, VisitRecord, Activity } from './types'
import * as XLSX from 'xlsx'

// 消息类型扩展
interface ExtendedChatMessage extends ChatMessage {
  action?: 'create_customer' | 'query_customer' | 'create_visit' | 'query_visit' | 'create_activity' | 'import_data' | 'query' | 'normal'
  data?: any
  showForm?: boolean
}

export default function App() {
  const [messages, setMessages] = useState<ExtendedChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeView, setActiveView] = useState<'chat' | 'customers' | 'visits' | 'activities' | 'import'>('chat')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [visits, setVisits] = useState<VisitRecord[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'zh-CN'
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true

      recognitionRef.current.onresult = (event: any) => {
        const results = event.results
        const transcript = results[results.length - 1][0].transcript
        setInputValue(transcript)
        
        // 如果是最终结果，自动发送
        if (results[results.length - 1].isFinal) {
          handleSend(transcript)
        }
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('语音识别错误:', event.error)
        setIsRecording(false)
      }

      recognitionRef.current.onend = () => {
        if (isRecording) {
          recognitionRef.current.start()
        }
      }
    }
  }, [])

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 语音合成
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = 1.1
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  // 解析用户意图
  const parseIntent = (text: string) => {
    const lowerText = text.toLowerCase()
    
    // 创建客户意图
    if (/添加|新增|创建.*客户|录入.*客户|登记.*客户/.test(lowerText)) {
      return { type: 'create_customer', text }
    }
    
    // 查询客户意图
    if (/查询|查找|搜索.*客户|看看.*客户|有哪些客户/.test(lowerText)) {
      return { type: 'query_customer', text }
    }
    
    // 创建拜访记录意图
    if (/记录.*拜访|添加.*拜访|录入.*拜访|拜访.*客户/.test(lowerText)) {
      return { type: 'create_visit', text }
    }
    
    // 查询拜访记录意图
    if (/查询.*拜访|查看.*拜访|拜访记录/.test(lowerText)) {
      return { type: 'query_visit', text }
    }
    
    // 创建活动意图
    if (/创建.*活动|新增.*活动|添加.*活动/.test(lowerText)) {
      return { type: 'create_activity', text }
    }
    
    // 导入数据意图
    if (/导入.*数据|上传.*文件|批量导入/.test(lowerText)) {
      return { type: 'import_data', text }
    }
    
    return { type: 'normal', text }
  }

  // 处理发送消息
  const handleSend = async (text?: string) => {
    const content = text || inputValue.trim()
    if (!content) return

    setInputValue('')
    setLoading(true)

    // 添加用户消息
    const userMessage: ExtendedChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      createdAt: new Date().toISOString(),
    }
    setMessages(prev => [...prev, userMessage])

    // 解析意图
    const intent = parseIntent(content)
    
    try {
      let response: ExtendedChatMessage

      switch (intent.type) {
        case 'create_customer':
          response = await handleCreateCustomerIntent(content)
          break
        case 'query_customer':
          response = await handleQueryCustomerIntent(content)
          break
        case 'create_visit':
          response = await handleCreateVisitIntent(content)
          break
        case 'query_visit':
          response = await handleQueryVisitIntent(content)
          break
        case 'create_activity':
          response = await handleCreateActivityIntent(content)
          break
        case 'import_data':
          response = await handleImportDataIntent(content)
          break
        default:
          // 普通对话，调用 AI
          const aiRes = await chatApi.sendMessage(content)
          response = {
            id: Date.now().toString(),
            role: 'assistant',
            content: aiRes.data.message.content,
            emotion: aiRes.data.emotion,
            createdAt: new Date().toISOString(),
          }
      }

      setMessages(prev => [...prev, response])
      speak(response.content)
    } catch (error) {
      const errorMessage: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '抱歉，处理您的请求时出错了，请重试。',
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, errorMessage])
    }

    setLoading(false)
  }

  // 处理创建客户意图
  const handleCreateCustomerIntent = async (text: string): Promise<ExtendedChatMessage> => {
    // 尝试从文本中提取客户信息
    const nameMatch = text.match(/客户[:：]?(\S+)|姓名[:：]?(\S+)/)
    const phoneMatch = text.match(/电话[:：]?(\d+)|手机[:：]?(\d+)/)
    
    const extractedData = {
      name: nameMatch?.[1] || nameMatch?.[2] || '',
      phone: phoneMatch?.[1] || phoneMatch?.[2] || '',
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: extractedData.name 
        ? `我检测到您想添加客户"${extractedData.name}"，请确认信息或补充更多详情。`
        : '请告诉我客户的姓名和联系方式，我会帮您录入系统。',
      action: 'create_customer',
      data: extractedData,
      showForm: true,
      createdAt: new Date().toISOString(),
    }
  }

  // 处理查询客户意图
  const handleQueryCustomerIntent = async (text: string): Promise<ExtendedChatMessage> => {
    try {
      const res = await customerApi.getList({ pageSize: 10 })
      setCustomers(res.data.data)
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `为您找到 ${res.data.pagination.total} 位客户，以下是最近添加的：`,
        action: 'query_customer',
        data: res.data.data,
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: '查询客户信息失败，请稍后再试。',
        createdAt: new Date().toISOString(),
      }
    }
  }

  // 处理创建拜访意图
  const handleCreateVisitIntent = async (text: string): Promise<ExtendedChatMessage> => {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: '请告诉我拜访的客户姓名、拜访内容和结果，我会帮您记录。',
      action: 'create_visit',
      showForm: true,
      createdAt: new Date().toISOString(),
    }
  }

  // 处理查询拜访意图
  const handleQueryVisitIntent = async (text: string): Promise<ExtendedChatMessage> => {
    try {
      const res = await visitApi.getList({ pageSize: 10 })
      setVisits(res.data.data)
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: `为您找到 ${res.data.pagination.total} 条拜访记录：`,
        action: 'query_visit',
        data: res.data.data,
        createdAt: new Date().toISOString(),
      }
    } catch (error) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: '查询拜访记录失败，请稍后再试。',
        createdAt: new Date().toISOString(),
      }
    }
  }

  // 处理创建活动意图
  const handleCreateActivityIntent = async (text: string): Promise<ExtendedChatMessage> => {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: '请告诉我活动名称、时间和类型，我会帮您创建活动。',
      action: 'create_activity',
      showForm: true,
      createdAt: new Date().toISOString(),
    }
  }

  // 处理导入数据意图
  const handleImportDataIntent = async (text: string): Promise<ExtendedChatMessage> => {
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: '请点击下方的文件上传按钮，选择要导入的 Excel 文件。',
      action: 'import_data',
      showForm: true,
      createdAt: new Date().toISOString(),
    }
  }

  // 切换语音录制
  const toggleRecording = () => {
    if (!recognitionRef.current) {
      alert('您的浏览器不支持语音识别')
      return
    }

    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
    } else {
      recognitionRef.current.start()
      setIsRecording(true)
    }
  }

  // 创建客户
  const createCustomer = async (data: any) => {
    try {
      await customerApi.create(data)
      const res = await customerApi.getList({ pageSize: 10 })
      setCustomers(res.data.data)
      
      const successMsg: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `成功添加客户"${data.name}"！`,
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, successMsg])
      speak(`成功添加客户${data.name}！`)
    } catch (error) {
      alert('创建失败')
    }
  }

  // 创建拜访记录
  const createVisit = async (data: any) => {
    try {
      await visitApi.create(data)
      const successMsg: ExtendedChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '拜访记录已保存！',
        createdAt: new Date().toISOString(),
      }
      setMessages(prev => [...prev, successMsg])
      speak('拜访记录已保存！')
    } catch (error) {
      alert('创建失败')
    }
  }

  // 处理文件导入
  const handleFileImport = async (file: File) => {
    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet)

        await chatApi.sendMessage(`正在导入 ${jsonData.length} 条数据...`)
        
        const successMsg: ExtendedChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `成功导入 ${jsonData.length} 条数据！`,
          createdAt: new Date().toISOString(),
        }
        setMessages(prev => [...prev, successMsg])
        speak(`成功导入${jsonData.length}条数据！`)
      }
      reader.readAsArrayBuffer(file)
    } catch (error) {
      alert('导入失败')
    }
  }

  // 快捷指令
  const quickCommands = [
    { icon: '👤', text: '添加客户', action: () => handleSend('我要添加一个新客户') },
    { icon: '📅', text: '记录拜访', action: () => handleSend('记录一次客户拜访') },
    { icon: '🔍', text: '查询客户', action: () => handleSend('查询所有客户') },
    { icon: '📊', text: '查看拜访记录', action: () => handleSend('查看拜访记录') },
  ]

  return (
    <div className="h-screen flex bg-gray-50">
      {/* 侧边栏 */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-white border-r overflow-hidden`}>
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-blue-600">保险助手</h1>
          <p className="text-xs text-gray-500 mt-1">您的智能工作伙伴</p>
        </div>
        <nav className="p-2">
          <button
            onClick={() => setActiveView('chat')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${activeView === 'chat' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            <span>💬</span>
            <span>智能对话</span>
          </button>
          <button
            onClick={() => { setActiveView('customers'); handleSend('查询所有客户') }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${activeView === 'customers' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            <span>👤</span>
            <span>客户管理</span>
          </button>
          <button
            onClick={() => { setActiveView('visits'); handleSend('查看拜访记录') }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${activeView === 'visits' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            <span>📅</span>
            <span>拜访记录</span>
          </button>
          <button
            onClick={() => setActiveView('activities')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${activeView === 'activities' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            <span>🎉</span>
            <span>活动管理</span>
          </button>
          <button
            onClick={() => setActiveView('import')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-1 ${activeView === 'import' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50'}`}
          >
            <span>📤</span>
            <span>数据导入</span>
          </button>
        </nav>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 flex flex-col">
        {/* 顶部栏 */}
        <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              ☰
            </button>
            <h2 className="font-medium">
              {activeView === 'chat' && '智能对话'}
              {activeView === 'customers' && '客户管理'}
              {activeView === 'visits' && '拜访记录'}
              {activeView === 'activities' && '活动管理'}
              {activeView === 'import' && '数据导入'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></span>
            <span className="text-sm text-gray-500">{isRecording ? '录音中' : '就绪'}</span>
          </div>
        </header>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl mb-4">
                🤖
              </div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">我是您的保险助手</h3>
              <p className="text-gray-500 mb-6 max-w-md">
                我可以通过语音帮您管理客户、记录拜访、查询信息。<br/>
                点击下方的麦克风按钮开始说话吧！
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {quickCommands.map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={cmd.action}
                    className="flex items-center gap-2 px-4 py-2 bg-white border rounded-full hover:bg-gray-50 transition-colors"
                  >
                    <span>{cmd.icon}</span>
                    <span>{cmd.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border shadow-sm'
                }`}>
                  {msg.role === 'assistant' && (
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🤖</span>
                      {msg.emotion && (
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          msg.emotion === '积极' || msg.emotion === '兴奋' ? 'bg-green-100 text-green-600' :
                          msg.emotion === '消极' || msg.emotion === '焦虑' ? 'bg-red-100 text-red-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {msg.emotion}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  
                  {/* 显示数据表格 */}
                  {msg.action === 'query_customer' && msg.data && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-gray-500">
                            <th className="text-left py-1">姓名</th>
                            <th className="text-left py-1">电话</th>
                            <th className="text-left py-1">职业</th>
                          </tr>
                        </thead>
                        <tbody>
                          {msg.data.slice(0, 5).map((c: Customer) => (
                            <tr key={c.id} className="border-t">
                              <td className="py-2">{c.name}</td>
                              <td className="py-2">{c.phone || '-'}</td>
                              <td className="py-2">{c.job || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {msg.data.length > 5 && (
                        <p className="text-xs text-gray-500 mt-2">还有 {msg.data.length - 5} 位客户...</p>
                      )}
                    </div>
                  )}

                  {/* 显示表单 */}
                  {msg.showForm && msg.action === 'create_customer' && (
                    <CustomerForm 
                      initialData={msg.data} 
                      onSubmit={createCustomer}
                      onCancel={() => {}}
                    />
                  )}

                  <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="bg-white border-t p-4">
          <div className="max-w-4xl mx-auto flex gap-3">
            <button
              onClick={toggleRecording}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                isRecording 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder={isRecording ? '正在聆听...' : '输入消息或点击麦克风语音输入...'}
              className="flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '...' : '发送'}
            </button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            提示：点击麦克风按钮，直接说话即可。例如："添加客户张三，电话13800138000"
          </p>
        </div>
      </main>

      {/* 隐藏的文件输入 */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileImport(file)
        }}
        className="hidden"
      />
    </div>
  )
}

// 客户表单组件
function CustomerForm({ initialData, onSubmit, onCancel }: { 
  initialData: any, 
  onSubmit: (data: any) => void,
  onCancel: () => void 
}) {
  const [data, setData] = useState(initialData || {})

  return (
    <div className="mt-3 bg-gray-50 rounded-lg p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500">姓名 *</label>
          <input
            type="text"
            value={data.name || ''}
            onChange={(e) => setData({ ...data, name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">电话</label>
          <input
            type="text"
            value={data.phone || ''}
            onChange={(e) => setData({ ...data, phone: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500">性别</label>
          <select
            value={data.gender || ''}
            onChange={(e) => setData({ ...data, gender: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">请选择</option>
            <option value="男">男</option>
            <option value="女">女</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">年龄</label>
          <input
            type="number"
            value={data.age || ''}
            onChange={(e) => setData({ ...data, age: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500">职业</label>
          <input
            type="text"
            value={data.job || ''}
            onChange={(e) => setData({ ...data, job: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onSubmit(data)}
          className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          确认添加
        </button>
        <button
          onClick={onCancel}
          className="flex-1 py-2 border rounded-lg text-sm hover:bg-gray-100"
        >
          取消
        </button>
      </div>
    </div>
  )
}
