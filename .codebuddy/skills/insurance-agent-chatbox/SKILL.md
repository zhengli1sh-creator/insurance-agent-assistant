---
name: insurance-agent-chatbox
description: This skill should be used when building, revising, or testing the insurance agent assistant's conversation-first workflow, especially for intent parsing, confirmation rules, emotional support replies, task extraction, and action orchestration across customers, visits, activities, queries, and reminders.
---

# Insurance Agent Chatbox

## Overview

Translate natural-language requests from insurance agents into safe CRM actions and refined companion-style replies. Use this skill to keep the assistant aligned with the product's conversation-first experience, private-data constraints, and premium service tone.

## When to Use

Use this skill when any of the following work is required:

- Design or update the system prompt for the insurance agent assistant
- Implement or revise intent routing, action execution, or confirmation cards
- Define how chatbox requests map to customer, visit, activity, query, or task actions
- Generate or refine praise, comfort, or companion-style replies for agents
- Write tests for conversation flows, confirmation logic, or task extraction behavior
- Review whether a proposed chat interaction matches the product's premium CRM tone

## Core Workflow

### 1. Classify the request

Determine whether the user input belongs to one primary family:

- Customer management
- Visit record management
- Activity record management
- Query and insight retrieval
- Task reminder management
- Emotional support and companionship
- Mixed intent that combines execution and emotional support

When mixed intent appears, prioritize emotional acknowledgment first, then continue into the business action.

### 2. Extract structured slots

Extract only the minimum fields needed for execution. Reuse the field groups defined in `references/intent-catalog.md`.

Prefer these slot types:

- Entity identifiers: customer name, customer group, activity title, record date
- Action fields: create, update, delete, query, summarize, remind
- Follow-up fields: deadline, owner, next action, reminder wording
- Tone flags: praise, comfort, steady guidance, action focus

When required fields are missing, ask a short follow-up question instead of guessing.

### 3. Decide whether confirmation is mandatory

Always require confirmation before executing any operation that:

- Deletes data
- Updates existing sensitive customer information
- Creates multi-customer activity associations

- Generates or closes follow-up tasks
- Executes when intent confidence is not high

Use no-confirmation flow only for safe read operations such as search, summary, and list retrieval.

### 4. Build the assistant output in two layers

Produce:

1. A natural reply suitable for the agent's current emotional and business context
2. A structured action preview that can be rendered by the UI when execution is needed

For write operations, keep the natural reply concise and let the preview carry the structured details.

### 5. Execute through domain services, not direct chat logic

Route confirmed actions to dedicated customer, visit, activity, query, and task services. Keep chat-specific code focused on:

- Intent recognition
- Slot completion
- Confirmation gating
- Reply composition
- Handoff to business services

## Behavioral Rules

### Safety and trust

- Treat every customer record as sensitive data
- Assume owner isolation is mandatory
- Refuse silent writes when the user intent is ambiguous
- Prefer one short clarification over one wrong execution

### Conversation quality

- Keep replies calm, refined, and supportive
- Avoid childish cheerleading, exaggerated excitement, or internet slang
- Balance efficiency with dignity; sound like a capable executive assistant, not a chatbot toy
- For praise, focus on judgment, steadiness, professionalism, and client care
- For comfort, acknowledge pressure first, then reduce the next step into a manageable action

### Task reminder generation

When a visit or activity note contains follow-up work, extract:

- Action owner
- Action summary
- Due time if present
- Source record reference
- Reminder priority based on urgency language

Do not create duplicate reminders when the same source and follow-up meaning already exist.

## Output Patterns

### Read-only query reply

Use this pattern:

- One-line acknowledgment
- One-line explanation of the interpreted query
- Structured result summary or UI handoff
- Optional next-step suggestion

### Write action reply

Use this pattern:

- One-line acknowledgment
- One-line explanation of the interpreted action
- Confirmation preview with explicit fields
- Short note about what will happen after confirmation

### Comfort + action reply

Use this pattern:

- Acknowledge the emotional state first
- Offer one stabilizing sentence
- Transition into one concrete business next step
- If needed, attach a confirmation preview for the business action

## Resources

- Read `references/intent-catalog.md` to map user utterances to action types, required slots, and confirmation policies
- Read `references/response-style.md` to keep praise, comfort, and premium CRM language consistent with the target audience

## Success Criteria

Treat the skill as correctly applied when:

- Natural language requests are mapped to the right action family
- Missing fields trigger concise clarification instead of unsafe guessing
- High-risk operations always require confirmation
- Emotional support sounds mature, warm, and premium
- Chatbox logic stays separated from domain persistence logic
