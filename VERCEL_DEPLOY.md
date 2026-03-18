# Vercel 部署配置完成

## ✅ 已完成的配置

### 1. 数据库配置
- ✅ Prisma Postgres 连接已配置
- ✅ 数据库表结构已创建
- ✅ 环境变量已设置

### 2. 后端配置
- ✅ 创建 `api/index.ts` Serverless Function 入口
- ✅ 更新 `vercel.json` 配置文件
- ✅ 添加 `@vercel/node` 依赖
- ✅ 更新 `package.json` 构建脚本
- ✅ 构建测试通过

### 3. 前端配置
- ✅ 创建 `vercel.json` 配置文件
- ✅ 创建 `.env.production` 环境变量文件
- ✅ 构建测试通过

## 📋 Vercel Dashboard 配置步骤

### 后端部署配置

1. **在 Vercel Dashboard 创建新项目**
   - 导入 GitHub 仓库
   - **重要**：Root Directory 设置为 `backend`
   - Framework Preset 选择 "Other"

2. **设置环境变量**（Environment Variables）
   ```
   DATABASE_URL = postgres://6e07220827e274c830b5b2d0d06faf8e7443632265efbf0161ba6c34a9ae64bb:sk_kLR6wc7tnIvYBcPbRKC6S@db.prisma.io:5432/postgres?sslmode=require
   DIRECT_URL = postgres://6e07220827e274c830b5b2d0d06faf8e7443632265efbf0161ba6c34a9ae64bb:sk_kLR6wc7tnIvYBcPbRKC6S@db.prisma.io:5432/postgres?sslmode=require
   NODE_ENV = production
   ```

3. **点击 Deploy**

### 前端部署配置

1. **在 Vercel Dashboard 创建另一个新项目**
   - 导入同一个 GitHub 仓库
   - **重要**：Root Directory 设置为 `frontend`
   - Framework Preset 选择 "Vite"

2. **设置环境变量**（Environment Variables）
   ```
   VITE_API_URL = https://your-backend.vercel.app
   ```
   *（部署后端后会获得实际地址）*

3. **点击 Deploy**

## 🔍 常见问题排查

### 如果后端部署失败

**检查项：**
1. Root Directory 是否设置为 `backend`
2. 环境变量是否正确设置
3. 查看构建日志（Build Log）

### 如果前端部署失败

**检查项：**
1. Root Directory 是否设置为 `frontend`
2. VITE_API_URL 是否已配置（可以先填个临时值）
3. 查看构建日志

### 如果 API 调用失败

**检查项：**
1. 前端 VITE_API_URL 是否正确
2. 后端是否部署成功
3. 数据库连接是否正常
4. CORS 配置是否正确

## 📊 部署完成后

1. **测试后端**
   - 访问 `https://your-backend.vercel.app/api/health`
   - 应该返回：`{"status":"ok","timestamp":"..."}`

2. **测试前端**
   - 访问前端 Vercel 域名
   - 测试各项功能是否正常

3. **验证数据库**
   - 创建客户记录
   - 添加拜访记录
   - 查看数据是否正确存储

## 🎯 下一步操作

1. 在 Vercel Dashboard 创建两个项目（backend 和 frontend）
2. 按上述步骤配置环境变量
3. 等待部署完成
4. 测试功能
5. 如有问题，查看 Vercel Dashboard 的 Logs 和 Deployments 标签页

## 📖 详细文档

完整的部署指南请参考：`DEPLOY.md`
