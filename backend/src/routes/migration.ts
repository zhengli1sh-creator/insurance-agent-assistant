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
      // 检查客户姓名是否为空
      const name = customer.name?.trim()
      if (!name) {
        results.failed++
        results.errors.push(`客户记录缺少姓名`)
        continue
      }

      // 去重判断：姓名 + 昵称
      const existingCustomer = await prisma.customer.findFirst({
        where: {
          name: name,
          nickname: customer.nickname || null,
        },
      })

      if (existingCustomer) {
        results.failed++
        results.errors.push(`客户 ${name} (昵称: ${customer.nickname || '无'}) 已存在，跳过导入`)
        continue
      }

      // 检查是否为扣子平台数据（有 uuid 字段）
      const isCozeData = customer.uuid || customer.sys_platform === 'coze'

      // 转换扣子字段到新 schema
      const customerData: any = {
        name: name,

        // 扣子字段映射
        age: customer.age || '未知',
        sex: mapGender(customer.sex || customer.gender),
        profession: customer.profession || customer.job,
        family_profile: customer.family_profile || customer.familyStatus,

        // 扣子特有字段
        core_interesting: customer.core_interesting,
        prefer_communicate: customer.prefer_communicate,
        recent_money: customer.recent_money,
        nickname: customer.nickname,

        // 平台信息
        sys_platform: customer.sys_platform || 'coze',
        uuid: customer.uuid,

        // 新增字段
        phone: customer.phone,
        email: customer.email,
        insurance_needs: customer.insurance_needs || customer.insuranceNeeds,
        customer_stage: customer.customer_stage || (customer.uuid ? 'potential' : undefined),
        tags: customer.tags || [],

        // 来源和状态
        source: customer.source || customer.sys_platform || 'coze',
        status: customer.status || 'active',

        // 备注
        remark: customer.remark,

        // 时间戳
        bstudio_create_time: customer.bstudio_create_time ? new Date(customer.bstudio_create_time) : undefined,

        // 元数据
        metadata: {
          ...(customer.metadata || {}),
          ...(isCozeData ? {
            migrated_from: 'coze',
            migrated_at: new Date().toISOString(),
          } : {}),
        },
      }

      // 过滤 undefined 值
      Object.keys(customerData).forEach(key => {
        if (customerData[key] === undefined) {
          delete customerData[key]
        }
      })

      await prisma.customer.create({
        data: customerData,
      })
      results.success++
    } catch (error: any) {
      results.failed++
      results.errors.push(`客户 ${customer.name || '未命名'}: ${error.message}`)
    }
  }

  res.json(results)
})

// 性别映射函数
function mapGender(gender: string | undefined): string {
  if (!gender) return 'unknown'
  const g = gender.toLowerCase()
  if (g === '男' || g === 'male' || g === '1') return 'male'
  if (g === '女' || g === 'female' || g === '2') return 'female'
  return 'unknown'
}

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
          customer_id: customerId,
          visit_time: new Date(visit.visitTime || visit.visit_time),
          visit_type: visit.visitType || visit.visit_type || 'other',
          location: visit.location,
          duration: visit.duration ? parseInt(visit.duration) : null,
          purpose: visit.purpose,
          content: visit.content || '',
          result: visit.result,
          next_plan: visit.nextPlan || visit.next_plan,
          next_date: visit.nextDate || visit.next_date ? new Date(visit.nextDate || visit.next_date) : null,
          sentiment: visit.sentiment,
          interest_level: visit.interest_level,
          concerns: visit.concerns,
          attachment: visit.attachment,
          metadata: visit.metadata,
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
          type: activity.type || 'other',
          description: activity.description,
          start_time: new Date(activity.startTime || activity.start_time),
          end_time: activity.endTime || activity.end_time ? new Date(activity.endTime || activity.end_time) : null,
          location: activity.location,
          online_link: activity.online_link,
          max_participants: activity.max_participants ? parseInt(activity.max_participants) : null,
          status: activity.status || 'upcoming',
          priority: activity.priority,
          cover_image: activity.cover_image,
          materials: activity.materials || [],
          metadata: activity.metadata,
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
      age: '年龄',
      sex: '性别（male/female/unknown）',
      profession: '职业',
      family_profile: '家庭情况',
      core_interesting: '核心关注点',
      prefer_communicate: '沟通偏好',
      recent_money: '资金情况',
      nickname: '客户昵称',
      sys_platform: '平台来源（如 coze）',
      uuid: '用户唯一标识',
      phone: '手机号',
      email: '邮箱',
      insurance_needs: '保险需求',
      customer_stage: '客户阶段（potential/contacted/proposal/negotiation/won/lost）',
      tags: '客户标签（数组，如 ["VIP", "潜客"]）',
      source: '客户来源',
      status: '状态（active/inactive/blacklist）',
      remark: '备注',
    },
    visits: {
      customerPhone: '客户手机号（用于关联客户）',
      customerName: '客户姓名（用于关联客户）',
      visitTime: '拜访时间（格式：2024-01-01 10:00）',
      visitType: '拜访类型（face-to-face/phone/wechat/email/other）',
      content: '拜访内容',
      result: '拜访结果',
      nextPlan: '下一步计划',
      location: '拜访地点',
      duration: '拜访时长（分钟）',
      sentiment: '客户情绪（positive/neutral/negative）',
    },
    activities: {
      title: '活动标题（必填）',
      type: '活动类型（seminar/lecture/appreciation/other）',
      startTime: '开始时间（格式：2024-01-01 10:00）',
      endTime: '结束时间',
      location: '活动地点',
      description: '活动描述',
      max_participants: '最大参与人数',
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
