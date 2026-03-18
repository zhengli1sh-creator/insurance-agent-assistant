import { Router } from 'express'
import { prisma } from '../utils/prisma'

const router = Router()

// 获取客户列表
router.get('/', async (req, res) => {
  const { page = '1', pageSize = '10', keyword, status } = req.query
  
  const where: any = {}
  
  if (keyword) {
    where.OR = [
      { name: { contains: keyword as string } },
      { phone: { contains: keyword as string } },
    ]
  }
  
  if (status) {
    where.status = status
  }
  
  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  
  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: parseInt(pageSize as string),
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            visitRecords: true,
            participations: true,
          },
        },
      },
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

// 获取单个客户详情
router.get('/:id', async (req, res) => {
  const { id } = req.params
  
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      visitRecords: {
        orderBy: { visitTime: 'desc' },
        take: 5,
      },
      participations: {
        include: {
          activity: true,
        },
        orderBy: { registerTime: 'desc' },
        take: 5,
      },
      followUps: {
        where: { status: 'pending' },
        orderBy: { dueDate: 'asc' },
      },
    },
  })
  
  if (!customer) {
    res.status(404).json({ error: '客户不存在' })
    return
  }
  
  res.json(customer)
})

// 创建客户
router.post('/', async (req, res) => {
  const customer = await prisma.customer.create({
    data: req.body,
  })
  
  res.json(customer)
})

// 更新客户
router.put('/:id', async (req, res) => {
  const { id } = req.params
  
  const customer = await prisma.customer.update({
    where: { id },
    data: req.body,
  })
  
  res.json(customer)
})

// 删除客户
router.delete('/:id', async (req, res) => {
  const { id } = req.params
  
  await prisma.customer.delete({
    where: { id },
  })
  
  res.json({ success: true })
})

export default router
