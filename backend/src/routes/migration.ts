import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 导入客户数据
router.post('/customers', async (req, res) => {
  const { customers } = req.body
  
  if (!Array.isArray(customers)) {
    res.status(400).json({ error: '数据格式错误，需要数组格式' })
    return
  }
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }
  
  for (const customer of customers) {
    try {
      await prisma.customer.create({
        data: {
          name: customer.name || '未命名客户',
          phone: customer.phone,
          email: customer.email,
          gender: customer.gender,
          age: customer.age ? parseInt(customer.age) : null,
          idCard: customer.idCard,
          address: customer.address,
          company: customer.company,
          job: customer.job,
          income: customer.income,
          familyStatus: customer.familyStatus,
          insuranceNeeds: customer.insuranceNeeds,
          riskLevel: customer.riskLevel,
          source: customer.source,
          remark: customer.remark,
        },
      })
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push(`客户 ${customer.name}: ${error.message}`)
    }
  }
  
  res.json(results)
})

// 导入拜访记录
router.post('/visits', async (req, res) => {
  const { visits } = req.body
  
  if (!Array.isArray(visits)) {
    res.status(400).json({ error: '数据格式错误，需要数组格式' })
    return
  }
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }
  
  for (const visit of visits) {
    try {
      // 先查找客户
      let customerId = visit.customerId
      
      if (!customerId && visit.customerPhone) {
        const customer = await prisma.customer.findFirst({
          where: { phone: visit.customerPhone },
        })
        if (customer) {
          customerId = customer.id
        }
      }
      
      if (!customerId && visit.customerName) {
        const customer = await prisma.customer.findFirst({
          where: { name: visit.customerName },
        })
        if (customer) {
          customerId = customer.id
        }
      }
      
      if (!customerId) {
        results.failed++
        results.errors.push(`找不到客户: ${visit.customerName || visit.customerPhone}`)
        continue
      }
      
      await prisma.visitRecord.create({
        data: {
          customerId,
          visitTime: new Date(visit.visitTime),
          visitType: visit.visitType || '其他',
          content: visit.content || '',
          result: visit.result,
          nextPlan: visit.nextPlan,
          location: visit.location,
          duration: visit.duration ? parseInt(visit.duration) : null,
          sentiment: visit.sentiment,
        },
      })
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push(`拜访记录: ${error.message}`)
    }
  }
  
  res.json(results)
})

// 导入活动数据
router.post('/activities', async (req, res) => {
  const { activities } = req.body
  
  if (!Array.isArray(activities)) {
    res.status(400).json({ error: '数据格式错误，需要数组格式' })
    return
  }
  
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  }
  
  for (const activity of activities) {
    try {
      await prisma.activity.create({
        data: {
          title: activity.title || '未命名活动',
          type: activity.type || '其他',
          startTime: new Date(activity.startTime),
          endTime: activity.endTime ? new Date(activity.endTime) : null,
          location: activity.location,
          description: activity.description,
          maxParticipants: activity.maxParticipants ? parseInt(activity.maxParticipants) : null,
          status: activity.status || 'upcoming',
        },
      })
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push(`活动 ${activity.title}: ${error.message}`)
    }
  }
  
  res.json(results)
})

// 获取导入模板
router.get('/template/:type', async (req, res) => {
  const { type } = req.params
  
  const templates: Record<string, any> = {
    customers: {
      name: '客户姓名（必填）',
      phone: '手机号',
      email: '邮箱',
      gender: '性别（男/女）',
      age: '年龄',
      idCard: '身份证号',
      address: '地址',
      company: '工作单位',
      job: '职业',
      income: '收入范围',
      familyStatus: '家庭状况',
      insuranceNeeds: '保险需求',
      riskLevel: '风险等级（保守/稳健/积极）',
      source: '客户来源',
      remark: '备注',
    },
    visits: {
      customerPhone: '客户手机号（用于关联客户）',
      customerName: '客户姓名（用于关联客户）',
      visitTime: '拜访时间（格式：2024-01-01 10:00）',
      visitType: '拜访类型（面谈/电话/微信/其他）',
      content: '拜访内容',
      result: '拜访结果',
      nextPlan: '下一步计划',
      location: '拜访地点',
      duration: '拜访时长（分钟）',
      sentiment: '客户情绪（积极/中性/消极）',
    },
    activities: {
      title: '活动标题（必填）',
      type: '活动类型（沙龙/讲座/答谢会/其他）',
      startTime: '开始时间（格式：2024-01-01 10:00）',
      endTime: '结束时间',
      location: '活动地点',
      description: '活动描述',
      maxParticipants: '最大参与人数',
      status: '活动状态（upcoming/ongoing/completed/cancelled）',
    },
  }
  
  const template = templates[type]
  if (!template) {
    res.status(400).json({ error: '无效的模板类型' })
    return
  }
  
  res.json(template)
})

export default router
