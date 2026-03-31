"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";


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

  return (
    <div
      className={cn(
        "space-y-3 rounded-[26px] border p-4 transition-all",
        highlighted
          ? "border-[#0F766E]/18 bg-[linear-gradient(180deg,rgba(243,251,248,0.98)_0%,rgba(255,255,255,0.98)_100%)] shadow-[0_12px_30px_rgba(15,118,110,0.08)]"
          : filled
            ? "border-[rgba(18,59,93,0.08)] bg-white/94 shadow-[0_12px_24px_rgba(15,23,42,0.04)]"
            : "border-white/80 bg-white/72 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1">
          <p className={cn("text-sm font-medium transition-colors", highlighted ? "text-[#0F766E]" : "text-slate-800")}>{label}</p>
          <p className="text-xs leading-5 text-slate-500">{description}</p>
        </div>
        <span
          className={cn(
            "rounded-full px-2.5 py-1 text-[11px] font-medium tracking-[0.16em] uppercase",
            highlighted
              ? "bg-[#0F766E]/10 text-[#0F766E]"
              : filled
                ? "bg-[var(--advisor-gold-soft)] text-[var(--advisor-gold)]"
                : "bg-slate-100 text-slate-400",
          )}
        >
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
          className={cn("h-12 rounded-[20px] px-4 transition-all", tone.controlClassName)}
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
          className={cn("min-h-[112px] rounded-[22px] px-4 py-3 transition-all", tone.controlClassName)}
        />
      </FieldGroup>
    );
  };

  const primaryFields = (
    <>
      {renderInputField("name", "客户姓名", "请输入客户姓名", "最小必填，先形成可识别的客户档案。", "md:col-span-2", true)}
      {renderInputField("nickname", "客户昵称", "可选", "记录更自然的称呼，后续沟通更顺手。")}
      {renderInputField("source", "客户来源", "例如：转介绍", "沉淀首次认识路径，便于后续复盘来源质量。")}
      {renderInputField("profession", "职业 / 身份", "例如：银行财务", "帮助后续判断沟通语言和经营切入点。", "md:col-span-2")}
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
      <div className={cn("rounded-[30px] p-4 sm:p-5", compact ? "rounded-[28px] border border-white/75 bg-white/90 shadow-[0_16px_34px_rgba(15,23,42,0.05)]" : "advisor-soft-card")}>
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
        <details className="advisor-disclosure-card group rounded-[28px] p-4">
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

        <div className="advisor-subtle-card rounded-[30px] p-4 sm:p-5">
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

