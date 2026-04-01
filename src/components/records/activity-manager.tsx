"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, FolderHeart, RefreshCcw, UserRoundPlus } from "lucide-react";
import { useMemo, useState } from "react";

import {
  CustomerProfileFields,
  emptyCustomerProfileForm,
  type CustomerProfileFormValue,
} from "@/components/customers/customer-profile-fields";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { customers as demoCustomers, records as demoRecords } from "@/lib/demo-data";
import { fetchJson } from "@/lib/crm-api";
import type { ActivityWorkflowDraftSeed } from "@/types/agent";
import type { ActivityRecordEntity } from "@/types/activity";
import type { CustomerRecord } from "@/types/customer";

type CustomerOption = {
  id: string;
  name: string;
  nickname: string;
};

type ParticipantFormItem = {
  rowId: string;
  customerId: string;
  name: string;
  nickName: string;
  followWork: string;
};

type ActivityFormState = {
  nameActivity: string;
  dateActivity: string;
  locationActivity: string;
  customerProfile: string;
  effectProfile: string;
  lessonsLearned: string;
  participants: ParticipantFormItem[];
};

type SaveActivityVariables = {
  form: ActivityFormState;
  editingId: string;
  resumed?: boolean;
};

type ResumeContext = {
  form: ActivityFormState;
  editingId: string;
  participantRowId: string;
};

type ResolvedParticipant = {
  customerId: string;
  name: string;
  nickName: string;
  followWork: string;
};

type FeedbackTone = "info" | "success" | "warning";

type ParticipantResolution =

  | { status: "resolved"; participant: ResolvedParticipant }
  | { status: "missing_name"; message: string }
  | { status: "ambiguous"; message: string }
  | { status: "not_found"; message: string };

type ActivityManagerProps = {
  variant?: "full" | "embedded";
  source?: "assistant-home" | "assistant-task" | "records";
  draftSeed?: ActivityWorkflowDraftSeed | null;
  expandHref?: string;
  onSaved?: (message: string) => void;
};


function createParticipantRow(patch?: Partial<ParticipantFormItem>): ParticipantFormItem {
  return {
    rowId: `participant-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    customerId: "",
    name: "",
    nickName: "",
    followWork: "",
    ...patch,
  };
}

function createEmptyForm(initialValues?: ActivityWorkflowDraftSeed["values"] | null): ActivityFormState {
  return {
    nameActivity: initialValues?.nameActivity ?? "",
    dateActivity: initialValues?.dateActivity ?? "",
    locationActivity: initialValues?.locationActivity ?? "",
    customerProfile: initialValues?.customerProfile ?? "",
    effectProfile: initialValues?.effectProfile ?? "",
    lessonsLearned: initialValues?.lessonsLearned ?? "",
    participants:
      initialValues?.participants && initialValues.participants.length > 0
        ? initialValues.participants.map((item) =>
            createParticipantRow({
              customerId: item.customerId ?? "",
              name: item.name ?? "",
              nickName: item.nickName ?? "",
              followWork: item.followWork ?? "",
            }),
          )
        : [createParticipantRow()],
  };
}

function cloneFormState(form: ActivityFormState): ActivityFormState {
  return {
    ...form,
    participants: form.participants.map((item) => ({ ...item })),
  };
}

function normalizeOptionalText(value: string | null | undefined) {
  return (value ?? "").trim();
}

function getFeedbackToneClassName(tone: FeedbackTone) {
  switch (tone) {
    case "success":
      return "advisor-notice-card-success";
    case "warning":
      return "advisor-notice-card-warning";
    default:
      return "advisor-notice-card-info";
  }
}

function getActivityInputClassName() {
  return "advisor-form-control h-11 rounded-2xl focus-visible:ring-0";
}

function getActivityTextareaClassName(minHeightClassName = "min-h-24") {
  return `advisor-form-control advisor-form-textarea ${minHeightClassName} rounded-[24px] focus-visible:ring-0`;
}

function findExactCustomerMatch(

  participant: Pick<ParticipantFormItem, "name" | "nickName">,
  options: CustomerOption[],
) {
  const name = participant.name.trim();
  const nickName = normalizeOptionalText(participant.nickName);

  if (!name) {
    return null;
  }

  const matches = options.filter(
    (item) => item.name.trim() === name && normalizeOptionalText(item.nickname) === nickName,
  );

  return matches.length === 1 ? matches[0] : null;
}

function resolveParticipant(participant: ParticipantFormItem, options: CustomerOption[]): ParticipantResolution {
  const normalizedName = participant.name.trim();
  const normalizedNickName = normalizeOptionalText(participant.nickName);
  const normalizedFollowWork = participant.followWork.trim();

  if (participant.customerId) {
    const selectedCustomer = options.find((item) => item.id === participant.customerId);
    return {
      status: "resolved",
      participant: {
        customerId: participant.customerId,
        name: selectedCustomer?.name ?? normalizedName,
        nickName: selectedCustomer?.nickname ?? normalizedNickName,
        followWork: normalizedFollowWork,
      },
    };
  }

  if (!normalizedName) {
    return { status: "missing_name", message: "请先填写参加活动客户的姓名，或直接选择已有客户档案。" };
  }

  const exactMatch = findExactCustomerMatch(participant, options);
  if (exactMatch) {
    return {
      status: "resolved",
      participant: {
        customerId: exactMatch.id,
        name: exactMatch.name,
        nickName: exactMatch.nickname,
        followWork: normalizedFollowWork,
      },
    };
  }

  const sameNameCandidates = options.filter((item) => item.name.trim() === normalizedName);
  if (sameNameCandidates.length > 0) {
    return {
      status: "ambiguous",
      message:
        sameNameCandidates.length > 1
          ? `客户“${normalizedName}”存在多条档案，请补充客户昵称或直接选择已有客户。`
          : `已存在名为“${normalizedName}”的客户档案，请补充昵称或直接选择该客户。`,
    };
  }

  return {
    status: "not_found",
    message: `还没有“${normalizedName}”的客户资料。请先补齐，我会继续保存这场活动。`,
  };
}


function buildParticipantsForSave(form: ActivityFormState, options: CustomerOption[]) {
  return form.participants.map((participant) => {
    const resolution = resolveParticipant(participant, options);
    if (resolution.status !== "resolved") {
      throw new Error(resolution.message);
    }

    return resolution.participant;
  });
}

export function ActivityManager({
  variant = "full",
  source = "records",
  draftSeed = null,
  expandHref = "/records?tab=activities",
  onSaved,
}: ActivityManagerProps) {

  const embedded = variant === "embedded";
  const initialDraftValues = draftSeed?.values ?? null;
  const initialAssistantNote = draftSeed?.assistantNote ?? "";
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ActivityFormState>(() => createEmptyForm(initialDraftValues));
  const [editingId, setEditingId] = useState("");
  const [feedback, setFeedback] = useState(() => initialAssistantNote);
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>(initialAssistantNote ? "info" : "success");
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState<CustomerProfileFormValue>({ ...emptyCustomerProfileForm });
  const [resumeContext, setResumeContext] = useState<ResumeContext | null>(null);

  const customersQuery = useQuery({ queryKey: ["customers-options"], queryFn: () => fetchJson<CustomerRecord[]>("/api/customers") });
  const activitiesQuery = useQuery({ queryKey: ["activities-crm"], queryFn: () => fetchJson<ActivityRecordEntity[]>("/api/activities") });

  const fallbackCustomers = useMemo<CustomerOption[]>(
    () => demoCustomers.map((item) => ({ id: item.id, name: item.name, nickname: "" })),
    [],
  );

  const customerOptions = customersQuery.isError
    ? fallbackCustomers
    : (customersQuery.data ?? []).map((item) => ({ id: item.id, name: item.name, nickname: item.nickname ?? "" }));

  const fallbackActivities = useMemo(
    () =>
      demoRecords
        .filter((item) => item.kind === "活动")
        .map((item) => ({
          id: item.id,
          owner_id: "demo",
          sys_platform: "demo",
          uuid: `activity-${item.id}`,
          bstudio_create_time: "",
          name_activity: item.title,
          date_activity: item.happenedAt.slice(0, 10),
          location_activity: "",
          customer_profile: "",
          effect_profile: item.summary,
          lessons_learned: item.tone,
          created_at: "",
          updated_at: "",
          activity_participants: item.customerNames.map((name) => ({
            customer_id: name,
            name,
            nick_name: null,
            follow_work: item.followUps.join("；"),
            customer: { id: name, name, nickname: null },
          })),
        })),
    [],
  );

  const activities = activitiesQuery.isError ? fallbackActivities : activitiesQuery.data ?? [];
  const assistantTaskMode = embedded && source === "assistant-task";
  const visibleActivities = assistantTaskMode ? [] : embedded ? activities.slice(0, 2) : activities;
  const originBadgeLabel = assistantTaskMode ? "" : source === "assistant-home" ? "来自助手" : "";


  const saveMutation = useMutation({

    mutationFn: (variables: SaveActivityVariables) => {
      const participants = buildParticipantsForSave(variables.form, customerOptions);
      return fetchJson<ActivityRecordEntity>("/api/activities", {
        method: variables.editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(variables.editingId ? { id: variables.editingId } : {}),
          nameActivity: variables.form.nameActivity,
          dateActivity: variables.form.dateActivity,
          locationActivity: variables.form.locationActivity,
          customerProfile: variables.form.customerProfile,
          effectProfile: variables.form.effectProfile,
          lessonsLearned: variables.form.lessonsLearned,
          participants,
        }),
      });
    },
    onSuccess: (_, variables) => {
      const successMessage = variables.resumed
        ? "客户档案已保存，并已继续完成刚才的客户活动记录"
        : variables.editingId
          ? "活动记录已更新"
          : "活动记录已保存";
      setFeedback(successMessage);
      setFeedbackTone("success");
      setEditingId("");
      setForm(createEmptyForm());
      setResumeContext(null);
      queryClient.invalidateQueries({ queryKey: ["activities-crm"] });
      queryClient.invalidateQueries({ queryKey: ["tasks-live"] });
      onSaved?.(successMessage);
    },

    onError: (error) => {
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: (payload: CustomerProfileFormValue) =>
      fetchJson<CustomerRecord>("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers-crm"] });
      queryClient.invalidateQueries({ queryKey: ["customers-options"] });

      const resumed = resumeContext;
      if (!resumed) {
        setCustomerSheetOpen(false);
        setCustomerForm({ ...emptyCustomerProfileForm });
        setFeedback("客户档案已创建");
        setFeedbackTone("success");
        return;
      }

      const nextForm = cloneFormState(resumed.form);
      nextForm.participants = nextForm.participants.map((item) =>
        item.rowId === resumed.participantRowId
          ? {
              ...item,
              customerId: customer.id,
              name: customer.name,
              nickName: customer.nickname ?? item.nickName,
            }
          : item,
      );

      setForm(nextForm);
      setEditingId(resumed.editingId);
      setCustomerSheetOpen(false);
      setCustomerForm({ ...emptyCustomerProfileForm });
      setFeedback("客户档案已保存，正在继续完成刚才的活动记录…");
      setFeedbackTone("success");
      saveMutation.mutate({ form: nextForm, editingId: resumed.editingId, resumed: true });
    },
    onError: (error) => {
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchJson<{ id: string }>(`/api/activities?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      setFeedback("活动记录已删除");
      setFeedbackTone("success");
      queryClient.invalidateQueries({ queryKey: ["activities-crm"] });
    },
    onError: (error) => {
      setFeedback(error.message);
      setFeedbackTone("warning");
    },
  });

  function patchCustomerForm(patch: Partial<CustomerProfileFormValue>) {
    setCustomerForm((current) => ({ ...current, ...patch }));
  }

  function patchForm(patch: Partial<ActivityFormState>) {
    setForm((current) => ({ ...current, ...patch }));
  }

  function addParticipant() {
    setForm((current) => ({ ...current, participants: [...current.participants, createParticipantRow()] }));
  }

  function updateParticipant(rowId: string, patch: Partial<ParticipantFormItem>) {
    setForm((current) => ({
      ...current,
      participants: current.participants.map((item) => (item.rowId === rowId ? { ...item, ...patch } : item)),
    }));
  }

  function syncParticipantSelection(rowId: string, customerId: string) {
    const customer = customerOptions.find((item) => item.id === customerId);
    updateParticipant(rowId, {
      customerId,
      name: customer?.name ?? "",
      nickName: customer?.nickname ?? "",
    });
  }

  function handleParticipantNameChange(rowId: string, value: string) {
    const participant = form.participants.find((item) => item.rowId === rowId);
    const selectedCustomer = customerOptions.find((item) => item.id === participant?.customerId);
    const shouldClearSelection = !!selectedCustomer && value.trim() !== selectedCustomer.name;

    updateParticipant(rowId, {
      name: value,
      customerId: shouldClearSelection ? "" : participant?.customerId ?? "",
    });
  }

  function handleParticipantNickNameChange(rowId: string, value: string) {
    const participant = form.participants.find((item) => item.rowId === rowId);
    const selectedCustomer = customerOptions.find((item) => item.id === participant?.customerId);
    const shouldClearSelection = !!selectedCustomer && normalizeOptionalText(value) !== normalizeOptionalText(selectedCustomer.nickname);

    updateParticipant(rowId, {
      nickName: value,
      customerId: shouldClearSelection ? "" : participant?.customerId ?? "",
    });
  }

  function removeParticipant(rowId: string) {
    setForm((current) => {
      const next = current.participants.filter((item) => item.rowId !== rowId);
      return { ...current, participants: next.length > 0 ? next : [createParticipantRow()] };
    });
  }

  function resetForm() {
    setEditingId("");
    setForm(createEmptyForm());
    setFeedback("");
    setFeedbackTone("info");
    setResumeContext(null);
    setCustomerSheetOpen(false);
    setCustomerForm({ ...emptyCustomerProfileForm });
  }

  function openCustomerSheetForParticipant(participant: ParticipantFormItem, sourceForm?: ActivityFormState, sourceEditingId?: string) {
    const draft = cloneFormState(sourceForm ?? form);
    setResumeContext({
      form: draft,
      editingId: sourceEditingId ?? editingId,
      participantRowId: participant.rowId,
    });
    setCustomerForm({
      ...emptyCustomerProfileForm,
      name: participant.name.trim(),
      nickname: participant.nickName.trim(),
      recentMoney: draft.nameActivity.trim(),
      coreInteresting: draft.customerProfile.trim(),
    });
    setCustomerSheetOpen(true);
    setFeedback("请先补客户信息，保存后会继续当前活动。");
    setFeedbackTone("warning");
  }


  function submitActivity() {
    const draft = cloneFormState(form);

    for (const participant of draft.participants) {
      const resolution = resolveParticipant(participant, customerOptions);
      if (resolution.status === "resolved") {
        continue;
      }

      if (resolution.status === "not_found") {
        openCustomerSheetForParticipant(participant, draft, editingId);
        setFeedback(resolution.message);
        setFeedbackTone("warning");
        return;
      }

      setFeedback(resolution.message);
      setFeedbackTone("warning");
      return;
    }

    saveMutation.mutate({ form: draft, editingId });
  }

  function startEdit(record: ActivityRecordEntity) {
    setEditingId(record.id);
    setResumeContext(null);
    setCustomerSheetOpen(false);
    setCustomerForm({ ...emptyCustomerProfileForm });
    setForm({
      nameActivity: record.name_activity,
      dateActivity: record.date_activity,
      locationActivity: record.location_activity ?? "",
      customerProfile: record.customer_profile ?? "",
      effectProfile: record.effect_profile ?? "",
      lessonsLearned: record.lessons_learned ?? "",
      participants:
        (record.activity_participants ?? []).map((item) =>
          createParticipantRow({
            customerId: item.customer_id,
            name: item.name,
            nickName: item.nick_name ?? "",
            followWork: item.follow_work ?? "",
          }),
        ) || [createParticipantRow()],
    });

    if (embedded && typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const resumeParticipant = resumeContext
    ? resumeContext.form.participants.find((item) => item.rowId === resumeContext.participantRowId) ?? null
    : null;

  const formCardTone = embedded ? "advisor-soft-card" : "glass-panel advisor-glass-surface";
  const primaryActionClassName = "advisor-primary-button cursor-pointer rounded-full text-white transition-all duration-200 hover:brightness-[1.03] disabled:shadow-none";
  const outlineActionClassName = "advisor-outline-button cursor-pointer rounded-full";



  return (
    <>
      <div className={embedded ? "space-y-4" : "grid gap-6 xl:grid-cols-[0.95fr_1.05fr]"}>
        <Card className={formCardTone}>
          <CardHeader className={assistantTaskMode ? "pb-3" : undefined}>
            <div className="flex flex-col gap-3">
              {!assistantTaskMode && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="advisor-chip-info rounded-full border-0 px-3 py-1">客户活动</Badge>
                  {originBadgeLabel && <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">{originBadgeLabel}</Badge>}
                  {resumeContext && <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">待继续</Badge>}
                </div>
              )}

              <div>
                <CardTitle className={assistantTaskMode ? "text-2xl text-slate-900" : "text-lg text-slate-900"}>
                  {editingId ? (assistantTaskMode ? "修改活动" : "继续修改这场活动") : assistantTaskMode ? "补录活动" : embedded ? "记录这场活动" : "新增活动"}
                </CardTitle>
                <p className="mt-2 text-sm text-slate-500">
                  {assistantTaskMode ? "确认活动信息和参加客户即可。" : "如果还没有客户资料，会先帮你补齐，再继续保存这场活动。"}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {embedded && !assistantTaskMode && (
              <div className="advisor-notice-card advisor-notice-card-info rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="advisor-chip-info rounded-full px-3 py-1">1. 填活动</span>
                  <span className="advisor-chip-info rounded-full px-3 py-1">2. 核对客户</span>
                  <span className="advisor-chip-info rounded-full px-3 py-1">3. 写后续</span>
                </div>
                <p className="mt-3">先把这场活动记下来。保存后，如果你想回看历史或统一整理名单，也可以进入活动记录。</p>
              </div>
            )}

            {resumeContext && (
              <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <RefreshCcw className="h-4 w-4 text-[var(--advisor-gold)]" />
                  刚才的内容已保留
                </div>
                <p className="mt-2">补完客户信息后，会继续保存这场活动，不需要重新填写。</p>
              </div>
            )}



            <Input value={form.nameActivity} onChange={(event) => patchForm({ nameActivity: event.target.value })} placeholder="活动名称（必填）" className={getActivityInputClassName()} />
            <div className={embedded ? "grid gap-4 md:grid-cols-2" : "space-y-4"}>
              <Input value={form.dateActivity} onChange={(event) => patchForm({ dateActivity: event.target.value })} type="date" className={getActivityInputClassName()} />
              <Input value={form.locationActivity} onChange={(event) => patchForm({ locationActivity: event.target.value })} placeholder="活动地点" className={getActivityInputClassName()} />
            </div>
            <Textarea value={form.customerProfile} onChange={(event) => patchForm({ customerProfile: event.target.value })} placeholder="目标客群画像" className={getActivityTextareaClassName()} />
            <Textarea value={form.effectProfile} onChange={(event) => patchForm({ effectProfile: event.target.value })} placeholder="活动效果" className={getActivityTextareaClassName("min-h-28")} />
            <Textarea value={form.lessonsLearned} onChange={(event) => patchForm({ lessonsLearned: event.target.value })} placeholder="经验教训" className={getActivityTextareaClassName()} />

            <div className="advisor-soft-card rounded-[24px] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{assistantTaskMode ? "参加客户" : "活动和参加客户"}</p>
                  <p className="mt-1 text-sm text-slate-500">{assistantTaskMode ? "可直接选择已有客户，或先填写姓名。" : "可直接选择已有客户；如果还没有客户资料，也可以先填写姓名和昵称，保存时会继续引导你补齐。"}</p>
                </div>
                <Button type="button" variant="outline" onClick={addParticipant} className={outlineActionClassName}>
                  新增参加客户
                </Button>
              </div>

              <div className="mt-3 space-y-4">
                {form.participants.map((participant, index) => {
                  const selectedCustomer = customerOptions.find((item) => item.id === participant.customerId) ?? null;
                  return (
                    <div key={participant.rowId} className="advisor-list-item-card rounded-[24px] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">参加客户 {index + 1}</p>
                        <Button type="button" variant="outline" onClick={() => removeParticipant(participant.rowId)} className={outlineActionClassName}>
                          移除
                        </Button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <select
                          value={participant.customerId}
                          onChange={(event) => syncParticipantSelection(participant.rowId, event.target.value)}
                          className="advisor-form-control advisor-form-select h-11 w-full rounded-2xl text-sm text-slate-700 focus-visible:ring-0 md:col-span-2"
                        >
                          <option value="">选择一位已建档客户（可选）</option>
                          {customerOptions.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.nickname ? `${item.name}（${item.nickname}）` : item.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          value={participant.name}
                          onChange={(event) => handleParticipantNameChange(participant.rowId, event.target.value)}
                          placeholder="客户姓名（必填）"
                          className={getActivityInputClassName()}
                        />
                        <Input
                          value={participant.nickName}
                          onChange={(event) => handleParticipantNickNameChange(participant.rowId, event.target.value)}
                          placeholder="客户昵称（可选）"
                          className={getActivityInputClassName()}
                        />
                        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 md:col-span-2">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => openCustomerSheetForParticipant(participant)}
                            className={outlineActionClassName}
                          >
                            <UserRoundPlus className="h-4 w-4" />
                            {assistantTaskMode ? "先补客户信息" : "找不到客户，先保存客户基础信息"}
                          </Button>

                          {selectedCustomer && (
                            <span>
                              已匹配：{selectedCustomer.nickname ? `${selectedCustomer.name}（${selectedCustomer.nickname}）` : selectedCustomer.name}
                            </span>
                          )}
                        </div>
                        <Textarea
                          value={participant.followWork}
                          onChange={(event) => updateParticipant(participant.rowId, { followWork: event.target.value })}
                          placeholder="待办事项，可用换行或分号分隔"
                          className={`${getActivityTextareaClassName()} md:col-span-2`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={submitActivity} disabled={saveMutation.isPending || createCustomerMutation.isPending} className={primaryActionClassName}>
                {saveMutation.isPending ? "正在保存" : editingId ? "保存修改" : embedded ? source === "assistant-task" ? "保存并返回" : "保存这场活动" : "保存活动"}
              </Button>

              <Button variant="outline" onClick={resetForm} className={outlineActionClassName}>
                清空
              </Button>
              {embedded && (
                <Link href={expandHref} className={`${outlineActionClassName} inline-flex items-center gap-2 px-4 py-2 text-sm`}>
                  {assistantTaskMode ? "查看活动记录" : "进入活动记录"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

            </div>

            {feedback && (
              <div className={`advisor-notice-card mt-4 rounded-[22px] px-4 py-3 text-sm leading-6 text-slate-700 ${getFeedbackToneClassName(feedbackTone)}`}>
                {feedback}
              </div>
            )}

          </CardContent>
        </Card>

        {embedded && !assistantTaskMode ? (
          <Card className="glass-panel advisor-glass-surface">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="advisor-chip-warning rounded-full border-0 px-3 py-1">全部活动</Badge>
                <Badge className="advisor-chip-success rounded-full border-0 px-3 py-1">最近活动</Badge>
              </div>
              <CardTitle className="text-lg text-slate-900">需要时再去活动记录</CardTitle>
              <p className="text-sm leading-6 text-slate-500">这里先帮你完成这场活动；如果想回看历史、统一整理名单或继续修改，再去活动记录。</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="advisor-notice-card advisor-notice-card-warning rounded-[24px] p-4 text-sm leading-6 text-slate-700">
                <div className="flex items-center gap-2 font-medium text-slate-900">
                  <FolderHeart className="h-4 w-4 text-[var(--advisor-gold)]" />
                  想回看时再打开
                </div>
                <p className="mt-2">历史对比和统一整理都放在活动记录里，手机上看会更清楚。</p>
              </div>

              {visibleActivities.length === 0 ? (
                <div className="advisor-module-placeholder-card rounded-[24px] p-5 text-sm text-slate-500">还没有活动记录，保存第一场后就能在这里继续查看。</div>
              ) : (
                visibleActivities.map((record) => {
                  const participantSummary = (record.activity_participants ?? [])
                    .map((item) => (item.nick_name ? `${item.name}（${item.nick_name}）` : item.name))
                    .join("、");

                  return (
                    <div key={record.id} className="advisor-record-card rounded-[24px] p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-medium text-slate-900">{record.name_activity}</p>
                          <p className="mt-1 text-sm text-slate-500">{record.date_activity} · {record.location_activity || "待补充地点"}</p>
                        </div>
                        <Button variant="outline" onClick={() => startEdit(record)} className="advisor-outline-button cursor-pointer rounded-full">
                          继续修改
                        </Button>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-700">{record.effect_profile || "待补充活动效果"}</p>
                      <p className="mt-3 text-xs leading-5 text-slate-500">参加客户：{participantSummary || "待补充名单"}</p>
                    </div>
                  );
                })
              )}

              <Link href={expandHref} className="advisor-primary-button inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition hover:brightness-[1.03]">
                去活动记录查看全部内容
                <ArrowRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {visibleActivities.map((record) => {
              const participantSummary = (record.activity_participants ?? [])
                .map((item) => (item.nick_name ? `${item.name}（${item.nick_name}）` : item.name))
                .join("、");

              return (
                <div key={record.id} className="advisor-list-item-card rounded-[28px] p-5">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{record.name_activity}</p>
                      <p className="mt-2 text-sm text-slate-500">活动日期：{record.date_activity} · 地点：{record.location_activity || "待补充"}</p>
                      <p className="mt-1 text-sm text-slate-500">参加客户：{participantSummary || "待补充"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" onClick={() => startEdit(record)} className="advisor-outline-button cursor-pointer rounded-full">编辑</Button>
                      <Button variant="outline" onClick={() => globalThis.confirm("确认删除这条活动记录吗？") && deleteMutation.mutate(record.id)} className="cursor-pointer rounded-full border-rose-200 bg-transparent text-rose-600 hover:bg-rose-50 hover:text-rose-700">删除</Button>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                    <div className="advisor-meta-tile rounded-[24px] p-4">目标客群画像：{record.customer_profile || "待补充"}</div>
                    <div className="advisor-meta-tile rounded-[24px] p-4">活动效果：{record.effect_profile || "待补充"}</div>
                    <div className="advisor-meta-tile rounded-[24px] p-4 md:col-span-2">经验教训：{record.lessons_learned || "待补充"}</div>
                    <div className="advisor-meta-tile rounded-[24px] p-4 md:col-span-2">
                      <p className="font-medium text-slate-900">客户参加活动表</p>
                      <div className="mt-3 space-y-2">
                        {(record.activity_participants ?? []).map((item) => (
                          <div key={`${record.id}-${item.customer_id}`} className="advisor-list-item-card rounded-2xl px-4 py-3">
                            <p className="text-slate-900">{item.nick_name ? `${item.name}（${item.nick_name}）` : item.name}</p>
                            <p className="mt-1 text-sm text-slate-500">待办事项：{item.follow_work || "暂无"}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <Sheet open={customerSheetOpen} onOpenChange={setCustomerSheetOpen}>
        <SheetContent side="bottom" className="advisor-sheet-surface max-h-[92vh] rounded-t-[32px] p-0 sm:max-w-none">
          <div className="overflow-y-auto">
            <SheetHeader className="advisor-sheet-header-surface px-5 py-5">
              <div className="space-y-2">
                <p className="advisor-kicker">Resume workflow</p>
                <SheetTitle className="text-xl text-slate-900">先补客户信息</SheetTitle>
                <SheetDescription className="text-sm leading-6 text-slate-500">保存客户档案后，会自动返回刚才的活动记录，不需要重新填写。</SheetDescription>
              </div>
            </SheetHeader>
            <div className="space-y-4 px-5 py-5">
              <div className="advisor-soft-card rounded-[28px] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-slate-900">
                      <span className="advisor-icon-badge advisor-icon-badge-warning advisor-icon-badge-md">
                        <AlertTriangle className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="advisor-kicker">Pending task</p>
                        <p className="text-base font-medium">当前待完成</p>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-slate-700">
                      保存活动记录：{form.nameActivity || resumeContext?.form.nameActivity || "待填写活动"} · 参加客户：
                      {resumeParticipant?.name || "待填写客户"}
                      {resumeParticipant?.nickName ? `（${resumeParticipant.nickName}）` : ""}
                    </p>
                  </div>
                  <Badge className="advisor-accent-chip rounded-full border-0">支持自动返回</Badge>
                </div>
              </div>

              <div className="advisor-notice-card advisor-notice-card-info rounded-[28px] p-4 text-sm leading-6 text-slate-700">
                先补这位参与客户的基础档案，再继续当前活动草稿。已填写的活动内容会保留，不会丢失。
              </div>

              <CustomerProfileFields value={customerForm} onChange={patchCustomerForm} disabled={createCustomerMutation.isPending} variant="compact" />

              <div className="flex flex-wrap gap-3 pb-5">
                <Button onClick={() => createCustomerMutation.mutate(customerForm)} disabled={createCustomerMutation.isPending} className={`${primaryActionClassName} px-5`}>
                  {createCustomerMutation.isPending ? "正在保存客户档案" : "保存客户档案并继续活动记录"}
                </Button>
                <Button variant="outline" onClick={() => setCustomerSheetOpen(false)} className={outlineActionClassName}>
                  稍后再说
                </Button>
              </div>

            </div>
          </div>
        </SheetContent>
      </Sheet>


    </>
  );
}
