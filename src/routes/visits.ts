import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 获取拜访记录列表
router.get('/', async (req, res) => {
  const { page = '1', pageSize = '10', customerId, startDate, endDate } = req.query
  
  const where: any = {}

  if (customerId) {
    where.customer_id = customerId as string
  }

  if (startDate || endDate) {
    where.visit_time = {}
    if (startDate) where.visit_time.gte = new Date(startDate as string)
    if (endDate) where.visit_time.lte = new Date(endDate as string)
  }

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)

  const [records, total] = await Promise.all([
    prisma.visitRecord.findMany({
      where,
      skip,
      take: parseInt(pageSize as string),
      orderBy: { visit_time: 'desc' },
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
    prisma.visitRecord.count({ where }),
  ])
  
  res.json({
    data: records,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
    },
  })
})

// 获取单个拜访记录
router.get('/:id', async (req, res) => {
  const { id } = req.params
  
  const record = await prisma.visitRecord.findUnique({
    where: { id },
    include: {
      customer: true,
      follow_up: true,
    },
  })
  
  if (!record) {
    res.status(404).json({ error: '记录不存在' })
    return
  }
  
  res.json(record)
})

// 创建拜访记录
router.post('/', async (req, res) => {
  const record = await prisma.visitRecord.create({
    data: req.body,
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
  
  res.json(record)
})

// 更新拜访记录
router.put('/:id', async (req, res) => {
  const { id } = req.params
  
  const record = await prisma.visitRecord.update({
    where: { id },
    data: req.body,
  })
  
  res.json(record)
})

// 删除拜访记录
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  
  await prisma.visitRecord.delete({
    where: { id },
  })
  
  res.json({ success: true })
})

export default router
