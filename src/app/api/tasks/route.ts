import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { createTasksService, listTasksService, updateTaskStatusService } from "@/modules/tasks/task-service";

export async function GET() {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    // eslint-disable-next-line no-console
    console.log("[API /tasks GET] Auth failed:", context.message);
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  // eslint-disable-next-line no-console
  console.log("[API /tasks GET] User:", context.user.id, "Email:", context.user.email);

  const result = await listTasksService(context.supabase, context.user.id);

  // eslint-disable-next-line no-console
  console.log("[API /tasks GET] Result:", { count: result.data?.length, status: result.status, error: result.error });

  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await createTasksService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await updateTaskStatusService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

