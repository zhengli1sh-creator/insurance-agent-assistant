"use client";

import { useMemo, useState } from "react";
import { DayButton as BaseDayButton, DayPicker, getDefaultClassNames, type DayButtonProps } from "react-day-picker";
import { format, isToday } from "date-fns";
import { zhCN } from "date-fns/locale";
import { CalendarDays } from "lucide-react";

import { TaskItem } from "@/types/domain";
import { cn } from "@/lib/utils";
import { TaskItemCard } from "./task-item-card";


interface TaskCalendarProps {
  tasks: TaskItem[];
  onTaskClick?: (task: TaskItem) => void;
  onStatusChange?: (taskId: string, status: "已完成" | "已取消") => void;
}

/**
 * 从 plannedAt 提取日期键（YYYY-MM-DD）
 */
function getCalendarDateKey(plannedAt: string): string | null {
  if (!plannedAt) return null;
  // ISO 8601 格式：2024-01-15T09:00:00.000Z
  return plannedAt.slice(0, 10);
}

export function TaskCalendar({ tasks, onTaskClick, onStatusChange }: TaskCalendarProps) {

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [month, setMonth] = useState<Date>(new Date());
  const defaultClassNames = getDefaultClassNames();

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    task: TaskItem | null;
    action: "已完成" | "已取消" | null;
  }>({ isOpen: false, task: null, action: null });

  const handleConfirm = () => {
    if (confirmDialog.task && confirmDialog.action && onStatusChange) {
      onStatusChange(confirmDialog.task.id, confirmDialog.action);
    }
    setConfirmDialog({ isOpen: false, task: null, action: null });
  };


  // 获取任务优先级颜色
  const getPriorityColor = (priority: TaskItem["priority"]) => {
    switch (priority) {
      case "高":
        return "bg-[#c28564]";
      case "中":
        return "bg-[#4a6a8a]";
      case "低":
        return "bg-[#9ca3af]";
      default:
        return "bg-[#9ca3af]";
    }
  };



  // 按日期分组任务（基于 plannedAt）
  const tasksByDate = useMemo(
    () =>
      tasks.reduce((acc, task) => {
        const dateKey = getCalendarDateKey(task.plannedAt);
        if (!dateKey) {
          return acc;
        }
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(task);
        return acc;
      }, {} as Record<string, TaskItem[]>),
    [tasks]
  );




  // 获取某天的任务

  const getTasksForDate = (date: Date): TaskItem[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return tasksByDate[dateStr] || [];
  };

  const getHighestPriorityForDate = (date: Date): TaskItem["priority"] | null => {
    const dayTasks = getTasksForDate(date);
    if (dayTasks.some((task) => task.priority === "高")) return "高";
    if (dayTasks.some((task) => task.priority === "中")) return "中";
    if (dayTasks.some((task) => task.priority === "低")) return "低";
    return null;
  };

  const CalendarDayButton = (props: DayButtonProps) => {
    const highestPriority = getHighestPriorityForDate(props.day.date);

    return (
      <BaseDayButton {...props} className={props.className}>
        {props.children}
        {highestPriority ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-1 left-1/2 z-10 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-white",
              getPriorityColor(highestPriority)
            )}
          />
        ) : null}

      </BaseDayButton>
    );
  };

  // 选中日期的任务

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const isSelectedToday = selectedDate ? isToday(selectedDate) : false;

  return (
    <div className="space-y-4">
      {/* 日历区域 */}
      <div className="advisor-field-card overflow-hidden rounded-[24px] p-3 sm:p-4">

        <DayPicker
          mode="single"
          required
          selected={selectedDate}
          onSelect={(date) => setSelectedDate(date ?? selectedDate)}
          month={month}

          onMonthChange={setMonth}
          locale={zhCN}
          showOutsideDays={false}
          navLayout="around"
          className="task-calendar"
          classNames={{
            ...defaultClassNames,
            root: cn(defaultClassNames.root, "w-full"),
            months: cn(defaultClassNames.months, "w-full"),
            month: cn(defaultClassNames.month, "w-full"),
            month_caption: cn(defaultClassNames.month_caption, "flex items-center justify-center"),
            caption_label: cn(defaultClassNames.caption_label, "text-sm font-medium text-[#2c3e50]"),
            button_previous: cn(
              defaultClassNames.button_previous,
              "rounded-md text-[#5a6c7d] transition-colors",
              "hover:bg-[#f8f6f3] hover:text-[#2c3e50]"
            ),
            button_next: cn(
              defaultClassNames.button_next,
              "rounded-md text-[#5a6c7d] transition-colors",
              "hover:bg-[#f8f6f3] hover:text-[#2c3e50]"
            ),
            chevron: cn(defaultClassNames.chevron, "h-4 w-4 fill-current"),
            month_grid: cn(defaultClassNames.month_grid, "w-full table-fixed border-collapse"),
            weekday: cn(defaultClassNames.weekday, "py-1 text-center text-xs font-medium text-[#8b7355]"),
            day: cn(defaultClassNames.day, "p-0 text-center align-middle"),
            day_button: cn(
              defaultClassNames.day_button,
              "relative mx-auto flex h-10 w-10 items-center justify-center rounded-lg",
              "text-sm font-medium text-[#2c3e50] transition-colors duration-200",
              "hover:bg-[#f8f6f3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c28564]"
            ),
            selected: cn(defaultClassNames.selected, "task-calendar__selected"),
            today: cn(defaultClassNames.today, "task-calendar__today"),
            outside: cn(defaultClassNames.outside, "task-calendar__outside"),
            disabled: cn(defaultClassNames.disabled, "task-calendar__disabled"),
            hidden: cn(defaultClassNames.hidden, "task-calendar__hidden"),
          }}

          components={{
            DayButton: CalendarDayButton,
          }}
        />

      </div>

      {/* 选中日期任务列表 */}
      {selectedDate && (
        <div className="advisor-list-item-card rounded-[24px] p-3 sm:p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 text-[#8b7355]" />
              <span className="truncate text-sm font-medium text-[#2c3e50]">
                {format(selectedDate, "M月d日", { locale: zhCN })}
              </span>
              {isSelectedToday ? (
                <span className="rounded-full bg-[#f3e6db] px-2 py-0.5 text-[11px] font-medium text-[#9d6d50]">
                  今天
                </span>
              ) : null}
            </div>
            <span className="shrink-0 rounded-full border border-white/80 bg-white/78 px-2.5 py-1 text-[11px] font-medium text-[#8b7355] shadow-[inset_0_1px_0_rgba(255,255,255,0.68)]">
              共 {selectedDateTasks.length} 项
            </span>
          </div>

          {selectedDateTasks.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-white/80 bg-white/55 py-4 text-center text-sm text-[#8b7355]">
              {isSelectedToday ? "今天暂无待执行任务" : "当日无待执行任务"}
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDateTasks.map((task) => (
                <TaskItemCard
                  key={task.id}
                  task={task}
                  isActionable
                  onClick={onTaskClick}
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


