# 数据导入操作步骤

## 📌 前提条件

- ✅ 已更新数据库 schema
- ✅ 已生成 Prisma Client
- ✅ 本地后端服务正在运行
- ✅ 本地前端服务正在运行
- ✅ 已从扣子平台导出 CSV/Excel 文件

---

## 🚀 开始导入

### 第 1 步：启动本地服务

**启动后端：**
```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend
npm run dev
```

后端会在 `http://localhost:3000` 运行

**启动前端（新终端窗口）：**
```bash
cd /Users/zhengli/CodeBuddy/20260318092523/frontend
npm run dev
```

前端会在 `http://localhost:5173` 运行

### 第 2 步：访问前端导入页面

在浏览器中打开：`http://localhost:5173`

1. 点击左侧导航栏的 **"数据迁移"**
2. 选择 **"客户数据导入"** 标签页

### 第 3 步：上传扣子数据文件

1. 点击上传区域
2. 选择您从扣子导出的 CSV/Excel 文件
3. 等待导入完成

### 第 4 步：查看导入结果

导入完成后，系统会显示：
- ✅ 成功导入的记录数
- ❌ 失败的记录数
- 📝 错误详情（如果有）

### 第 5 步：验证数据

1. 点击 **"客户管理"** 页面
2. 查看导入的客户列表
3. 抽查几条记录，确认字段正确

---

## ✅ 导入完成后的操作

### 1. 查看数据库状态

使用 Prisma Studio 查看数据：
```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend
npx prisma studio
```

浏览器会自动打开 Prisma Studio，您可以：
- 查看 `Customer` 表的所有记录
- 检查字段是否正确映射
- 确认 `metadata` 包含迁移信息

### 2. 部署到生产环境

**提交代码：**
```bash
cd /Users/zhengli/CodeBuddy/20260318092523
git add .
git commit -m "feat: 完成扣子数据迁移"
git push
```

**Vercel 自动部署：**
- 后端会自动部署：`https://insurance-agent-backend-seven.vercel.app`
- 前端会自动部署：`https://insurance-agent-frontend-omega.vercel.app`

**注意：** 因为本地和生产使用同一个数据库，所以：
- ✅ 数据已经在云数据库中
- ✅ 生产环境可以直接使用
- ✅ 不需要重复导入

### 3. 验证生产环境

访问生产环境前端：
```
https://insurance-agent-frontend-omega.vercel.app
```

查看"客户管理"页面，确认数据正常显示。

---

## 🔧 如果需要重新导入

如果数据有问题，需要重新导入：

### 方式一：清空客户表后重新导入

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 连接到数据库并清空表
npx prisma db execute --stdin << EOF
TRUNCATE TABLE "Customer" CASCADE;
EOF
```

然后重新通过前端导入。

### 方式二：删除特定记录

1. 使用 Prisma Studio
2. 打开 `Customer` 表
3. 选择要删除的记录
4. 点击删除

---

## 📊 数据验证清单

导入完成后，请确认：

- [ ] 客户记录数量与扣子导出一致
- [ ] 所有扣子字段正确映射
- [ ] 姓名显示正确
- [ ] 年龄数据正确
- [ ] 性别显示为 `male` / `female` / `unknown`
- [ ] 核心关注点、沟通偏好等扣子字段完整
- [ ] UUID 正确保留
- [ ] 新字段有默认值：
  - [ ] `customer_stage`: `"potential"`
  - [ ] `tags`: `[]`
  - [ ] `status`: `"active"`
- [ ] `metadata` 包含：
  - [ ] `migrated_from: "coze"`
  - [ ] `migrated_at`: 迁移时间戳

---

## 🎉 完成！

数据导入完成后，您可以：

1. **开始补充新字段信息**（phone, email, tags）
2. **使用客户阶段管理**（potential → contacted → proposal → ...）
3. **开始第二大类改造**（AI 意图识别）

---

## 📞 遇到问题？

### Q: 导入后看不到数据？
**A:** 检查：
1. 后端服务是否正常运行
2. 浏览器控制台是否有错误
3. 网络请求是否成功

### Q: 部分字段显示为空？
**A:** 正常现象，扣子可能没有这些字段的数据。新字段会自动使用默认值。

### Q: 性别显示为 "unknown"？
**A:** 扣子的性别值不是标准的 `男/女`，系统会映射为 `unknown`。可以后续手动修改。

### Q: 生产环境看不到数据？
**A:** 检查：
1. 生产环境的后端是否部署成功
2. 生产环境的数据库连接字符串是否正确
3. 数据是否在本地导入成功

---

## 📌 重要提醒

⚠️ **备份现有数据**

如果数据库中已有重要数据，建议先备份：

```bash
# 导出数据库备份
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 使用 pg_dump（如果安装了）
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql

# 或使用 Prisma 导出为 JSON
npx prisma db execute --stdin << EOF > customers-backup.json
SELECT row_to_json(t) FROM (SELECT * FROM "Customer") t;
EOF
```
