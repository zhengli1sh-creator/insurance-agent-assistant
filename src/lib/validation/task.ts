import { z } from "zod";

export const taskStatusUpdateSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  status: z.enum(["待执行", "进行中", "已完成", "已取消", "已逾期"]),
});
