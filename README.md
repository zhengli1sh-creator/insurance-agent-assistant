# 保险代理人智能助手 🤖

一个专为保险代理人设计的智能工作助手，通过 AI 对话交互帮助代理人高效管理客户信息，并提供情绪支持和鼓励。

## ✨ 核心功能

### 1. 客户管理
- **客户信息管理**：增删改客户基础信息（姓名、联系方式、保险需求等）
- **拜访记录**：记录每次客户拜访的详情
- **活动管理**：管理客户活动及参与记录
- **综合查询**：支持多维度查询客户、拜访、活动数据

### 2. AI 智能助手
- **语音输入**：支持语音对话，解放双手
- **智能意图识别**：AI 自动理解用户意图，执行相应操作
- **情绪识别**：识别代理人情绪状态
- **安慰对话**：提供鼓励和安慰，做代理人的贴心助手

### 3. 数据迁移
- 支持 Excel/CSV 数据导入
- 方便迁移现有生产环境数据

## 🏗️ 技术架构

### 前端
- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **状态管理**: Zustand
- **HTTP 客户端**: Axios

### 后端
- **运行时**: Node.js 20+
- **框架**: Express.js + TypeScript
- **ORM**: Prisma
- **数据库**: SQLite（开发）/ PostgreSQL（生产）

## 🚀 快速开始

### 环境要求
- Node.js 20+
- npm 10+

### 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 数据库初始化

```bash
cd backend
npx prisma migrate dev --name init
npx prisma generate
```

### 启动服务

```bash
# 启动后端（端口 3001）
cd backend
npm run build
npm start

# 启动前端（端口 5173）
cd frontend
npm run dev
```

### 访问应用

打开浏览器访问 http://localhost:5173

## 📁 项目结构

```
├── frontend/          # 前端项目
│   ├── src/
│   │   ├── pages/    # 页面组件
│   │   ├── services/ # API 服务
│   │   └── types/    # 类型定义
│   └── package.json
├── backend/           # 后端项目
│   ├── src/
│   │   ├── routes/   # API 路由
│   │   └── utils/    # 工具函数
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
└── README.md
```

## 📝 使用说明

### 语音交互示例

- "添加客户张三，电话 13800138000"
- "查询所有客户"
- "记录拜访，客户李四，讨论了重疾险"
- "查看拜访记录"
- "最近业绩不太好，有点沮丧" → AI 会识别情绪并安慰鼓励

### 快捷操作

点击界面上的快捷按钮，快速执行常用操作：
- 📝 添加客户
- 📋 记录拜访
- 🔍 查询客户
- 📊 查看拜访记录

## 🔧 部署

### 部署到 Vercel（推荐）

本项目支持部署到 Vercel 平台，使用云端 PostgreSQL 数据库。

**部署架构：**
- **前端**：Vercel 静态网站托管
- **后端**：Vercel Serverless Functions
- **数据库**：云端 PostgreSQL（支持 Vercel Postgres / Supabase / Neon 等）

**快速部署步骤：**

1. **准备云端数据库**
   - Vercel Postgres：在 Vercel Dashboard 创建 Postgres 数据库
   - Supabase：访问 [supabase.com](https://supabase.com) 创建免费数据库

2. **部署后端**
   ```bash
   cd backend
   vercel --prod
   ```
   设置环境变量：`DATABASE_URL`、`DIRECT_URL`、`NODE_ENV=production`

3. **执行数据库迁移**
   ```bash
   npx prisma migrate deploy
   ```

4. **部署前端**
   ```bash
   cd frontend
   # 更新 .env.production 中的 VITE_API_URL
   vercel --prod
   ```

📖 **详细部署文档**：[DEPLOY.md](./DEPLOY.md)

## 📄 许可证

MIT License

---

Made with ❤️ for Insurance Agents
