import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { createActivityService, deleteActivityService, listActivitiesService, updateActivityService } from "@/modules/activities/activity-service";

export async function GET() {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const result = await listActivitiesService(context.supabase, context.user.id);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await createActivityService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await updateActivityService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function DELETE(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await deleteActivityService(context.supabase, context.user.id, searchParams.get("id") ?? "");
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}
