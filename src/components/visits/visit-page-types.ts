import type { CustomerRecord } from "@/types/customer";
import type { VisitRecordEntity } from "@/types/visit";

export type VisitDraftFieldKey =
  | "customer"
  | "timeVisit"
  | "location"
  | "methodCommunicate"
  | "tone"
  | "corePain"
  | "briefContent"
  | "followWork";

export type VisitDraftState = {
  customerId: string;
  name: string;
  nickName: string;
  timeVisit: string;
  location: string;
  methodCommunicate: string;
  tone: string;
  corePain: string;
  briefContent: string;
  followWork: string;
};

export type ExtractedVisitFieldItem = { label: string; value: string };

export type VisitCustomerStatusTone = "matched" | "pending" | "review" | "missing";

export type VisitCustomerStatus = {
  tone: VisitCustomerStatusTone;
  title: string;
  description: string;
  customer?: CustomerRecord | null;
};

export type VisitChatMessageType = "welcome" | "user-input" | "extracted-summary" | "save-success" | "error-hint";

export type VisitChatMessage = {
  id: string;
  role: "assistant" | "user";
  type: VisitChatMessageType;
  content: string;
  timestamp: string;
  rawInput?: string;
  extractedFields?: ExtractedVisitFieldItem[];
  currentDraft?: VisitDraftState;
  customerStatus?: VisitCustomerStatus;
  savedVisit?: VisitRecordEntity;
  pendingTaskCount?: number;
};
