---
name: insurance-agent-assistant-web-app
overview: 更新方案为：面向资深保险代理人的高审美响应式 Web 智能体，基于 Supabase、GitHub 与 Vercel，采用 chatbox 主导交互，并在视觉上匹配中年女性代理人及中高资产客户服务场景。
design:
  architecture:
    framework: react
    component: shadcn
  styleKeywords:
    - Glassmorphism
    - Premium CRM
    - Calm Supportive
    - Elegant Concierge
    - Conversation First
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 32px
      weight: 700
    subheading:
      size: 20px
      weight: 600
    body:
      size: 15px
      weight: 400
  colorSystem:
    primary:
      - "#1E3A8A"
      - "#0F766E"
      - "#B8894A"
    background:
      - "#F7F4EE"
      - "#FFFFFF"
      - "#EDF4F7"
    text:
      - "#1F2937"
      - "#475569"
      - "#FFFFFF"
    functional:
      - "#15803D"
      - "#B91C1C"
      - "#B45309"
      - "#2563EB"
todos:
  - id: bootstrap-foundation
    content: 初始化 Next.js、Supabase 与高审美工作台骨架
    status: completed
  - id: auth-rls
    content: 实现注册登录、中间件与 Supabase RLS 权限
    status: completed
    dependencies:
      - bootstrap-foundation
  - id: agent-spec
    content: 使用 [skill:skill-creator] 定义 chatbox 智能体规范
    status: completed
    dependencies:
      - bootstrap-foundation
  - id: crm-modules
    content: 实现客户、拜访、活动数据模型与 CRUD
    status: completed
    dependencies:
      - auth-rls
  - id: query-task-chat
    content: 打通综合查询、任务提醒与聊天动作执行
    status: completed
    dependencies:
      - crm-modules
      - agent-spec
  - id: delivery-verify
    content: 使用 [subagent:code-explorer] 校验 GitHub 与 Vercel 交付
    status: completed
    dependencies:
      - query-task-chat
---

## User Requirements

### User Requirements

构建一个面向资深保险代理人的会话式客户经营应用，支持电脑和手机浏览器访问，并根据屏幕大小自适应展示。代理人通过主 chatbox 输入自然语言，系统理解意图后完成客户管理、记录维护、查询分析和提醒等操作。需支持客户基础信息、拜访记录、客户活动记录的新增、删除、修改；支持综合查询客户信息、经营情况和共同特点客户；并从拜访或活动内容中识别后续事项，生成提醒。需提供注册、登录和数据权限控制，确保每位代理人只能查看自己录入的客户与记录。

### Product Overview

产品形态为“对话主舞台 + 结构化工作台”。界面中心是常驻智能对话框，周边配合客户卡片、经营时间线、查询结果区和任务看板。整体视觉需体现专业、优雅、可信与高端服务感，避免生硬后台风，兼顾温和陪伴感与礼宾式效率感。

### Core Features

- 注册登录与个人数据隔离
- 客户基础信息增删改
- 拜访记录增删改
- 多客户活动记录增删改
- 综合查询与共同特点筛选
- 后续任务自动提醒
- 贯穿全流程的独立对话助手

## Tech Stack Selection

- 代码库勘察结果：`c:/Users/郑理/.codebuddy/保险代理人助手` 当前为空目录，按全新项目实施。
- 前端与全栈框架：Next.js（App Router） + TypeScript
- UI 与样式：Tailwind CSS + shadcn/ui
- 表单与校验：React Hook Form + Zod
- 数据获取与缓存：TanStack Query
- 云数据库与认证：Supabase（PostgreSQL + Auth + Row Level Security）
- 测试：Vitest + Playwright
- 交付：GitHub 仓库管理，Vercel 部署

## Implementation Approach

采用“自然语言输入 + 结构化确认执行”的方案。用户先通过 chatbox 描述需求，系统将输入解析为业务意图，再调用对应服务执行；新增、删除、批量活动关联、任务生成等高风险操作先展示确认卡片，避免误操作。

后端能力按 `auth / chat / customers / visits / activities / queries / tasks` 模块拆分，页面层负责展示与交互，服务层负责业务规则，repository 层负责 Supabase 访问。权限控制以服务端会话中的 `userId` 为准，所有业务数据统一绑定所有者，并由 Supabase RLS 执行最终隔离。列表与查询优先走索引过滤和分页，目标复杂度控制在 `O(log n + k)`；共同特点查询第一版基于结构化字段、标签和时间条件，不引入高成本搜索方案。

## Implementation Notes

- 所有表写入、查询、更新、删除都以服务端会话用户为准，不信任客户端传入的归属字段。
- 删除、批量更新、批量客户活动关联等动作需二次确认。
- 聊天消息、客户列表、经营记录和任务列表均分页或分段加载，降低移动端首屏压力。
- 任务提醒应按来源记录幂等生成，避免重复创建。
- 日志仅记录意图类型、执行结果、耗时和匿名标识，不记录敏感客户详情。
- Vercel 仅保存必要环境变量；Supabase Service Role 仅限服务端使用，不下发到客户端。

## Architecture Design

系统采用分层结构：

- 表现层：响应式页面、chatbox、客户列表、记录时间线、任务看板
- 应用层：意图编排、权限守卫、查询聚合、任务生成
- 领域层：客户服务、拜访服务、活动服务、查询服务、任务服务、用户服务
- 数据层：Supabase Auth、数据库访问、RLS 策略、SQL 迁移

主要关系：

- chatbox 负责承接自然语言输入，并驱动客户、记录、查询、任务四类动作
- 页面模块复用同一套服务层与校验规则，避免聊天入口和页面入口行为不一致
- 权限通过中间件、服务端会话校验和 Supabase RLS 三层共同保障

## Directory Structure

## Directory Structure Summary

项目从空目录初始化，采用业务模块化组织，兼顾 chatbox 主交互、结构化页面、Supabase 权限隔离和 GitHub/Vercel 交付。

```text
c:/Users/郑理/.codebuddy/保险代理人助手/
├── package.json                         # [NEW] 项目依赖、脚本与构建入口
├── next.config.mjs                      # [NEW] Next.js 配置
├── tailwind.config.ts                   # [NEW] Tailwind 主题与设计令牌
├── postcss.config.js                    # [NEW] PostCSS 配置
├── tsconfig.json                        # [NEW] TypeScript 配置
├── .env.example                         # [NEW] Supabase 与部署所需环境变量示例
├── .gitignore                           # [NEW] Git 提交忽略规则
├── README.md                            # [NEW] 本地开发、Supabase、GitHub、Vercel 使用说明
├── supabase/
│   ├── migrations/
│   │   └── 0001_init.sql               # [NEW] 初始表结构、索引与 RLS 策略
│   └── seed.sql                         # [NEW] 可选演示数据
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # [NEW] 全局布局、主题与查询客户端挂载
│   │   ├── globals.css                  # [NEW] 全局样式与设计变量
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx           # [NEW] 登录页
│   │   │   └── register/page.tsx        # [NEW] 注册页
│   │   ├── (workspace)/
│   │   │   ├── layout.tsx               # [NEW] 工作台布局，承载顶部导航、底部导航、chatbox
│   │   │   ├── page.tsx                 # [NEW] 首页工作台
│   │   │   ├── customers/page.tsx       # [NEW] 客户中心
│   │   │   ├── records/page.tsx         # [NEW] 记录中心
│   │   │   └── tasks/page.tsx           # [NEW] 查询与提醒页
│   │   └── api/
│   │       ├── chat/route.ts            # [NEW] 对话与动作编排接口
│   │       ├── customers/route.ts       # [NEW] 客户 CRUD 接口
│   │       ├── visits/route.ts          # [NEW] 拜访记录 CRUD 接口
│   │       ├── activities/route.ts      # [NEW] 活动记录 CRUD 接口
│   │       └── tasks/route.ts           # [NEW] 任务查询与状态更新接口
│   ├── components/
│   │   ├── chat/chat-panel.tsx          # [NEW] 主 chatbox、消息流与确认卡片
│   │   ├── layout/top-nav.tsx           # [NEW] 顶部导航
│   │   ├── layout/bottom-nav.tsx        # [NEW] 移动端底部导航
│   │   ├── customers/customer-list.tsx  # [NEW] 客户列表与筛选
│   │   ├── records/record-timeline.tsx  # [NEW] 拜访/活动时间线
│   │   └── tasks/task-board.tsx         # [NEW] 任务看板
│   ├── modules/
│   │   ├── auth/auth-service.ts         # [NEW] 注册、登录、会话与权限判断
│   │   ├── chat/intent-service.ts       # [NEW] 意图解析与确认策略
│   │   ├── chat/action-executor.ts      # [NEW] 意图到业务动作的执行路由
│   │   ├── customers/customer-service.ts# [NEW] 客户业务服务
│   │   ├── visits/visit-service.ts      # [NEW] 拜访业务服务
│   │   ├── activities/activity-service.ts# [NEW] 活动业务服务
│   │   ├── queries/query-service.ts     # [NEW] 综合查询服务
│   │   └── tasks/task-service.ts        # [NEW] 提醒生成、去重与状态流转
│   ├── lib/
│   │   ├── supabase/client.ts           # [NEW] 浏览器端 Supabase 客户端
│   │   ├── supabase/server.ts           # [NEW] 服务端 Supabase 客户端
│   │   ├── repositories/                # [NEW] 数据访问层目录
│   │   └── validation/                  # [NEW] Zod 校验规则目录
│   ├── types/
│   │   ├── customer.ts                  # [NEW] 客户类型定义
│   │   ├── visit.ts                     # [NEW] 拜访记录类型
│   │   ├── activity.ts                  # [NEW] 活动记录类型
│   │   ├── task.ts                      # [NEW] 任务类型
│   │   └── chat.ts                      # [NEW] 对话与意图类型
│   └── middleware.ts                    # [NEW] 未登录拦截与路由保护
└── tests/
    ├── modules/query-service.test.ts    # [NEW] 综合查询测试
    ├── modules/task-service.test.ts     # [NEW] 提醒幂等测试
    └── app/chat-flow.spec.ts            # [NEW] chatbox 关键流程测试
```

## 设计方向

整体采用“高端礼宾式 CRM + 温和陪伴式助手”设计。视觉核心不是传统后台，而是精致、可信、柔和、克制的高级服务感：以 chatbox 为主舞台，周边通过半透明卡片、细腻阴影、低饱和渐变和金属点缀营造专业与优雅。桌面端突出会话与结果并排的掌控感，移动端使用抽屉和分层卡片保持轻盈。

## 页面规划

### 1. 登录注册页

- 顶部品牌区：展示品牌名、简短价值语与高端服务形象图。
- 主表单卡：承载登录或注册表单，采用柔光玻璃卡片。
- 价值摘要区：三张信息卡展示客户经营、任务提醒、陪伴助手。
- 安全说明区：说明隐私保护、数据隔离与专业使用场景。

### 2. 工作台首页

- 顶部导航：品牌、全局搜索、用户菜单，固定在顶部。
- 主 chatbox：大面积消息流与输入框，成为视觉与操作中心。
- 快捷动作条：提供新增客户、记录拜访、发起活动、查询提醒。
- 今日任务卡：突出待办、逾期、已完成状态与优先级。
- 最近客户区：展示最近经营客户、最新记录和下一步建议。
- 底部导航：移动端固定切换首页、客户、记录、任务。

### 3. 客户中心

- 顶部导航：保留全局搜索与筛选结果摘要。
- 对话辅助条：支持直接输入“帮我找近期未跟进客户”等命令。
- 筛选标签栏：按分层、标签、时间、状态快速筛选。
- 客户列表区：卡片化展示姓名、分层、最近跟进和提醒状态。
- 客户详情区：展示基础信息、经营摘要、相关记录与任务入口。
- 底部导航：保持跨页面一致体验。

### 4. 记录中心

- 顶部导航：切换拜访记录与活动记录视图。
- 记录对话区：支持自然语言录入经营动作与后续事项。
- 时间线列表：按时间展示拜访与活动动态。
- 参与客户卡：突出活动涉及的多客户关系和人数信息。
- 后续任务预览：保存前展示自动识别的提醒结果。
- 底部导航：支持快速切回客户或任务页。

### 5. 查询与提醒页

- 顶部导航：展示查询模式、时间范围和已生效条件。
- 智能查询框：支持自然语言查询客户信息、经营情况、共同特点。
- 条件标签区：将系统理解结果转成可编辑筛选标签。
- 结果聚类区：按客户分组、特点标签和经营洞察展示结果。
- 任务看板区：分待办、已完成、逾期展示提醒。
- 底部导航：保持移动端主路径稳定。

## 交互与响应式

桌面端采用双栏或三栏结构，chatbox 与结果区并排；平板端收敛为双栏；手机端改为单列流式布局，详情、确认与筛选优先使用底部抽屉。按钮、卡片和输入框使用细腻微动效，整体动态温和，不浮夸。

## Agent Extensions

### Skill

- **skill-creator**
- Purpose: 定义 chatbox 智能体的人设、意图清单、确认机制、赞扬安慰话术边界与执行规则
- Expected outcome: 形成可直接指导实现的对话助手规范，确保客户管理与陪伴式反馈一致

### SubAgent

- **code-explorer**
- Purpose: 在实施前后核对目录、接口、模块依赖、权限链路和部署相关文件范围
- Expected outcome: 降低漏改风险，保证 Supabase、GitHub、Vercel 交付链路完整一致