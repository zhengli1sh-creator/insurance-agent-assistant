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

### 3.4 表单控件
- `advisor-form-control`
- `advisor-form-control-muted`
- `advisor-form-control-highlighted`
- `advisor-form-select`
- `advisor-form-textarea`


### 3.5 语义提示卡 / 简报卡 / Review
- `advisor-briefing-panel`
- `advisor-briefing-panel-known`
- `advisor-briefing-panel-missing`
- `advisor-briefing-panel-next`
- `advisor-preview-notice`
- `advisor-notice-card`
- `advisor-notice-card-info`
- `advisor-notice-card-success`
- `advisor-notice-card-warning`
- `advisor-review-card`
- `advisor-review-card-success`
- `advisor-review-highlight`
- `advisor-review-chip`

### 3.6 Chip / Status / Icon
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

### 3.7 交互 / 排版
- `advisor-primary-button`
- `advisor-outline-button`
- `advisor-section-label`
- `advisor-kicker`
- `advisor-hairline`
- `advisor-assistant-bubble`
- `advisor-user-bubble`


---

## 4. 本轮已收口的高复用样式
本轮优先把此前散落在组件内部、且已跨页面重复的模式抽回全局。

补充结论：
- 本轮把 `src/components/tasks/*` 收口后，未新增新的全局 `advisor-*` 类
- 说明现有样式体系已经可以稳定覆盖任务域中的状态分栏、指标卡、空态和批量处理提示
- 后续若任务域再出现新视觉需求，应优先复用既有 `advisor-*`，而不是为状态颜色或任务卡层级单独造类

本轮已确认的高复用模式如下：

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
7. 表单控件 family
   - `advisor-form-control`
   - `advisor-form-control-muted`
   - `advisor-form-control-highlighted`
   - `advisor-form-select`
   - `advisor-form-textarea`

8. Review / 复核高亮 family
   - `advisor-review-card`
   - `advisor-review-card-success`
   - `advisor-review-highlight`
   - `advisor-review-chip`
9. 助手对话气泡
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
- AI 整理 / 待复核区：`advisor-review-card advisor-review-card-success`
- 复核高亮：`advisor-review-highlight`
- 复核标签：`advisor-review-chip`

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

### 5.5 表单控件
- 通用输入 / 触发器：`advisor-form-control`
- 弱化背景输入：`advisor-form-control advisor-form-control-muted`
- AI 整理后的待复核输入：`advisor-form-control advisor-form-control-highlighted`
- `SelectTrigger`：`advisor-form-control advisor-form-select`
- `Textarea`：`advisor-form-control advisor-form-textarea`


### 5.6 按钮
- 主动作：`advisor-primary-button`
- 次动作：`advisor-outline-button`

### 5.7 跨域组件映射示范
以下 3 个组件分别代表客户域、记录域、任务域，已可作为后续收口时的优先参考：

1. `src/components/customers/customer-profile-fields.tsx`（客户域）
   - 字段组容器：`advisor-field-card`
   - 输入控件：`advisor-form-*`
   - AI 整理 / 待复核区：`advisor-review-*`
   - 折叠补充区：`advisor-disclosure-card` + `advisor-disclosure-toggle`

2. `src/components/records/activity-manager.tsx`（记录域）
   - 流程说明、自动返回、校验提示：`advisor-notice-card-*`
   - 流程状态与提示标签：`advisor-chip-*`
   - 参与客户核对与结果条目：`advisor-list-item-card`
   - AI 整理与确认区：`advisor-review-*`

3. `src/components/tasks/task-board.tsx`（任务域）
   - 看板总览卡与状态分栏：`advisor-soft-card` / `advisor-subtle-card`
   - 顶部指标卡：`advisor-meta-tile`
   - 批量处理建议区：`advisor-notice-card advisor-notice-card-info` + `advisor-icon-badge-*`
   - 状态数量、优先级、节奏提示：`advisor-chip-*`
   - 单条任务卡：`advisor-list-item-card`
   - 到期安排与执行提醒：`advisor-meta-tile` + `advisor-field-card`
   - 空态承接：`advisor-empty-state-card`

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

4. `src/components/tasks/task-board.tsx`
   - 作为 B 类“今日重点 + 批量处理”示范
   - 验证既有 `advisor-soft-card`、`advisor-subtle-card`、`advisor-meta-tile`、`advisor-list-item-card`、`advisor-chip-*`、`advisor-icon-badge-*` 可直接承接任务域

5. `src/components/tasks/live-task-board.tsx`
   - 作为“数据桥接层不额外创造视觉语言”示范
   - 加载态、示例态、实时态全部复用 `task-board.tsx` 已沉淀的语义样式，不为数据来源单独发明样式分支

补充：
- `src/components/customers/customer-profile-fields.tsx` 已把字段组容器、输入控件、高亮复核与折叠补充区统一纳入 `advisor-form-*`、`advisor-review-*` 与 `advisor-disclosure-card`
- `src/components/customers/customer-center-shell.tsx`、`src/components/customers/customer-detail-shell.tsx`、`src/components/customers/customer-crm-panel.tsx` 已完成客户中心标准页收口
- 本轮任务域收口未新增全局类，说明“客户域 -> 记录域 -> 任务域”已经形成稳定的复用链路

### 8.1 已验证可跨客户域 / 记录域 / 任务域复用的模式
- `advisor-chip-*`：可同时承接客户状态提示、记录流程状态、任务优先级与分栏统计
- `advisor-icon-badge-*`：可同时承接记录入口说明、批量处理建议、状态图标容器
- `advisor-list-item-card`：可同时承接客户列表项、记录条目、任务单条卡
- `advisor-meta-tile`：可同时承接客户指标、任务总览指标、任务到期信息块
- `advisor-field-card`：可同时承接客户字段组、记录后续动作区、任务执行提醒区
- `advisor-notice-card-*`：可同时承接记录流程提示、恢复说明、任务批量处理建议
- `advisor-empty-state-card`：可同时承接客户列表空态与任务分栏空态
- `advisor-soft-card` / `advisor-subtle-card`：可同时承接页面辅助卡、结构化工作区与任务状态分栏

---


## 9. 后续迁移优先级
下一轮建议按以下顺序继续推进：

1. `src/app/(app)/tasks/page.tsx`
   - 把任务页顶部入口主卡继续收口到 `advisor-hero-card`、`advisor-accent-chip` 等页面级骨架模式
2. `src/components/chat/chat-panel.tsx`
   - 统一快捷入口 pill、预览卡、状态提示与主次按钮，减少内联颜色与渐变写法
3. `src/components/customers/customer-list.tsx`
   - 清理 tier badge、信息 tile、下一步经营动作卡中的零散内联样式
4. 其余残留内联样式的辅助组件
   - 优先清理 `border / bg / shadow / text-*` 的局部直写，继续回收到既有 `advisor-*`

---


## 10. 开发检查清单
每次新增或改造页面前，先过以下清单：

- 是否已判断属于 A / B / C 哪类场景
- 是否优先复用现有 `advisor-*`
- 是否避免直接写新的主色 / 大渐变 / 阴影
- 是否把提示、确认、成功反馈落入 `advisor-notice-card-*`
- 是否把表单输入优先收口到 `advisor-form-*`
- 是否把 AI 整理 / 待复核高亮优先收口到 `advisor-review-*`
- 是否把列表条目、记录块、字段 tile 落入统一模式
- 是否支持手机端单主工作区

- 是否符合“助手驱动主流程 + 全量视图兜底 + 中断可恢复”

如果答案有任一项为“否”，应继续收口，不直接交付。
