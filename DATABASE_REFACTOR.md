# 数据库表结构重构方案

## 📊 概述

将现有数据库表结构进行优化，增强业务能力，支持更完善的客户管理、拜访记录、活动管理功能。

---

## 🔄 主要变更对比

### 1. 客户表（Customer）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|--------|
| `familyStatus` | String | 明确的家庭状况枚举值 |
| `hasChildren` | Boolean | 是否有子女 |
| `childrenCount` | Int | 子女数量 |
| `insuranceNeeds` | Text | 长文本（原 String） |
| `currentInsurance` | Text | 已有保险信息 |
| `tags` | String[] | 客户标签数组 |
| `customerStage` | String | 客户生命周期阶段 |
| `metadata` | Json | 扩展元数据 |

#### 删除字段

| 字段名 | 原因 |
|--------|------|
| 无 | 保留所有原有字段 |

#### 优化点

✅ 支持客户标签系统（VIP/潜客/流失客户等）
✅ 客户生命周期管理（潜在→接触→方案→谈判→成交→流失）
✅ 灵活的扩展字段（metadata）
✅ 更清晰的枚举值

---

### 2. 新增：客户标签系统

#### 新增表：CustomerTag

```
- id: 标签ID
- name: 标签名称（唯一）
- color: 标签颜色
- createdAt: 创建时间
```

#### 新增表：CustomerTagRelation

```
- id: 关联ID
- customerId: 客户ID
- tagId: 标签ID
- createdAt: 创建时间

唯一约束：customerId + tagId
```

**优势：**
✅ 支持客户打多个标签
✅ 标签可复用
✅ 便于筛选和分组

---

### 3. 拜访记录表（VisitRecord）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|
| `purpose` | Text | 拜访目的 |
| `content` | Text | 长文本（原 String） |
| `result` | Text | 长文本（原 String） |
| `nextDate` | DateTime | 下次跟进时间 |
| `interestLevel` | String | 客户兴趣程度 |
| `concerns` | Text | 客户顾虑/疑问 |
| `attachment` | String | 附件路径 |
| `metadata` | Json | 扩展元数据 |

#### 优化点

✅ 更详细的拜访记录（目的、顾虑、兴趣度）
✅ 支持附件管理
✅ 明确下次跟进时间
✅ 灵活的扩展字段

---

### 4. 活动表（Activity）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|
| `registeredCount` | Int | 已报名人数 |
| `attendedCount` | Int | 实际参与人数 |
| `priority` | String | 活动优先级 |
| `onlineLink` | String | 在线活动链接 |
| `coverImage` | String | 封面图片 |
| `materials` | String[] | 活动资料链接 |
| `metadata` | Json | 扩展元数据 |

#### 优化点

✅ 更精准的参与人数统计
✅ 支持线上线下活动
✅ 活动资料管理
✅ 活动优先级

---

### 5. 活动参与记录表（ActivityParticipation）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|
| `status` | String | 增加状态：no-show |
| `fee` | Int | 参与费用 |
| `paymentStatus` | String | 支付状态 |
| `cancelTime` | DateTime | 取消时间 |
| `feedback` | Text | 长文本（原 String） |
| `suggestions` | Text | 建议和意见 |
| `metadata` | Json | 扩展元数据 |

#### 优化点

✅ 支持活动费用管理
✅ 支付状态跟踪
✅ 更详细的反馈收集
✅ 缺席状态标记

---

### 6. 跟进工作表（FollowUp）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|
| `content` | Text | 长文本（原 String） |
| `reminderTime` | DateTime | 提醒时间 |
| `attachment` | String | 附件路径 |
| `remark` | Text | 备注内容 |
| `metadata` | Json | 扩展元数据 |

#### 优化点

✅ 支持提醒时间设置
✅ 附件管理
✅ 备注和元数据扩展

---

### 7. AI 对话记录表（ChatHistory）

#### 新增字段

| 字段名 | 类型 | 说明 | 原因 |
|--------|------|------|
| `content` | Text | 长文本（原 String） |
| `intent` | String | 意图识别结果 |
| `sessionId` | String | 会话ID |
| `metadata` | Json | 扩展信息 |

#### 优化点

✅ 支持意图识别存储
✅ 会话上下文关联
✅ AI 模型元数据（confidence, tokens等）

---

## 📋 数据迁移策略

### 方案 A：保留现有数据（推荐）

**适用场景：** 已有生产数据，需要保留

#### 迁移步骤

1. **备份数据**
   ```bash
   # 导出现有数据
   npx prisma db seed --schema=./prisma/schema.prisma
   ```

2. **创建新表结构**
   ```bash
   # 应用新的 schema
   npx prisma db push --schema=./prisma/schema-new.prisma
   ```

3. **数据迁移脚本**
   ```bash
   # 运行迁移脚本（需要编写）
   node scripts/migrate-data.js
   ```

4. **验证数据**
   ```bash
   # 使用 Prisma Studio 检查
   npx prisma studio
   ```

5. **切换 schema**
   ```bash
   # 重命名新 schema
   mv prisma/schema-new.prisma prisma/schema.prisma
   ```

---

### 方案 B：清空重建（测试环境）

**适用场景：** 开发测试，数据不重要

#### 迁移步骤

1. **删除旧表**
   ```bash
   npx prisma migrate reset --force
   ```

2. **应用新 schema**
   ```bash
   cp prisma/schema-new.prisma prisma/schema.prisma
   npx prisma db push
   ```

3. **生成种子数据（可选）**
   ```bash
   npx prisma db seed
   ```

---

## 🚀 实施建议

### 阶段 1：本地测试

1. ✅ 在本地应用新 schema
2. ✅ 测试所有 API 接口
3. ✅ 验证数据完整性

### 阶段 2：生产部署

1. ✅ 备份生产数据库
2. ✅ 执行数据迁移
3. ✅ 验证数据正确性
4. ✅ 回滚方案准备

### 阶段 3：前端适配

1. ✅ 更新前端 UI 支持新字段
2. ✅ 适配标签系统
3. ✅ 优化表单验证

---

## 📊 表结构对比总结

| 指标 | 旧版本 | 新版本 | 提升 |
|--------|---------|---------|------|
| 数据表数量 | 6 | 7 | +1 |
| 客户字段 | 16 | 25 | +56% |
| 拜访记录字段 | 11 | 15 | +36% |
| 活动表字段 | 9 | 14 | +56% |
| 参与记录字段 | 8 | 11 | +38% |
| 文本字段 | String | Text | 支持长文本 |
| 扩展性 | 无 | Json | 灵活扩展 |

---

## ✅ 下一步行动

1. **确认迁移方案**
   - 保留现有数据？
   - 还是清空重建？

2. **准备迁移脚本**
   - 如需保留数据，需要编写迁移脚本

3. **更新后端 API**
   - 适配新的表结构
   - 添加标签管理接口

4. **更新前端**
   - 适配新的字段
   - 添加标签功能

---

**请确认：**
- 是否需要保留现有数据？
- 是否同意这个表结构设计？
- 有其他需求或修改建议？
