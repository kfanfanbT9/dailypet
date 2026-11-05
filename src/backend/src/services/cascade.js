// 연쇄 삭제·고아 정리 (ARCHITECTURE.md 5장). Chroma에는 트랜잭션이 없으므로
// 반려동물 행을 마지막에 지우고(실패해도 프로필이 남아 다시 시도 가능), 같은 삭제를 다시 해도 남은 단계부터 끝까지 간다.
import { log } from "../lib/logger.js";

const PET_CHILDREN = [
  ["tasks", "tasks"],
  ["health_events", "healthEvents"],
  ["weight_logs", "weights"],
  ["interactions", "interactions"],
  ["preferences", "preferences"],
];

export class FaultInjected extends Error {
  constructor(step) {
    super(`fault_injected:${step}`);
    this.name = "FaultInjected";
  }
}

/** FAULT_INJECT=delete_after:<컬렉션> (테스트 전용) */
function checkFault(deps, step) {
  if (deps.config.faultInject === `delete_after:${step}`) throw new FaultInjected(step);
}

async function deletePetThreads(deps, userId, petId) {
  const logs = await deps.repos.chatLogs.list(userId, { pet_id: petId });
  const threads = [...new Set(logs.map((l) => l.thread_id))];
  deps.checkpoints?.deleteThreads(threads);
  await deps.repos.chatLogs.removeWhere(userId, { pet_id: petId });
  return threads.length;
}

/** 반려동물 연쇄 삭제: tasks → health_events → weight_logs → interactions → preferences(그 반려동물 것) → chat_logs+checkpoint → pets */
export async function deletePet(deps, userId, petId) {
  for (const [collection, repo] of PET_CHILDREN) {
    await deps.repos[repo].removeWhere(userId, { pet_id: petId });
    checkFault(deps, collection);
  }
  await deletePetThreads(deps, userId, petId);
  checkFault(deps, "chat_logs");
  await deps.repos.pets.remove(userId, petId);
}

/** 회원 탈퇴: 모든 반려동물 연쇄 삭제 → 사용자 공통 취향 → 남은 사용자 행 → users */
export async function deleteUser(deps, userId) {
  for (const pet of await deps.repos.pets.list(userId)) await deletePet(deps, userId, pet.id);
  for (const repo of ["preferences", "tasks", "healthEvents", "weights", "interactions"]) {
    await deps.repos[repo].removeWhere(userId, {});
  }
  const logs = await deps.repos.chatLogs.list(userId);
  deps.checkpoints?.deleteThreads(logs.map((l) => l.thread_id));
  await deps.repos.chatLogs.removeWhere(userId, {});
  await deps.repos.users.remove(userId);
}

/**
 * 고아 정리 (서버 시작 시 1회): 사용자가 없는 반려동물은 연쇄 삭제, 반려동물이 없는 하위 행은 삭제.
 * 모든 사용자를 훑는 내부 전용 작업이라 store를 직접 쓴다 (라우트에서 쓰지 않는다).
 */
export async function cleanupOrphans(deps) {
  const store = deps.repos.store;
  const userIds = new Set((await store.get("users")).map((r) => r.id));
  const counts = { pets: 0, rows: 0 };
  for (const { row } of await store.get("pets")) {
    if (!userIds.has(row.user_id)) {
      await deletePet(deps, row.user_id, row.id);
      counts.pets += 1;
    }
  }
  const petIds = new Set((await store.get("pets")).map((r) => r.id));
  for (const name of ["tasks", "health_events", "weight_logs", "interactions", "chat_logs", "preferences"]) {
    const orphans = (await store.get(name)).filter(({ row }) =>
      name === "preferences"
        ? !userIds.has(row.user_id) || (row.pet_id && !petIds.has(row.pet_id))
        : !userIds.has(row.user_id) || !petIds.has(row.pet_id),
    );
    if (orphans.length === 0) continue;
    if (name === "chat_logs") deps.checkpoints?.deleteThreads(orphans.map((o) => o.row.thread_id));
    await store.delete(name, { ids: orphans.map((o) => o.id) });
    counts.rows += orphans.length;
  }
  if (counts.pets || counts.rows) log.info("orphans_cleaned", counts);
  return counts;
}
