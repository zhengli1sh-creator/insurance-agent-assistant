"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEventHandler,
  type ReactNode,
} from "react";

import { ClipboardList } from "lucide-react";

import { customerOutlineActionClassName, customerPrimaryActionClassName } from "@/components/customers/customer-style";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const MIN_TEXTAREA_HEIGHT = 46;
const MAX_TEXTAREA_HEIGHT = 156;


export type VisitEntryComposerField = {
  key: string;
  label: string;
  required?: boolean;
};

type VisitEntryComposerProps = {
  inputText: string;
  onInputTextChange: (value: string) => void;
  onExtract: () => void;
  onSave: () => void;
  onFocus?: () => void;
  onKeyDown?: KeyboardEventHandler<HTMLTextAreaElement>;
  suggestedFields: VisitEntryComposerField[];
  helperSlot?: ReactNode;
  isReadyToSave: boolean;
  isExtractPending: boolean;
  isSavePending: boolean;
  saveLabel?: string;
  placeholder?: string;
};


export function VisitEntryComposer({
  inputText,
  onInputTextChange,
  onExtract,
  onSave,
  onFocus,
  onKeyDown,
  suggestedFields,
  helperSlot,
  isReadyToSave,
  isExtractPending,
  isSavePending,
  saveLabel = "保存拜访记录",
  placeholder = "例如：今天见了王姐，她主要担心孩子教育金，约好下周三把方案发给她。",
}: VisitEntryComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  const syncTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = `${MIN_TEXTAREA_HEIGHT}px`;
    const nextHeight = Math.min(MAX_TEXTAREA_HEIGHT, Math.max(MIN_TEXTAREA_HEIGHT, textarea.scrollHeight));
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  }, []);

  useEffect(() => {
    syncTextareaHeight();
  }, [inputText, syncTextareaHeight]);



  return (
    <div className="advisor-panel-footer-surface fixed bottom-0 left-0 right-0 z-50 px-2.5 pt-2 sm:px-4 md:px-5 lg:px-6 pb-[calc(0.65rem+env(safe-area-inset-bottom))]">

      <div className="advisor-input-dock mx-auto max-w-3xl rounded-[22px] p-2.5 sm:rounded-[24px] sm:p-3.5">
        <div className="flex items-start gap-2.5">
          <div className="advisor-icon-badge advisor-icon-badge-info mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center sm:h-7 sm:w-7">
            <ClipboardList className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-medium text-slate-900 sm:text-sm">输入拜访信息</p>

              {suggestedFields.length > 0 ? (
                suggestedFields.map((field) => (
                  <Badge key={field.key} className="advisor-chip-warning rounded-full border-0 px-2.5 py-1 text-[11px] font-medium leading-4">
                    <span>{field.label}</span>
                    {field.required ? <span className="advisor-chip-info ml-1 rounded-full px-1.5 py-0.5 text-[10px] leading-4">建议先补</span> : null}
                  </Badge>
                ))
              ) : (
                <span className="text-[12px] leading-5 text-slate-500">当前信息已较完整，可直接保存拜访记录</span>
              )}
            </div>
            {helperSlot}
          </div>
        </div>

        <Textarea
          ref={textareaRef}
          rows={1}
          value={inputText}
          onFocus={onFocus}
          onChange={(event) => onInputTextChange(event.target.value)}
          onKeyDown={onKeyDown}
          aria-label="拜访信息输入框"
          placeholder={placeholder}
          className="advisor-form-control advisor-form-control-highlighted mt-2.5 rounded-[16px] border-white/80 px-3 py-2.5 text-sm leading-6 shadow-none focus-visible:ring-0 sm:mt-3 sm:rounded-[18px]"
          style={{ minHeight: MIN_TEXTAREA_HEIGHT, maxHeight: MAX_TEXTAREA_HEIGHT }}
        />

        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:mt-3">
          <Button
            onClick={onExtract}
            disabled={isExtractPending || !inputText.trim()}
            className={cn(customerPrimaryActionClassName, "h-9 text-sm sm:h-10")}
          >
            {isExtractPending ? "整理中…" : "整理信息"}
          </Button>
          <Button
            onClick={onSave}
            disabled={isSavePending}
            className={cn(isReadyToSave ? customerPrimaryActionClassName : customerOutlineActionClassName, "h-9 text-sm sm:h-10")}
          >
            {isSavePending ? "保存中…" : saveLabel}
          </Button>
        </div>

        <p className="mt-2 hidden text-[11px] leading-5 text-slate-400 md:block">
          先整理再保存；如识别到后续事项，保存成功后会继续进入任务确认页。支持 `Ctrl/Cmd + Enter` 快速整理。
        </p>
      </div>
    </div>
  );
}
