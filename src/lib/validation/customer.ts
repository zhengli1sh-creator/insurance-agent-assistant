import { z } from "zod";

const customerFieldsSchema = z.object({
  name: z.string().trim().min(1, "客户姓名不能为空"),
  age: z.string().trim().optional().default(""),
  sex: z.string().trim().optional().default(""),
  profession: z.string().trim().optional().default(""),
  familyProfile: z.string().trim().optional().default(""),
  wealthProfile: z.string().trim().optional().default(""),
  coreInteresting: z.string().trim().optional().default(""),
  preferCommunicate: z.string().trim().optional().default(""),
  source: z.string().trim().optional().default(""),
  nickname: z.string().trim().optional().default(""),
  recentMoney: z.string().trim().optional().default(""),
});

export const customerCreateSchema = customerFieldsSchema;

export const customerUpdateSchema = customerFieldsSchema.partial().extend({
  id: z.string().uuid("客户标识不正确"),
});
