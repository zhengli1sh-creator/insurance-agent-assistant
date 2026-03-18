# 扣子数据迁移 - 快速执行指南

## 📋 准备工作（已完成）

✅ 创建了迁移脚本 `backend/scripts/migrate-coze-data.js`
✅ 创建了验证脚本 `backend/scripts/verify-migration.js`
✅ 融合版 schema 已准备好：`backend/prisma/schema-final.prisma`

---

## 🚀 现在开始执行（5 步）

### 第 1 步：放置 CSV 文件

**操作：** 将扣子导出的 CSV 文件复制到 scripts 目录

```bash
# 假设你的 CSV 文件在 ~/Downloads/
cp ~/Downloads/customers_export.csv /Users/zhengli/CodeBuddy/20260318092523/backend/scripts/
```

**或者在 Finder 中：**
- 打开 Finder
- 找到导出的 `customers_export.csv`
- 拖拽到项目 `backend/scripts/` 文件夹中

---

### 第 2 步：应用新数据库结构

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 备份旧 schema（可选）
cp prisma/schema.prisma prisma/schema-backup.prisma

# 应用新 schema
cp prisma/schema-final.prisma prisma/schema.prisma

# 生成 Prisma Client
npx prisma generate

# 推送到数据库（本地）
npx prisma db push
```

**预期输出：**
```
✔ Generated Prisma Client
🚀 Your database is now in sync with your Prisma schema.
```

---

### 第 3 步：安装依赖

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 安装 CSV 解析库
npm install csv-parser --save
```

---

### 第 4 步：执行数据迁移

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 运行迁移脚本
node scripts/migrate-coze-data.js
```

**预期输出：**
```
🚀 开始迁移客户数据...

📖 正在读取 CSV 文件...
✅ 读取到 120 条客户记录

🔍 检查重复数据...

📦 开始批量插入数据（每批 50 条）...

  📝 处理第 1/3 批 (50 条)...
     ✅ 成功插入 50 条，重复 0 条

  📝 处理第 2/3 批 (50 条)...
     ✅ 成功插入 50 条，重复 0 条

  📝 处理第 3/3 批 (20 条)...
     ✅ 成功插入 20 条，重复 0 条

📊 迁移统计：
   总记录数：120
   成功插入：120
   重复跳过：0
   失败数量：0
   成功率：100.00%

🔎 数据抽样验证：

样本数据：

  1. 张三
     UUID: abc123...
     阶段: potential
     标签: 无
     来源: coze
     迁移时间: 2026-03-18T...

✅ 迁移完成！

🎉 所有操作完成
```

---

### 第 5 步：验证迁移结果

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 运行验证脚本
node scripts/verify-migration.js
```

**预期输出：**
```
🔍 开始验证迁移数据...

📊 客户总数：120

📈 客户阶段分布：
   potential      :  100 (83.3%)
   contacted      :   15 (12.5%)
   proposal       :    5 ( 4.2%)

📈 客户来源分布：
   coze          :  120 (100.0%)

🔬 字段完整性检查：
   ✅ name              :120/120
   ✅ uuid              :  98/---
   ⚠️  core_interesting  :  45/---
   ✅ customer_stage    :120/120
   ✅ tags             :   0/---

📦 Metadata 检查：
   ✅ metadata 包含迁移信息
   迁移来源：coze
   迁移时间：2026-03-18T...

📋 最新 5 条客户记录：

  1. 张三
     ID: 550e8400-e29b-41d4-a716-446655440000
     UUID: abc123...
     年龄: 35
     职业: 工程师
     阶段: potential
     标签: 无
     来源: coze
     创建时间: 2026-03-18T...
     核心关注: 健康保险

... (更多记录)

🔍 数据质量检查：
   ✅ 数据质量良好

==================================================
✅ 验证完成！

📊 总结：
   ✓ 已成功迁移 120 条客户记录
   ✓ 数据结构完整
   ✓ Metadata 信息正确
   ✓ 可以开始使用

🎉 验证程序完成
```

---

## ⚠️ 常见问题解决

### 问题 1：找不到 CSV 文件

**错误信息：**
```
❌ CSV 文件不存在：backend/scripts/customers_export.csv
```

**解决方法：**
1. 确认 CSV 文件名是否是 `customers_export.csv`
2. 确认文件已放到 `backend/scripts/` 目录
3. 使用 `ls backend/scripts/` 检查文件是否存在

### 问题 2：csv-parser 模块未安装

**错误信息：**
```
Error: Cannot find module 'csv-parser'
```

**解决方法：**
```bash
npm install csv-parser --save
```

### 问题 3：数据库连接失败

**错误信息：**
```
Error: Can't reach database server
```

**解决方法：**
1. 检查 `.env` 文件中的 `DATABASE_URL` 是否正确
2. 确认网络连接正常
3. 使用 `npx prisma db push` 测试连接

### 问题 4：字段名不匹配

**错误信息：**
```
Error: Column 'xxx' does not exist
```

**解决方法：**
1. 确认新 schema 已应用：`npx prisma db push`
2. 检查 CSV 文件的列名是否正确
3. 查看迁移日志中的具体错误字段

---

## ✅ 迁移成功标志

完成所有步骤后，你应该看到：

- ✅ CSV 文件读取成功
- ✅ 所有记录插入数据库
- ✅ 验证脚本通过
- ✅ 可以在 Prisma Studio 中看到数据
- ✅ 后端 API 可以查询到客户数据

---

## 🎯 迁移完成后的下一步

### 1. 查看数据

```bash
# 使用 Prisma Studio 可视化查看
npx prisma studio
```

浏览器会打开，可以看到所有表和数据。

### 2. 测试后端 API

```bash
# 测试客户列表 API
curl https://insurance-agent-backend-seven.vercel.app/api/customers

# 测试客户详情 API
curl https://insurance-agent-backend-seven.vercel.app/api/customers?limit=1
```

### 3. 部署到生产

```bash
# 提交代码
git add .
git commit -m "feat: 完成数据迁移，应用新数据库结构"
git push

# Vercel 自动部署
# 等待部署完成
```

### 4. 开始前端 AI 意图识别开发

迁移完成后，可以开始第二大类改造：
- 设计意图识别系统
- 集成大模型 API
- 实现对话式交互

---

## 📞 需要帮助？

如果遇到问题：

1. **查看错误日志** - 脚本会输出详细的错误信息
2. **检查 CSV 格式** - 确保列名与扣子导出的一致
3. **重新开始** - 删除 `node_modules/.prisma` 重新生成

---

## 🚀 立即开始

现在按顺序执行上面的 5 个步骤吧！

完成后告诉我结果，我们继续下一步！
