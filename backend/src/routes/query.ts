import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 综合查询
router.get('/search', async (req, res) => {
  const {
    type,
    keyword,
    startDate,
    endDate,
    status,
    page = '1',
    pageSize = '10',
  } = req.query
  
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  
  switch (type) {
    case 'customer':
      // 客户基本信息查询
      const customerWhere: any = {}
      if (keyword) {
        customerWhere.OR = [
          { name: { contains: keyword as string } },
          { phone: { contains: keyword as string } },
          { email: { contains: keyword as string } },
        ]
      }
      if (status) customerWhere.status = status
      
      const [customers, customerTotal] = await Promise.all([
        prisma.customer.findMany({
          where: customerWhere,
          skip,
          take: parseInt(pageSize as string),
          orderBy: { createdAt: 'desc' },
        }),
        prisma.customer.count({ where: customerWhere }),
      ])
      
      res.json({
        type: 'customer',
        data: customers,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          total: customerTotal,
        },
      })
      break
      
    case 'visit':
      // 拜访记录查询
      const visitWhere: any = {}
      if (keyword) {
        visitWhere.OR = [
          { content: { contains: keyword as string } },
          { result: { contains: keyword as string } },
        ]
      }
      if (startDate) visitWhere.visitTime = { ...visitWhere.visitTime, gte: new Date(startDate as string) }
      if (endDate) visitWhere.visitTime = { ...visitWhere.visitTime, lte: new Date(endDate as string) }
      
      const [visits, visitTotal] = await Promise.all([
        prisma.visitRecord.findMany({
          where: visitWhere,
          skip,
          take: parseInt(pageSize as string),
          orderBy: { visitTime: 'desc' },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        }),
        prisma.visitRecord.count({ where: visitWhere }),
      ])
      
      res.json({
        type: 'visit',
        data: visits,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          total: visitTotal,
        },
      })
      break
      
    case 'activity':
      // 活动查询
      const activityWhere: any = {}
      if (keyword) {
        activityWhere.OR = [
          { title: { contains: keyword as string } },
          { description: { contains: keyword as string } },
        ]
      }
      if (status) activityWhere.status = status
      if (startDate) activityWhere.startTime = { ...activityWhere.startTime, gte: new Date(startDate as string) }
      if (endDate) activityWhere.startTime = { ...activityWhere.startTime, lte: new Date(endDate as string) }
      
      const [activities, activityTotal] = await Promise.all([
        prisma.activity.findMany({
          where: activityWhere,
          skip,
          take: parseInt(pageSize as string),
          orderBy: { startTime: 'desc' },
        }),
        prisma.activity.count({ where: activityWhere }),
      ])
      
      res.json({
        type: 'activity',
        data: activities,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          total: activityTotal,
        },
      })
      break
      
    case 'followup':
      // 跟进工作查询
      const followUpWhere: any = {}
      if (status) followUpWhere.status = status
      if (startDate) followUpWhere.dueDate = { ...followUpWhere.dueDate, gte: new Date(startDate as string) }
      if (endDate) followUpWhere.dueDate = { ...followUpWhere.dueDate, lte: new Date(endDate as string) }
      
      const [followUps, followUpTotal] = await Promise.all([
        prisma.followUp.findMany({
          where: followUpWhere,
          skip,
          take: parseInt(pageSize as string),
          orderBy: { dueDate: 'asc' },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        }),
        prisma.followUp.count({ where: followUpWhere }),
      ])
      
      res.json({
        type: 'followup',
        data: followUps,
        pagination: {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          total: followUpTotal,
        },
      })
      break
      
    default:
      res.status(400).json({ error: '无效的查询类型' })
  }
})

// 客户整体情况查询
router.get('/customer-overview/:id', async (req, res) => {
  const { id } = req.params
  
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      visitRecords: {
        orderBy: { visitTime: 'desc' },
      },
      participations: {
        include: {
          activity: true,
        },
        orderBy: { registerTime: 'desc' },
      },
      followUps: {
        orderBy: { dueDate: 'desc' },
      },
    },
  })
  
  if (!customer) {
    res.status(404).json({ error: '客户不存在' })
    return
  }
  
  // 统计信息
  const stats = {
    totalVisits: customer.visitRecords.length,
    totalActivities: customer.participations.length,
    pendingFollowUps: customer.followUps.filter(f => f.status === 'pending').length,
    lastVisitDate: customer.visitRecords[0]?.visitTime || null,
  }
  
  res.json({
    customer,
    stats,
  })
})

// 特征客户查询
router.get('/customer-features', async (req, res) => {
  const { riskLevel, ageMin, ageMax, income, insuranceNeeds, page = '1', pageSize = '10' } = req.query
  
  const where: any = {}
  
  if (riskLevel) where.riskLevel = riskLevel
  if (income) where.income = income
  if (insuranceNeeds) where.insuranceNeeds = { contains: insuranceNeeds as string }
  if (ageMin || ageMax) {
    where.age = {}
    if (ageMin) where.age.gte = parseInt(ageMin as string)
    if (ageMax) where.age.lte = parseInt(ageMax as string)
  }
  
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: parseInt(pageSize as string),
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ])
  
  res.json({
    data: customers,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
    },
  })
})

export default router
