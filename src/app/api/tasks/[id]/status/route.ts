/**
 * 任务状态变更 API
 * 基于任务管理设计文档 v1.0
 *
 * POST /api/tasks/[id]/status  - 变更任务状态（完成/取消）
 */

import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { changeTaskStatusService } from "@/modules/tasks/task-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function buildResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

/**
 * POST /api/tasks/[id]/status
 * 变更任务状态（只允许从 "待开始" 改为 "已完成" 或 "已取消"）
 *
 * 请求体：
 * {
 *   status: "已完成" | "已取消";
 * }
 *
 * 响应：
 * {
 *   id: string;
 *   title: string;
 *   status: "已完成" | "已取消";
 *   completedAt?: string;  // 标记完成时返回
 *   canceledAt?: string;   // 标记取消时返回
 * }
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {

  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return buildResponse({ error: context.message }, 401);
  }

  const { id: taskId } = await params;

  if (!taskId) {
    return buildResponse({ error: "任务标识不能为空" }, 400);
  }

  try {
    const body = await request.json();
    const result = await changeTaskStatusService(context.supabase, context.user.id, {
      id: taskId,
      status: body.status,
    });

    return buildResponse(
      result.error ? { error: result.error } : result.data,
      result.status
    );
  } catch (error) {
    return buildResponse(
      { error: error instanceof Error ? error.message : "请求解析失败" },
      400
    );
  }
}
