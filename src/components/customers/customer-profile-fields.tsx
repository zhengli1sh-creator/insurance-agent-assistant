"use client";

import type { ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface CustomerProfileFormValue {
  name: string;
  nickname: string;
  age: string;
  sex: string;
  profession: string;
  familyProfile: string;
  wealthProfile: string;
  coreInteresting: string;
  preferCommunicate: string;
  source: string;
  recentMoney: string;
  remark: string;
}


export type CustomerProfileFieldKey = keyof CustomerProfileFormValue;

export const emptyCustomerProfileForm: CustomerProfileFormValue = {

  name: "",
  nickname: "",
  age: "",
  sex: "",
  profession: "",
  familyProfile: "",
  wealthProfile: "",
  coreInteresting: "",
  preferCommunicate: "",
  source: "",
  recentMoney: "",
  remark: "",
};


interface CustomerProfileFieldsProps {
  value: CustomerProfileFormValue;
  onChange: (patch: Partial<CustomerProfileFormValue>) => void;
  disabled?: boolean;
  className?: string;
  variant?: "full" | "compact";
  highlightedFields?: CustomerProfileFieldKey[];
}

function FieldGroup({
  label,
  className,
  children,
  filled = false,
  highlighted = false,
}: {
  label: string;
  className?: string;
  children: ReactNode;
  filled?: boolean;
  highlighted?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <p className={cn("text-xs font-medium transition-colors", highlighted ? "text-[#0F766E]" : filled ? "text-slate-600" : "text-slate-400")}>{label}</p>
      {children}
    </div>
  );
}


export function CustomerProfileFields({
  value,
  onChange,
  disabled = false,
  className,
  variant = "full",
  highlightedFields = [],
}: CustomerProfileFieldsProps) {
  const compact = variant === "compact";
  const highlightedSet = new Set(highlightedFields);

  const resolveFieldTone = (field: CustomerProfileFieldKey) => {
    const filled = value[field].trim().length > 0;
    const highlighted = filled && highlightedSet.has(field);

    return {
      filled,
      highlighted,
      controlClassName: highlighted
        ? "border-[#0F766E]/20 bg-[#F3FBF8] text-slate-900 shadow-[0_6px_20px_rgba(15,118,110,0.08)]"
        : filled
          ? "border-slate-200 bg-white text-slate-900"
          : "border-slate-100 bg-slate-50/80 text-slate-500 placeholder:text-slate-400",
    };
  };

  const renderInputField = (
    field: CustomerProfileFieldKey,
    label: string,
    placeholder: string,
    className?: string,
  ) => {
    const tone = resolveFieldTone(field);

    return (
      <FieldGroup label={label} className={className} filled={tone.filled} highlighted={tone.highlighted}>
        <Input
          value={value[field]}
          onChange={(event) => onChange({ [field]: event.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("h-11 rounded-2xl transition-colors", tone.controlClassName)}
        />
      </FieldGroup>
    );
  };

  const renderTextareaField = (
    field: CustomerProfileFieldKey,
    label: string,
    placeholder: string,
    className?: string,
  ) => {
    const tone = resolveFieldTone(field);

    return (
      <FieldGroup label={label} className={className} filled={tone.filled} highlighted={tone.highlighted}>
        <Textarea
          value={value[field]}
          onChange={(event) => onChange({ [field]: event.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          className={cn("min-h-24 rounded-[24px] transition-colors", tone.controlClassName)}
        />
      </FieldGroup>
    );
  };

  const extraFields = (
    <>
      {renderInputField("age", "年龄", "可选")}
      {renderInputField("sex", "性别", "可选")}
      {renderInputField("recentMoney", "资金情况", "例如：每年可安排 2 万预算", "md:col-span-2")}
      {renderTextareaField("wealthProfile", "财富情况", "例如：有房有车、已有理财配置", "md:col-span-2")}
      {renderTextareaField("familyProfile", "家庭情况", "例如：已婚，有一个女儿", "md:col-span-2")}
      {renderTextareaField("preferCommunicate", "沟通偏好", "例如：更习惯微信沟通", "md:col-span-2")}
      {renderTextareaField("remark", "备注", "例如：做事谨慎，决策前会先和爱人商量，不喜欢被频繁催促", "md:col-span-2")}
    </>
  );


  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      {renderInputField("name", "客户姓名", "请输入客户姓名", "md:col-span-2")}
      {renderInputField("nickname", "客户昵称", "可选")}
      {renderInputField("source", "客户来源", "例如：转介绍")}
      {renderInputField("profession", "职业 / 身份", "例如：银行财务", "md:col-span-2")}
      {renderTextareaField("coreInteresting", "核心关注点", "例如：孩子教育金、养老规划", "md:col-span-2")}

      {compact ? (
        <details className="md:col-span-2 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer list-none font-medium text-slate-900">补充更多信息</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">{extraFields}</div>
        </details>
      ) : (
        extraFields
      )}
    </div>
  );
}
