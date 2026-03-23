---
name: insurance-agent-assistant-web-app
overview: 更新方案为：基于 Supabase 的响应式 Web 智能体，采用 chatbox 主导交互，覆盖客户管理、拜访/活动记录、综合查询、任务提醒、注册登录与数据隔离，并按 GitHub + Vercel 的交付链路实施。
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - 高端商务
    - 深海蓝
    - 轻玻璃质感
    - 对话驱动
    - 精英可信
    - 流畅微动效
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 30px
      weight: 700
    subheading:
      size: 18px
      weight: 600
    body:
      size: 15px
      weight: 400
  colorSystem:
    primary:
      - "#123B6A"
      - "#1E5AA8"
      - "#2F7FD9"
    background:
      - "#F4F7FB"
      - "#FFFFFF"
      - "#EAF1FA"
    text:
      - "#0F172A"
      - "#334155"
      - "#FFFFFF"
    functional:
      - "#16A34A"
      - "#DC2626"
      - "#D97706"
      - "#0EA5E9"
todos:
  - id: bootstrap-app
    content: 初始化 Next.js、Supabase 与响应式应用骨架
    status: pending
  - id: auth-security
    content: 实现注册登录、路由守卫和私有数据权限
    status: pending
    dependencies:
      - bootstrap-app
  - id: define-agent
    content: 使用 [skill:skill-creator] 定义 chatbox 智能体规范
    status: pending
    dependencies:
      - bootstrap-app
  - id: build-crm
    content: 落地客户、拜访、活动数据模型与 CRUD
    status: pending
    dependencies:
      - auth-security
  - id: query-reminder
    content: 实现综合查询、任务提醒与聊天动作执行
    status: pending
    dependencies:
      - build-crm
      - define-agent
  - id: verify-delivery
    content: 使用 [subagent:code-explorer] 校验 GitHub 与 Vercel 交付
    status: pending
    dependencies:
      - query-reminder
---

## User Requirements

- 面向资深保险代理人的 Web 智能体，支持电脑与手机浏览器访问，并能自适应不同屏幕尺寸。
- 应用以 chatbox 为主要交互入口，代理人通过自然语言输入需求，智能体理解后执行，并把结果以清晰的列表、卡片、时间线或提醒形式展示出来。

## Product Overview

该应用围绕“客户经营”与“代理人陪伴”两条主线展开。界面核心是对话框，用户既可以通过聊天完成新增、查询、修改等操作，也可以在页面中查看结构化结果。整体视觉应专业、可信、易读，桌面端适合高频办公，手机端适合快速录入与查看提醒。

## Core Features

- 用户管理：支持注册、登录与退出，用于保护敏感客户数据；每个代理人只能查看和管理自己录入的客户与相关记录。
- 客户基础信息管理：支持客户信息的新增、删除、修改，并可查看客户详情。
- 拜访记录管理：支持记录代理人拜访客户的情况，并可新增、删除、修改相关记录。
- 客户活动记录管理：支持记录代理人组织多名客户参加活动的情况，并可新增、删除、修改记录。
- 综合查询：支持查询客户基础信息、客户经营情况，以及查找具有共同特点的客户。
- 任务提醒：从拜访记录和活动记录中的后续工作生成提醒，帮助代理人持续跟进。
- 独立对话助手：贯穿整个应用，在客户管理过程中持续可用；既能理解管理意图并协助执行，也能对代理人进行赞扬、安慰与陪伴式反馈。

## Tech Stack Selection

- 代码库现状：已探索 `c:/Users/郑理/.codebuddy/保险代理人助手`，当前为空目录，适合按全新项目落地。
- 前端框架：Next.js（App Router）+ TypeScript
- UI 与样式：Tailwind CSS + shadcn/ui
- 数据与认证：Supabase（PostgreSQL、Auth、RLS）
- 数据请求与缓存：TanStack Query
- 表单与校验：React Hook Form + Zod
- 测试：Vitest + Playwright
- 交付链路：GitHub 仓库管理，Vercel 部署

## Implementation Approach

采用“结构化 CRM 模块 + chatbox 智能体入口”双轨方案。页面负责稳定展示客户、记录、任务与查询结果；chatbox 负责理解自然语言、生成操作预览并触发业务动作。这样既保留对话式体验，也能保证录入、校验、查询与修改过程可控、可回看。

关键技术决策：

- 选用 Next.js，是因为它同时满足响应式 Web、服务端接口能力与 Vercel 部署一致性，减少额外网关层。
- 选用 Supabase Auth 与 Row Level Security，把“每个代理人只能看自己的数据”下沉到数据库层，避免只靠前端控制权限。
- 多客户活动采用“活动主表 + 参与客户关联表”，支持一场活动关联多名客户，也方便统计客户共同特征。
- chatbox 写操作统一走“意图识别 → 结构化预览 → 用户确认 → 执行”流程，降低误删误改风险。
- 任务提醒在拜访记录、活动记录新增或修改时增量生成，不做全表反复扫描，控制写后开销。

性能与可靠性：

- 高频查询优先建立 `owner_id + created_at`、`owner_id + status` 等组合索引，常见读取复杂度接近 O(log n)。
- 综合查询优先走结构化筛选与索引字段；备注类全文检索在字段明确后再扩展，避免早期过度设计。
- 所有业务写入通过服务层统一封装，chatbox 只调用动作执行器，不直接操作数据库。
- 客户敏感数据不写入前端日志；错误日志仅保留动作类型、请求编号和可定位信息。

## Implementation Notes

- 业务表统一带 `owner_id`，所有读写依赖登录态与 RLS 同时生效。
- 客户字段要求尚未完全给出，先固定表关系与迁移入口，后续通过增量 migration 补充字段，避免大范围返工。
- chatbox 与页面共用同一套领域服务，避免一套逻辑两套实现。
- 删除、批量修改、任务关闭等高风险操作都要求明确确认。
- 不在客户端暴露 Supabase 高权限密钥；如需服务端特权操作，只放在服务器环境变量中。

## Architecture Design

### System Structure

- 表现层：登录注册页、工作台、客户中心、记录中心、任务与洞察页、全局 chatbox
- 应用层：认证服务、客户服务、拜访服务、活动服务、查询服务、任务生成器、智能体意图路由、动作执行器
- 数据层：Supabase Auth、PostgreSQL 表、RLS 策略、索引、查询视图或 RPC

### Core Data Model

- `profiles`：代理人资料
- `customers`：客户基础信息
- `visit_records`：拜访记录
- `activity_events`：客户活动记录主表
- `activity_participants`：活动与客户的多对多关系
- `tasks`：后续提醒任务

### Main Flow

1. 用户登录后进入工作台，仅加载本人数据范围。
2. 用户通过 chatbox 或页面表单发起操作。
3. 智能体将输入转换为标准业务动作。
4. 领域服务校验参数并写入 Supabase。
5. 任务生成器同步创建或更新提醒。
6. 页面与 chatbox 同步回显结果与状态。

## Directory Structure

以下为建议创建的完整核心结构，覆盖前端骨架、Supabase 模式、业务模块、智能体层与部署文件。

```text
project-root/
├── package.json  # [NEW] 项目依赖与脚本。定义开发、构建、测试、Lint、类型检查命令。
├── README.md  # [NEW] 项目说明。记录本地运行、Supabase 配置、GitHub 提交流程与 Vercel 部署步骤。
├── .env.example  # [NEW] 环境变量模板。包含 Supabase、模型服务、部署所需键名说明。
├── next.config.ts  # [NEW] Next.js 构建配置。确保 Vercel 兼容与安全响应头。
├── middleware.ts  # [NEW] 路由守卫。保护业务页，未登录时跳转登录页。
├── src/
│   ├── app/
│   │   ├── layout.tsx  # [NEW] 全局布局。挂载主题、查询客户端、通知与会话上下文。
│   │   ├── page.tsx  # [NEW] 根路由。根据登录态跳转工作台或登录页。
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx  # [NEW] 登录页。支持邮箱密码登录与错误提示。
│   │   │   ├── register/page.tsx  # [NEW] 注册页。完成代理人账户创建与基础资料初始化。
│   │   │   └── callback/route.ts  # [NEW] 认证回调。处理 Supabase 会话交换与重定向。
│   │   ├── (app)/
│   │   │   ├── layout.tsx  # [NEW] 业务区骨架。放置顶部导航、侧栏、底部导航与全局 chatbox。
│   │   │   ├── dashboard/page.tsx  # [NEW] 智能工作台。展示鼓励关怀、任务摘要、近期客户与聊天入口。
│   │   │   ├── customers/page.tsx  # [NEW] 客户中心。展示客户列表、筛选、详情与 CRUD。
│   │   │   ├── records/page.tsx  # [NEW] 记录中心。管理拜访记录与客户活动记录。
│   │   │   ├── tasks/page.tsx  # [NEW] 任务页。查看提醒状态、到期时间与来源记录。
│   │   │   └── insights/page.tsx  # [NEW] 洞察页。承载综合查询与共同特征客户结果。
│   │   └── api/
│   │       └── agent/route.ts  # [NEW] 智能体接口。接收聊天消息，完成意图识别、确认与动作派发。
│   ├── components/
│   │   ├── shell/app-shell.tsx  # [NEW] 响应式应用壳。统一桌面与移动端导航布局。
│   │   ├── chat/agent-chatbox.tsx  # [NEW] 核心聊天组件。输入消息、展示预览并回显执行结果。
│   │   ├── chat/message-list.tsx  # [NEW] 消息流渲染。区分系统、用户、执行结果与关怀回复。
│   │   ├── chat/action-preview-card.tsx  # [NEW] 写操作预览卡。展示待创建或待修改内容并确认。
│   │   ├── customers/customer-table.tsx  # [NEW] 客户表格。支持筛选、分页与快捷操作。
│   │   ├── customers/customer-form-drawer.tsx  # [NEW] 客户表单抽屉。用于新增与编辑客户。
│   │   ├── records/visit-record-list.tsx  # [NEW] 拜访记录列表。按客户、时间、状态查看。
│   │   ├── records/activity-record-list.tsx  # [NEW] 活动记录列表。展示多客户参与情况。
│   │   ├── tasks/task-reminder-panel.tsx  # [NEW] 任务提醒面板。聚合待办、逾期与已完成任务。
│   │   └── insights/query-result-panel.tsx  # [NEW] 查询结果面板。展示结构化结果卡片与统计块。
│   ├── features/
│   │   ├── auth/
│   │   │   ├── auth-service.ts  # [NEW] 认证服务。封装注册、登录、登出、会话读取。
│   │   │   └── auth-schema.ts  # [NEW] 认证表单校验规则。
│   │   ├── customers/
│   │   │   ├── customer-service.ts  # [NEW] 客户领域服务。实现客户 CRUD 与列表查询。
│   │   │   ├── customer-repository.ts  # [NEW] 客户数据访问。集中封装 Supabase 查询。
│   │   │   └── customer-schema.ts  # [NEW] 客户输入校验与 DTO 转换。
│   │   ├── visits/
│   │   │   ├── visit-service.ts  # [NEW] 拜访服务。实现记录 CRUD 与关联任务触发。
│   │   │   ├── visit-repository.ts  # [NEW] 拜访数据访问。封装用户维度查询。
│   │   │   └── visit-schema.ts  # [NEW] 拜访记录校验规则。
│   │   ├── activities/
│   │   │   ├── activity-service.ts  # [NEW] 活动服务。处理活动主记录与参与客户关系。
│   │   │   ├── activity-repository.ts  # [NEW] 活动数据访问。批量写入活动与参与者映射。
│   │   │   └── activity-schema.ts  # [NEW] 活动记录校验规则。
│   │   ├── tasks/
│   │   │   ├── task-service.ts  # [NEW] 任务服务。查询、更新与关闭任务。
│   │   │   └── reminder-generator.ts  # [NEW] 提醒生成器。根据后续事项增量生成任务。
│   │   ├── insights/
│   │   │   └── insight-service.ts  # [NEW] 综合查询服务。组合客户、记录、任务形成查询结果。
│   │   └── agent/
│   │       ├── system-prompt.ts  # [NEW] 智能体系统提示与行为边界定义。
│   │       ├── intent-catalog.ts  # [NEW] 意图目录。定义可识别动作、所需字段与确认策略。
│   │       ├── intent-router.ts  # [NEW] 意图路由。把聊天输入转换为标准业务动作。
│   │       └── action-executor.ts  # [NEW] 动作执行器。调用对应领域服务并返回结果消息。
│   ├── lib/
│   │   ├── supabase/client.ts  # [NEW] 浏览器端 Supabase 客户端。
│   │   ├── supabase/server.ts  # [NEW] 服务端 Supabase 客户端。处理受保护读写与会话。
│   │   ├── query/query-client.ts  # [NEW] TanStack Query 客户端初始化与默认策略。
│   │   ├── utils/date.ts  # [NEW] 日期格式化与到期计算工具。
│   │   └── utils/logger.ts  # [NEW] 统一日志工具。输出可追踪但不含敏感信息。
│   └── types/
│       ├── domain.ts  # [NEW] 客户、拜访、活动、任务等领域类型定义。
│       └── agent.ts  # [NEW] 智能体消息、意图、动作预览等类型定义。
├── supabase/
│   └── migrations/
│       ├── 001_profiles.sql  # [NEW] 代理人资料表与认证关联。创建基础 profile 结构。
│       ├── 002_crm_core.sql  # [NEW] 客户、拜访、活动、参与关系、任务表。字段后续按用户要求细化。
│       ├── 003_rls_indexes.sql  # [NEW] RLS 策略与高频查询索引。保证私有访问与查询性能。
│       └── 004_query_views.sql  # [NEW] 综合查询视图或 RPC。支撑经营情况与共同特征查询。
└── tests/
    ├── agent/intent-router.test.ts  # [NEW] 意图路由测试。覆盖写操作确认与错误输入。
    ├── tasks/reminder-generator.test.ts  # [NEW] 任务生成测试。覆盖新增、修改、去重与关闭。
    └── auth/route-protection.test.ts  # [NEW] 认证与受保护路由测试。验证未登录拦截与登录跳转。
```

## 设计方向

采用“高端商务、深海蓝主色、轻玻璃质感”的界面语言，整体沉稳、可信、专业。桌面端以三栏工作台呈现：左侧导航、中间结果区、右侧 chatbox；移动端切换为顶部标题、内容主区、底部导航、抽屉式 chatbox。聊天始终可见或一键唤起，确保“对话驱动管理”是核心体验。

## 页面规划

### 1. 登录与注册

- 顶部品牌栏：显示产品名、副标题与安全感文案，背景为柔和渐变。
- 认证卡片：高对比输入框、主按钮、错误提示与密码强度反馈。
- 权限说明区：简述仅查看本人客户数据的规则。
- 底部帮助栏：放置返回入口、隐私说明与联系方式。

### 2. 智能工作台

- 顶部导航：品牌、当前用户、退出、全局搜索入口。
- 今日关怀卡：展示鼓励、安慰、任务摘要与近期进展。
- 中央 chatbox：大输入区、快捷指令、操作预览卡、结果消息流。
- 客户与任务摘要：近期客户、待跟进事项、逾期提醒双列卡片。
- 底部导航：移动端底部 Tab，桌面端底部状态条与快捷操作。

### 3. 客户中心

- 顶部导航：页面标题、快速新增、筛选条件入口。
- 客户列表区：卡片与表格双模式，桌面优先表格，移动优先卡片。
- 客户详情抽屉：展示基础信息、经营进展与最近互动时间线。
- 侧边 chatbox：支持新增客户、查找相似客户等自然语言操作。
- 底部导航：保留返回工作台、记录、任务等快捷切换。

### 4. 记录中心

- 顶部导航：拜访记录与活动记录切换标签。
- 拜访时间线：按日期排序，支持状态标签与后续事项高亮。
- 活动记录面板：突出多客户参与关系、活动主题与结果摘要。
- 快捷录入区：支持从 chatbox 或表单快速补录与修改记录。
- 底部导航：移动端便于单手切换模块，桌面端展示同步状态。

### 5. 任务与洞察

- 顶部导航：任务与查询切换、筛选与导出入口。
- 任务看板：按待办、进行中、已完成分组，突出到期时间与来源记录。
- 查询洞察区：展示客户经营情况、共同特征客户和筛选结果卡片。
- 智能建议区：chatbox 给出下一步跟进建议、赞扬或安慰话术。
- 底部导航：提供客户、记录、工作台的快速往返。

## 交互与动效

- 聊天发送、结果回写、确认卡展开使用 180ms 到 240ms 微动效。
- 删除、修改等危险动作采用二次确认与红色状态强调。
- 桌面端保持多面板并行；移动端优先单列阅读与底部操作。
- 查询结果与任务变化实时回显到 chatbox，形成连续会话体验。

## Agent Extensions

### Skill

- **skill-creator**
- Purpose: 定义 chatbox 智能体的角色、意图目录、动作边界、确认规则与回复风格。
- Expected outcome: 产出可直接落地的系统提示、意图映射、写操作确认机制与会话策略。

### SubAgent

- **code-explorer**
- Purpose: 在执行阶段持续校验项目结构、路由关系、模块依赖与新增文件的一致性。
- Expected outcome: 降低路径遗漏、模块耦合错误与集成回归风险，确保方案按目录设计完整落地。