# 使用前端导入数据迁移扣子数据指南

## 📋 概述

本指南说明如何使用前端的"数据迁移"页面,将扣子平台导出的 CSV/Excel 数据导入到新数据库。

---

## 🚀 迁移步骤

### 第 1 步:从扣子平台导出数据

1. 登录扣子平台
2. 进入客户数据管理页面
3. 导出客户数据为 CSV 或 Excel 文件
4. 确保导出的文件包含以下字段:
   - name (姓名)
   - age (年龄)
   - sex (性别)
   - profession (职业)
   - family_profile (家庭情况)
   - core_interesting (核心关注点)
   - prefer_communicate (沟通偏好)
   - recent_money (资金情况)
   - nickname (客户昵称)
   - sys_platform (平台来源)
   - uuid (用户唯一标识)

### 第 2 步:准备数据文件

如果导出的字段名与新 schema 不一致,您需要在 Excel 中重命名列:

**扣子字段 → 新 schema 字段:**

| 扣子字段 | 新 schema 字段 | 说明 |
|---------|--------------|------|
| name | name | 保留 |
| age | age | 保留(String 类型) |
| sex/gender | sex | 映射为 sex |
| profession/job | profession | 映射为 profession |
| family_profile/familyStatus | family_profile | 映射为 family_profile |
| core_interesting | core_interesting | 保留 |
| prefer_communicate | prefer_communicate | 保留 |
| recent_money | recent_money | 保留 |
| nickname | nickname | 保留 |
| sys_platform | sys_platform | 保留 |
| uuid | uuid | 保留 |
| insuranceNeeds | insurance_needs | 映射为 insurance_needs |

**注意:** 如果您的 Excel 文件已经有正确的字段名,则无需修改。

### 第 3 步:启动前端项目

在本地启动前端开发服务器:

```bash
cd /Users/zhengli/CodeBuddy/20260318092523/frontend
npm run dev
```

访问: `http://localhost:5173`

### 第 4 步:使用数据导入功能

1. 在左侧导航栏中,点击 **"数据迁移"**
2. 选择 **"客户数据导入"** 标签页
3. 可选:点击 **"下载客户模板"** 查看推荐的 Excel 格式
4. 点击上传区域,选择您从扣子导出的 CSV/Excel 文件
5. 等待导入完成

### 第 5 步:查看导入结果

导入完成后,您会看到:

- ✅ **成功数量**: 成功导入的客户记录数
- ❌ **失败数量**: 导入失败的记录数
- 📝 **错误详情**: 如果有失败记录,会显示具体的错误信息

**示例:**
```
导入结果
成功: 120
失败: 0
```

---

## 🔍 常见问题

### Q1: 导入失败,提示"字段不存在"

**原因:** Excel 中的列名与数据库字段不匹配。

**解决:**
1. 点击"下载客户模板"查看正确的列名
2. 在 Excel 中将列名重命名为模板中的名称
3. 重新上传

### Q2: 性别字段显示错误

**原因:** 性别格式不正确。

**解决:** 确保性别值为以下之一:
- `male` (男)
- `female` (女)
- `unknown` (未知)

### Q3: UUID 冲突

**原因:** 扣子 UUID 与现有数据重复。

**解决:** 导入逻辑会自动跳过重复的 UUID,无需处理。

### Q4: 导入后新字段为空

**原因:** 扣子数据中没有新字段,系统会自动填充默认值。

**默认值:**
- `customer_stage`: `"potential"`
- `tags`: `[]` (空数组)
- `status`: `"active"`
- `metadata`: 包含迁移来源和时间戳

---

## ✅ 导入成功标志

导入成功后,您应该看到:

- ✅ 客户记录数量与扣子导出一致
- ✅ 所有扣子字段正确迁移
- ✅ 新字段有合理的默认值
- ✅ `metadata` 字段包含迁移来源和时间
- ✅ 可以在"客户管理"页面看到导入的客户

---

## 🎯 下一步

导入完成后:

1. **验证数据**: 在"客户管理"页面查看导入的客户
2. **补充信息**: 为新字段(`phone`, `email`, `tags`)补充数据
3. **设置客户阶段**: 根据 `customer_stage` 字段管理客户
4. **开始 AI 意图识别**: 进入第二大类改造

---

## 📞 技术支持

如果导入过程中遇到问题:

1. **检查 Excel 格式**: 确保使用 `.xlsx` 或 `.xls` 格式
2. **查看错误详情**: 系统会显示详细的错误信息
3. **分批导入**: 如果数据量很大,可以分批导入
4. **查看后端日志**: 如果问题严重,可以检查后端日志

---

## 🎉 完成!

恭喜您完成了扣子数据迁移!现在您的客户数据已经在新的数据库系统中。
