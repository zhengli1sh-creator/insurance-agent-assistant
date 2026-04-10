import type { TaskDraftItem, TaskDraftSeed, TaskPriorityValue } from "@/types/task";
import type { VisitRecordEntity } from "@/types/visit";

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function truncate(value: string, maxLength = 80) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function splitFollowUps(source: string[], fallbackText?: string | null): string[] {
  // 优先使用 follow_ups 数组
  if (source.length > 0) {
    return [...new Set(source.map((item) => item.trim()).filter(Boolean))];
  }
  
  // 如果没有 follow_ups，使用 follow_work 作为整体
  const text = normalizeText(fallbackText);
  if (!text) {
    return [];
  }
  
  // 尝试按句号或分号拆分多个独立事项
  // 但保留每个事项内部的逗号连接（如"回去做个方案，本周五约他聊"作为一条）
  const items = text
    .split(/[。；;]/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 3); // 过滤太短的无意义片段
  
  if (items.length > 0) {
    return items;
  }
  
  // 如果拆分后没有有效项，返回整个文本作为一条
  return [text];
}

function priorityFromText(text: string): TaskPriorityValue {
  if (/今天|立即|尽快|马上|本周内/.test(text)) {
    return "高";
  }

  if (/本周|周[一二三四五六日天]|下周|安排|约/.test(text)) {
    return "中";
  }

  return "低";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function resolveWeekdayOffset(current: number, target: number, nextWeek = false) {
  const normalizedCurrent = current === 0 ? 7 : current;
  let offset = target - normalizedCurrent;

  if (offset < 0 || nextWeek) {
    offset += 7;
  }

  if (offset === 0 && nextWeek) {
    offset = 7;
  }

  return offset;
}

function extractDueDate(text: string, visitDate: string) {
  const baseDate = visitDate ? new Date(`${visitDate}T00:00:00`) : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return "";
  }

  if (/今天/.test(text)) {
    return formatDate(baseDate);
  }

  if (/明天/.test(text)) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 1);
    return formatDate(next);
  }

  if (/后天/.test(text)) {
    const next = new Date(baseDate);
    next.setDate(next.getDate() + 2);
    return formatDate(next);
  }

  const fullDateMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (fullDateMatch) {
    return `${fullDateMatch[1]}-${fullDateMatch[2]}-${fullDateMatch[3]}`;
  }

  const shortDateMatch = text.match(/(\d{1,2})月(\d{1,2})[日号]?/);
  if (shortDateMatch) {
    return `${baseDate.getFullYear()}-${pad(Number(shortDateMatch[1]))}-${pad(Number(shortDateMatch[2]))}`;
  }

  const weekdayMatch = text.match(/(本周|下周)([一二三四五六日天])/);
  if (weekdayMatch) {
    const weekdayMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      日: 7,
      天: 7,
    };
    const next = new Date(baseDate);
    next.setDate(next.getDate() + resolveWeekdayOffset(baseDate.getDay(), weekdayMap[weekdayMatch[2]], weekdayMatch[1] === "下周"));
    return formatDate(next);
  }

  return "";
}

function normalizeTaskTitle(title: string): string {
  const text = normalizeText(title);
  if (!text) {
    return "";
  }
  
  // 移除开头的人称代词和冗余词
  let normalized = text
    .replace(/^(客户|他|她|对方|让我|要我|叫我|希望|想)/, "")
    .replace(/^[,，\s]+/, "")
    .trim();
  
  // 如果标题以动作词开头，补充主语让语义更完整
  const actionPrefixes = /^(做|整理|准备|提交|发给|反馈|确认|约|联系|跟进|完成|回去做)/;
  if (actionPrefixes.test(normalized) && !normalized.includes("客户")) {
    // 检查是否已经包含明确的动作对象
    if (!/方案|材料|资料|合同|计划|报告/.test(normalized)) {
      normalized = `与客户${normalized}`;
    }
  }
  
  // 如果包含时间信息，分离出来放在后面
  const timeMatch = normalized.match(/[,，]?(本周|下周|今天|明天|后天|\d+月|\d+号|\d{1,2}日)([^,，]*)/);
  if (timeMatch) {
    const timePart = timeMatch[0].replace(/^[，,]/, "").trim();
    const mainPart = normalized.replace(timeMatch[0], "").trim().replace(/[，,]$/, "");
    normalized = mainPart ? `${mainPart}（${timePart}）` : timePart;
  }
  
  return normalized || text;
}

function buildTaskNote(sourceSummary: string, title: string) {
  const summary = normalizeText(sourceSummary);
  if (!summary) {
    return "来自刚才确认的拜访后续事项。";
  }

  return `来源：来自拜访记录。沟通背景：${truncate(summary, 90)}。待办：${title}`;
}

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function resolvePlannedAt(title: string, visitDate: string) {
  const plannedDate = extractDueDate(title, visitDate);
  
  if (plannedDate) {
    // 如果有提取到日期，使用该日期上午9点作为默认时间
    const date = new Date(`${plannedDate}T09:00:00`);
    return toDatetimeLocalValue(date);
  }
  
  if (visitDate) {
    // 否则使用拜访日期
    const date = new Date(`${visitDate}T09:00:00`);
    return toDatetimeLocalValue(date);
  }
  
  // 默认使用今天
  const today = new Date();
  today.setHours(9, 0, 0, 0);
  return toDatetimeLocalValue(today);
}

function buildTaskDraftItem(
  title: string,
  visitDate: string,
  sourceSummary: string,
  customerId: string,
  customerName: string,
): TaskDraftItem {
  const normalizedTitle = normalizeTaskTitle(title);
  return {
    id: crypto.randomUUID(),
    title: normalizedTitle || title,
    priority: priorityFromText(title),
    plannedAt: resolvePlannedAt(title, visitDate),
    remindAt: null,
    note: buildTaskNote(sourceSummary, title),
    customerId,
    customerName,
  };
}


export function buildTaskDraftSeedFromVisit({
  visit,
  sourceSummary,
}: {
  visit: VisitRecordEntity;
  sourceSummary?: string;
}): TaskDraftSeed | null {
  const customerId = normalizeText(visit.customer_id);
  if (!customerId) {
    return null;
  }

  const followUps = splitFollowUps(visit.follow_ups, visit.follow_work);
  if (followUps.length === 0) {
    return null;
  }

  const summary = normalizeText(sourceSummary) || normalizeText(visit.brief_content) || normalizeText(visit.summary);

  return {
    from: "visit",
    sourceId: visit.id,
    sourceDate: visit.time_visit,
    customerId,
    customerName: visit.name,
    customerNickname: normalizeText(visit.nick_name),
    sourceSummary: summary,
    drafts: followUps.map((item) => buildTaskDraftItem(item, visit.time_visit, summary, customerId, visit.name)),
  };
}

