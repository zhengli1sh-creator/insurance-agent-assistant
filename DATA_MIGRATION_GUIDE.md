# 数据迁移执行指南

## 📊 迁移概述

将扣子（Coze）平台的数据迁移到 Vercel PostgreSQL 数据库。

---

## 🎯 迁移目标

### 源数据：扣子平台

**客户表字段：**
- name, age, sex, profession, family_profile
- core_interesting, prefer_communicate, recent_money, nickname
- sys_platform, uuid, bstudio_create_time

### 目标数据：Vercel PostgreSQL

**客户表字段：**
- 保留扣子字段 + 新增字段 + metadata

---

## 📋 迁移步骤

### 第 1 步：准备扣子数据

#### 方式 A：手动导出（推荐）

1. **登录扣子平台**
2. **进入数据管理页面**
3. **导出客户数据为 CSV/Excel**
   - 包含所有字段
   - 保存为 `customers_export.csv`

#### 方式 B：API 导出

如果扣子平台提供 API：

```bash
# 调用扣子 API 导出数据
curl -X GET "https://api.coze.com/v1/customers/export" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o customers_export.csv
```

---

### 第 2 步：应用新数据库结构

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 1. 备份当前 schema（如有需要）
cp prisma/schema.prisma prisma/schema-backup.prisma

# 2. 应用新 schema
cp prisma/schema-final.prisma prisma/schema.prisma

# 3. 生成 Prisma Client
npx prisma generate

# 4. 推送新表结构到数据库
npx prisma db push
```

**预期输出：**
```
Your database is now in sync with your Prisma schema.
```

---

### 第 3 步：编写迁移脚本

创建迁移脚本：`backend/scripts/migrate-coze-data.js`

```javascript
const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const csv = require('csv-parser')

const prisma = new PrismaClient()

// 字段映射配置
const fieldMapping = {
  // 扣子字段 -> Vercel 字段
  name: 'name',
  age: 'age',
  sex: 'sex',
  profession: 'profession',
  family_profile: 'family_profile',
  core_interesting: 'core_interesting',
  prefer_communicate: 'prefer_communicate',
  recent_money: 'recent_money',
  nickname: 'nickname',
  sys_platform: 'sys_platform',
  uuid: 'uuid',
  bstudio_create_time: 'bstudio_create_time'
}

// 数据转换函数
function transformCustomer(data) {
  return {
    // 映射扣子字段
    name: data.name,
    age: data.age,
    sex: data.sex,
    profession: data.profession,
    family_profile: data.family_profile,
    core_interesting: data.core_interesting,
    prefer_communicate: data.prefer_communicate,
    recent_money: data.recent_money,
    nickname: data.nickname,
    sys_platform: data.sys_platform,
    uuid: data.uuid,
    bstudio_create_time: data.bstudio_create_time ? new Date(data.bstudio_create_time) : null,
    
    // 新增字段的默认值
    customer_stage: data.uuid ? 'potential' : null, // 根据业务逻辑设置
    tags: [], // 初始为空标签
    insurance_needs: null, // 等待后续填写
    phone: null, // 等待后续填写
    email: null, // 等待后续填写
    status: 'active',
    source: data.sys_platform || 'coze',
    remark: null,
    metadata: {
      migrated_from: 'coze',
      migrated_at: new Date().toISOString(),
      original_id: data.id
    }
  }
}

// 主迁移函数
async function migrateCustomers() {
  try {
    // 1. 读取导出的 CSV
    const customers = []
    fs.createReadStream('customers_export.csv')
      .pipe(csv())
      .on('data', (data) => {
        customers.push(transformCustomer(data))
      })
      .on('end', async () => {
        console.log(`读取到 ${customers.length} 条客户记录`)
        
        // 2. 批量插入数据库
        const batchSize = 50
        for (let i = 0; i < customers.length; i += batchSize) {
          const batch = customers.slice(i, i + batchSize)
          console.log(`正在插入第 ${Math.floor(i/batchSize) + 1} 批数据...`)
          
          await prisma.customer.createMany({
            data: batch,
            skipDuplicates: true // 跳过重复数据
          })
        }
        
        console.log('迁移完成！')
      })
      
  } catch (error) {
    console.error('迁移失败：', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// 执行迁移
migrateCustomers()
```

---

### 第 4 步：执行迁移

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/backend

# 1. 将导出的 CSV 文件放在 scripts 目录
mv ~/Downloads/customers_export.csv backend/scripts/

# 2. 执行迁移脚本
node scripts/migrate-coze-data.js
```

**预期输出：**
```
读取到 120 条客户记录
正在插入第 1 批数据...
正在插入第 2 批数据...
正在插入第 3 批数据...
迁移完成！
```

---

### 第 5 步：验证迁移结果

```bash
# 1. 使用 Prisma Studio 查看数据
npx prisma studio

# 2. 或使用脚本验证
node scripts/verify-migration.js
```

验证脚本 `scripts/verify-migration.js`：

```javascript
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function verifyMigration() {
  // 统计迁移记录数
  const count = await prisma.customer.count()
  console.log(`✅ 已迁移 ${count} 条客户记录`)
  
  // 抽查数据完整性
  const samples = await prisma.customer.findMany({
    take: 5,
    orderBy: { created_at: 'desc' }
  })
  
  console.log('样本数据：', samples)
  
  await prisma.$disconnect()
}

verifyMigration()
```

---

## 🔧 高级迁移场景

### 场景 1：处理重复数据

如果扣子数据和现有数据有 UUID 冲突：

```javascript
// 在迁移脚本中添加去重逻辑
const existingUuids = await prisma.customer.findMany({
  select: { uuid: true },
  where: { uuid: { not: null } }
})

const uuidSet = new Set(existingUuids.map(c => c.uuid))

const filteredCustomers = customers.filter(c => 
  !uuidSet.has(c.uuid)
)
```

### 场景 2：数据类型转换

如果扣子导出的数据格式需要转换：

```javascript
function convertData(data) {
  return {
    ...data,
    // 字符串转日期
    bstudio_create_time: data.bstudio_create_time 
      ? new Date(data.bstudio_create_time) 
      : null,
    
    // 空值处理
    age: data.age || '未知',
    profession: data.profession || '未知',
    
    // 字符串转数字
    metadata: {
      original_id: parseInt(data.id) || null,
      // ...
    }
  }
}
```

### 场景 3：数据清洗

如果导出数据包含错误值：

```javascript
function cleanData(data) {
  return {
    ...data,
    // 移除特殊字符
    name: data.name?.replace(/[\x00-\x1F\x7F]/g, ''),
    
    // 标准化空格
    profession: data.profession?.trim(),
    
    // 格式化电话
    phone: data.phone?.replace(/\D/g, ''),
    
    // 邮箱小写
    email: data.email?.toLowerCase(),
  }
}
```

---

## 🚀 部署到生产环境

### 1. 备份生产数据库

```bash
# 导出生产数据备份
pg_dump $DATABASE_URL > production-backup-$(date +%Y%m%d).sql
```

### 2. 更新生产代码

```bash
# 1. 提交新 schema
git add prisma/schema.prisma
git commit -m "feat: 更新数据库 schema 为融合版本"
git push

# 2. Vercel 自动重新部署
# 等待部署完成
```

### 3. 在 Vercel 执行迁移

```bash
# 方法 1：通过 Vercel CLI
vercel exec bash
node scripts/migrate-coze-data.js

# 方法 2：通过 Vercel Console
# 在 Vercel Dashboard → Project → Console 执行
```

### 4. 验证生产数据

访问 Vercel 部署的 API：

```bash
curl https://insurance-agent-backend-seven.vercel.app/api/customers?limit=1
```

---

## 📊 迁移检查清单

### 准备阶段
- [ ] 从扣子平台导出数据
- [ ] 检查导出数据完整性
- [ ] 备份现有数据库（如有需要）
- [ ] 确认迁移脚本已准备好

### 执行阶段
- [ ] 应用新数据库 schema
- [ ] Prisma Client 生成成功
- [ ] 执行数据迁移脚本
- [ ] 检查迁移日志无错误

### 验证阶段
- [ ] 记录数量匹配
- [ ] 抽查数据准确性
- [ ] 新字段有合理默认值
- [ ] metadata 包含迁移信息

### 上线阶段
- [ ] 代码推送到生产
- [ ] Vercel 部署成功
- [ ] API 响应正常
- [ ] 前端功能测试通过

---

## ⚠️ 常见问题

### Q1：迁移失败，提示字段不存在

**原因：** schema 未正确应用

**解决：**
```bash
# 检查 schema 文件
cat prisma/schema.prisma

# 重新生成
npx prisma generate
npx prisma db push
```

### Q2：数据导入后乱码

**原因：** CSV 文件编码问题

**解决：**
```javascript
// 指定编码读取
fs.createReadStream('customers_export.csv', 'utf-8')
```

### Q3：UUID 冲突

**原因：** 扣子 UUID 与现有数据重复

**解决：**
```javascript
// 跳过重复数据
await prisma.customer.createMany({
  data: batch,
  skipDuplicates: true
})
```

### Q4：迁移速度慢

**原因：** 一次性插入数据量太大

**解决：**
```javascript
// 分批插入
const batchSize = 50  // 调整批次大小
```

---

## ✅ 迁移成功标志

迁移成功后，你应该看到：

- ✅ 客户记录数量正确
- ✅ 所有扣子字段都正确迁移
- ✅ 新字段有合理默认值
- ✅ metadata 记录迁移来源和时间
- ✅ API 返回正确的数据结构
- ✅ 前端可以正常显示客户列表

---

## 📞 需要帮助？

如果迁移过程中遇到问题：

1. **查看错误日志** - 迁移脚本会输出详细错误信息
2. **使用 Prisma Studio** - 可视化检查数据库状态
3. **回滚到备份** - 如有严重问题，使用备份数据

---

## 🎯 下一步

迁移完成后：

1. **更新后端 API** - 适配新的字段结构
2. **更新前端 UI** - 支持新增字段显示
3. **添加标签功能** - 实现客户标签管理
4. **开始 AI 意图识别** - 进入第二大类改造
