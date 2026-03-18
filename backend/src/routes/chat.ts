import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 获取对话历史
router.get('/history', async (req, res) => {
  const { page = '1', pageSize = '20' } = req.query
  
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  
  const [messages, total] = await Promise.all([
    prisma.chatHistory.findMany({
      skip,
      take: parseInt(pageSize as string),
      orderBy: { createdAt: 'asc' },
    }),
    prisma.chatHistory.count(),
  ])
  
  res.json({
    data: messages,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
    },
  })
})

// 发送消息并获取 AI 回复
router.post('/message', async (req, res) => {
  const { content } = req.body
  
  if (!content) {
    res.status(400).json({ error: '消息内容不能为空' })
    return
  }
  
  // 保存用户消息
  await prisma.chatHistory.create({
    data: {
      role: 'user',
      content,
    },
  })
  
  // 模拟情绪识别
  const emotions = ['积极', '中性', '消极', '焦虑', '疲惫', '兴奋']
  const detectedEmotion = detectEmotion(content)
  
  // 生成 AI 回复
  const reply = generateReply(content, detectedEmotion)
  
  // 保存 AI 回复
  const assistantMessage = await prisma.chatHistory.create({
    data: {
      role: 'assistant',
      content: reply,
      emotion: detectedEmotion,
    },
  })
  
  res.json({
    message: assistantMessage,
    emotion: detectedEmotion,
  })
})

// 清空对话历史
router.delete('/history', async (req, res) => {
  await prisma.chatHistory.deleteMany({})
  res.json({ success: true })
})

// 情绪识别函数
function detectEmotion(content: string): string {
  const content_lower = content.toLowerCase()
  
  // 焦虑/压力关键词
  if (/压力|焦虑|担心|害怕|紧张|累|疲惫|困难|挑战|业绩|目标|完不成/.test(content_lower)) {
    return '焦虑'
  }
  
  // 消极关键词
  if (/失败|失望|难过|伤心|沮丧|郁闷|不开心|不好|糟|差/.test(content_lower)) {
    return '消极'
  }
  
  // 积极关键词
  if (/开心|高兴|成功|棒|好|优秀|满意|顺利|成交|签约/.test(content_lower)) {
    return '积极'
  }
  
  // 兴奋关键词
  if (/激动|兴奋|太棒了|厉害|完美|惊喜/.test(content_lower)) {
    return '兴奋'
  }
  
  // 疲惫关键词
  if (/累|困|疲倦| exhaustion|想休息|撑不住/.test(content_lower)) {
    return '疲惫'
  }
  
  return '中性'
}

// 生成回复函数
function generateReply(content: string, emotion: string): string {
  const replies: Record<string, string[]> = {
    '焦虑': [
      '我理解您的压力，保险销售确实需要面对很多挑战。但请相信，每一次努力都在为未来积累。深呼吸，我们一步步来，您已经做得很棒了！',
      '焦虑是正常的，说明您对工作有责任心。试着把大目标分解成小目标，每完成一个就给自己一点鼓励。记住，您的价值不只是一张保单。',
      '压力大的话，不妨先停下来休息片刻。调整好心态再出发，您会比现在更有力量。我相信您的能力！',
    ],
    '消极': [
      '每个人都会有低谷期，这并不代表您的能力。失败是成功的一部分，它让我们更强大。请相信自己，明天会更好！',
      '我理解您的失落，但请不要对自己太苛刻。销售有起有落很正常，重要的是保持信心。您曾经成功过，未来也一定会！',
      '挫折只是暂时的，您的努力和坚持终将得到回报。给自己一个拥抱，然后重新出发，我会一直支持您！',
    ],
    '积极': [
      '太棒了！听到您的好消息我也为您开心！保持这份热情和信心，您会创造更多佳绩的！继续加油！',
      '您的积极态度真让人感染！成功总是青睐有准备的人，您做到了！期待您更多的好消息！',
      '看到您这么开心，我也感到很高兴！请继续保持这份干劲，您是最棒的！',
    ],
    '兴奋': [
      '哇！太厉害了！您的努力终于有了回报，真为您感到骄傲！这份喜悦值得好好庆祝一下！',
      '太棒了！这就是坚持的力量！您的成功不是偶然，是实力的体现！继续冲吧！',
      '恭喜恭喜！看到您这么激动，我也被感染了！这是您应得的，继续创造更多辉煌吧！',
    ],
    '疲惫': [
      '辛苦了！您已经付出了很多，现在需要的是好好休息。只有照顾好自己，才能走得更远。好好睡一觉，明天又是新的一天！',
      '疲惫说明您一直在努力，但请记住休息也是工作的一部分。给自己放个假，充好电再出发，您会更有力量！',
      '累了就休息一下吧，不要硬撑。您的健康最重要，调整好状态再回来，我会一直在这里等您！',
    ],
    '中性': [
      '您好！我是您的专属工作助手，有什么我可以帮您的吗？无论是客户管理还是情绪支持，我都在这里！',
      '收到！有什么需要我协助的吗？比如查询客户信息、记录拜访情况，或者只是想聊聊天，我随时待命！',
      '好的！作为您的助手，我会一直陪伴您左右。有任何需要随时告诉我，我们一起把工作做得更好！',
    ],
  }
  
  const emotionReplies = replies[emotion] || replies['中性']
  return emotionReplies[Math.floor(Math.random() * emotionReplies.length)]
}

export default router
