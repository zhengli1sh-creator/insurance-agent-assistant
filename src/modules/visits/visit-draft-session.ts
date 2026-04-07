"use client";

import type { VisitChatMessage, VisitDraftState } from "@/components/visits/visit-page-types";

const VISIT_DRAFT_STORAGE_KEY = "visit-record-draft";

export type PersistedVisitDraft = {
  currentDraft: VisitDraftState;
  messages: VisitChatMessage[];
  savedAt: string;
};

export function persistVisitDraft(draft: VisitDraftState, messages: VisitChatMessage[]) {
  if (typeof window === "undefined") return;

  const isEmpty =
    !draft.name.trim() &&
    !draft.nickName.trim() &&
    !draft.timeVisit.trim() &&
    !draft.briefContent.trim();

  if (isEmpty) {
    clearVisitDraft();
    return;
  }

  const payload: PersistedVisitDraft = {
    currentDraft: draft,
    messages: messages.filter((m) => m.type !== "save-success"),
    savedAt: new Date().toISOString(),
  };

  try {
    window.localStorage.setItem(VISIT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
  } catch {
  }
}

export function readVisitDraft(): PersistedVisitDraft | null {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(VISIT_DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as PersistedVisitDraft;
    const savedAt = new Date(parsed.savedAt).getTime();
    const now = Date.now();
    const hours24 = 24 * 60 * 60 * 1000;

    if (now - savedAt > hours24) {
      clearVisitDraft();
      return null;
    }

    return parsed;
  } catch {
    clearVisitDraft();
    return null;
  }
}

export function clearVisitDraft() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(VISIT_DRAFT_STORAGE_KEY);
}

export function hasUnsavedVisitDraft(): boolean {
  return readVisitDraft() !== null;
}
