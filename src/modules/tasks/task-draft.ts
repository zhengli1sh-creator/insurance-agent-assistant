import type { TaskDraftItem, TaskDraftSeed, TaskPriorityValue } from "@/types/task";
import type { VisitRecordEntity } from "@/types/visit";

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function truncate(value: string, maxLength = 80) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}…` : value;
}

function splitFollowUps(source: string[], fallbackText?: string | null) {
  const items = source.length > 0 ? source : normalizeText(fallbackText).split(/[\n；;]/);
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
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

function buildTaskNote(sourceSummary: string, title: string) {
  const summary = normalizeText(sourceSummary);
  if (!summary) {
    return "来自刚才确认的拜访后续事项。";
  }

  return `来源：刚才的拜访记录。沟通背景：${truncate(summary, 90)}。待办：${title}`;
}

function resolvePlannedAt(title: string, visitDate: string) {
  const plannedDate = extractDueDate(title, visitDate) || visitDate || new Date().toISOString().slice(0, 10);
  return `${plannedDate}T09:00:00.000Z`;
}

function buildTaskDraftItem(
  title: string,
  visitDate: string,
  sourceSummary: string,
  customerId: string,
  customerName: string,
): TaskDraftItem {
  return {
    id: crypto.randomUUID(),
    title,
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

