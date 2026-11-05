// /api/* 호출 함수 모음 (wireframe 14장 화면 ↔ API 대응표의 모든 API).
import { request } from "./client";
import type {
  CatalogItem,
  ChatResponse,
  Decision,
  HealthEventsResponse,
  HealthUpdateResponse,
  Me,
  NotificationItem,
  Pet,
  PetInput,
  PreferencesResponse,
  Signal,
  SwapResponse,
  Task,
  TasksResponse,
  ThreadDetail,
  ThreadSummary,
  WeightLog,
  WeightSaveResponse,
} from "./types";

export const auth = {
  me: () => request<Me>("/api/me", { skipAuthRedirect: true }),
  login: (email: string, password: string) =>
    request<Me>("/api/auth/login", { method: "POST", body: { email, password }, skipAuthRedirect: true }),
  signup: (email: string, password: string, nickname: string) =>
    request<Me>("/api/auth/signup", {
      method: "POST",
      body: { email, password, nickname },
      skipAuthRedirect: true,
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST", skipAuthRedirect: true }),
  deleteMe: (confirm_email: string) =>
    request<void>("/api/me", { method: "DELETE", body: { confirm_email } }),
};

export const pets = {
  list: () => request<Pet[]>("/api/pets"),
  get: (id: string) => request<Pet>(`/api/pets/${id}`),
  create: (input: PetInput) => request<Pet>("/api/pets", { method: "POST", body: input }),
  update: (id: string, input: Partial<PetInput>) =>
    request<Pet>(`/api/pets/${id}`, { method: "PUT", body: input }),
  remove: (id: string, confirm_name: string) =>
    request<void>(`/api/pets/${id}`, { method: "DELETE", body: { confirm_name } }),
};

export const tasks = {
  list: (petId: string, date?: string) =>
    request<TasksResponse>(`/api/pets/${petId}/tasks`, { query: { date } }),
  regenerate: (petId: string) =>
    request<TasksResponse>(`/api/pets/${petId}/tasks/generate`, { method: "POST", body: { confirm: true } }),
  add: (petId: string, body: { title?: string; catalog_item_id?: string; time?: string | null }) =>
    request<Task>(`/api/pets/${petId}/tasks`, { method: "POST", body }),
  patch: (taskId: string, body: { done?: boolean; time?: string | null; title?: string }) =>
    request<Task>(`/api/tasks/${taskId}`, { method: "PATCH", body }),
  remove: (taskId: string) => request<void>(`/api/tasks/${taskId}`, { method: "DELETE" }),
  swap: (taskId: string) => request<SwapResponse>(`/api/tasks/${taskId}/swap`, { method: "POST" }),
  feedback: (petId: string, itemId: string | null, signal: Signal) =>
    request<unknown>(`/api/pets/${petId}/feedback`, { method: "POST", body: { itemId, signal } }),
};

export const health = {
  list: (petId: string) => request<HealthEventsResponse>(`/api/pets/${petId}/health-events`),
  complete: (eventId: string, completed_date: string) =>
    request<HealthUpdateResponse>(`/api/health-events/${eventId}/complete`, {
      method: "PATCH",
      body: { completed_date },
    }),
  setDue: (eventId: string, due_date: string) =>
    request<HealthUpdateResponse>(`/api/health-events/${eventId}`, { method: "PATCH", body: { due_date } }),
  setLastDone: (eventId: string, last_done_date: string) =>
    request<HealthUpdateResponse>(`/api/health-events/${eventId}`, {
      method: "PATCH",
      body: { last_done_date },
    }),
  notifications: () => request<NotificationItem[]>("/api/notifications"),
};

export const weights = {
  list: (petId: string) => request<WeightLog[]>(`/api/pets/${petId}/weights`),
  add: (petId: string, date: string, weight_kg: number, overwrite = false) =>
    request<WeightSaveResponse>(`/api/pets/${petId}/weights`, {
      method: "POST",
      body: { date, weight_kg, overwrite },
    }),
  remove: (weightId: string) =>
    request<{ pet_weight_kg: number; tasks_outdated: boolean }>(`/api/weights/${weightId}`, {
      method: "DELETE",
    }),
};

export const preferences = {
  get: (petId: string) => request<PreferencesResponse>(`/api/pets/${petId}/preferences`),
  removeOne: (petId: string, prefId: string) =>
    request<{ deleted: string; scope: string }>(`/api/pets/${petId}/preferences/${prefId}`, {
      method: "DELETE",
    }),
  reset: (petId: string) => request<unknown>(`/api/pets/${petId}/preferences`, { method: "DELETE" }),
};

export const catalog = {
  list: (q: { category?: string; species?: string; petId?: string }) =>
    request<CatalogItem[]>("/api/catalog", { query: q }),
};

export const chat = {
  send: (question: string, petId: string, threadId?: string | null) =>
    request<ChatResponse>("/api/chat", {
      method: "POST",
      body: { question, petId, ...(threadId ? { threadId } : {}) },
    }),
  resume: (threadId: string, decisions: Decision[]) =>
    request<ChatResponse>("/api/chat/resume", { method: "POST", body: { threadId, decisions } }),
  threads: (petId: string) => request<ThreadSummary[]>(`/api/pets/${petId}/threads`),
  thread: (threadId: string) => request<ThreadDetail>(`/api/threads/${threadId}`),
  removeThread: (threadId: string) => request<void>(`/api/threads/${threadId}`, { method: "DELETE" }),
};
