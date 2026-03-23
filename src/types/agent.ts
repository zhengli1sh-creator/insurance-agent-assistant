export type AgentRole = "assistant" | "user";
export type AgentMood = "鼓舞" | "安慰" | "执行";
export type ChatRequestMode = "chat" | "workflow";

export interface AgentPreviewAction {
  label: string;
  command?: string;
  draft?: string;
  continuationContext?: string;
  workflow?: AssistantWorkflowDirective;
  variant?: "primary" | "secondary";
}


export interface AgentActionPreview {
  title: string;
  description: string;
  items: string[];
  requiresConfirmation: boolean;
  confirmCommand?: string;
  actions?: AgentPreviewAction[];
}


export interface AgentMessage {
  id: string;
  role: AgentRole;
  content: string;
  timestamp: string;
  mood: AgentMood;
  preview?: AgentActionPreview;
}

export interface VisitWorkflowDraftValues {
  customerId?: string;
  name?: string;
  nickName?: string;
  timeVisit?: string;
  location?: string;
  corePain?: string;
  briefContent?: string;
  followWork?: string;
  methodCommunicate?: string;
}

export interface VisitWorkflowDraftSeed {
  id: string;
  values: VisitWorkflowDraftValues;
  assistantNote?: string;
}

export interface ActivityWorkflowParticipantDraftValues {
  customerId?: string;
  name?: string;
  nickName?: string;
  followWork?: string;
}

export interface ActivityWorkflowDraftValues {
  nameActivity?: string;
  dateActivity?: string;
  locationActivity?: string;
  customerProfile?: string;
  effectProfile?: string;
  lessonsLearned?: string;
  participants?: ActivityWorkflowParticipantDraftValues[];
}

export interface ActivityWorkflowDraftSeed {
  id: string;
  values: ActivityWorkflowDraftValues;
  assistantNote?: string;
}

export interface WorkflowSeedField {
  label: string;
  value: string;
}

export interface CustomerWorkflowDraftValues {
  name?: string;
  nickname?: string;
  age?: string;
  sex?: string;
  profession?: string;
  familyProfile?: string;
  wealthProfile?: string;
  source?: string;
  coreInteresting?: string;
  preferCommunicate?: string;
  recentMoney?: string;
  remark?: string;
}



export interface CustomerWorkflowDraftSeed {
  id: string;
  values: CustomerWorkflowDraftValues;
  assistantNote?: string;
  suggestedFields?: WorkflowSeedField[];
  resumeVisitSeed?: VisitWorkflowDraftSeed | null;
}

export interface AssistantSecondaryAction {
  label: string;
  href: string;
}

export interface AssistantLauncherState {
  mood: AgentMood;
  title: string;
  description: string;
  suggestion: string;
  secondaryAction?: AssistantSecondaryAction;
}

export type AssistantSurface = "visit" | "activities" | "customers" | "tasks" | "unknown";

export interface AssistantWorkflowDirective {
  preferredSurface: AssistantSurface;
  presentation: "primary" | "secondary";
  launcher: AssistantLauncherState;
  visitSeed?: VisitWorkflowDraftSeed | null;
  activitySeed?: ActivityWorkflowDraftSeed | null;
  customerSeed?: CustomerWorkflowDraftSeed | null;
}

export interface ChatResponse {
  reply: string;
  mood: AgentMood;
  preview?: AgentActionPreview | null;
  error?: string;
  workflow?: AssistantWorkflowDirective;
}
