import { z } from "zod";

const jsonObjectSchema = z.record(z.string(), z.any());

const jsonArraySchema = z.array(z.any());

export const queryTemplateCreateSchema = z.object({
  queryName: z.string().trim().min(1, "查询名称不能为空"),
  queryScope: z.enum(["customers", "visits", "activities", "tasks", "mixed"]),
  filterJson: jsonObjectSchema.optional().default({}),
  sortJson: jsonArraySchema.optional().default([]),
  displayJson: jsonObjectSchema.optional().default({}),
  isDefault: z.boolean().optional().default(false),
});

export const insightReportGenerateSchema = z.object({
  reportName: z.string().trim().min(1, "报告名称不能为空").optional(),
  reportType: z.enum(["system", "manual", "custom"]).optional().default("system"),
  sourceQueryId: z.string().uuid("查询模板标识不正确").optional(),
});
