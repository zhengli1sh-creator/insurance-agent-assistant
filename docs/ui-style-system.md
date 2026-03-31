# 保险代理人助手 UI 样式体系

## 1. 文档目的
本文件用于把当前项目里已经验证过的顾问式视觉语言固化为后续统一准绳，服务于：
- 已开发页面的持续优化
- 新页面的快速搭建
- 样式资产的统一复用
- 验收时对“是否符合顾问式雅致工作台”的一致判断

本文件与以下文档配套使用：
- `docs/design-principles.md`
- `docs/customer-center-design.md`

## 2. 单一来源
后续样式优先从以下三层获取，不再零散拼装：

1. `src/app/globals.css`
   - 设计令牌：`--advisor-*`
   - 语义样式：`advisor-*`
2. 页面/模块中已沉淀的结构化样式模式
3. 本文档中的命名、复用和扩展规则

原则：
- 新页面先找现有 `advisor-*`，找不到再补
- 同一视觉模式出现第 2 次时就要考虑抽象
- 不直接新造主色、阴影和大面积渐变

---

## 3. 现有样式资产清单

### 3.1 令牌层 Tokens
定义位置：`src/app/globals.css`

- 品牌色
  - `--advisor-ink`
  - `--advisor-ink-strong`
  - `--advisor-gold`
  - `--advisor-gold-soft`
- 边框
  - `--advisor-border-strong`
  - `--advisor-border-soft`
- Surface
  - `--advisor-surface-hero`
  - `--advisor-surface-soft`
  - `--advisor-surface-muted`
- Shadow
  - `--advisor-shadow-hero`
  - `--advisor-shadow-soft`
  - `--advisor-shadow-subtle`

### 3.2 基础 Surface / Card
- `advisor-hero-card`
- `advisor-soft-card`
- `advisor-subtle-card`
- `advisor-glass-surface`
- `advisor-glass-surface-strong`
- `advisor-field-card`
- `advisor-record-card`
- `advisor-list-item-card`
- `advisor-empty-state-card`
- `advisor-module-placeholder-card`
- `advisor-meta-tile`

### 3.3 面板 / 流程 / 容器 Surface
- `advisor-panel-header-surface`
- `advisor-panel-footer-surface`
- `advisor-input-dock`
- `advisor-dialog-surface`
- `advisor-dialog-footer-surface`
- `advisor-sheet-surface`
- `advisor-sheet-header-surface`
- `advisor-disclosure-card`
- `advisor-disclosure-toggle`

### 3.4 语义提示卡 / 简报卡
- `advisor-briefing-panel`
- `advisor-briefing-panel-known`
- `advisor-briefing-panel-missing`
- `advisor-briefing-panel-next`
- `advisor-preview-notice`
- `advisor-notice-card`
- `advisor-notice-card-info`
- `advisor-notice-card-success`
- `advisor-notice-card-warning`

### 3.5 Chip / Status / Icon
- `advisor-accent-chip`
- `advisor-chip-info`
- `advisor-chip-success`
- `advisor-chip-warning`
- `advisor-chip-neutral`
- `advisor-status-healthy`
- `advisor-status-progress`
- `advisor-status-pending`
- `advisor-icon-badge`
- `advisor-icon-badge-info`
- `advisor-icon-badge-success`
- `advisor-icon-badge-warning`
- `advisor-icon-badge-neutral`
- `advisor-icon-badge-sm`
- `advisor-icon-badge-md`

### 3.6 交互 / 排版
- `advisor-primary-button`
- `advisor-outline-button`
- `advisor-section-label`
- `advisor-kicker`
- `advisor-hairline`
- `advisor-assistant-bubble`
- `advisor-user-bubble`

---

## 4. 本轮已收口的高复用样式
本轮优先把此前散落在组件内部、且已跨页面重复的模式抽回全局：

1. 玻璃态页面壳
   - `advisor-glass-surface`
   - `advisor-glass-surface-strong`
2. 统一提示卡 family
   - `advisor-notice-card-*`
3. 底部抽屉 / 浮层 surface
   - `advisor-sheet-surface`
   - `advisor-sheet-header-surface`
4. 折叠说明卡
   - `advisor-disclosure-card`
   - `advisor-disclosure-toggle`
5. 列表项 / 记录卡 / 字段 tile
   - `advisor-list-item-card`
   - `advisor-record-card`
   - `advisor-meta-tile`
6. Tone chip / icon badge
   - `advisor-chip-*`
   - `advisor-icon-badge-*`
7. 助手对话气泡
   - `advisor-assistant-bubble`
   - `advisor-user-bubble`

---

## 5. 推荐映射规则

### 5.1 页面骨架
- 页面主壳：`glass-panel + advisor-glass-surface(-strong)`
- 区块头部：`advisor-panel-header-surface`
- 底部操作区：`advisor-panel-footer-surface`
- 底部输入 dock：`advisor-input-dock`

### 5.2 卡片分层
- 主工作卡：`advisor-soft-card`
- 次级辅助卡：`advisor-subtle-card`
- Hero / 页面头部主卡：`advisor-hero-card`
- 列表项卡：`advisor-list-item-card`
- 记录条目卡：`advisor-record-card`
- 字段 tile：`advisor-meta-tile`
- 空状态 / 占位：`advisor-module-placeholder-card` 或 `advisor-empty-state-card`

### 5.3 反馈与提示
- 信息提醒：`advisor-notice-card advisor-notice-card-info`
- 成功反馈：`advisor-notice-card advisor-notice-card-success`
- 风险提醒 / 需确认：`advisor-notice-card advisor-notice-card-warning`

### 5.4 图标与标签
- 品牌提示：`advisor-accent-chip`
- 中性信息：`advisor-chip-info`
- 成功状态：`advisor-chip-success`
- 待确认 / 自动返回：`advisor-chip-warning`
- 普通弱提示：`advisor-chip-neutral`

- 品牌图标徽章：`advisor-icon-badge advisor-icon-badge-warning`
- 信息徽章：`advisor-icon-badge advisor-icon-badge-info`
- 成功徽章：`advisor-icon-badge advisor-icon-badge-success`
- 中性徽章：`advisor-icon-badge advisor-icon-badge-neutral`

### 5.5 按钮
- 主动作：`advisor-primary-button`
- 次动作：`advisor-outline-button`

---

## 6. 页面级实施规则

### A 类场景：助手驱动单主流程
适用：新增客户、记录拜访、联系前回顾、今日重点

要求：
- 首屏只突出一个主工作区
- 页面壳优先使用 `advisor-glass-surface`
- 说明、风险、自动返回等信息优先落到 `advisor-notice-card-*`
- 输入底区优先使用 `advisor-input-dock`

### B 类场景：助手发起 + 结构化承接
适用：活动补录、批量处理、名单核对、模板沉淀

要求：
- 列表区、核对区、结果区必须结构化承接
- 列表条目优先使用 `advisor-record-card` / `advisor-list-item-card`
- 批量说明、校验提醒优先使用 `advisor-notice-card-*`

### C 类场景：全量视图 / 复盘视图
适用：周复盘、月复盘、趋势总览

要求：
- 必须保留总览、对比、趋势分区
- 主区块优先用 `advisor-soft-card`
- 子指标与摘要块优先用 `advisor-field-card` / `advisor-meta-tile`

---

## 7. 新增样式的准入规则
后续新增 `advisor-*` 时必须满足：

1. 该模式已跨页面或跨模块重复
2. 现有类无法稳定表达其语义
3. 新名称属于“语义命名”，不是视觉细节命名

推荐命名：
- `advisor-{surface|card|panel|chip|badge|notice|sheet}-{tone|purpose}`

避免命名：
- `advisor-blue-card`
- `advisor-shadow-card`
- `advisor-24-radius-panel`

---

## 8. 本轮迁移示范
本轮已优先迁移以下代表页面 / 组件：

1. `src/app/(app)/customers/new/page.tsx`
   - 作为 A 类高频单主流程示范
   - 收口了页面壳、输入 dock、对话气泡、结果反馈卡等样式模式

2. `src/components/records/visit-manager.tsx`
   - 作为“记录拜访 + 中断恢复”示范
   - 收口了流程提示卡、恢复抽屉、记录列表卡、字段 tile

3. `src/components/records/activity-manager.tsx`
   - 作为 B 类“活动补录 + 参与客户校验”示范
   - 验证 `visit-manager` 沉淀出的样式模式可跨兄弟模块复用

补充：
- `src/components/customers/customer-profile-fields.tsx` 已把折叠补充区迁入 `advisor-disclosure-card`

---

## 9. 后续迁移优先级
下一轮建议按以下顺序继续推进：

1. `src/components/customers/customer-detail-shell.tsx`
   - 作为客户详情标准页继续收口
2. `src/components/customers/customer-center-shell.tsx`
   - 统一客户列表入口页骨架
3. `src/components/customers/customer-crm-panel.tsx`
   - 收口客户域中的提醒卡、恢复卡、助手面板
4. `src/components/tasks/*` 与 `src/components/records/*`
   - 统一列表卡与状态 chip

---

## 10. 开发检查清单
每次新增或改造页面前，先过以下清单：

- 是否已判断属于 A / B / C 哪类场景
- 是否优先复用现有 `advisor-*`
- 是否避免直接写新的主色 / 大渐变 / 阴影
- 是否把提示、确认、成功反馈落入 `advisor-notice-card-*`
- 是否把列表条目、记录块、字段 tile 落入统一模式
- 是否支持手机端单主工作区
- 是否符合“助手驱动主流程 + 全量视图兜底 + 中断可恢复”

如果答案有任一项为“否”，应继续收口，不直接交付。
