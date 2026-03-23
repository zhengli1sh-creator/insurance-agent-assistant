import type { SupabaseClient } from "@supabase/supabase-js";

import type { AssistantUnderstandingResult } from "@/modules/chat/assistant-understanding";
import { resolveCustomerSnapshotService } from "@/modules/customers/customer-service";
import type { CustomerSnapshot } from "@/types/customer";

export type VisitCustomerStatus = "existing" | "missing" | "ambiguous" | "possible_existing" | "unknown";
export type VisitCustomerLookupField = "name" | "nickname";

export interface AssistantWorkflowBuildOptions {
  visitCustomerStatus?: VisitCustomerStatus;
  visitCustomerLookupField?: VisitCustomerLookupField;
  visitCustomerLookupValue?: string;
  visitMatchedCustomer?: CustomerSnapshot | null;
  visitPossibleCustomer?: CustomerSnapshot | null;
  forceCustomerCapture?: boolean;
}


export async function resolveWorkflowBuildOptions(
  supabase: SupabaseClient | null,
  userId: string | null,
  understanding: AssistantUnderstandingResult,
): Promise<AssistantWorkflowBuildOptions> {
  if (understanding.type !== "visit_create") {
    return {};
  }

  const payload = understanding.payload as { customerName?: string; nickName?: string; nickname?: string };
  const customerName = payload.customerName?.trim() ?? "";
  const nickName = typeof payload.nickName === "string"
    ? payload.nickName.trim()
    : typeof payload.nickname === "string"
      ? payload.nickname.trim()
      : "";

  if (!customerName && !nickName) {
    return {};
  }

  const lookupField: VisitCustomerLookupField = customerName ? "name" : "nickname";
  const lookupValue = customerName || nickName;

  if (!supabase || !userId) {
    return { visitCustomerStatus: "unknown", visitCustomerLookupField: lookupField, visitCustomerLookupValue: lookupValue };
  }

  const result = await resolveCustomerSnapshotService(supabase, userId, {
    name: customerName || undefined,
    nickName: nickName || undefined,
  });

  if (result.data) {
    return {
      visitCustomerStatus: "existing",
      visitCustomerLookupField: lookupField,
      visitCustomerLookupValue: lookupValue,
      visitMatchedCustomer: result.data,
    };
  }

  if (result.error?.code === "CUSTOMER_MISMATCH" && result.candidate) {
    return {
      visitCustomerStatus: "possible_existing",
      visitCustomerLookupField: lookupField,
      visitCustomerLookupValue: lookupValue,
      visitPossibleCustomer: result.candidate,
    };
  }

  if (result.error?.code === "CUSTOMER_NOT_FOUND") {
    return { visitCustomerStatus: "missing", visitCustomerLookupField: lookupField, visitCustomerLookupValue: lookupValue };
  }

  if (result.error?.code === "CUSTOMER_AMBIGUOUS") {
    return { visitCustomerStatus: "ambiguous", visitCustomerLookupField: lookupField, visitCustomerLookupValue: lookupValue };
  }

  return { visitCustomerStatus: "unknown", visitCustomerLookupField: lookupField, visitCustomerLookupValue: lookupValue };
}


