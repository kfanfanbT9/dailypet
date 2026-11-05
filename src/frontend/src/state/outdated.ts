// "프로필이 바뀌었어요 [할 일 다시 제안]" 표시 (F1·S05): 프로필·체중 저장 응답의 tasks_outdated로 남기고, 다시 제안하면 지운다.
// 반려동물별, localStorage(실패하면 메모리)에 둔다.
import { useSyncExternalStore } from "react";

const KEY = "dp.outdated";
let memory: string[] = [];
const listeners = new Set<() => void>();

function read(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : memory;
  } catch {
    return memory;
  }
}
function write(ids: string[]) {
  memory = ids;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {
    // 메모리만
  }
  listeners.forEach((l) => l());
}

export function markOutdated(petId: string) {
  const ids = read();
  if (!ids.includes(petId)) write([...ids, petId]);
}
export function clearOutdated(petId: string) {
  write(read().filter((id) => id !== petId));
}
export function useOutdated(petId: string | undefined): boolean {
  const snapshot = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => JSON.stringify(read()),
  );
  return Boolean(petId && (JSON.parse(snapshot) as string[]).includes(petId));
}
