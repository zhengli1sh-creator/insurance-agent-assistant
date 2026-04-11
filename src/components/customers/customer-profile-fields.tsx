"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";


import {
  customerCompactSectionCardClassName,
  customerDisclosureCardClassName,
  customerFieldGroupClassName,
  customerFieldStateChipClassName,
  customerInputFieldClassName,
  customerSectionCardClassName,
  customerSubtleSectionCardClassName,
  customerTextareaFieldClassName,
} from "@/components/customers/customer-style";

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
  description,
  className,
  children,
  filled = false,
  highlighted = false,
  required = false,
}: {
  label: string;
  description: string;
  className?: string;
  children: ReactNode;
  filled?: boolean;
  highlighted?: boolean;
  required?: boolean;
}) {
  const stateLabel = highlighted ? "已识别" : filled ? "已补充" : required ? "必填" : "待补充";
  const containerClassName = highlighted
    ? "advisor-review-card advisor-review-highlight"
    : filled
      ? "advisor-meta-tile border border-white/75"
      : "advisor-field-card";
  const stateChipClassName = highlighted
    ? "advisor-review-chip"
    : filled
      ? "advisor-chip-success"
      : required
        ? "advisor-chip-warning"
        : "advisor-chip-neutral";

  return (
    <div className={cn(customerFieldGroupClassName, containerClassName, className)}>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className={cn("text-sm font-medium transition-colors", highlighted ? "text-emerald-700" : "text-slate-800")}>{label}</p>

          <p className="text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span className={cn(customerFieldStateChipClassName, stateChipClassName)}>

          {stateLabel}
        </span>
      </div>
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
        ? "advisor-form-control advisor-form-control-highlighted"
        : filled
          ? "advisor-form-control"
          : "advisor-form-control advisor-form-control-muted",

    };
  };


  const renderInputField = (
    field: CustomerProfileFieldKey,
    label: string,
    placeholder: string,
    description: string,
    className?: string,
    required = false,
  ) => {
    const tone = resolveFieldTone(field);

    return (
      <FieldGroup label={label} description={description} className={className} filled={tone.filled} highlighted={tone.highlighted} required={required}>
        <Input
          value={value[field]}
          onChange={(event) => onChange({ [field]: event.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(customerInputFieldClassName, tone.controlClassName)}

        />

      </FieldGroup>
    );
  };

  const renderTextareaField = (
    field: CustomerProfileFieldKey,
    label: string,
    placeholder: string,
    description: string,
    className?: string,
  ) => {
    const tone = resolveFieldTone(field);

    return (
      <FieldGroup label={label} description={description} className={className} filled={tone.filled} highlighted={tone.highlighted}>
        <Textarea
          value={value[field]}
          onChange={(event) => onChange({ [field]: event.target.value })}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(customerTextareaFieldClassName, tone.controlClassName)}

        />

      </FieldGroup>
    );
  };

  const primaryFields = (
    <>
      {renderInputField("name", "客户姓名", "请输入客户姓名", "最小必填，先形成可识别的客户档案。", "md:col-span-2", true)}
      {renderInputField("nickname", "客户昵称", "可选", "记录更自然的称呼，后续沟通更顺手。")}
      {renderTextareaField("coreInteresting", "核心关注点", "例如：孩子教育金、养老规划", "先记录客户最在意的主题，经营简报会据此更聚焦。", "md:col-span-2")}
    </>

  );

  const extraFields = (
    <>
      {renderInputField("age", "年龄", "可选", "补充年龄段，便于判断阶段性需求。")}
      {renderInputField("sex", "性别", "可选", "只在确有帮助时补充，避免无效信息堆叠。")}
      {renderInputField("recentMoney", "资金情况", "例如：每年可安排 2 万预算", "记录近期预算或资金安排，为后续建议做准备。", "md:col-span-2")}
      {renderTextareaField("wealthProfile", "财富情况", "例如：有房有车、已有理财配置", "只写已确认的信息，不做主观推断。", "md:col-span-2")}
      {renderTextareaField("familyProfile", "家庭情况", "例如：已婚，有一个女儿", "帮助理解家庭责任与保障优先级。", "md:col-span-2")}
      {renderTextareaField("preferCommunicate", "沟通偏好", "例如：更习惯微信沟通", "沉淀联系节奏、渠道和表达方式偏好。", "md:col-span-2")}
      {renderTextareaField("remark", "备注", "例如：做事谨慎，决策前会先和爱人商量，不喜欢被频繁催促", "补充无法归类但对经营有帮助的真实观察。", "md:col-span-2")}
    </>
  );

  return (
    <div className={cn("space-y-4", className)}>
      <div className={compact ? customerCompactSectionCardClassName : customerSectionCardClassName}>


        <div className="space-y-2">

          <p className="advisor-kicker">Customer profile</p>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-slate-900">基础建档信息</h3>
            <p className="max-w-2xl text-sm leading-6 text-slate-600">先把这位客户最核心的识别信息与经营起点沉淀下来，后续流程会以这里为基础继续展开。</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">{primaryFields}</div>
      </div>

      {compact ? (
        <details className={cn(customerDisclosureCardClassName, "group")}>

          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <div className="space-y-1">
              <p className="advisor-kicker">Additional profile</p>
              <p className="text-base font-medium text-slate-900">补充更多信息</p>
              <p className="text-sm leading-6 text-slate-500">按需补齐家庭、财富、沟通与备注，系统会据此形成更完整的经营简报。</p>
            </div>
            <span className="advisor-disclosure-toggle flex size-9 shrink-0 items-center justify-center transition-transform duration-200 group-open:rotate-180">
              <ChevronDown className="h-4 w-4" />
            </span>
          </summary>
          <div className="mt-4 grid gap-3 md:grid-cols-2">{extraFields}</div>
        </details>
      ) : (

        <div className={customerSubtleSectionCardClassName}>

          <div className="space-y-2">
            <p className="advisor-kicker">Additional profile</p>
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-900">补充画像信息</h3>
              <p className="max-w-2xl text-sm leading-6 text-slate-600">这些信息不是一次必须填满，但一旦真实可得，就应尽量沉淀，便于后续拜访、活动与提醒承接。</p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2">{extraFields}</div>
        </div>
      )}
    </div>
  );
}

