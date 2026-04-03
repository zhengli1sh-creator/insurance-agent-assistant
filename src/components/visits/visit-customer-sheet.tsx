"use client";

import { AlertTriangle, ArrowRight, UserRoundPlus, Users } from "lucide-react";

import { CustomerProfileFields, type CustomerProfileFormValue } from "@/components/customers/customer-profile-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CustomerRecord } from "@/types/customer";

export type VisitCustomerSheetMode = "related" | "create";

type VisitCustomerSheetProps = {
  open: boolean;
  mode: VisitCustomerSheetMode;
  relatedCustomers: CustomerRecord[];
  customerForm: CustomerProfileFormValue;
  isCreatePending: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: VisitCustomerSheetMode) => void;
  onCustomerFormChange: (patch: Partial<CustomerProfileFormValue>) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onCreateCustomer: () => void;
};

function CustomerOptionCard({ customer, onSelect }: { customer: CustomerRecord; onSelect: () => void }) {
  const meta = [customer.profession, customer.source].filter(Boolean).join(" · ") || "已建档客户";

  return (
    <button
      type="button"
      onClick={onSelect}
      className="advisor-list-item-card w-full rounded-[24px] p-4 text-left transition hover:-translate-y-0.5 hover:bg-white"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{customer.name}</p>
            {customer.nickname ? <Badge className="advisor-chip-info rounded-full border-0 px-2 py-0.5 text-[11px]">{customer.nickname}</Badge> : null}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{meta}</p>
          {customer.core_interesting ? <p className="mt-2 text-xs leading-5 text-slate-500">关注点：{customer.core_interesting}</p> : null}
        </div>
        <span className="advisor-chip-success rounded-full px-3 py-1 text-xs">直接选用</span>
      </div>
    </button>
  );
}

export function VisitCustomerSheet({
  open,
  mode,
  relatedCustomers,
  customerForm,
  isCreatePending,
  onOpenChange,
  onModeChange,
  onCustomerFormChange,
  onSelectCustomer,
  onCreateCustomer,
}: VisitCustomerSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="advisor-sheet-surface max-h-[92vh] rounded-t-[32px] p-0 sm:max-w-none">
        <div className="overflow-y-auto">
          <SheetHeader className="advisor-sheet-header-surface px-5 py-5">
            <div className="space-y-2 text-left">
              <p className="advisor-kicker">Resume workflow</p>
              <SheetTitle className="text-xl text-slate-900">{mode === "related" ? "先核对现有客户" : "先补客户档案"}</SheetTitle>
              <SheetDescription className="text-sm leading-6 text-slate-500">
                {mode === "related"
                  ? "为避免误写到别的客户，请先确认是否已有现成档案；如没有，再继续补最小客户信息。"
                  : "客户基础信息保存后，会自动回到刚才的拜访记录继续保存，不需要重新填写。"}
              </SheetDescription>
            </div>
          </SheetHeader>

          <div className="space-y-4 px-5 py-5">
            <div className="advisor-soft-card rounded-[28px] p-4">
              <div className="flex items-start gap-3">
                <span className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md mt-0.5">
                  <AlertTriangle className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-slate-900">当前待继续</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">保存本次拜访记录。客户信息补齐后，我会继续完成刚才的保存动作。</p>
                </div>
              </div>
            </div>

            {mode === "related" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-slate-900">
                  <span className="advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-md">
                    <Users className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-base font-medium">已找到 {relatedCustomers.length} 位相近客户</p>
                    <p className="text-sm leading-6 text-slate-500">建议先确认是否为同一位客户，再决定是否新建档案。</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {relatedCustomers.map((customer) => (
                    <CustomerOptionCard key={customer.id} customer={customer} onSelect={() => onSelectCustomer(customer)} />
                  ))}
                </div>

                <Button onClick={() => onModeChange("create")} className="advisor-primary-button h-11 w-full rounded-full text-white">
                  <UserRoundPlus className="h-4 w-4" />
                  这些都不是，继续补客户档案
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <CustomerProfileFields value={customerForm} onChange={onCustomerFormChange} disabled={isCreatePending} variant="compact" />
                {relatedCustomers.length > 0 ? (
                  <Button variant="outline" onClick={() => onModeChange("related")} className="advisor-outline-button h-11 w-full rounded-full">
                    返回核对相近客户
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button onClick={onCreateCustomer} disabled={isCreatePending} className="advisor-primary-button h-11 w-full rounded-full text-white">
                  {isCreatePending ? "保存中…" : "先保存客户档案并继续"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
