import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { createCustomerService, deleteCustomerService, listCustomersService, updateCustomerService } from "@/modules/customers/customer-service";

export async function GET(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await listCustomersService(context.supabase, context.user.id, searchParams.get("search") ?? "");
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await createCustomerService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function PATCH(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json();
  const result = await updateCustomerService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function DELETE(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await deleteCustomerService(context.supabase, context.user.id, searchParams.get("id") ?? "");
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}
