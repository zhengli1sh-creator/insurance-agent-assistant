import { VercelRequest, VercelResponse } from '@vercel/node'
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config()

const prisma = new PrismaClient()

// 创建 Express 应用
const app = express()

// 配置 CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://insurance-agent-frontend-eight.vercel.app', 'https://*.vercel.app']
    : '*',
  credentials: true
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 导入路由
import customerRoutes from '../src/routes/customers'
import visitRoutes from '../src/routes/visits'
import activityRoutes from '../src/routes/activities'
import queryRoutes from '../src/routes/query'
import chatRoutes from '../src/routes/chat'
import migrationRoutes from '../src/routes/migration'

// 挂载路由
app.use('/api/customers', customerRoutes)
app.use('/api/visits', visitRoutes)
app.use('/api/activities', activityRoutes)
app.use('/api/query', queryRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/migration', migrationRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 导出 Serverless 处理函数
export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res)
}
