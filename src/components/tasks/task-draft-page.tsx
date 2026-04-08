/**
 * 新增任务页面
 * 基于任务管理设计文档 v1.0
 *
 * 支持：
 * 1. 手工创建任务
 * 2. 确认来源于拜访/活动的任务草稿
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ChevronLeft, Plus, Trash2, Clock, Calendar } from "lucide-react";

import { customerOutlineActionClassName, customerPrimaryActionClassName } from "@/components/customers/customer-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, fetchJson } from "@/lib/crm-api";
import { cn } from "@/lib/utils";
import { clearTaskDraftSeed, readTaskDraftSeed } from "@/modules/tasks/task-draft-session";
import type { TaskDraftItem, TaskDraftSeed, TaskEntity, TaskPriorityValue } from "@/types/task";

/**
 * 创建空任务草稿
 */
function createEmptyTaskDraft(): TaskDraftItem {
  return {
    id: crypto.randomUUID(),
    title: "",
    priority: "中",
    plannedAt: "",
    remindAt: null,
    note: null,
    customerId: null,
    customerName: null,
  };
}

/**
 * 获取任务列表（用于刷新缓存）
 */
function fetchLiveTasks() {
  return fetchJson<TaskEntity[]>("/api/tasks", { cache: "no-store" });
}

/**
 * 来源提示卡片（拜访/活动来源时显示）
 */
function SourceNoticeCard({ seed }: { seed: TaskDraftSeed }) {
  const sourceLabel = seed.from === "visit" ? "拜访" : "活动";

  return (
    <Card className="advisor-notice-card advisor-notice-card-info rounded-[30px]">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="advisor-accent-chip rounded-full px-3 py-1">来自刚才的{sourceLabel}</Badge>
          {seed.customerName && (
            <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">
              {seed.customerName}
              {seed.customerNickname ? `（${seed.customerNickname}）` : ""}
            </Badge>
          )}
          <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">{seed.sourceDate}</Badge>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">已整理出待确认任务，请你补充后再创建。</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            自动生成任务属于高风险动作，这里只预填刚才{sourceLabel}里已经出现的后续事项，不会直接写入。
          </p>
        </div>
        {seed.sourceSummary ? (
          <div className="rounded-[24px] border border-white/80 bg-white/80 p-4 text-sm leading-6 text-slate-700">
            {seed.sourceSummary}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * 任务编辑器卡片
 */
function TaskEditorCard({
  draft,
  index,
  onChange,
  onRemove,
  removable,
}: {
  draft: TaskDraftItem;
  index: number;
  onChange: (patch: Partial<TaskDraftItem>) => void;
  onRemove: () => void;
  removable: boolean;
}) {
  return (
    <Card className="advisor-soft-card rounded-[30px]">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="advisor-kicker">Task {index + 1}</p>
            <p className="mt-1 text-base font-semibold text-slate-900">待确认任务</p>
          </div>
          {removable ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="rounded-full text-slate-500 hover:bg-white hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>

        <div className="space-y-3">
          {/* 任务标题 */}
          <Input
            value={draft.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="任务标题，例如：下周三发教育金方案"
            className="advisor-form-control h-12 rounded-[20px] px-4 focus-visible:ring-0"
          />

          {/* 计划执行时间 + 优先级 */}
          <div className="grid gap-3 sm:grid-cols-[1fr,auto]">
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={draft.plannedAt}
                onChange={(event) => onChange({ plannedAt: event.target.value })}
                type="datetime-local"
                placeholder="计划执行时间"
                className="advisor-form-control h-12 rounded-[20px] pl-10 pr-4 focus-visible:ring-0"
              />
            </div>
            <select
              value={draft.priority}
              onChange={(event) => onChange({ priority: event.target.value as TaskPriorityValue })}
              className="advisor-form-control advisor-form-select h-12 rounded-[20px] px-4 text-sm text-slate-700 focus-visible:ring-0"
            >
              <option value="高">高优先级</option>
              <option value="中">中优先级</option>
              <option value="低">低优先级</option>
            </select>
          </div>

          {/* 提醒时间（可选） */}
          <div className="relative">
            <Clock className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={draft.remindAt || ""}
              onChange={(event) => onChange({ remindAt: event.target.value || null })}
              type="datetime-local"
              placeholder="提醒时间（可选）"
              className="advisor-form-control h-12 rounded-[20px] pl-10 pr-4 focus-visible:ring-0"
            />
          </div>

          {/* 备注 */}
          <Textarea
            value={draft.note || ""}
            onChange={(event) => onChange({ note: event.target.value || null })}
            placeholder="补充提醒方式、执行口径或需要一起确认的细节。"
            className="advisor-form-control advisor-form-textarea min-h-24 rounded-[22px] px-4 py-3 focus-visible:ring-0"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 任务草稿页面主组件
 */
export function TaskDraftPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [seed, setSeed] = useState<TaskDraftSeed | null>(null);
  const [drafts, setDrafts] = useState<TaskDraftItem[]>([]);
  const [saveSuccessCount, setSaveSuccessCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // 初始化：读取草稿种子
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const nextSeed = readTaskDraftSeed();
      setSeed(nextSeed);

      // 如果有草稿种子，使用种子中的草稿；否则创建一个空草稿
      if (nextSeed?.drafts?.length) {
        setDrafts(nextSeed.drafts);
      } else {
        setDrafts([createEmptyTaskDraft()]);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // 计算有效草稿数量
  const validDraftCount = useMemo(
    () => drafts.filter((item) => item.title.trim() && item.plannedAt).length,
    [drafts]
  );

  // 创建任务 Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const validDrafts = drafts.filter((item) => item.title.trim() && item.plannedAt);

      // 构建请求体
      const tasksPayload = validDrafts.map((item) => ({
        title: item.title.trim(),
        plannedAt: new Date(item.plannedAt).toISOString(),
        remindAt: item.remindAt ? new Date(item.remindAt).toISOString() : null,
        priority: item.priority,
        note: item.note?.trim() || null,
        customerId: seed?.customerId || item.customerId,
        sourceType: seed ? (seed.from === "visit" ? "visit" : "activity") : "manual",
        sourceId: seed?.sourceId || null,
      }));

      // 批量创建任务
      const results = [];
      for (const taskPayload of tasksPayload) {
        const result = await fetchJson<TaskEntity>("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify(taskPayload),
        });
        results.push(result);
      }

      return results;
    },
    onMutate: () => {
      setErrorMessage("");
      setSaveSuccessCount(0);
    },
    onSuccess: async (result) => {
      setSaveSuccessCount(result.length);
      clearTaskDraftSeed();
      await queryClient.invalidateQueries({ queryKey: ["tasks-live"] });
      await queryClient.fetchQuery({ queryKey: ["tasks-live"], queryFn: fetchLiveTasks }).catch(() => undefined);
      window.setTimeout(() => router.push("/tasks"), 900);
    },
    onError: (error) => {
      if (error instanceof ApiRequestError && (error.status === 401 || error.status === 403)) {
        setErrorMessage("登录状态已失效，请重新登录后再创建任务。");
        return;
      }

      if (error instanceof ApiRequestError && error.status === 409) {
        setErrorMessage("存在重复任务，请检查任务标题和计划执行时间。");
        return;
      }

      setErrorMessage(error instanceof Error ? error.message : "这次还没有创建成功，请再核对一下任务内容。");
    },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      {/* 页面标题 */}
      <Card className="glass-panel advisor-glass-surface-strong rounded-[32px]">
        <CardContent className="space-y-4 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/tasks")}
              className="advisor-outline-button h-9 w-9 rounded-full hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">新增任务</h1>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                只确认当前需要生成的事项，不必在这里重看整页拜访内容。
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 来源提示 */}
      {seed ? <SourceNoticeCard seed={seed} /> : null}

      {/* 成功提示 */}
      {saveSuccessCount > 0 ? (
        <Card className="advisor-notice-card advisor-notice-card-success rounded-[30px]">
          <CardContent className="flex items-start gap-3 p-5">
            <span className="advisor-icon-badge advisor-icon-badge-success h-9 w-9 shrink-0">
              <CheckCircle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-base font-semibold text-slate-900">已确认并创建 {saveSuccessCount} 条任务</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                正在回到任务工作台，方便你继续查看今天的整体节奏。
              </p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 错误提示 */}
      {errorMessage ? (
        <Card className="advisor-notice-card advisor-notice-card-warning rounded-[30px]">
          <CardContent className="p-5 text-sm leading-6 text-slate-700">{errorMessage}</CardContent>
        </Card>
      ) : null}

      {/* 任务草稿列表 */}
      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <TaskEditorCard
            key={draft.id}
            draft={draft}
            index={index}
            removable={drafts.length > 1}
            onRemove={() => setDrafts((prev) => prev.filter((item) => item.id !== draft.id))}
            onChange={(patch) =>
              setDrafts((prev) => prev.map((item) => (item.id === draft.id ? { ...item, ...patch } : item)))
            }
          />
        ))}
      </div>

      {/* 添加任务按钮 */}
      <Button
        variant="outline"
        onClick={() => setDrafts((prev) => [...prev, createEmptyTaskDraft()])}
        className="advisor-outline-button h-11 w-full rounded-full"
      >
        <Plus className="h-4 w-4" />
        再补一条任务
      </Button>

      {/* 底部操作栏 */}
      <div className="advisor-panel-footer-surface fixed inset-x-0 bottom-0 border-t border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(248,250,252,0.98)_100%)] px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl gap-3">
          <Button
            variant="outline"
            onClick={() => {
              clearTaskDraftSeed();
              router.push("/tasks");
            }}
            className={cn(customerOutlineActionClassName, "h-11 flex-1")}
          >
            暂不创建
          </Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || validDraftCount === 0}
            className={cn(customerPrimaryActionClassName, "h-11 flex-1")}
          >
            {createMutation.isPending
              ? "创建中…"
              : `确认创建${validDraftCount > 0 ? `（${validDraftCount}）` : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
