import { useEffect, useRef, useState } from 'react'
import { chatApi } from '../services/api'
import type { ChatMessage } from '../types'

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const recognitionRef = useRef<any>(null)

  // 语音合成
  const speak = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'zh-CN'
      utterance.rate = 1
      utterance.pitch = 1
      window.speechSynthesis.speak(utterance)
    }
  }

  // 初始化语音识别
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.lang = 'zh-CN'
      recognitionRef.current.continuous = false
      recognitionRef.current.interimResults = false

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript
        setInputValue(transcript)
        setIsRecording(false)
      }

      recognitionRef.current.onerror = () => {
        setIsRecording(false)
        alert('语音识别失败，请重试')
      }

      recognitionRef.current.onend = () => {
        setIsRecording(false)
      }
    }
  }, [])

  const fetchHistory = async () => {
    try {
      const res = await chatApi.getHistory({ pageSize: 100 })
      setMessages(res.data.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!inputValue.trim()) return

    const content = inputValue.trim()
    setInputValue('')
    setLoading(true)

    try {
      const res = await chatApi.sendMessage(content)
      await fetchHistory()
      
      // 语音播报 AI 回复
      speak(res.data.message.content)
    } catch (error) {
      alert('发送失败')
    }
    setLoading(false)
  }

  const handleClear = async () => {
    try {
      await chatApi.clearHistory()
      setMessages([])
      alert('已清空对话')
    } catch (error) {
      alert('清空失败')
    }
  }

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

  const getEmotionIcon = (emotion?: string) => {
    switch (emotion) {
      case '积极':
      case '兴奋':
        return '😊'
      case '消极':
      case '焦虑':
        return '😔'
      case '疲惫':
        return '😴'
      default:
        return '😐'
    }
  }

  const getEmotionColor = (emotion?: string) => {
    switch (emotion) {
      case '积极':
      case '兴奋':
        return 'bg-green-100 text-green-600'
      case '消极':
      case '焦虑':
        return 'bg-red-100 text-red-600'
      case '疲惫':
        return 'bg-yellow-100 text-yellow-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  const quickMessages = [
    '今天工作压力好大',
    '刚刚成功签单了！',
    '感觉最近业绩不太理想',
    '有点累了，想休息一下',
    '客户拒绝了，有点沮丧',
    '今天拜访了很多客户',
  ]

  return (
    <div className="flex flex-col h-full">
      {/* 头部 */}
      <div className="flex justify-between items-center p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="font-medium">AI 助手</span>
          <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded">在线</span>
        </div>
        <button
          onClick={handleClear}
          className="text-red-600 hover:text-red-800 text-sm"
        >
          清空对话
        </button>
      </div>

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-gray-400 mb-4 text-6xl">💬</div>
            <p className="text-gray-500">开始和 AI 助手对话吧</p>
            <div className="mt-6">
              <p className="text-gray-500 text-sm mb-3">快捷消息：</p>
              <div className="flex flex-wrap gap-2 max-w-md justify-center">
                {quickMessages.map((msg, index) => (
                  <button
                    key={index}
                    onClick={() => setInputValue(msg)}
                    className="px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-sm text-gray-700 transition-colors"
                  >
                    {msg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.role === 'assistant' && msg.emotion && (
                  <div className="flex items-center gap-1 mb-2 pb-2 border-b border-gray-200">
                    <span>{getEmotionIcon(msg.emotion)}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${getEmotionColor(msg.emotion)}`}>
                      检测到情绪：{msg.emotion}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap">{msg.content}</div>
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
      <div className="p-4 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={toggleRecording}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              isRecording
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span>{isRecording ? '🔴' : '🎤'}</span>
            <span>{isRecording ? '录音中...' : '语音'}</span>
          </button>
          <input
            type="text"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="输入消息或点击语音按钮说话..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <span>📤</span>
            <span>{loading ? '发送中...' : '发送'}</span>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          提示：您可以输入文字或使用语音与 AI 助手交流，助手会识别您的情绪并给予安慰和鼓励。
        </p>
      </div>
    </div>
  )
}
