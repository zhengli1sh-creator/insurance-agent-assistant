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
      orderBy: { created_at: 'desc' },
      include: {
        _count: {
          select: {
            visit_records: true,
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
      visit_records: {
        orderBy: { visit_time: 'desc' },
        take: 5,
      },
      participations: {
        include: {
          activity: true,
        },
        orderBy: { register_time: 'desc' },
        take: 5,
      },
      follow_ups: {
        where: { status: 'pending' },
        orderBy: { due_date: 'asc' },
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
  const { name, nickname, phone, email } = req.body

  // 检查客户姓名是否为空
  if (!name || !name.trim()) {
    res.status(400).json({ error: '客户姓名不能为空' })
    return
  }

  // 去重判断：姓名 + 昵称
  const existingCustomer = await prisma.customer.findFirst({
    where: {
      name: name.trim(),
      nickname: nickname || null,
    },
  })

  if (existingCustomer) {
    res.status(400).json({ error: '该客户已存在（姓名+昵称重复）' })
    return
  }

  // 检查手机号唯一性（如果提供了手机号）
  if (phone) {
    const existingPhone = await prisma.customer.findFirst({
      where: { phone: phone.trim() },
    })
    if (existingPhone) {
      res.status(400).json({ error: '该手机号已被使用' })
      return
    }
  }

  // 检查邮箱唯一性（如果提供了邮箱）
  if (email) {
    const existingEmail = await prisma.customer.findFirst({
      where: { email: email.trim() },
    })
    if (existingEmail) {
      res.status(400).json({ error: '该邮箱已被使用' })
      return
    }
  }

  const customer = await prisma.customer.create({
    data: {
      ...req.body,
      name: name.trim(),
    },
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
