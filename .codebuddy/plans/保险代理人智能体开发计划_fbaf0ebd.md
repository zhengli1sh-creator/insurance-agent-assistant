---
name: 保险代理人智能体开发计划
overview: 开发一个保险代理人工作助手智能体，包含客户管理（基础信息、拜访记录、活动记录、综合查询、数据迁移）和情绪识别安慰对话功能，采用 React + Node.js 技术栈，响应式 Web 应用。
design:
  architecture:
    framework: react
    component: tdesign
  styleKeywords:
    - 商务专业
    - 现代简洁
    - 高效清晰
    - 温暖关怀
    - 响应式
  fontSystem:
    fontFamily: PingFang SC
    heading:
      size: 24px
      weight: 600
    subheading:
      size: 18px
      weight: 500
    body:
      size: 14px
      weight: 400
  colorSystem:
    primary:
      - "#0052D9"
      - "#1890FF"
      - "#40A9FF"
    background:
      - "#F5F7FA"
      - "#FFFFFF"
    text:
      - "#1D2129"
      - "#4E5969"
      - "#86909C"
    functional:
      - "#00B42A"
      - "#F53F3F"
      - "#FF7D00"
      - "#722ED1"
todos:
  - id: setup-project
    content: 初始化前后端项目结构和基础配置
    status: completed
  - id: design-database
    content: 设计数据库模型并创建 Prisma schema
    status: completed
    dependencies:
      - setup-project
  - id: develop-backend-api
    content: 开发后端 RESTful API（客户、拜访、活动、查询接口）
    status: completed
    dependencies:
      - design-database
  - id: develop-frontend-pages
    content: 开发前端页面组件（客户管理、拜访记录、活动管理）
    status: completed
    dependencies:
      - develop-backend-api
  - id: implement-query-system
    content: 实现综合查询功能和数据展示
    status: completed
    dependencies:
      - develop-frontend-pages
  - id: develop-ai-assistant
    content: 开发 AI 情绪识别和安慰对话功能
    status: completed
    dependencies:
      - develop-backend-api
  - id: implement-data-migration
    content: 使用 [skill:xlsx] 实现数据迁移功能
    status: completed
    dependencies:
      - develop-backend-api
  - id: responsive-design
    content: 完善响应式布局，适配多端屏幕
    status: completed
    dependencies:
      - develop-frontend-pages
  - id: deploy-application
    content: 使用 [integration:tcb] 部署应用到云端
    status: completed
    dependencies:
      - responsive-design
      - implement-data-migration
      - develop-ai-assistant
---

## 产品概述

开发一个保险代理人工作助手智能体，帮助代理人高效管理客户信息，并在工作中提供情绪支持和鼓励。

## 核心功能

### 一、客户管理模块

1. **客户基础信息管理**

- 客户信息的增加、删除、修改
- 包含姓名、联系方式、保险需求等基础字段

2. **拜访记录管理**

- 代理人拜访客户记录的增删改
- 记录拜访时间、内容、结果等信息

3. **客户活动记录管理**

- 客户参加代理人或公司组织活动的记录管理
- 活动类型、时间、参与情况等信息

4. **综合查询系统**

- 客户基本信息查询
- 拜访记录查询
- 活动记录查询
- 客户整体情况综合查询
- 特征客户群体查询
- 活动查询
- 跟进工作查询

5. **数据迁移**

- 支持将现有生产环境数据导入新系统

### 二、情绪支持模块

- 情绪识别：识别代理人的情绪状态
- 安慰对话：根据情绪状态提供相应的鼓励和安慰对话

## 部署要求

- Web 应用形式部署
- 响应式设计，自适应电脑和手机屏幕

## 技术栈选择

### 前端技术栈

- **框架**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **UI 组件库**: TDesign (腾讯企业级设计系统，适合业务管理系统)
- **状态管理**: Zustand (轻量级，适合中小型应用)
- **路由**: React Router v6
- **HTTP 客户端**: Axios

### 后端技术栈

- **运行时**: Node.js 20+
- **框架**: Express.js + TypeScript
- **ORM**: Prisma (类型安全，支持迁移)
- **数据库**: SQLite (开发环境) / PostgreSQL (生产环境)
- **AI 集成**: 支持调用大语言模型 API 实现情绪识别和对话

### 部署方案

- 前端构建为静态资源
- 后端提供 RESTful API
- 支持响应式布局适配多端

## 架构设计

### 系统架构

采用前后端分离架构：

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   前端 (React)   │────▶│  后端 (Express)  │────▶│   数据库        │
│  - 响应式 UI     │     │  - REST API     │     │  - SQLite/PG    │
│  - 状态管理      │◀────│  - 业务逻辑      │◀────│  - Prisma ORM   │
│  - 路由导航      │     │  - AI 集成      │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 模块划分

**前端模块**:

- `pages/` - 页面组件（客户列表、客户详情、拜访记录、活动记录等）
- `components/` - 复用组件（表单、表格、查询面板等）
- `stores/` - Zustand 状态管理
- `services/` - API 调用封装
- `types/` - TypeScript 类型定义

**后端模块**:

- `routes/` - API 路由定义
- `controllers/` - 业务逻辑控制器
- `services/` - 服务层（客户管理、活动管理、AI对话等）
- `models/` - Prisma 数据模型
- `middleware/` - 中间件（错误处理、日志等）

### 数据模型设计

核心实体：

- `Customer` - 客户基础信息
- `VisitRecord` - 拜访记录
- `Activity` - 活动信息
- `ActivityParticipation` - 活动参与记录
- `FollowUp` - 跟进工作记录

### 数据流

用户操作 → React 组件 → Zustand Store → API 调用 → Express 路由 → Controller → Service → Prisma → 数据库

## 实现要点

### 响应式设计

- 使用 Tailwind CSS 的响应式断点
- 移动端优先设计
- 表格和表单的自适应布局

### 数据迁移方案

- 提供数据导入 API
- 支持 CSV/Excel 格式解析
- 数据校验和清洗

### AI 情绪识别

- 集成大语言模型 API
- 设计情绪识别 Prompt
- 构建安慰对话上下文

## 目录结构

```
insurance-agent-assistant/
├── frontend/                    # 前端项目
│   ├── src/
│   │   ├── components/         # 公共组件
│   │   │   ├── Layout/         # 布局组件
│   │   │   ├── DataTable/      # 数据表格组件
│   │   │   ├── SearchPanel/    # 查询面板组件
│   │   │   └── Form/           # 表单组件
│   │   ├── pages/              # 页面
│   │   │   ├── Customer/       # 客户管理页面
│   │   │   ├── Visit/          # 拜访记录页面
│   │   │   ├── Activity/       # 活动管理页面
│   │   │   ├── Query/          # 综合查询页面
│   │   │   └── Assistant/      # AI助手页面
│   │   ├── stores/             # 状态管理
│   │   ├── services/           # API 服务
│   │   ├── types/              # 类型定义
│   │   └── utils/              # 工具函数
│   ├── public/
│   └── package.json
├── backend/                     # 后端项目
│   ├── src/
│   │   ├── routes/             # 路由
│   │   ├── controllers/        # 控制器
│   │   ├── services/           # 服务层
│   │   ├── middleware/         # 中间件
│   │   └── utils/              # 工具函数
│   ├── prisma/
│   │   └── schema.prisma       # 数据库模型
│   └── package.json
└── README.md
```

## 设计风格

采用现代商务风格，专业、清晰、高效。以 TDesign 企业级设计系统为基础，打造适合保险代理人日常工作的管理界面。

## 设计理念

- **专业商务**: 蓝色系主色调，传递专业、可信赖的品牌形象
- **高效清晰**: 信息层级分明，操作路径简洁
- **温暖关怀**: 在 AI 助手模块融入温暖的视觉元素，体现人文关怀

## 页面规划

### 1. 客户管理页面

- 顶部：搜索栏 + 新增客户按钮
- 中部：客户列表表格（支持分页、排序、筛选）
- 底部：分页器
- 操作列：编辑、删除、查看详情

### 2. 客户详情页面

- 客户基础信息卡片
- 拜访记录时间轴
- 活动参与记录列表
- 跟进工作提醒

### 3. 拜访记录页面

- 日历视图 + 列表视图切换
- 拜访记录表单弹窗
- 客户筛选器

### 4. 活动管理页面

- 活动列表（卡片式布局）
- 活动详情抽屉
- 参与客户管理

### 5. 综合查询页面

- 多维度查询条件面板
- 查询结果展示（表格/卡片）
- 高级筛选功能

### 6. AI 助手页面

- 对话式界面
- 情绪状态指示器
- 快捷鼓励语按钮
- 历史对话记录

## 响应式设计

- 桌面端：侧边栏导航，多列布局
- 平板端：折叠式侧边栏，自适应网格
- 手机端：底部标签导航，单列堆叠布局

## Agent Extensions

### Skill

- **xlsx**: 用于数据迁移功能，支持读取和解析现有生产环境的 Excel/CSV 数据文件，将其转换为系统可导入的格式
- Purpose: 处理数据迁移中的 Excel/CSV 文件解析和数据清洗
- Expected outcome: 实现生产环境数据到系统的平滑迁移

### Integration

- **tcb**: 腾讯云开发平台，提供数据库、云函数、存储和托管服务
- Purpose: 为应用提供云端数据库和部署托管能力
- Expected outcome: 实现应用的生产环境部署和数据持久化存储