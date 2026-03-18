import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 获取活动列表
router.get('/', async (req, res) => {
  const { page = '1', pageSize = '10', status, type } = req.query
  
  const where: any = {}
  
  if (status) where.status = status
  if (type) where.type = type
  
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  
  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      skip,
      take: parseInt(pageSize as string),
      orderBy: { start_time: 'desc' },
      include: {
        _count: {
          select: {
            participations: true,
          },
        },
      },
    }),
    prisma.activity.count({ where }),
  ])
  
  res.json({
    data: activities,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
    },
  })
})

// 获取单个活动详情
router.get('/:id', async (req, res) => {
  const { id } = req.params
  
  const activity = await prisma.activity.findUnique({
    where: { id },
    include: {
      participations: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { register_time: 'desc' },
      },
    },
  })
  
  if (!activity) {
    res.status(404).json({ error: '活动不存在' })
    return
  }
  
  res.json(activity)
})

// 创建活动
router.post('/', async (req, res) => {
  const activity = await prisma.activity.create({
    data: req.body,
  })
  
  res.json(activity)
})

// 更新活动
router.put('/:id', async (req, res) => {
  const { id } = req.params
  
  const activity = await prisma.activity.update({
    where: { id },
    data: req.body,
  })
  
  res.json(activity)
})

// 删除活动
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  
  await prisma.activity.delete({
    where: { id },
  })
  
  res.json({ success: true })
})

// 添加参与记录
router.post('/:id/participants', async (req, res) => {
  const { id } = req.params
  const { customerId } = req.body
  
  const participation = await prisma.activityParticipation.create({
    data: {
      activity_id: id,
      customer_id: customerId,
    },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          phone: true,
        },
      },
    },
  })
  
  res.json(participation)
})

// 更新参与记录
router.put('/:id/participants/:customerId', async (req, res) => {
  const { id, customerId } = req.params
  
  const participation = await prisma.activityParticipation.update({
    where: {
      activity_id_customer_id: {
        activity_id: id,
        customer_id: customerId,
      },
    },
    data: req.body,
  })
  
  res.json(participation)
})

// 删除参与记录
router.delete('/:id/participants/:customerId', async (req, res) => {
  const { id, customerId } = req.params
  
  await prisma.activityParticipation.delete({
    where: {
      activity_id_customer_id: {
        activity_id: id,
        customer_id: customerId,
      },
    },
  })
  
  res.json({ success: true })
})

export default router
