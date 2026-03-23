import { NextResponse } from "next/server";
import { z } from "zod";

import { requireUserContext } from "@/lib/supabase/require-user";
import { extractCustomerDraft } from "@/modules/customers/customer-draft-extractor";
import type { WorkflowSeedField } from "@/types/agent";

const requestSchema = z.object({
  message: z.string().trim().min(1, "请先输入一段客户信息"),
  currentName: z.string().trim().optional().default(""),
});

const fieldLabelMap = {
  name: "客户姓名",
  nickname: "客户昵称",
  age: "年龄",
  sex: "性别",
  profession: "职业 / 身份",
  familyProfile: "家庭情况",
  wealthProfile: "财富情况",
  coreInteresting: "核心关注点",
  preferCommunicate: "沟通偏好",
  source: "客户来源",
  recentMoney: "资金情况",
  remark: "备注",
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

  const fields = await extractCustomerDraft(payload.data.message, payload.data.currentName);
  const extractedFields = Object.entries(fieldLabelMap).flatMap(([key, label]) => {
    const value = fields[key as keyof typeof fields]?.trim();
    return value ? ([{ label, value }] satisfies WorkflowSeedField[]) : [];
  });

  const extractedLabels = extractedFields.map((item) => item.label);
  const message = extractedFields.length > 0
    ? {
        text: "已根据你输入的信息，自动填写了",
        fields: extractedLabels,
        suffix: "栏的信息，请你核对",
      }
    : {
        text: "我暂时还没稳定提取到更多字段。你可以换一种更具体的说法，例如补一句来源、职业或核心关注点。",
        fields: [],
        suffix: "",
      };

  return NextResponse.json({
    fields,
    extractedFields,
    message,
  });
}
