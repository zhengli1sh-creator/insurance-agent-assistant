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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, ChevronLeft, Search, User } from "lucide-react";

import { customerPrimaryActionClassName } from "@/components/customers/customer-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { ApiRequestError, fetchJson } from "@/lib/crm-api";
import { cn } from "@/lib/utils";
import { clearTaskDraftSeed, readTaskDraftSeed } from "@/modules/tasks/task-draft-session";
import type { TaskDraftItem, TaskDraftSeed, TaskEntity, TaskPriorityValue } from "@/types/task";

/**
 * 客户列表项类型
 */
interface CustomerListItem {
  id: string;
  name: string;
  nickname: string | null;
}

/**
 * 获取客户列表
 */
function fetchCustomers(): Promise<CustomerListItem[]> {
  return fetchJson<CustomerListItem[]>("/api/customers", { cache: "no-store" });
}

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
    <Card className="advisor-notice-card advisor-notice-card-info rounded-[28px] md:rounded-[30px]">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className="advisor-accent-chip rounded-full px-3 py-1">来自刚才的{sourceLabel}</Badge>
          {seed.customerName ? (
            <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">
              {seed.customerName}
              {seed.customerNickname ? `（${seed.customerNickname}）` : ""}
            </Badge>
          ) : null}
          <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">{seed.sourceDate}</Badge>
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-semibold text-slate-900 sm:text-lg">已整理出待确认任务，请你补充后再创建。</h2>
          <p className="text-sm leading-6 text-slate-600">
            自动生成任务属于高风险动作，这里只预填刚才{sourceLabel}里已经出现的后续事项，不会直接写入。
          </p>
        </div>

        {seed.sourceSummary ? (
          <div className="rounded-[22px] border border-white/80 bg-white/80 p-4 text-sm leading-6 text-slate-700">
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
  selectedCustomer,
  onChange,
  onSelectCustomer,
}: {
  draft: TaskDraftItem;
  selectedCustomer: { id: string; name: string; nickname: string | null } | null;
  onChange: (patch: Partial<TaskDraftItem>) => void;
  onSelectCustomer: () => void;
}) {
  return (
    <Card className="advisor-soft-card rounded-[28px] md:rounded-[30px]">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="rounded-[22px] border border-white/75 bg-white/75 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>关联客户</span>
              </div>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {selectedCustomer
                  ? `${selectedCustomer.name}${selectedCustomer.nickname ? `（${selectedCustomer.nickname}）` : ""}`
                  : "当前未关联客户，可先创建任务，后续再补充客户归属。"}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onSelectCustomer}
              className="h-8 shrink-0 rounded-full border-white/80 bg-white/85 px-3 text-xs text-slate-700 hover:bg-white"
            >
              {selectedCustomer ? "重新选择" : "选择客户"}
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">任务标题</label>
            <Input
              value={draft.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder="例如：下周三发教育金方案"
              className="advisor-form-control h-12 rounded-[20px] px-4 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">任务备注</label>
            <Textarea
              value={draft.note || ""}
              onChange={(event) => onChange({ note: event.target.value || null })}
              placeholder="例如：提前一天微信提醒客户准备身份证和银行卡"
              className="advisor-form-control advisor-form-textarea min-h-24 rounded-[22px] px-4 py-3 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">计划执行时间</label>
            <Input
              value={draft.plannedAt}
              onChange={(event) => onChange({ plannedAt: event.target.value })}
              type="datetime-local"
              className="advisor-form-control h-12 rounded-[20px] px-4 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">提醒时间</label>
            <Input
              value={draft.remindAt || ""}
              onChange={(event) => onChange({ remindAt: event.target.value || null })}
              type="datetime-local"
              className="advisor-form-control h-12 rounded-[20px] px-4 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">优先级</label>
            <select
              value={draft.priority}
              onChange={(event) => onChange({ priority: event.target.value as TaskPriorityValue })}
              className="advisor-form-control advisor-form-select h-12 w-full rounded-[20px] px-4 text-sm text-slate-700 focus-visible:ring-0"
            >
              <option value="高">高优先级</option>
              <option value="中">中优先级</option>
              <option value="低">低优先级</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * 客户选择抽屉组件
 */
function CustomerSelectSheet({
  isOpen,
  onClose,
  onSelect,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (customer: CustomerListItem) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers-list"],
    queryFn: fetchCustomers,
    enabled: isOpen,
  });

  // 按姓名排序并过滤
  const filteredCustomers = useMemo(() => {
    const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
    if (!searchQuery.trim()) return sorted;
    const query = searchQuery.toLowerCase();
    return sorted.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        (c.nickname && c.nickname.toLowerCase().includes(query))
    );
  }, [customers, searchQuery]);

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-[24px] p-0 sm:h-[600px]">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle className="text-base font-semibold">选择客户</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索客户姓名或昵称"
              className="h-11 rounded-full pl-10 pr-4"
            />
          </div>

          <ScrollArea className="h-[calc(80vh-140px)] sm:h-[420px]">
            {isLoading ? (
              <div className="py-8 text-center text-sm text-slate-400">加载中...</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">
                {searchQuery ? "未找到匹配的客户" : "暂无客户数据"}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 p-3 transition-colors hover:bg-slate-100"
                  >
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-700">{customer.name}</span>
                      {customer.nickname ? <span className="text-sm text-slate-400">（{customer.nickname}）</span> : null}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        onSelect(customer);
                        onClose();
                      }}
                      className="h-7 rounded-full bg-slate-900 px-3 text-xs hover:bg-slate-800"
                    >
                      选择
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
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
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: string; name: string; nickname: string | null } | null>(null);
  const [isCustomerSheetOpen, setIsCustomerSheetOpen] = useState(false);

  // 初始化：读取草稿种子
  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const nextSeed = readTaskDraftSeed();
      setSeed(nextSeed);

      // 如果有草稿种子，使用种子中的草稿；否则创建一个空草稿
      if (nextSeed?.drafts?.length) {
        setDrafts(nextSeed.drafts);
        // 如果种子中有客户信息，设置选中的客户
        if (nextSeed.customerId && nextSeed.customerName) {
          setSelectedCustomer({
            id: nextSeed.customerId,
            name: nextSeed.customerName,
            nickname: nextSeed.customerNickname || null,
          });
        }
      } else {
        setDrafts([createEmptyTaskDraft()]);
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, []);

  // 计算有效草稿数量
  const isValidDraft = useMemo(
    () => drafts.length > 0 && drafts[0].title.trim() && drafts[0].plannedAt,
    [drafts]
  );

  const sourceLabel = seed ? (seed.from === "visit" ? "拜访" : "活动") : null;
  const headerHint = seed
    ? `已根据刚才的${sourceLabel}整理出待确认事项，请补充后再创建。`
    : "先补充关键信息，再由你确认创建，不会直接误写任务。";

  // 创建任务 Mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      const draft = drafts[0];
      if (!draft.title.trim() || !draft.plannedAt) {
        throw new Error("请填写任务标题和计划执行时间");
      }

      // 构建请求体
      const taskPayload = {
        title: draft.title.trim(),
        plannedAt: new Date(draft.plannedAt).toISOString(),
        remindAt: draft.remindAt ? new Date(draft.remindAt).toISOString() : null,
        priority: draft.priority,
        note: draft.note?.trim() || null,
        customerId: selectedCustomer?.id || seed?.customerId || null,
        sourceType: seed ? (seed.from === "visit" ? "visit" : "activity") : "manual",
        sourceId: seed?.sourceId || null,
      };

      // 创建任务
      const result = await fetchJson<TaskEntity>("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(taskPayload),
      });

      return result;
    },
    onMutate: () => {
      setErrorMessage("");
      setSaveSuccessCount(0);
    },
    onSuccess: async () => {
      setSaveSuccessCount(1);
      await queryClient.invalidateQueries({ queryKey: ["tasks-live"] });
      await queryClient.fetchQuery({ queryKey: ["tasks-live"], queryFn: fetchLiveTasks }).catch(() => undefined);

      // 重置表单，方便继续创建下一个任务
      setDrafts([createEmptyTaskDraft()]);
      setSelectedCustomer(null);
      clearTaskDraftSeed();
      setSeed(null);

      // 3秒后自动隐藏成功提示
      window.setTimeout(() => setSaveSuccessCount(0), 3000);
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
    <div className="flex min-h-0 flex-1 flex-col">
      <Card className="glass-panel advisor-glass-surface-strong flex min-h-0 flex-1 flex-col overflow-hidden rounded-[28px] md:rounded-[32px]">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="advisor-panel-header-surface shrink-0 px-4 py-3 sm:px-5 md:px-6">
            <div className="mx-auto flex max-w-3xl items-start gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/")}
                className="advisor-outline-button mt-0.5 h-9 w-9 shrink-0 rounded-full hover:bg-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-base font-semibold text-slate-900 sm:text-lg">新增任务</h1>
                  <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1 text-[11px] font-medium sm:text-xs">
                    {seed ? `来自${sourceLabel}草稿` : "手工创建"}
                  </Badge>
                </div>
                <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">{headerHint}</p>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 pb-[176px] sm:px-5 sm:pb-[188px] md:px-6 md:pb-[204px]">
            <div className="mx-auto flex max-w-3xl flex-col gap-3 md:gap-4">
              {seed ? <SourceNoticeCard seed={seed} /> : null}

              {saveSuccessCount > 0 ? (
                <Card className="advisor-notice-card advisor-notice-card-success rounded-[28px] md:rounded-[30px]">
                  <CardContent className="flex items-start gap-3 p-4 sm:p-5">
                    <span className="advisor-icon-badge advisor-icon-badge-success flex h-9 w-9 shrink-0 items-center justify-center">
                      <CheckCircle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900">任务已创建</p>
                      <p className="mt-1.5 text-sm leading-6 text-slate-600">你可以继续创建下一个任务。</p>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {errorMessage ? (
                <Card className="advisor-notice-card advisor-notice-card-warning rounded-[28px] md:rounded-[30px]">
                  <CardContent className="p-4 text-sm leading-6 text-slate-700 sm:p-5">{errorMessage}</CardContent>
                </Card>
              ) : null}

              {drafts.length > 0 ? (
                <TaskEditorCard
                  draft={drafts[0]}
                  selectedCustomer={selectedCustomer}
                  onSelectCustomer={() => setIsCustomerSheetOpen(true)}
                  onChange={(patch) =>
                    setDrafts((prev) => prev.map((item, idx) => (idx === 0 ? { ...item, ...patch } : item)))
                  }
                />
              ) : (
                <Card className="advisor-soft-card rounded-[28px] md:rounded-[30px]">
                  <CardContent className="p-5 text-sm leading-6 text-slate-500">正在准备任务草稿…</CardContent>
                </Card>
              )}

              <div className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      <CustomerSelectSheet
        isOpen={isCustomerSheetOpen}
        onClose={() => setIsCustomerSheetOpen(false)}
        onSelect={(customer) => setSelectedCustomer(customer)}
      />

      <div className="advisor-panel-footer-surface fixed bottom-0 left-0 right-0 z-50 px-2.5 pt-2 sm:px-4 md:px-5 lg:px-6 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">
        <div className="advisor-input-dock mx-auto max-w-3xl rounded-[22px] p-2.5 sm:rounded-[24px] sm:p-3">
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              disabled={createMutation.isPending}
              className="h-10 rounded-full border-slate-200 bg-white/80 text-sm text-slate-700 hover:bg-white sm:h-11"
            >
              暂不创建
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending || !isValidDraft}
              className={cn(customerPrimaryActionClassName, "h-10 text-sm sm:h-11")}
            >
              {createMutation.isPending ? "创建中…" : "确认创建"}
            </Button>
          </div>
          <p className="mt-2 hidden text-[11px] leading-5 text-slate-400 md:block">
            保存前会由你完成最终确认，来源草稿不会自动写入任务列表。
          </p>
        </div>
      </div>
    </div>
  );
}
