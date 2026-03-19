import { z } from "zod";

const visitFieldsSchema = z.object({
  customerId: z.string().uuid("客户标识不正确").optional(),
  name: z.string().trim().min(1, "客户姓名不能为空"),
  timeVisit: z
    .string()
    .trim()
    .min(1, "拜访日期不能为空")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "拜访日期格式不正确"),
  location: z.string().trim().optional().default(""),
  corePain: z.string().trim().optional().default(""),
  briefContent: z.string().trim().optional().default(""),
  followWork: z.string().trim().optional().default(""),
  methodCommunicate: z.string().trim().optional().default(""),
  nickName: z.string().trim().optional().default(""),
  title: z.string().trim().optional().default(""),
  summary: z.string().trim().optional().default(""),
  happenedAt: z.string().trim().optional().default(""),
  tone: z.string().trim().optional().default(""),
  followUps: z.array(z.string().trim().min(1)).optional().default([]),
});

export const visitCreateSchema = visitFieldsSchema;

export const visitUpdateSchema = visitFieldsSchema.partial().extend({
  id: z.string().uuid("拜访记录标识不正确"),
});
