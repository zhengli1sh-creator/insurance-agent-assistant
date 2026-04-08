/**
 * 任务校验规则
 * 基于任务管理设计文档 v1.0
 */

import { z } from "zod";

// ============================================
// 基础校验规则
// ============================================

/** ISO 8601 日期时间格式校验 */
const isoDatetimeSchema = z.string().datetime({ message: "时间格式不正确，应为 ISO 8601 格式" });

/** 可选的 ISO 日期时间 */
const optionalIsoDatetimeSchema = z.union([
  z.literal(""),
  z.string().datetime(),
  z.null(),
]).optional().nullable();

/** 任务优先级 */
const taskPrioritySchema = z.enum(["高", "中", "低"], {
  message: "优先级必须是 高、中、低 之一",
});

/** 任务来源类型 */
const taskSourceTypeSchema = z.enum(["manual", "visit", "activity"], {
  message: "来源类型不正确",
});

// ============================================
// 创建任务校验
// ============================================

/**
 * 创建任务请求校验
 * 必填：title, plannedAt
 * 选填：remindAt, priority, note, customerId, sourceType, sourceId
 */
export const taskCreateSchema = z.object({
  title: z.string()
    .trim()
    .min(1, "任务标题不能为空")
    .max(100, "任务标题不超过 100 字"),
  
  plannedAt: isoDatetimeSchema,
  
  remindAt: optionalIsoDatetimeSchema,
  
  priority: taskPrioritySchema.optional().default("中"),
  
  note: z.string()
    .trim()
    .max(500, "备注不超过 500 字")
    .optional()
    .nullable(),
  
  customerId: z.string()
    .uuid("客户标识格式不正确")
    .optional()
    .nullable(),
  
  sourceType: taskSourceTypeSchema.optional().default("manual"),
  
  sourceId: z.string()
    .uuid("来源标识格式不正确")
    .optional()
    .nullable(),
});

/**
 * 批量创建任务校验（用于拜访/活动来源的任务草稿确认）
 */
export const taskBatchCreateSchema = z.object({
  tasks: z.array(taskCreateSchema)
    .min(1, "请至少确认一条任务"),
});

// ============================================
// 更新任务校验
// ============================================

/**
 * 更新任务请求校验
 * 只允许修改特定字段，且只允许修改 "待开始" 状态的任务
 */
export const taskUpdateSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  
  title: z.string()
    .trim()
    .min(1, "任务标题不能为空")
    .max(100, "任务标题不超过 100 字")
    .optional(),
  
  plannedAt: isoDatetimeSchema.optional(),
  
  remindAt: optionalIsoDatetimeSchema,
  
  priority: taskPrioritySchema.optional(),
  
  note: z.string()
    .trim()
    .max(500, "备注不超过 500 字")
    .optional()
    .nullable(),
});

// ============================================
// 状态变更校验
// ============================================

/**
 * 任务状态变更校验
 * 只允许从 "待开始" 改为 "已完成" 或 "已取消"
 */
export const taskStatusChangeSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  
  status: z.enum(["已完成", "已取消"], {
    message: "状态只能变更为 已完成 或 已取消",
  }),
});

// ============================================
// 废弃的校验规则（保留兼容）
// ============================================

/** @deprecated 使用 taskCreateSchema 替代 */
export const oldTaskCreateSchema = z.object({
  tasks: z.array(
    z.object({
      title: z.string().trim().min(1, "请先填写任务标题"),
      priority: z.enum(["高", "中", "低"]).optional().default("中"),
      dueDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式不正确")]).optional().default(""),
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

/** @deprecated 使用 taskStatusChangeSchema 替代 */
export const taskStatusUpdateSchema = z.object({
  id: z.string().uuid("任务标识不正确"),
  status: z.enum(["待执行", "进行中", "已完成", "已取消", "已逾期"]),
});

// ============================================
// 类型导出
// ============================================

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskBatchCreateInput = z.infer<typeof taskBatchCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type TaskStatusChangeInput = z.infer<typeof taskStatusChangeSchema>;
