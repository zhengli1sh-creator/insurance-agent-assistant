"use client";

import type { AssistantWorkflowDirective } from "@/types/agent";

const WORKFLOW_STORAGE_KEY = "assistant-pending-workflow";

export function persistAssistantWorkflow(workflow: AssistantWorkflowDirective) {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(workflow));
}

export function readAssistantWorkflow() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(WORKFLOW_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AssistantWorkflowDirective;
  } catch {
    window.sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
    return null;
  }
}

export function clearAssistantWorkflow() {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(WORKFLOW_STORAGE_KEY);
}
