"use client";

import type { TaskDraftSeed } from "@/types/task";

const TASK_DRAFT_STORAGE_KEY = "visit-task-draft-seed";

export function persistTaskDraftSeed(seed: TaskDraftSeed) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(TASK_DRAFT_STORAGE_KEY, JSON.stringify(seed));
}

export function readTaskDraftSeed() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(TASK_DRAFT_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TaskDraftSeed;
  } catch {
    window.sessionStorage.removeItem(TASK_DRAFT_STORAGE_KEY);
    return null;
  }
}

export function clearTaskDraftSeed() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(TASK_DRAFT_STORAGE_KEY);
}
