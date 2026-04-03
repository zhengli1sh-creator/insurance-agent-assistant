import { z } from "zod";

const optionalDateSchema = z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确")]).optional().default("");

export const taskCreateSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().trim().min(1, "请先填写任务标题"),
      priority: z.enum(["高", "中", "低"]).optional().default("中"),
      dueDate: optionalDateSchema,
      note: z.string().trim().optional().default(""),
      customerId: z.string().uuid("客户标识不正确").optional(),
      customerName: z.string().trim().optional().default(""),
      customerNickname: z.string().trim().optional().default(""),
      description: z.string().trim().optional().default(""),
      category: z.string().trim().optional().default(""),
      sourceType: z.enum(["manual", "visit"]).optional().default("manual"),
      sourceId: z.string().uuid("来源标识不正确").optional().nullable(),
    }),
  ).min(1, "请至少确认一条任务"),
});

export const taskStatusUpdateSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  status: z.enum(["待执行", "进行中", "已完成", "已取消", "已逾期"]),
});

