# 生产环境数据导入指南

## 🎯 选择生产环境导入

由于本地和生产环境共享同一个 Prisma Postgres 数据库，所以在生产环境导入数据是完全等效的。

---

## 📋 前提条件

- ✅ 代码已推送到 GitHub
- ✅ Vercel 部署已完成
- ✅ 数据库 schema 已更新
- ✅ 已从扣子平台导出 CSV/Excel 文件

---

## 🚀 生产环境导入步骤

### 第 1 步：确认 Vercel 部署状态

访问 Vercel Dashboard：
- **后端项目**: https://vercel.com/dashboard
- **前端项目**: https://vercel.com/dashboard

确保两个项目的部署状态都是 **"Ready"**。

查看部署日志：
- 点击项目 → Deployments
- 查看最新的部署是否成功
- 确认构建无错误

### 第 2 步：访问生产环境前端

打开浏览器访问生产环境前端：

```
https://insurance-agent-frontend-omega.vercel.app
```

### 第 3 步：进入数据迁移页面

1. 登录系统（如果有登录功能）
2. 点击左侧导航栏的 **"数据迁移"**
3. 选择 **"客户数据导入"** 标签页

### 第 4 步：上传扣子数据文件

1. 点击上传区域
2. 选择您从扣子导出的 CSV/Excel 文件
3. 等待导入完成

### 第 5 步：查看导入结果

导入完成后，系统会显示：

- ✅ **成功数量**: 成功导入的客户记录数
- ❌ **失败数量**: 导入失败的记录数
- 📝 **错误详情**: 如果有失败记录，会显示具体的错误信息

**示例：**
```
导入结果
成功: 120
失败: 0
```

### 第 6 步：验证数据

1. 点击 **"客户管理"** 页面
2. 查看导入的客户列表
3. 抽查几条记录，确认字段正确：
   - ✅ 姓名显示正确
   - ✅ 年龄数据正确
   - ✅ 性别显示为 `male` / `female` / `unknown`
   - ✅ 核心关注点、沟通偏好等扣子字段完整
   - ✅ UUID 正确保留

---

## 🔍 数据验证清单

导入完成后，请确认：

### 基本数据
- [ ] 客户记录数量与扣子导出一致
- [ ] 姓名字段完整，无缺失

### 扣子字段映射
- [ ] `core_interesting`（核心关注点）完整
- [ ] `prefer_communicate`（沟通偏好）完整
- [ ] `recent_money`（资金情况）完整
- [ ] `nickname`（客户昵称）完整
- [ ] `uuid`（用户唯一标识）正确保留
- [ ] `sys_platform`（平台来源）标记为 "coze"

### 新字段默认值
- [ ] `customer_stage`: `"potential"`
- [ ] `tags`: `[]`（空数组）
- [ ] `status`: `"active"`

### 元数据记录
- [ ] `metadata.migrated_from`: `"coze"`
- [ ] `metadata.migrated_at`: 迁移时间戳

---

## ⚠️ 常见问题

### Q1: 导入失败，提示"字段不存在"

**原因:** Excel 中的列名与数据库字段不匹配。

**解决:**
1. 点击"下载客户模板"查看正确的列名
2. 在 Excel 中将列名重命名为模板中的名称
3. 重新上传

**字段对照表：**

| 扣子字段 | 新 schema 字段 | 说明 |
|---------|--------------|------|
| name | name | 客户姓名（必填） |
| age | age | 年龄 |
| sex/gender | sex | 性别：male/female/unknown |
| profession/job | profession | 职业 |
| family_profile/familyStatus | family_profile | 家庭情况 |
| core_interesting | core_interesting | 核心关注点 |
| prefer_communicate | prefer_communicate | 沟通偏好 |
| recent_money | recent_money | 资金情况 |
| nickname | nickname | 客户昵称 |
| sys_platform | sys_platform | 平台来源 |
| uuid | uuid | 用户唯一标识 |
| phone | phone | 手机号 |
| email | email | 邮箱 |
| insurance_needs/insuranceNeeds | insurance_needs | 保险需求 |

### Q2: 提示"客户已存在"

**原因:** 姓名+昵称重复。

**说明:** 这是正常的去重逻辑，避免重复导入相同的客户。

**解决:**
- 检查是否已经导入过该客户
- 如果需要更新，可以在"客户管理"页面手动编辑
- 或者先删除旧记录，重新导入

### Q3: 性别显示为 "unknown"

**原因:** 扣子的性别值不是标准的 `男/女`，系统会映射为 `unknown`。

**解决:**
- 在 Excel 中手动修改性别值：`男` → `male`，`女` → `female`
- 或者在导入后，在"客户管理"页面手动修改

### Q4: 手机号或邮箱冲突

**原因:** 数据库中已有相同的手机号或邮箱。

**解决:**
- 如果是同一客户，检查昵称是否一致
- 如果是不同客户，修改手机号或邮箱后再导入

---

## 📊 查看生产环境数据

### 方法 1：通过前端查看

访问生产环境前端：
```
https://insurance-agent-frontend-omega.vercel.app
```

查看"客户管理"页面。

### 方法 2：通过 API 查看

访问后端 API：
```bash
curl https://insurance-agent-backend-seven.vercel.app/api/customers
```

### 方法 3：使用 Prisma Studio（本地）

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend
npx prisma studio
```

因为本地和生产使用同一个数据库，您可以在本地 Prisma Studio 中查看生产环境的数据。

---

## ✅ 导入成功标志

导入成功后，您应该看到：

- ✅ 客户记录数量正确
- ✅ 所有扣子字段都正确迁移
- ✅ 新字段有合理的默认值
- ✅ `metadata` 字段包含迁移来源和时间
- ✅ API 返回正确的数据结构
- ✅ 前端可以正常显示客户列表

---

## 🎯 导入完成后的操作

### 1. 补充新字段信息

为以下字段补充数据（在"客户管理"页面）：

- `phone`: 手机号
- `email`: 邮箱
- `tags`: 客户标签（如 VIP、潜客等）

### 2. 设置客户阶段

根据业务逻辑，调整客户的 `customer_stage`：

- `potential`: 潜在客户
- `contacted`: 已联系
- `proposal`: 已提供方案
- `negotiation`: 谈判中
- `won`: 已成交
- `lost`: 已流失

### 3. 开始第二大类改造

数据导入完成后，可以开始进行：

- AI 意图识别
- 智能对话
- 自动化流程

---

## 📞 技术支持

如果导入过程中遇到问题：

1. **查看浏览器控制台**: F12 打开开发者工具，查看网络请求和错误信息
2. **检查网络连接**: 确保能够访问 Vercel 后端 API
3. **查看后端日志**: 在 Vercel Dashboard → 项目 → Logs 查看错误日志
4. **重新部署**: 如果代码有问题，Vercel 会自动重新部署

---

## 🎉 完成！

恭喜您完成了数据迁移！现在您的扣子数据已经在生产环境的数据库中运行。
