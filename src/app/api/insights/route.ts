import { NextResponse } from "next/server";

import { requireUserContext } from "@/lib/supabase/require-user";
import { generateInsightsReportService, listInsightsService } from "@/modules/queries/query-service";

export async function GET() {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const result = await listInsightsService(context.supabase, context.user.id);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}

export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const result = await generateInsightsReportService(context.supabase, context.user.id, payload);
  return NextResponse.json(result.error ? { error: result.error } : result.data, { status: result.status });
}
