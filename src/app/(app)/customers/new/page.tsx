"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Sparkles, 
  ChevronLeft, 
  ChevronUp, 
  ChevronDown, 
  Users, 
  Lightbulb,
  CheckCircle2,
  Circle,
  UserPlus,
  CheckCircle
} from "lucide-react";

import { fetchJson } from "@/lib/crm-api";
import type { CustomerRecord } from "@/types/customer";

// ============ 类型定义 ============

// 客户字段定义
const customerFields = [
  { key: "name", label: "姓名", required: true },
  { key: "nickname", label: "昵称", required: false },
  { key: "age", label: "年龄", required: false },
  { key: "sex", label: "性别", required: false },
  { key: "profession", label: "职业", required: false },
  { key: "familyProfile", label: "家庭情况", required: false },
  { key: "wealthProfile", label: "财富状况", required: false },
  { key: "coreInteresting", label: "核心关注点", required: false },
  { key: "preferCommunicate", label: "沟通偏好", required: false },
  { key: "source", label: "客户来源", required: false },
  { key: "recentMoney", label: "近期资金情况", required: false },
  { key: "remark", label: "备注", required: false },
] as const;

type CustomerFieldKey = typeof customerFields[number]["key"];

// 中文标签到英文 key 的映射（与 API 返回的 label 对应）
const labelToKeyMap: Record<string, CustomerFieldKey> = {
  "客户姓名": "name",
  "客户昵称": "nickname",
  "年龄": "age",
  "性别": "sex",
  "职业 / 身份": "profession",
  "家庭情况": "familyProfile",
  "财富情况": "wealthProfile",
  "核心关注点": "coreInteresting",
  "沟通偏好": "preferCommunicate",
  "客户来源": "source",
  "资金情况": "recentMoney",
  "备注": "remark",
};

// 信息分类定义
const infoCategories = [
  { title: "基础信息", items: ["姓名*", "昵称", "年龄", "性别", "职业"] },
  { title: "家庭与财富", items: ["家庭情况", "财富状况", "近期资金情况"] },
  { title: "经营相关", items: ["核心关注点", "沟通偏好", "客户来源"] },
  { title: "其他", items: ["其他任意信息"] },
];

// 消息类型定义
type ChatMessageType = "welcome" | "user-input" | "extracted-summary" | "save-success" | "error-hint";

type ExtractedFieldItem = { label: string; value: string };

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  type: ChatMessageType;
  content: string;
  timestamp: string;
  // 用户输入的原始文本
  rawInput?: string;
  // 本次提取的字段
  extractedFields?: ExtractedFieldItem[];
  // 当前所有字段状态（用于展示已填/未填）
  currentFields?: Record<CustomerFieldKey, string>;
  // 保存成功的客户数据
  savedCustomer?: CustomerRecord;
};

type CustomerDraftExtractResponse = {
  fields: Record<string, string>;
  extractedFields: Array<{ label: string; value: string }>;
  message: string;
};

// ============ 子组件 ============

// 欢迎引导消息组件
function WelcomeMessageCard() {
  return (
    <div className="rounded-2xl border border-[#0F766E]/10 bg-gradient-to-br from-[#F3FBF8] to-[#E8F5F1] p-4">
      {/* 标题行 */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0F766E]/15">
          <Lightbulb className="h-3 w-3 text-[#0F766E]" />
        </div>
        <span className="text-sm font-medium text-slate-700">可保存的信息项</span>
      </div>

      {/* 分类列表 - 紧凑布局 */}
      <div className="space-y-2">
        {infoCategories.map((category) => (
          <div key={category.title} className="flex items-center gap-2">
            <span className="shrink-0 text-xs font-medium text-slate-500 w-16">
              {category.title}
            </span>
            <div className="flex flex-wrap gap-1">
              {category.items.map((item) => (
                <Badge
                  key={item}
                  variant="secondary"
                  className="rounded bg-[#0F766E]/10 text-[#0F5C56] font-normal text-xs px-1.5 py-0"
                >
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        在下方输入框中描述客户信息，助手会帮你整理成结构化档案
      </p>
    </div>
  );
}

// 整理结果卡片组件
function ExtractedSummaryCard({ 
  extractedFields, 
  currentFields 
}: { 
  extractedFields: ExtractedFieldItem[];
  currentFields: Record<CustomerFieldKey, string>;
}) {
  // 获取已填写的字段列表
  const filledFields = customerFields.filter(f => currentFields[f.key]?.trim());
  const emptyFields = customerFields.filter(f => !currentFields[f.key]?.trim());

  return (
    <div className="rounded-2xl border border-[#B8894A]/20 bg-[#FFF8EE]/80 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-[#B8894A]" />
        <span className="text-sm font-medium text-slate-700">已整理的客户信息</span>
      </div>

      {/* 本次更新的字段 */}
      {extractedFields.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium text-[#B8894A]">📋 本次更新</p>
          <div className="flex flex-wrap gap-1.5">
            {extractedFields.map((field, idx) => (
              <Badge 
                key={idx}
                variant="secondary" 
                className="bg-[#B8894A]/10 text-[#8B6914] text-xs"
              >
                {field.label}：{field.value}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 已填写 / 未填写 分栏 */}
      <div className="grid gap-3 md:grid-cols-2">
        {/* 已填写 */}
        <div className="rounded-xl bg-white/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-slate-600">已填写 ({filledFields.length})</span>
          </div>
          {filledFields.length > 0 ? (
            <div className="space-y-1">
              {filledFields.map(field => (
                <div key={field.key} className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 w-14 shrink-0">{field.label}</span>
                  <span className="text-slate-700 truncate">{currentFields[field.key]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">暂无已填写字段</p>
          )}
        </div>

        {/* 未填写 */}
        <div className="rounded-xl bg-white/60 p-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Circle className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-medium text-slate-600">未填写 ({emptyFields.length})</span>
          </div>
          {emptyFields.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {emptyFields.map(field => (
                <Badge 
                  key={field.key}
                  variant="secondary" 
                  className={`text-xs ${field.required ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}
                >
                  {field.label}{field.required && '*'}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-emerald-600">✓ 所有字段已填写</p>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        你可以继续补充信息，或直接保存当前档案
      </p>
    </div>
  );
}

// 保存成功卡片组件
function SaveSuccessCard({ customer }: { customer: CustomerRecord }) {
  // 组装所有已保存的字段（完整展示）
  const allFields = [
    { label: "姓名", value: customer.name },
    { label: "昵称", value: customer.nickname },
    { label: "年龄", value: customer.age },
    { label: "性别", value: customer.sex },
    { label: "职业", value: customer.profession },
    { label: "家庭情况", value: customer.family_profile },
    { label: "财富状况", value: customer.wealth_profile },
    { label: "核心关注点", value: customer.core_interesting },
    { label: "沟通偏好", value: customer.prefer_communicate },
    { label: "客户来源", value: customer.source },
    { label: "近期资金情况", value: customer.recent_money },
    { label: "备注", value: customer.remark },
  ].filter(f => f.value);

  return (
    <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      {/* 标题 - 带图标 */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
        </div>
        <span className="text-base font-medium text-emerald-800">已保存的客户档案</span>
      </div>

      {/* 客户姓名标题 */}
      <div className="mb-3 rounded-lg bg-emerald-100/50 px-3 py-2">
        <span className="text-lg font-semibold text-emerald-900">
          {customer.name}
        </span>
        {customer.nickname && (
          <span className="ml-2 text-sm text-emerald-700">
            ({customer.nickname})
          </span>
        )}
      </div>

      {/* 完整字段列表 */}
      {allFields.length > 1 && (
        <div className="rounded-xl bg-white/70 p-3">
          <div className="grid gap-2 md:grid-cols-2">
            {allFields
              .filter(f => f.label !== "姓名" && f.label !== "昵称")
              .map((field, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm">
                  <span className="text-slate-500 w-20 shrink-0 text-xs pt-0.5">{field.label}</span>
                  <span className="text-slate-800 flex-1">{field.value}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">
        你可以继续添加下一位客户
      </p>
    </div>
  );
}

// 错误提示卡片
function ErrorHintCard({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4">
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-100">
          <span className="text-rose-600 text-xs">!</span>
        </div>
        <span className="text-sm text-rose-700">{message}</span>
      </div>
    </div>
  );
}

// ============ 主页面组件 ============

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  // ===== 状态管理 =====
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [currentDraft, setCurrentDraft] = useState<Record<CustomerFieldKey, string>>({
    name: "", nickname: "", age: "", sex: "", profession: "",
    familyProfile: "", wealthProfile: "", coreInteresting: "",
    preferCommunicate: "", source: "", recentMoney: "", remark: "",
  });
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ name: string; confirmed: boolean } | null>(null);
  const [isExistingCustomersOpen, setIsExistingCustomersOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // ===== 数据获取 =====
  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const data = await fetchJson<CustomerRecord[]>("/api/customers");
      return data.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    },
  });

  const customers = customersQuery.data ?? [];

  // ===== 初始化欢迎消息 =====
  useEffect(() => {
    if (!isInitialized && !customersQuery.isLoading) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "welcome",
        content: "欢迎来到客户档案录入。你可以直接告诉我客户的基本信息，我会帮你整理成结构化档案。",
        timestamp: formatTime(),
      });
      setIsInitialized(true);
    }
  }, [isInitialized, customersQuery.isLoading]);

  // ===== 自动滚动到底部 =====
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // ===== 辅助函数 =====
  const formatTime = () => {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  };

  const addMessage = (message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  };

  // 检查是否有任何字段被填充
  const hasAnyExtractedData = Object.values(currentDraft).some((v) => v.trim() !== "");

  // ===== Mutations =====
  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<CustomerDraftExtractResponse>("/api/customers/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          currentName: currentDraft.name,
          currentRemark: currentDraft.remark,
        }),
      }),
    onSuccess: (result, variables) => {
      // 增量合并策略
      const newData: Record<CustomerFieldKey, string> = { ...currentDraft };
      
      result.extractedFields.forEach((field) => {
        const key = labelToKeyMap[field.label] || (field.label as CustomerFieldKey);
        if (key in newData) {
          newData[key] = field.value;
        }
      });
      
      setCurrentDraft(newData);
      setInputText("");
      
      // 添加助手整理结果消息
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "extracted-summary",
        content: "已根据你提供的信息，整理出以下档案内容",
        timestamp: formatTime(),
        extractedFields: result.extractedFields,
        currentFields: newData,
      });
    },
    onError: (error: Error) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: error.message || "提取信息时出错，请重试",
        timestamp: formatTime(),
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: (data: Record<CustomerFieldKey, string>) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          nickname: data.nickname,
          age: data.age,
          sex: data.sex,
          profession: data.profession,
          familyProfile: data.familyProfile,
          wealthProfile: data.wealthProfile,
          coreInteresting: data.coreInteresting,
          preferCommunicate: data.preferCommunicate,
          source: data.source,
          recentMoney: data.recentMoney,
          remark: data.remark,
        }),
      }),
    onSuccess: async (savedCustomer) => {
      // 刷新客户列表
      await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      await queryClient.refetchQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      
      // 添加保存成功消息
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "save-success",
        content: "客户档案已保存成功",
        timestamp: formatTime(),
        savedCustomer,
      });

      // 延迟后重置状态并显示新的欢迎消息
      setTimeout(() => {
        // 清空当前草稿
        setCurrentDraft({
          name: "", nickname: "", age: "", sex: "", profession: "",
          familyProfile: "", wealthProfile: "", coreInteresting: "",
          preferCommunicate: "", source: "", recentMoney: "", remark: "",
        });
        setDuplicateConfirm(null);
        
        // 添加新的欢迎消息
        addMessage({
          id: crypto.randomUUID(),
          role: "assistant",
          type: "welcome",
          content: "欢迎继续添加客户档案。你可以直接告诉我下一位客户的基本信息。",
          timestamp: formatTime(),
        });
      }, 1500);
    },
    onError: (error: Error) => {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: error.message || "保存失败，请重试",
        timestamp: formatTime(),
      });
    },
  });

  // ===== 事件处理 =====
  const handleExtract = () => {
    if (!inputText.trim()) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: "请先输入客户信息",
        timestamp: formatTime(),
      });
      return;
    }

    // 添加用户消息
    addMessage({
      id: crypto.randomUUID(),
      role: "user",
      type: "user-input",
      content: inputText.trim(),
      timestamp: formatTime(),
      rawInput: inputText.trim(),
    });

    // 调用提取API
    extractMutation.mutate(inputText.trim());
  };

  const handleClear = () => {
    setInputText("");
    setCurrentDraft({
      name: "", nickname: "", age: "", sex: "", profession: "",
      familyProfile: "", wealthProfile: "", coreInteresting: "",
      preferCommunicate: "", source: "", recentMoney: "", remark: "",
    });
    setDuplicateConfirm(null);
  };

  const validateNameComplete = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  const findDuplicateCustomer = (name: string, nickname: string): CustomerRecord | undefined => {
    return customers.find((c) => {
      const nameMatch = c.name === name.trim();
      const nicknameMatch = c.nickname === (nickname.trim() || undefined);
      return nameMatch && nicknameMatch;
    });
  };

  const handleSave = () => {
    const name = currentDraft.name.trim();
    const nickname = currentDraft.nickname.trim();
    
    // 1. 校验姓名是否存在
    if (!name) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: "客户姓名是必填信息，尚未填写。请在下方输入框中补充客户姓名，如：客户叫王伟",
        timestamp: formatTime(),
      });
      return;
    }
    
    // 2. 校验姓名是否完整
    if (!validateNameComplete(name)) {
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: `当前姓名为"${name}"，似乎不完整。请补充完整姓名以便后续准确识别这位客户，例如输入：客户全名是王建国`,
        timestamp: formatTime(),
      });
      return;
    }
    
    // 3. 检查重复客户
    const existingSameName = customers.find((c) => c.name === name);
    const isTrulyDuplicate = findDuplicateCustomer(name, nickname);
    
    if (existingSameName && isTrulyDuplicate && !(duplicateConfirm?.name === name && duplicateConfirm?.confirmed)) {
      setDuplicateConfirm({ name, confirmed: false });
      addMessage({
        id: crypto.randomUUID(),
        role: "assistant",
        type: "error-hint",
        content: `检测到已有名为"${name}"的客户（${existingSameName.nickname ? existingSameName.nickname + '，' : ''}创建于 ${existingSameName.created_at ? new Date(existingSameName.created_at).toLocaleDateString() : '未知'}）。如为同一人请前往客户中心更新；如确认为另一位同名客户，请补充昵称信息并交给助手整理后，再次点击保存`,
        timestamp: formatTime(),
      });
      return;
    }
    
    setDuplicateConfirm(null);
    saveMutation.mutate(currentDraft);
  };

  // ===== 渲染消息 =====
  const renderMessage = (message: ChatMessage) => {
    const isAssistant = message.role === "assistant";
    
    return (
      <div 
        key={message.id} 
        className={`flex gap-3 ${isAssistant ? "justify-start" : "justify-end"}`}
      >
        {isAssistant && (
          <Avatar className="mt-1 h-8 w-8 border border-white shadow-sm shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-[#0F766E] to-[#B8894A] text-white text-xs">
              AI
            </AvatarFallback>
          </Avatar>
        )}
        
        <div className={`max-w-[85%] space-y-1 ${isAssistant ? "items-start" : "items-end text-right"}`}>
          {/* 时间戳 */}
          <span className="text-xs text-slate-400 px-1">{message.timestamp}</span>
          
          {/* 消息内容 */}
          <div className={`rounded-2xl px-4 py-3 text-sm shadow-sm ${
            isAssistant 
              ? "bg-white border border-slate-100 text-slate-700" 
              : "bg-gradient-to-br from-[#0F766E] to-[#0B5F59] text-white"
          }`}>
            {message.type === "user-input" ? (
              <p className="leading-relaxed">{message.rawInput}</p>
            ) : (
              <p className="leading-relaxed">{message.content}</p>
            )}
          </div>

          {/* 结构化卡片内容 */}
          {isAssistant && message.type === "welcome" && (
            <div className="pt-1">
              <WelcomeMessageCard />
            </div>
          )}

          {isAssistant && message.type === "extracted-summary" && message.currentFields && (
            <div className="pt-1">
              <ExtractedSummaryCard 
                extractedFields={message.extractedFields || []}
                currentFields={message.currentFields}
              />
            </div>
          )}

          {isAssistant && message.type === "save-success" && message.savedCustomer && (
            <div className="pt-1">
              <SaveSuccessCard customer={message.savedCustomer} />
            </div>
          )}

          {isAssistant && message.type === "error-hint" && (
            <div className="pt-1">
              <ErrorHintCard message={message.content} />
            </div>
          )}
        </div>
      </div>
    );
  };

  // ===== 页面渲染 =====
  return (
    <div className="h-[calc(100vh-64px)] flex flex-col overflow-hidden bg-white">
      {/* 页面标题 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-100 bg-white shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/customers")}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-lg font-semibold text-slate-900">添加客户档案</h1>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 overflow-hidden">
        <div className="h-full grid lg:grid-cols-[1fr_280px]">
          {/* 左侧：对话区域 */}
          <div className="flex flex-col h-full overflow-hidden">
            {/* 消息列表 - 可滚动区域 */}
            <div 
              ref={scrollAreaRef}
              className="flex-1 overflow-y-auto px-4 py-4"
              style={{ overscrollBehavior: 'contain' }}
            >
              <div className="space-y-5 max-w-3xl mx-auto">
                {messages.map(renderMessage)}
                
                {/* 加载状态 */}
                {(extractMutation.isPending || saveMutation.isPending) && (
                  <div className="flex gap-3 justify-start">
                    <Avatar className="mt-1 h-8 w-8 border border-white shadow-sm shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-[#0F766E] to-[#B8894A] text-white text-xs">
                        AI
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-white border border-slate-100 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Sparkles className="h-4 w-4 animate-pulse text-[#B8894A]" />
                        {extractMutation.isPending ? "正在整理信息..." : "正在保存档案..."}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* 底部留白 */}
                <div className="h-20 lg:h-4" />
              </div>
            </div>

            {/* 底部输入区域 */}
            <div className="border-t border-slate-100 bg-white p-4 shrink-0">
              <div className="max-w-3xl mx-auto">
                <Card className="border-slate-200/70 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus className="h-4 w-4 text-[#0F766E]" />
                      <span className="text-sm font-medium text-slate-700">输入客户信息</span>
                      <span className="text-xs text-slate-400">助手会帮你整理成档案</span>
                    </div>
                    
                    <Textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="请描述客户的基本信息，例如：&#10;王敏，35岁，软件工程师，已婚有一个5岁孩子，家庭年收入50万左右..."
                      className="min-h-[100px] resize-none rounded-xl border-slate-200/80 bg-slate-50/50 p-3 text-sm leading-relaxed placeholder:text-slate-400"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.metaKey) {
                          handleExtract();
                        }
                      }}
                    />

                    {/* 操作按钮 */}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={handleClear}
                        disabled={!hasAnyExtractedData && !inputText}
                        className="rounded-full border-slate-300 bg-transparent px-4 text-sm"
                      >
                        清空输入框
                      </Button>

                      <Button
                        onClick={handleExtract}
                        disabled={extractMutation.isPending || !inputText.trim()}
                        className="rounded-full bg-[#0F766E] px-4 text-white hover:bg-[#0B5F59] text-sm"
                      >
                        {extractMutation.isPending ? "整理中..." : "交给助手"}
                      </Button>

                      <Button
                        onClick={handleSave}
                        disabled={saveMutation.isPending}
                        className="rounded-full bg-[#123B5D] px-4 text-white hover:bg-[#0E2E49] text-sm"
                      >
                        {saveMutation.isPending ? "保存中..." : "保存客户"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* 右侧：现有客户列表（桌面端） */}
          <Card className="hidden lg:flex lg:flex-col h-full border-l border-slate-100 bg-[#F7F5F2]/50 rounded-none">
            <CardContent className="flex h-full flex-col p-0">
              <div className="border-b border-[#E8E4DE] bg-[#EFEBE6]/30 p-4">
                <h3 className="font-medium text-[#123B5D]">现有客户</h3>
                <p className="text-xs text-slate-500">避免重复建档</p>
              </div>
              <ScrollArea className="flex-1 px-3 py-3">
                <div className="space-y-2">
                  {customers.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex cursor-pointer items-center gap-3 rounded-xl bg-white/60 p-2.5 shadow-sm transition-all hover:bg-white hover:shadow-md"
                      onClick={() => router.push(`/customers`)}
                    >
                      <Avatar className="h-9 w-9 border border-[#E8E4DE]">
                        <AvatarFallback className="bg-[#F0F4F8] text-xs font-medium text-[#123B5D]">
                          {customer.name.slice(0, 1)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {customer.name}
                        </p>
                        {customer.nickname && (
                          <p className="truncate text-xs text-slate-500">
                            {customer.nickname}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                  {customers.length === 0 && (
                    <div className="py-8 text-center text-sm text-slate-400">
                      暂无客户数据
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 底部现有客户区域 - 手机端 */}
      <Card className="fixed inset-x-4 bottom-4 z-40 border-slate-200/50 bg-[#F7F5F2]/95 backdrop-blur-sm lg:hidden">
        <div
          className="flex cursor-pointer items-center justify-between p-3"
          onClick={() => setIsExistingCustomersOpen(!isExistingCustomersOpen)}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#123B5D]" />
            <span className="text-sm font-medium text-slate-700">
              现有 {customers.length} 位客户
            </span>
            <span className="text-xs text-slate-400">（避免重复建档）</span>
          </div>
          {isExistingCustomersOpen ? (
            <ChevronDown className="h-5 w-5 text-slate-400" />
          ) : (
            <ChevronUp className="h-5 w-5 text-slate-400" />
          )}
        </div>

        {isExistingCustomersOpen && (
          <div className="border-t border-[#E8E4DE]">
            <ScrollArea className="h-[200px] px-3 py-2">
              <div className="space-y-2">
                {customers.map((customer) => (
                  <div
                    key={customer.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg bg-white/60 p-2 shadow-sm transition-all hover:bg-white hover:shadow-md"
                    onClick={() => router.push(`/customers`)}
                  >
                    <Avatar className="h-8 w-8 border border-[#E8E4DE]">
                      <AvatarFallback className="bg-[#F0F4F8] text-xs font-medium text-[#123B5D]">
                        {customer.name.slice(0, 1)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {customer.name}
                      </p>
                      {customer.nickname && (
                        <p className="truncate text-xs text-slate-500">
                          {customer.nickname}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {customers.length === 0 && (
                  <div className="py-6 text-center text-sm text-slate-400">
                    暂无客户数据
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </Card>

    </div>
  );
}
