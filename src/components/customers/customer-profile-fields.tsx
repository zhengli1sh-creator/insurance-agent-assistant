"use client";

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
}

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
};

interface CustomerProfileFieldsProps {
  value: CustomerProfileFormValue;
  onChange: (patch: Partial<CustomerProfileFormValue>) => void;
  disabled?: boolean;
  className?: string;
  variant?: "full" | "compact";
}

export function CustomerProfileFields({ value, onChange, disabled = false, className, variant = "full" }: CustomerProfileFieldsProps) {
  const compact = variant === "compact";

  return (
    <div className={cn("grid gap-3 md:grid-cols-2", className)}>
      <Input
        value={value.name}
        onChange={(event) => onChange({ name: event.target.value })}
        placeholder="客户姓名（必填）"
        disabled={disabled}
        className="h-11 rounded-2xl border-white bg-white md:col-span-2"
      />
      <Input
        value={value.nickname}
        onChange={(event) => onChange({ nickname: event.target.value })}
        placeholder="客户昵称（可选）"
        disabled={disabled}
        className="h-11 rounded-2xl border-white bg-white"
      />
      <Input
        value={value.source}
        onChange={(event) => onChange({ source: event.target.value })}
        placeholder="客户来源，例如：转介绍"
        disabled={disabled}
        className="h-11 rounded-2xl border-white bg-white"
      />
      <Input
        value={value.profession}
        onChange={(event) => onChange({ profession: event.target.value })}
        placeholder="职业"
        disabled={disabled}
        className="h-11 rounded-2xl border-white bg-white md:col-span-2"
      />
      <Textarea
        value={value.coreInteresting}
        onChange={(event) => onChange({ coreInteresting: event.target.value })}
        placeholder="核心关注点"
        disabled={disabled}
        className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
      />

      {compact ? (
        <details className="md:col-span-2 rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 text-sm text-slate-600">
          <summary className="cursor-pointer list-none font-medium text-slate-900">补充更多信息</summary>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <Input
              value={value.age}
              onChange={(event) => onChange({ age: event.target.value })}
              placeholder="年龄"
              disabled={disabled}
              className="h-11 rounded-2xl border-white bg-white"
            />
            <Input
              value={value.sex}
              onChange={(event) => onChange({ sex: event.target.value })}
              placeholder="性别"
              disabled={disabled}
              className="h-11 rounded-2xl border-white bg-white"
            />
            <Input
              value={value.recentMoney}
              onChange={(event) => onChange({ recentMoney: event.target.value })}
              placeholder="资金情况"
              disabled={disabled}
              className="h-11 rounded-2xl border-white bg-white md:col-span-2"
            />
            <Textarea
              value={value.wealthProfile}
              onChange={(event) => onChange({ wealthProfile: event.target.value })}
              placeholder="财富情况"
              disabled={disabled}
              className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
            />
            <Textarea
              value={value.familyProfile}
              onChange={(event) => onChange({ familyProfile: event.target.value })}
              placeholder="家庭情况"
              disabled={disabled}
              className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
            />
            <Textarea
              value={value.preferCommunicate}
              onChange={(event) => onChange({ preferCommunicate: event.target.value })}
              placeholder="沟通偏好"
              disabled={disabled}
              className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
            />
          </div>
        </details>
      ) : (
        <>
          <Input
            value={value.age}
            onChange={(event) => onChange({ age: event.target.value })}
            placeholder="年龄"
            disabled={disabled}
            className="h-11 rounded-2xl border-white bg-white"
          />
          <Input
            value={value.sex}
            onChange={(event) => onChange({ sex: event.target.value })}
            placeholder="性别"
            disabled={disabled}
            className="h-11 rounded-2xl border-white bg-white"
          />
          <Input
            value={value.recentMoney}
            onChange={(event) => onChange({ recentMoney: event.target.value })}
            placeholder="资金情况"
            disabled={disabled}
            className="h-11 rounded-2xl border-white bg-white md:col-span-2"
          />
          <Textarea
            value={value.wealthProfile}
            onChange={(event) => onChange({ wealthProfile: event.target.value })}
            placeholder="财富情况"
            disabled={disabled}
            className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
          />
          <Textarea
            value={value.familyProfile}
            onChange={(event) => onChange({ familyProfile: event.target.value })}
            placeholder="家庭情况"
            disabled={disabled}
            className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
          />
          <Textarea
            value={value.preferCommunicate}
            onChange={(event) => onChange({ preferCommunicate: event.target.value })}
            placeholder="沟通偏好"
            disabled={disabled}
            className="min-h-24 rounded-[24px] border-white bg-white md:col-span-2"
          />
        </>
      )}
    </div>
  );
}
