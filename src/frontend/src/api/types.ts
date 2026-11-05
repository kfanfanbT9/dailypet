// Backend /api/* 요청·응답 타입 (ARCHITECTURE.md 4.2, phase2_task.md). 목(MSW)도 이 타입을 거쳐 만든다.

export type Species = "dog" | "cat";
export type AgeGroup = "junior" | "adult" | "senior";
export type TaskCategory = "diet" | "activity" | "health" | "custom";
export type Signal = "like" | "dislike" | "complete" | "swap" | "remove" | "custom";

export interface ApiErrorBody {
  error: { code: string; message: string; fields?: { field: string }[] };
}

export interface Me {
  user_id: string;
  email: string;
  nickname: string;
  created_at?: string;
}

export interface DefaultTimes {
  meal?: string[];
  walk?: string[];
}

export interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: Species;
  breed: string;
  sex: "male" | "female" | null;
  neutered: boolean;
  size: "small" | "medium" | "large" | null;
  birth_date: string;
  weight_kg: number | null;
  activity_level: "low" | "normal" | "high" | null;
  allergies: string[];
  conditions: string[];
  memo: string;
  default_times: DefaultTimes;
  created_at: string;
  age_group: AgeGroup;
  tasks_outdated?: boolean;
}

export interface HealthHistoryInput {
  catalog_item_id: string;
  last_done_date: string;
  dose_no?: number;
}

export interface PetInput {
  name: string;
  species: Species;
  birth_date: string;
  weight_kg: number;
  breed?: string;
  sex?: "male" | "female" | null;
  neutered?: boolean;
  size?: "small" | "medium" | "large" | null;
  activity_level?: "low" | "normal" | "high" | null;
  allergies?: string[];
  conditions?: string[];
  memo?: string;
  default_times?: DefaultTimes;
  health_history?: HealthHistoryInput[];
}

export interface Task {
  id: string;
  user_id: string;
  pet_id: string;
  date: string;
  time: string | null;
  category: TaskCategory;
  source: "auto" | "chat" | "custom";
  catalog_item_id: string | null;
  health_event_id: string | null;
  title: string;
  done: boolean;
  reason?: string | null;
  rank?: number | null;
  relaxed?: string[];
}

export interface TasksResponse {
  date: string;
  tasks: Task[];
  notice?: string;
  retryable?: boolean;
}

export interface SwapResponse {
  swapped: boolean;
  task: Task;
  notice?: string;
  replaced?: string;
}

export type HealthStatus = "scheduled" | "done" | "overdue" | "needs_history";

export interface HealthEvent {
  id: string;
  pet_id: string;
  catalog_item_id: string;
  type: string;
  dose_no: number | null;
  due_date: string;
  status: HealthStatus;
  completed_date: string | null;
  name: string;
  d_day: number;
}

export interface HealthEventsResponse {
  needs_history: HealthEvent[];
  upcoming: HealthEvent[];
  done: HealthEvent[];
}

export interface HealthUpdateResponse {
  event: HealthEvent;
  next: HealthEvent | null;
}

export type NotificationKind = "overdue" | "today" | "d1" | "d7";

export interface NotificationItem {
  event_id: string;
  pet_id: string;
  pet_name: string;
  catalog_item_id: string;
  name: string;
  dose_no: number | null;
  due_date: string;
  d_day: number;
  kind: NotificationKind;
}

export interface WeightLog {
  id: string;
  pet_id: string;
  date: string;
  weight_kg: number;
}

export interface WeightSaveResponse {
  weight: WeightLog;
  pet_weight_kg: number;
  tasks_outdated: boolean;
}

export interface Preference {
  id: string;
  pet_id: string | null;
  kind: "like" | "dislike" | "constraint";
  target: string;
  note: string;
  score: number;
  excluded_until: string | null;
  updated_at: string;
  scope: "pet" | "all_pets";
  item_name: string | null;
  excluded_now?: boolean;
}

export interface FrequentItem {
  catalog_item_id: string;
  item_name: string | null;
  count: number;
}

export interface PreferencesResponse {
  like: Preference[];
  dislike: Preference[];
  constraint: Preference[];
  frequent?: FrequentItem[];
}

export interface CatalogItem {
  item_id: string;
  name: string;
  category: "diet" | "activity" | "health";
  species: Species[];
  intensity: string | null;
  subtype: string | null;
  summary: string;
  type?: string | null;
  allergens?: string[];
  contraindications?: string[];
}

export interface TraceEvent {
  step: number;
  type: "handoff" | "tool_call" | "tool_result" | "guardrail" | "interrupt" | "error" | "final";
  [key: string]: unknown;
}

export interface ChatResponse {
  answer: string;
  contexts: string[];
  trace: TraceEvent[];
  thread_id: string | null;
}

export type Decision =
  | { type: "approve" }
  | { type: "edit"; edited_action: { name: string; args: Record<string, unknown> } }
  | { type: "reject"; message?: string };

export interface ThreadSummary {
  thread_id: string;
  started_at: string;
  last_at: string;
  title: string;
  count: number;
}

export interface ThreadDetail {
  thread_id: string;
  pet_id: string;
  messages: { question: string; answer: string; trace: TraceEvent[]; created_at: string }[];
}
