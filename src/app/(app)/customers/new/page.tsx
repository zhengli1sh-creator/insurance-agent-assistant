"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { FileText, Sparkles, Save, Trash2, ChevronLeft, ChevronUp, ChevronDown, Users, Lightbulb, RefreshCw } from "lucide-react";

import { fetchJson } from "@/lib/crm-api";
import type { CustomerRecord } from "@/types/customer";
import { customers as demoCustomers } from "@/lib/demo-data";

// 信息引导卡片组件
function InfoGuidanceCard() {
  const infoCategories = [
    { title: "基础信息", items: ["姓名（必填）", "昵称", "年龄", "性别", "职业"] },
    { title: "家庭与财富", items: ["家庭情况", "财富状况", "近期资金情况"] },
    { title: "经营相关", items: ["核心关注点", "沟通偏好", "客户来源"] },
    { title: "其他", items: ["备注（可保存其他任意信息）"] },
  ];

  return (
    <Card className="border-[#0F766E]/10 bg-gradient-to-br from-[#F3FBF8] to-[#E8F5F1]">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#0F766E]/15">
            <Lightbulb className="h-4 w-4 text-[#0F766E]" />
          </div>
          <span className="font-medium text-slate-900">可提供的信息项</span>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {infoCategories.map((category) => (
            <div key={category.title} className="rounded-xl bg-white/70 p-3">
              <h4 className="mb-2 text-sm font-medium text-slate-700">{category.title}</h4>
              <div className="flex flex-wrap gap-1.5">
                {category.items.map((item) => (
                  <Badge
                    key={item}
                    variant="secondary"
                    className="rounded-md bg-[#0F766E]/10 text-[#0F5C56] font-normal"
                  >
                    {item}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <p className="mt-4 text-sm text-slate-500">
          在下方输入框中描述客户信息，助手会帮你整理成结构化档案
        </p>
      </CardContent>
    </Card>
  );
}

// 获取档案卡片标题和图标
function getArchiveCardTitle(extractCount: number) {
  if (extractCount === 1) {
    return { title: "助手已整理的客户信息", icon: <FileText className="h-4 w-4 text-[#B8894A]" /> };
  }
  return { title: "已更新的客户信息", icon: <RefreshCw className="h-4 w-4 text-[#B8894A]" /> };
}

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

type CustomerFieldKey = typeof customerFields[number]["key"];

type MessageData = {
  text: string;
  fields: string[];
  suffix: string;
};

type CustomerDraftExtractResponse = {
  fields: Record<string, string>;
  extractedFields: Array<{ label: string; value: string }>;
  message: MessageData | string;
};

export default function NewCustomerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [inputText, setInputText] = useState("");
  const [extractCount, setExtractCount] = useState(0);
  const [extractedData, setExtractedData] = useState<Record<CustomerFieldKey, string>>({
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
  });
  const [feedback, setFeedback] = useState<MessageData | string>("");
  const [duplicateConfirm, setDuplicateConfirm] = useState<{ name: string; confirmed: boolean } | null>(null);
  const [isExistingCustomersOpen, setIsExistingCustomersOpen] = useState(false);

  // 获取客户列表 - 按创建时间倒序
  const customersQuery = useQuery({
    queryKey: ["customers-list"],
    queryFn: async () => {
      const data = await fetchJson<CustomerRecord[]>("/api/customers");
      // 按创建时间倒序排列
      return data.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
    },
  });

  const customers = customersQuery.data ?? [];

  // 信息提取 mutation - 支持增量补充
  const extractMutation = useMutation({
    mutationFn: (message: string) =>
      fetchJson<CustomerDraftExtractResponse>("/api/customers/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message,
          // 传递当前已提取的数据，帮助大模型理解上下文
          currentData: extractedData,
        }),
      }),
    onSuccess: (result) => {
      // 增量合并策略：新提取的字段覆盖旧值，已有值保持不变
      const newData: Record<CustomerFieldKey, string> = { ...extractedData };
      const updatedFields: string[] = [];
      
      result.extractedFields.forEach((field) => {
        // 尝试通过中文标签映射到英文 key
        const key = labelToKeyMap[field.label] || (field.label as CustomerFieldKey);
        if (key in newData) {
          // 记录哪些字段被更新了（包括从空值填充或覆盖旧值）
          if (newData[key] !== field.value) {
            updatedFields.push(field.label);
          }
          newData[key] = field.value;
        }
      });
      
      setExtractedData(newData);
      setInputText(""); // 清空输入框
      setExtractCount((prev) => prev + 1); // 增加提取次数
      
      // 构建增量反馈消息
      if (updatedFields.length > 0) {
        setFeedback({
          text: "已根据补充信息，",
          fields: updatedFields,
          suffix: "栏已更新。请核对所有信息是否完整",
        });
      } else {
        setFeedback(result.message);
      }
    },
    onError: (error: Error) => {
      setFeedback(error.message || "提取信息时出错");
    },
  });

  // 保存客户 mutation
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
    onSuccess: async () => {
      // 立即刷新客户列表
      await queryClient.invalidateQueries({ queryKey: ["customers-list"] });
      await queryClient.refetchQueries({ queryKey: ["customers-list"] });
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });
      // 清空表单，准备添加下一位客户
      setInputText("");
      setExtractCount(0);
      setExtractedData({
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
      });
      setDuplicateConfirm(null);
      setFeedback("客户档案已保存，你可以继续添加下一位客户");
    },
    onError: (error: Error) => {
      setFeedback(error.message || "保存失败");
    },
  });

  const handleExtract = () => {
    if (!inputText.trim()) {
      setFeedback("请先输入客户信息");
      return;
    }
    extractMutation.mutate(inputText.trim());
  };

  const handleClear = () => {
    setInputText("");
    setExtractCount(0);
    setExtractedData({
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
    });
    setFeedback("");
    setDuplicateConfirm(null);
  };

  // 校验姓名是否完整（至少2个字符）
  const validateNameComplete = (name: string): boolean => {
    return name.trim().length >= 2;
  };

  // 检查是否存在同名同昵称客户（用于判断是否为同一人）
  const findDuplicateCustomer = (name: string, nickname: string): CustomerRecord | undefined => {
    return customers.find((c) => {
      const nameMatch = c.name === name.trim();
      const nicknameMatch = c.nickname === (nickname.trim() || undefined);
      // 姓名相同且昵称也相同（或都为空）才算是同一人
      return nameMatch && nicknameMatch;
    });
  };

  const handleSave = () => {
    const name = extractedData.name.trim();
    const nickname = extractedData.nickname.trim();
    
    // 1. 校验姓名是否存在
    if (!name) {
      setFeedback({
        text: "客户姓名是必填信息，",
        fields: ["姓名"],
        suffix: "尚未填写。请在下方输入框中补充客户姓名，如：客户叫王伟",
      });
      return;
    }
    
    // 2. 校验姓名是否完整（不少于2个字）
    if (!validateNameComplete(name)) {
      setFeedback({
        text: '当前姓名为"',
        fields: [name],
        suffix: '"，似乎不完整。请补充完整姓名以便后续准确识别这位客户，例如输入：客户全名是王建国',
      });
      return;
    }
    
    // 3. 检查重复客户（如果尚未确认过）
    // 只检查姓名相同的情况，不管昵称是否相同
    const existingSameName = customers.find((c) => c.name === name);
    const isTrulyDuplicate = findDuplicateCustomer(name, nickname);
    
    if (existingSameName && isTrulyDuplicate && !(duplicateConfirm?.name === name && duplicateConfirm?.confirmed)) {
      setDuplicateConfirm({ name, confirmed: false });
      setFeedback({
        text: '检测到已有名为"',
        fields: [name],
        suffix: `"的客户（${existingSameName.nickname ? existingSameName.nickname + '，' : ''}创建于 ${existingSameName.created_at ? new Date(existingSameName.created_at).toLocaleDateString() : '未知'}）。如为同一人请前往客户中心更新；如确认为另一位同名客户，请补充昵称信息并交给助手整理后，再次点击保存`,
      });
      return;
    }
    
    // 清除确认状态并保存
    setDuplicateConfirm(null);
    saveMutation.mutate(extractedData);
  };

  // 检查是否有任何字段被填充
  const hasAnyExtractedData = Object.values(extractedData).some((v) => v.trim() !== "");
  const { title: archiveTitle, icon: archiveIcon } = getArchiveCardTitle(extractCount);

  return (
    <div className="space-y-6">
      {/* 页面标题 - 全宽 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/customers")}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">添加客户档案</h1>
          <p className="text-sm text-slate-500">描述客户信息，让助手帮你整理成结构化档案</p>
        </div>
      </div>

      {/* 主内容网格 - 手机端添加底部padding给固定区域留空间 */}
      <div className="grid gap-6 pb-16 lg:grid-cols-[1fr_320px] lg:items-start lg:pb-0">
        {/* 左侧内容 */}
        <div className="flex flex-col gap-6">
          {/* 信息引导区或档案展示区 - 根据是否有提取数据动态切换 */}
          {hasAnyExtractedData ? (
            <Card className="border-[#B8894A]/20 bg-[#FFF8EE]/80 backdrop-blur-sm">
              <CardContent className="p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#B8894A]/15">
                      {archiveIcon}
                    </div>
                    <span className="font-medium text-slate-900">{archiveTitle}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="h-8 rounded-full text-slate-500 hover:text-slate-700"
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    清空
                  </Button>
                </div>
                
                <div className="grid gap-3 md:grid-cols-2">
                  {customerFields.map((field) => (
                    <div
                      key={field.key}
                      className="flex items-start gap-3 rounded-xl bg-white/60 p-3"
                    >
                      <Badge
                        variant="secondary"
                        className={`shrink-0 rounded-md ${
                          field.required 
                            ? "bg-rose-100 text-rose-700" 
                            : "bg-[#B8894A]/10 text-[#8B6914]"
                        }`}
                      >
                        {field.label}
                        {field.required && <span className="ml-0.5">*</span>}
                      </Badge>
                      <span className={`text-sm ${
                        extractedData[field.key] 
                          ? "text-slate-700" 
                          : "text-slate-400 italic"
                      }`}>
                        {extractedData[field.key] || "待填写"}
                      </span>
                    </div>
                  ))}
                </div>
                
                {feedback && (
                  <div className="mt-4 text-sm text-slate-600">
                    {typeof feedback === 'string' ? (
                      feedback
                    ) : (
                      <>
                        {feedback.text}
                        {feedback.fields.map((field, idx) => (
                          <span key={idx}>
                            <span className="font-bold text-slate-900">"{field}"</span>
                            {idx < feedback.fields.length - 1 ? '、' : ''}
                          </span>
                        ))}
                        {feedback.suffix}
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <InfoGuidanceCard />
          )}

        {/* 文本输入区 */}
        <Card className="flex-1 border-slate-200/70 bg-white/90 backdrop-blur-sm">
          <CardContent className="flex h-full flex-col p-6">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#0F766E]" />
              <label className="text-base font-medium text-slate-900">
                输入客户信息
              </label>
              <span className="text-xs text-slate-400">
                添加、补充、修正待保存的客户信息，都在这里输入，助手会为你整理
              </span>
            </div>
            <Textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="请描述客户的基本信息，例如：&#10;姓名、年龄、职业、家庭情况、财富状况、投资偏好、沟通习惯等...&#10;&#10;示例：王敏，35岁，软件工程师，已婚有一个5岁孩子，家庭年收入50万左右，对基金投资比较感兴趣，平时喜欢通过微信沟通"
              className="min-h-[200px] flex-1 resize-none rounded-2xl border-slate-200/80 bg-slate-50/50 p-4 text-base leading-relaxed placeholder:text-slate-400"
            />

            {/* 操作按钮区 */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={handleClear}
                className="rounded-full border-slate-300 bg-transparent px-5"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                清空输入框
              </Button>

              <Button
                onClick={handleExtract}
                disabled={extractMutation.isPending || !inputText.trim()}
                className="rounded-full bg-[#0F766E] px-5 text-white hover:bg-[#0B5F59]"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {extractMutation.isPending ? "正在整理..." : "交给助手整理"}
              </Button>

              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending || !extractedData.name.trim()}
                className="rounded-full bg-[#123B5D] px-5 text-white hover:bg-[#0E2E49] disabled:opacity-50"
                title={!extractedData.name.trim() 
                  ? "请先填写客户姓名" 
                  : extractedData.name.trim().length < 2 
                    ? "姓名不完整，请补充完整后保存" 
                    : ""}
              >
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "保存中..." : "保存客户档案"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

        {/* 右侧客户列表边栏 - 桌面端 */}
        <Card className="hidden h-full border-slate-200/50 bg-[#F7F5F2]/80 backdrop-blur-sm lg:flex lg:flex-col">
          <CardContent className="flex h-full flex-col p-0">
            <div className="border-b border-[#E8E4DE] bg-[#EFEBE6]/50 p-4">
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

      {/* 底部现有客户区域 - 手机端可折叠 */}
      <Card className="fixed inset-x-4 bottom-4 z-40 border-slate-200/50 bg-[#F7F5F2]/95 backdrop-blur-sm lg:hidden">
        {/* 折叠状态：点击展开 */}
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

        {/* 展开状态：显示客户列表 */}
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
