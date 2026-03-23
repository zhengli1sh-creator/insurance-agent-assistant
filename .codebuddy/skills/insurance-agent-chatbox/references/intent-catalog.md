# Intent Catalog

## 1. Customer Management

### 1.1 Create customer
- Trigger examples:
  - “新增一个客户，叫林雅雯，在上海，关注家族保障与传承”
  - “帮我录入今天新认识的客户”
- Required slots:
  - customerName
  - at least one identifying or operating field such as city, tier, tags, assetFocus, note
- Confirmation: required
- Output preview:
  - customer summary card
  - fields to be saved
  - optional next follow-up suggestion

### 1.2 Update customer
- Trigger examples:
  - “把沈婧怡的层级调整为菁英优选”
  - “更新顾诗岚的关注点为企业主风险隔离”
- Required slots:
  - customer selector
  - changed fields
- Confirmation: required
- Clarify when multiple customers share the same name or selector is vague

### 1.3 Delete customer
- Trigger examples:
  - “删除周明珠的档案”
- Required slots:
  - customer selector
- Confirmation: mandatory with explicit danger copy
- Extra rule:
  - mention that related records and tasks may be affected

## 2. Visit Record Management

### 2.1 Create visit record
- Trigger examples:
  - “记录今天拜访了林雅雯，她希望周五收到保障缺口清单”
- Required slots:
  - customer selector
  - visit summary
  - happenedAt or implied current time
- Confirmation: required
- Derived data:
  - follow-up tasks
  - tone summary
  - next contact suggestion

### 2.2 Update visit record
- Required slots:
  - record selector
  - changed fields
- Confirmation: required

### 2.3 Delete visit record
- Required slots:
  - record selector
- Confirmation: mandatory
- Extra rule:
  - mention linked reminders that may be archived or removed

## 3. Activity Record Management

### 3.1 Create activity record
- Trigger examples:
  - “记录一场春季沙龙，参加客户有林雅雯、周明珠、顾诗岚”
- Required slots:
  - activityTitle
  - participant list
  - summary or theme
  - happenedAt or plannedAt
- Confirmation: mandatory
- Derived data:
  - participant mappings
  - follow-up reminders per interested customer when possible

### 3.2 Update activity record
- Required slots:
  - activity selector
  - changed fields
- Confirmation: required

### 3.3 Delete activity record
- Required slots:
  - activity selector
- Confirmation: mandatory

## 4. Query and Insight Retrieval

### 4.1 Customer information query
- Trigger examples:
  - “查一下林雅雯最近的经营情况”
  - “给我看上海的黑金私享客户”
- Required slots:
  - query target or filter conditions
- Confirmation: not required
- Result shape:
  - summary list, details card, or grouped output

### 4.2 Business status query
- Trigger examples:
  - “这周哪些客户还没有跟进”
  - “最近活动后谁最值得优先回访”
- Required slots:
  - time range and conditions if present
- Confirmation: not required
- Result shape:
  - ranked list with reasons

### 4.3 Common-trait query
- Trigger examples:
  - “帮我找对礼宾式服务更敏感的客户”
  - “找出适合参加小型闭门沙龙的客户”
- Required slots:
  - trait expression or structured filters
- Confirmation: not required
- Result shape:
  - grouped customers, shared tags, suggested next actions

## 5. Task Reminder Management

### 5.1 Generate reminder from a record
- Usually implicit inside visit/activity creation or update
- Required slots:
  - source record
  - follow-up summary
  - due date when present
- Confirmation: required when creating new reminder

### 5.2 View reminders
- Trigger examples:
  - “看一下今天的待办”
  - “哪些提醒已经逾期”
- Confirmation: not required

### 5.3 Complete or close reminder
- Trigger examples:
  - “把林雅雯那条清单发送任务标记完成”
- Required slots:
  - task selector
- Confirmation: required

## 6. Emotional Support and Companionship

### 6.1 Praise
- Trigger examples:
  - agent has just completed a demanding visit, activity, or query workflow
- Reply focus:
  - judgment, steadiness, client care, aesthetic sense, relationship depth
- Avoid:
  - childish compliments, empty flattery, exaggerated emotional words

### 6.2 Comfort
- Trigger examples:
  - “我今天有点压力”
  - “客户没有回应，我有点挫败”
- Reply sequence:
  1. acknowledge pressure
  2. normalize the difficulty of premium client work
  3. propose one manageable next step

### 6.3 Mixed support + action
- Trigger examples:
  - “我有点沮丧，顺便帮我看看今天该先跟进谁”
- Reply sequence:
  1. acknowledge emotion
  2. give one stabilizing sentence
  3. continue into query or action result

## 7. Standard Confirmation Payload

For any write operation, the confirmation preview should contain:

- actionType
- target entity
- normalized fields
- affected linked items such as tasks or participants
- user-facing explanation in polished Chinese
- requiresConfirmation = true
