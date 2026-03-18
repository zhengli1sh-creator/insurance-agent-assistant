# Vercel 部署指南

本项目支持部署到 Vercel 平台，使用云端 PostgreSQL 数据库。

## 部署架构

- **前端**：Vercel 静态网站托管
- **后端**：Vercel Serverless Functions
- **数据库**：云端 PostgreSQL（Vercel Postgres / Supabase / Neon / Prisma Postgres）

## 快速部署指南

### 1. 数据库配置

#### 使用 Prisma Postgres（已配置）

当前项目已配置 Prisma Postgres 数据库，环境变量已在 `backend/.env` 中设置。

#### 或使用其他云数据库

**Vercel Postgres（推荐）**
1. 在 Vercel Dashboard → Storage → Postgres 创建数据库
2. 复制连接字符串

**Supabase（免费）**
1. 访问 https://supabase.com 创建项目
2. Project Settings → Database 复制连接字符串

**Neon**
1. 访问 https://neon.tech 创建项目
2. 复制连接字符串

### 2. 部署后端

#### 方式 A：通过 Vercel Dashboard 部署（推荐）

1. 将代码推送到 GitHub
2. 访问 Vercel Dashboard
3. 点击 "Add New Project"
4. 导入 GitHub 仓库
5. 选择 **Backend 根目录**（`/backend`）
6. 配置环境变量：

```
DATABASE_URL = postgresql://user:password@host:port/dbname?sslmode=require
DIRECT_URL = postgresql://user:password@host:port/dbname?sslmode=require
NODE_ENV = production
```

7. 点击 Deploy

#### 方式 B：通过 CLI 部署

```bash
cd backend
vercel --prod
```

### 3. 部署前端

#### 方式 A：通过 Vercel Dashboard 部署（推荐）

1. 在 Vercel Dashboard 创建新项目
2. 导入同一个 GitHub 仓库
3. 选择 **Frontend 根目录**（`/frontend`）
4. 配置环境变量：

```
VITE_API_URL = https://your-backend.vercel.app
```

5. 点击 Deploy

#### 方式 B：通过 CLI 部署

```bash
cd frontend

# 修改 .env.production 中的 API 地址
vercel --prod
```

### 4. 执行数据库迁移

部署后，在本地执行迁移命令：

```bash
cd backend
npx prisma migrate deploy
```

或在 Vercel Dashboard 的命令行中执行。

## Vercel 配置说明

### Backend 配置

**文件：** `backend/vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "functions": {
    "api/**/*.ts": {
      "runtime": "nodejs20.x",
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.ts"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        }
      ]
    }
  ]
}
```

**关键点：**
- `api/index.ts` 作为 Serverless Function 入口
- 所有 `/api/*` 请求重定向到 `api/index.ts`
- 使用 Express 处理路由

### Frontend 配置

**文件：** `frontend/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "handle": "filesystem"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

**关键点：**
- 使用 Vite 构建静态文件
- SPA 路由支持（所有路径重定向到 index.html）

## 环境变量

### 后端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `DATABASE_URL` | PostgreSQL 连接字符串 | ✅ | `postgresql://...` |
| `DIRECT_URL` | Prisma 迁移连接字符串 | ✅ | `postgresql://...` |
| `NODE_ENV` | 运行环境 | ✅ | `production` |

### 前端环境变量

| 变量名 | 说明 | 必需 | 示例 |
|--------|------|------|------|
| `VITE_API_URL` | 后端 API 地址 | ✅ | `https://api.example.com` |

**注意：** 前端环境变量必须以 `VITE_` 开头。

## 故障排查

### 问题 1：部署失败

**检查清单：**
1. 确保 `backend/vercel.json` 配置正确
2. 检查环境变量是否已设置
3. 查看 Vercel Dashboard 的构建日志
4. 确认 `package.json` 中的 `vercel-build` 脚本存在

### 问题 2：数据库连接失败

**检查清单：**
1. 验证 `DATABASE_URL` 格式正确
2. 确认数据库允许 Vercel IP 访问
3. 检查 SSL 设置（必须包含 `sslmode=require`）

### 问题 3：API 404 错误

**检查清单：**
1. 确认 `api/index.ts` 文件存在
2. 检查 `vercel.json` 中的 `rewrites` 配置
3. 验证前端 `VITE_API_URL` 配置正确

### 问题 4：CORS 错误

**解决方案：**
1. 检查 `backend/api/index.ts` 中的 CORS 配置
2. 在 Vercel Dashboard 配置正确的域名白名单
3. 确认前端域名已添加到 `cors.origin`

## 更新部署

### 更新代码

1. 修改代码后提交到 GitHub
2. Vercel 自动触发重新部署

### 更新数据库结构

```bash
cd backend
npx prisma migrate dev --name migration_name
npx prisma db push
```

## 监控和日志

### 查看日志

- **Vercel Dashboard**: Project → Logs
- **Serverless Function Logs**: 查看函数执行日志
- **构建日志**: 查看部署构建过程

### 性能监控

- Vercel Analytics
- 数据库查询性能（Prisma Studio）
- Serverless Function 执行时间

## 成本估算

### Vercel

| 资源 | 免费额度 | 超额费用 |
|------|---------|---------|
| Serverless Functions | 100 GB-hours/月 | $0.60/GB-hour |
| 带宽 | 100 GB/月 | $40/100 GB |
| 静态托管 | 100 GB/月 | $15/100 GB |

### Prisma Postgres

| 资源 | 免费额度 | 超额费用 |
|------|---------|---------|
| 存储 | 5 GB | - |
| 计算 | 192 小时/月 | $0.03/小时 |

### Supabase（免费）

- 500 MB 数据库存储
- 1 GB 文件存储
- 50,000 每月请求

## 最佳实践

1. **使用环境变量** - 不要硬编码敏感信息
2. **启用错误追踪** - 集成 Sentry 等工具
3. **监控函数执行时间** - 避免超时（默认 10 秒）
4. **优化数据库查询** - 使用 Prisma 索引和查询优化
5. **配置自定义域名** - 提升品牌形象

## 联系支持

- Vercel 文档: https://vercel.com/docs
- Prisma 文档: https://www.prisma.io/docs
- 问题反馈: GitHub Issues
