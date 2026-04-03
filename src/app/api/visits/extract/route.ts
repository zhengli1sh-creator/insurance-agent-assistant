import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserContext } from "@/lib/supabase/require-user";
import { extractVisitDraft, visitDraftExtractionSchema } from "@/modules/visits/visit-draft-extractor";

import type { WorkflowSeedField } from "@/types/agent";

const requestSchema = z.object({
  message: z.string().trim().min(1, "请先输入拜访信息"),
  currentDraft: visitDraftExtractionSchema.partial().optional(),
});


const fieldLabelMap = {
  name: "客户姓名",
  nickName: "客户昵称",
  timeVisit: "拜访日期",
  location: "地点",
  methodCommunicate: "沟通方式",
  corePain: "核心痛点",
  briefContent: "拜访内容",
  followWork: "后续动作",
} as const;


export async function POST(request: Request) {
  const context = await requireUserContext();
  if (!context.supabase || !context.user) {
    return NextResponse.json({ error: context.message }, { status: 401 });
  }

  const payload = requestSchema.safeParse(await request.json());
  if (!payload.success) {
    return NextResponse.json({ error: payload.error.issues[0]?.message ?? "请求参数不正确", errorCode: "VALIDATION_ERROR" }, { status: 400 });
  }

  const hasCurrentDraft = Object.values(payload.data.currentDraft ?? {}).some((value) => value?.trim());
  const fields = await extractVisitDraft(payload.data.message, payload.data.currentDraft);
  const extractedFields = Object.entries(fieldLabelMap).flatMap(([key, label]) => {

    const value = fields[key as keyof typeof fields]?.trim();
    return value ? ([{ label, value }] satisfies WorkflowSeedField[]) : [];
  });

  const message = extractedFields.length > 0
    ? `${hasCurrentDraft ? "已继续补充整理出" : "已为你整理出"} ${extractedFields.map((item) => item.label).join("、")}，请核对后保存。`
    : hasCurrentDraft
      ? "已保留前面识别的信息，这次暂未整理出新增字段。你可以继续补一句地点、沟通重点或后续动作。"
      : "我暂时还没稳定提取到更多字段。你可以换一种更具体的说法，例如补一句拜访时间、地点或沟通重点。";


  return NextResponse.json({
    fields,
    extractedFields,
    message,
  });
}
