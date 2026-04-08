import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { createTasksService, listTasksService, updateTaskStatusService } from "@/modules/tasks/task-service";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "Cache-Control": "no-store" };

function buildTasksResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: noStoreHeaders });
}

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
  console.log("[API /tasks GET] Result:", { count: result.data?.length, status: result.status, error: result.error });

  return buildTasksResponse(result.error ? { error: result.error } : result.data, result.status);
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return buildTasksResponse({ error: context.message }, 401);
  }

  const payload = await request.json();
  const result = await createTasksService(context.supabase, context.user.id, payload);
  return buildTasksResponse(result.error ? { error: result.error } : result.data, result.status);
}

export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return buildTasksResponse({ error: context.message }, 401);
  }

  const payload = await request.json();
  const result = await updateTaskStatusService(context.supabase, context.user.id, payload);
  return buildTasksResponse(result.error ? { error: result.error } : result.data, result.status);
}


