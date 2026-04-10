import { useState } from "react";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { TaskItem } from "@/types/domain";

const priorityMeta: Record<TaskItem["priority"], { className: string; label: string }> = {
  高: { className: "advisor-chip-warning", label: "高优先" },
  中: { className: "advisor-chip-info", label: "中优先" },
  低: { className: "advisor-chip-neutral", label: "低优先" },
};

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText: string;
  confirmVariant?: "default" | "destructive";
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText,
  confirmVariant = "default",
}: ConfirmDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:gap-0">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            取消
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} className="w-full sm:w-auto">
            {confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function formatHistoryTime(value?: string | null) {
  if (!value) return "未知";

  return new Date(value).toLocaleString("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTaskSourceLabel(task: TaskItem) {
  if (task.source) return task.source;

  switch (task.sourceType) {
    case "visit":
      return "来源：拜访记录";
    case "activity":
      return "来源：活动记录";
    case "manual":
    default:
      return "来源：手动创建";
  }
}

interface TaskItemCardProps {
  task: TaskItem;
  isActionable?: boolean;
  statusLabel?: string;
  statusBadgeClassName?: string;
  onStatusChange?: (taskId: string, status: "已完成" | "已取消") => void;
  onClick?: (task: TaskItem) => void;
}

export function TaskItemCard({
  task,
  isActionable = false,
  statusLabel,
  statusBadgeClassName = "advisor-chip-neutral",
  onStatusChange,
  onClick,
}: TaskItemCardProps) {
  const priority = priorityMeta[task.priority];
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    action: "已完成" | "已取消" | null;
  }>({ isOpen: false, action: null });

  const handleConfirm = () => {
    if (confirmDialog.action && onStatusChange) {
      onStatusChange(task.id, confirmDialog.action);
    }
    setConfirmDialog({ isOpen: false, action: null });
  };

  const titleBlock = (
    <div className="space-y-2 flex-1 min-w-0">
      <p className="text-base font-semibold leading-7 text-slate-900">{task.title}</p>
      {task.note && <p className="text-sm leading-6 text-slate-600 line-clamp-3">{task.note}</p>}
      <p className="text-xs text-slate-500">{getTaskSourceLabel(task)}</p>
      {task.customerName && <p className="text-sm leading-6 text-slate-500">关联客户：{task.customerName}</p>}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          "advisor-list-item-card rounded-[26px] p-4 sm:p-5",
          !isActionable && (task.status === "已完成" || task.status === "已取消") && "bg-white/72",
          onClick && "cursor-pointer"
        )}
        onClick={onClick ? () => onClick(task) : undefined}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            {titleBlock}
            <Badge className={cn(priority.className, "w-fit shrink-0 rounded-full border-0 px-3 py-1")}>
              {priority.label}
            </Badge>
          </div>

          <div className="advisor-hairline" />

          {isActionable ? (
            <div className="advisor-meta-tile rounded-[22px] border border-white/75 p-4">
              <div className="flex items-start gap-3">
                <span className="advisor-icon-badge advisor-icon-badge-info shrink-0">
                  <Calendar className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="advisor-section-label">计划执行时间</p>
                  <p className="mt-3 text-sm font-medium text-slate-900 break-all">{task.plannedAt}</p>
                  {task.remindAt && <p className="mt-2 text-xs text-slate-500 break-all">提醒：{task.remindAt}</p>}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="advisor-meta-tile rounded-[22px] border border-white/75 p-4">
                <p className="advisor-section-label">计划执行时间</p>
                <p className="mt-3 text-sm font-medium text-slate-900 break-all">{task.plannedAt}</p>
                {task.remindAt && <p className="mt-2 text-xs text-slate-500 break-all">提醒：{task.remindAt}</p>}
              </div>
              <div className="advisor-field-card rounded-[22px] p-4">
                <p className="advisor-section-label">
                  {task.status === "已完成" ? "完成时间" : task.status === "已取消" ? "取消时间" : "任务状态"}
                </p>
                {task.status === "已完成" || task.status === "已取消" ? (
                  <p className="mt-3 text-sm font-medium text-slate-900">
                    {task.status === "已完成"
                      ? formatHistoryTime(task.completedAt)
                      : formatHistoryTime(task.canceledAt)}
                  </p>
                ) : (
                  <Badge className={cn(statusBadgeClassName, "mt-3 rounded-full border-0 px-3 py-1")}>
                    {statusLabel ?? task.status}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {isActionable && onStatusChange && (
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDialog({ isOpen: true, action: "已完成" });
                }}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-full px-4 h-9 text-sm font-medium transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                完成
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  setConfirmDialog({ isOpen: true, action: "已取消" });
                }}
                className="text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full px-4 h-9 text-sm font-medium transition-colors"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                取消
              </Button>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, action: null })}
        onConfirm={handleConfirm}
        title={confirmDialog.action === "已完成" ? "确认完成任务" : "确认取消任务"}
        description={
          confirmDialog.action === "已完成"
            ? `确定将任务"${task.title}"标记为已完成吗？完成后任务将移动到"已完成"区。`
            : `确定将任务"${task.title}"标记为已取消吗？取消后任务将移动到"已取消"区。`
        }
        confirmText={confirmDialog.action === "已完成" ? "确认完成" : "确认取消"}
        confirmVariant={confirmDialog.action === "已完成" ? "default" : "destructive"}
      />
    </>
  );
}
