import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { createVisitService, deleteVisitService, listVisitsByCustomerService, listVisitsService, updateVisitService } from "@/modules/visits/visit-service";

export async function GET(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const customerId = searchParams.get("customerId");

  if (customerId) {
    const result = await listVisitsByCustomerService(context.supabase, context.user.id, customerId);
    return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
  }

  const result = await listVisitsService(context.supabase, context.user.id);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await createVisitService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error, errorCode: result.errorCode } : result.data, { status: result.status });
}


export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await updateVisitService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error, errorCode: result.errorCode } : result.data, { status: result.status });
}


export async function DELETE(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await deleteVisitService(context.supabase, context.user.id, searchParams.get("id") ?? "");
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}
