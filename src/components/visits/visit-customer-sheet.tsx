"use client";

import { useMemo, useState } from "react";

import { AlertTriangle, ArrowRight, Search, Users } from "lucide-react";

import { CustomerProfileFields, type CustomerProfileFormValue } from "@/components/customers/customer-profile-fields";
import { customerEmptyPanelClassName } from "@/components/customers/customer-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CustomerRecord } from "@/types/customer";

export type VisitCustomerSheetMode = "all" | "related" | "create";

type VisitCustomerSheetProps = {
  open: boolean;
  mode: VisitCustomerSheetMode;
  customers: CustomerRecord[];
  relatedCustomers: CustomerRecord[];
  customerForm: CustomerProfileFormValue;
  isCreatePending: boolean;
  onOpenChange: (open: boolean) => void;
  onModeChange: (mode: VisitCustomerSheetMode) => void;
  onCustomerFormChange: (patch: Partial<CustomerProfileFormValue>) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onCreateCustomer: () => void;
};

const customerNameCollator = new Intl.Collator(["zh-Hans-CN", "zh-CN"], { sensitivity: "base", numeric: true });

function normalizeSearchKeyword(keyword: string) {
  return keyword.replace(/\s+/g, " ").trim().toLocaleLowerCase("zh-Hans-CN");
}

function matchesCustomerSearch(customer: CustomerRecord, keyword: string) {
  if (!keyword) {
    return true;
  }

  const haystack = [
    customer.name,
    customer.nickname,
    customer.profession,
    customer.source,
    customer.core_interesting,
    customer.remark,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("zh-Hans-CN");

  return haystack.includes(keyword);
}

function sortCustomersBySurname(customers: CustomerRecord[]) {
  return [...customers].sort((left, right) => {
    const leftName = left.name.trim();
    const rightName = right.name.trim();
    const surnameOrder = customerNameCollator.compare(leftName.charAt(0), rightName.charAt(0));

    if (surnameOrder !== 0) {
      return surnameOrder;
    }

    const fullNameOrder = customerNameCollator.compare(leftName, rightName);
    if (fullNameOrder !== 0) {
      return fullNameOrder;
    }

    return customerNameCollator.compare(left.nickname?.trim() ?? "", right.nickname?.trim() ?? "");
  });
}

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

function getSheetMeta(mode: VisitCustomerSheetMode, relatedCount: number) {
  switch (mode) {
    case "all":
      return {
        title: "选择现有客户",
        description: "如未找到，可回到“添加拜访记录”页面、快速添加客户。",
      };
    case "related":
      return {
        title: "先核对现有客户",
        description: "为避免误写到别的客户，请先确认是否已有现成档案；如没有，再继续补最小客户信息。",
        summaryTitle: "当前待继续",
        summaryDescription: "保存本次拜访记录。客户信息补齐后，我会继续完成刚才的保存动作。",
        listTitle: `已找到 ${relatedCount} 位相近客户`,
        listDescription: "建议先确认是否为同一位客户，再决定是否新建档案。",
      };
    default:
      return {
        title: "先补客户档案",
        description: "客户基础信息保存后，会自动回到刚才的拜访记录继续保存，不需要重新填写。",
        summaryTitle: "当前待继续",
        summaryDescription: "保存本次拜访记录。客户信息补齐后，我会继续完成刚才的保存动作。",
      };
  }
}

export function VisitCustomerSheet({
  open,
  mode,
  customers,
  relatedCustomers,
  customerForm,
  isCreatePending,
  onOpenChange,
  onModeChange,
  onCustomerFormChange,
  onSelectCustomer,
  onCreateCustomer,
}: VisitCustomerSheetProps) {
  const [searchKeyword, setSearchKeyword] = useState("");

  const sheetMeta = getSheetMeta(mode, relatedCustomers.length);

  const searchableCustomers = useMemo(() => sortCustomersBySurname(mode === "all" ? customers : relatedCustomers), [mode, customers, relatedCustomers]);
  const normalizedKeyword = useMemo(() => normalizeSearchKeyword(searchKeyword), [searchKeyword]);
  const visibleCustomers = useMemo(
    () => searchableCustomers.filter((customer) => matchesCustomerSearch(customer, normalizedKeyword)),
    [normalizedKeyword, searchableCustomers],
  );

  const emptyMessage = mode === "all"
    ? normalizedKeyword
      ? "没有找到匹配的客户，可回到“添加拜访记录”页面快速添加客户。"
      : "当前还没有已建档客户"
    : normalizedKeyword
      ? "没有找到匹配的相近客户"
      : "当前没有需要核对的相近客户";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="advisor-sheet-surface max-h-[92vh] overflow-hidden rounded-t-[32px] p-0 sm:max-w-none">
        <div className="h-full overflow-y-auto [touch-action:pan-y] [webkit-overflow-scrolling:touch]">
          <SheetHeader className="advisor-sheet-header-surface px-5 py-5">
            <div className="space-y-2 text-left">
              <p className="advisor-kicker">Resume workflow</p>
              <SheetTitle className="text-xl text-slate-900">{sheetMeta.title}</SheetTitle>
              <SheetDescription className="text-sm leading-6 text-slate-500">{sheetMeta.description}</SheetDescription>
            </div>
          </SheetHeader>

          <div className="space-y-4 px-5 py-5">
            {mode === "create" ? (
              <>
                <div className="advisor-soft-card rounded-[28px] p-4">
                  <div className="flex items-start gap-3">
                    <span className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md mt-0.5">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{sheetMeta.summaryTitle}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-700">{sheetMeta.summaryDescription}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <CustomerProfileFields value={customerForm} onChange={onCustomerFormChange} disabled={isCreatePending} variant="compact" />
                  {relatedCustomers.length > 0 ? (
                    <Button variant="outline" onClick={() => onModeChange("related")} className="advisor-outline-button h-11 w-full rounded-full">
                      返回核对相近客户
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : customers.length > 0 ? (
                    <Button variant="outline" onClick={() => onModeChange("all")} className="advisor-outline-button h-11 w-full rounded-full">
                      返回选择现有客户
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button onClick={onCreateCustomer} disabled={isCreatePending} className="advisor-primary-button h-11 w-full rounded-full text-white">
                    {isCreatePending ? "保存中…" : "先保存客户档案并继续"}
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchKeyword}
                    onChange={(event) => setSearchKeyword(event.target.value)}
                    placeholder={mode === "all" ? "输入姓名、昵称、职业或来源搜索客户" : "输入姓名或昵称搜索相近客户"}
                    className="advisor-form-control h-11 rounded-[18px] border-white/80 pl-10 pr-3 focus-visible:ring-0"
                  />
                </div>

                {mode === "related" ? (
                  <div className="flex items-center gap-2 text-slate-900">
                    <span className="advisor-icon-badge advisor-icon-badge-info advisor-icon-badge-md">
                      <Users className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-base font-medium">{sheetMeta.listTitle}</p>
                      <p className="text-sm leading-6 text-slate-500">{sheetMeta.listDescription}</p>
                    </div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {visibleCustomers.length > 0 ? (
                    visibleCustomers.map((customer) => (
                      <CustomerOptionCard key={customer.id} customer={customer} onSelect={() => onSelectCustomer(customer)} />
                    ))
                  ) : (
                    <div className={customerEmptyPanelClassName}>{emptyMessage}</div>
                  )}
                </div>

                {mode === "related" ? (
                  <Button onClick={() => onModeChange("create")} className="advisor-primary-button h-11 w-full rounded-full text-white">
                    这些都不是，继续补客户档案
                  </Button>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
