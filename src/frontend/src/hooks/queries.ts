// TanStack Query 키·훅 한곳. 반려동물별 쿼리는 키에 petId가 들어가 따로 캐시된다.
import { useQuery } from "@tanstack/react-query";
import { auth, catalog, chat, health, pets, preferences, tasks, weights } from "@/api/endpoints";

export const qk = {
  me: ["me"] as const,
  pets: ["pets"] as const,
  pet: (id: string) => ["pet", id] as const,
  tasks: (petId: string) => ["tasks", petId] as const,
  health: (petId: string) => ["health", petId] as const,
  notifications: ["notifications"] as const,
  weights: (petId: string) => ["weights", petId] as const,
  prefs: (petId: string) => ["prefs", petId] as const,
  threads: (petId: string) => ["threads", petId] as const,
  thread: (id: string) => ["thread", id] as const,
  catalog: (q: Record<string, string | undefined>) => ["catalog", q] as const,
};

export const useMe = () => useQuery({ queryKey: qk.me, queryFn: auth.me, retry: false });
export const usePets = () => useQuery({ queryKey: qk.pets, queryFn: pets.list });
export const useTodayTasks = (petId?: string) =>
  useQuery({ queryKey: qk.tasks(petId ?? ""), queryFn: () => tasks.list(petId!), enabled: Boolean(petId) });
export const useHealthEvents = (petId?: string) =>
  useQuery({ queryKey: qk.health(petId ?? ""), queryFn: () => health.list(petId!), enabled: Boolean(petId) });
export const useNotifications = () =>
  useQuery({ queryKey: qk.notifications, queryFn: health.notifications, refetchOnWindowFocus: true });
export const useWeights = (petId?: string) =>
  useQuery({
    queryKey: qk.weights(petId ?? ""),
    queryFn: () => weights.list(petId!),
    enabled: Boolean(petId),
  });
export const usePreferences = (petId?: string) =>
  useQuery({
    queryKey: qk.prefs(petId ?? ""),
    queryFn: () => preferences.get(petId!),
    enabled: Boolean(petId),
  });
export const useThreads = (petId?: string) =>
  useQuery({
    queryKey: qk.threads(petId ?? ""),
    queryFn: () => chat.threads(petId!),
    enabled: Boolean(petId),
  });
export const useCatalog = (q: { category?: string; species?: string; petId?: string }, enabled = true) =>
  useQuery({ queryKey: qk.catalog(q), queryFn: () => catalog.list(q), enabled, staleTime: 5 * 60_000 });
