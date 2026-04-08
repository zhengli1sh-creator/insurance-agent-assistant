/**
 * 任务管理 API
 * 基于任务管理设计文档 v1.0
 *
 * GET    /api/tasks      - 查询任务列表（已分区）
 * POST   /api/tasks      - 创建单个任务
 * PATCH  /api/tasks      - 更新任务信息
 */

import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import {
  createTaskService,
  listTasksService,
  updateTaskService,
} from "@/modules/tasks/task-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function buildTasksResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

/**
 * GET /api/tasks
 * 查询当前用户的所有任务，返回已分区的数据
 *
 * 返回结构：
 * {
 *   todayReminders: TaskEntity[],  // 今日提醒聚焦区
 *   pending: TaskEntity[],         // 待开始任务区
 *   overdue: TaskEntity[],         // 已过期任务区
 *   completed: TaskEntity[],       // 已完成任务区
 *   canceled: TaskEntity[]         // 已取消任务区
 * }
 */
export async function GET() {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    // eslint-disable-next-line no-console
    console.log("[API /tasks GET] Auth failed:", context.message);
    return buildTasksResponse({ error: context.message }, 401);
  }

  // eslint-disable-next-line no-console
  console.log("[API /tasks GET] User:", context.user.id, "Email:", context.user.email);

  const result = await listTasksService(context.supabase, context.user.id);

  // eslint-disable-next-line no-console
  console.log("[API /tasks GET] Result:", {
    status: result.status,
    error: result.error,
    hasData: !!result.data,
  });

  return buildTasksResponse(result.error ? { error: result.error } : result.data, result.status);
}

/**
 * POST /api/tasks
 * 创建单个任务
 *
 * 请求体：
 * {
 *   title: string;           // 必填，任务标题
 *   plannedAt: string;       // 必填，ISO 8601 格式计划执行时间
 *   remindAt?: string;       // 可选，ISO 8601 格式提醒时间
 *   priority?: "高" | "中" | "低";  // 可选，默认 "中"
 *   note?: string;           // 可选，任务备注
 *   customerId?: string;     // 可选，关联客户 ID
 *   sourceType?: "manual" | "visit" | "activity";  // 可选，默认 "manual"
 *   sourceId?: string;       // 可选，来源记录 ID
 * }
 */
export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return buildTasksResponse({ error: context.message }, 401);
  }

  try {
    const payload = await request.json();
    const result = await createTaskService(context.supabase, context.user.id, payload);

    return buildTasksResponse(
      result.error ? { error: result.error, errorCode: result.errorCode } : result.data,
      result.status
    );
  } catch (error) {
    return buildTasksResponse(
      { error: error instanceof Error ? error.message : "请求解析失败" },
      400
    );
  }
}

/**
 * PATCH /api/tasks
 * 更新任务信息（仅允许修改 "待开始" 状态的任务）
 *
 * 请求体：
 * {
 *   id: string;              // 必填，任务 ID
 *   title?: string;          // 可选，任务标题
 *   plannedAt?: string;      // 可选，ISO 8601 格式计划执行时间
 *   remindAt?: string;       // 可选，ISO 8601 格式提醒时间
 *   priority?: "高" | "中" | "低";  // 可选，优先级
 *   note?: string;           // 可选，任务备注
 * }
 */
export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return buildTasksResponse({ error: context.message }, 401);
  }

  try {
    const payload = await request.json();
    const result = await updateTaskService(context.supabase, context.user.id, payload);

    return buildTasksResponse(
      result.error ? { error: result.error } : result.data,
      result.status
    );
  } catch (error) {
    return buildTasksResponse(
      { error: error instanceof Error ? error.message : "请求解析失败" },
      400
    );
  }
}
