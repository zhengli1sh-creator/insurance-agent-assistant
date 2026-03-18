import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

import customerRoutes from './routes/customers'
import visitRoutes from './routes/visits'
import activityRoutes from './routes/activities'
import queryRoutes from './routes/query'
import chatRoutes from './routes/chat'
import migrationRoutes from './routes/migration'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 路由
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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`)
})
