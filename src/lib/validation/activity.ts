import { z } from "zod";

const activityParticipantSchema = z.object({
  customerId: z.string().uuid("参与客户标识不正确"),
  name: z.string().trim().min(1, "客户姓名不能为空"),
  nickName: z.string().trim().optional().default(""),
  followWork: z.string().trim().optional().default(""),
});

export const activityCreateSchema = z.object({
  nameActivity: z.string().trim().min(1, "活动名称不能为空"),
  dateActivity: z
    .string()
    .trim()
    .min(1, "活动日期不能为空")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "活动日期格式不正确"),
  locationActivity: z.string().trim().optional().default(""),
  customerProfile: z.string().trim().optional().default(""),
  effectProfile: z.string().trim().optional().default(""),
  lessonsLearned: z.string().trim().optional().default(""),
  participants: z.array(activityParticipantSchema).min(1, "至少添加一位参加活动的客户"),
});

export const activityUpdateSchema = activityCreateSchema.partial().extend({
  id: z.string().uuid("活动记录标识不正确"),
});
