// 오늘의 할 일 (F2·F13). 추천은 항상 Agent POST /tasks/generate가 한다 — Backend는 저장·유지 규칙만 (CLAUDE.md 4.2).
import { AgentUnavailable } from "../lib/errors.js";
import { newId } from "../lib/ids.js";

export const NOTICE_UNAVAILABLE = "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
export const NOTICE_NO_SWAP = "더 추천할 항목이 없어요.";
const inflight = new Map(); // `${userId}:${petId}:${date}` → Promise (단일 프로세스 로컬 데모 전제)

function toRow(userId, petId, date, t) {
  if (t.category === "health") {
    return {
      id: newId("task"),
      user_id: userId,
      pet_id: petId,
      date,
      time: null,
      category: "health",
      source: "auto",
      catalog_item_id: null,
      health_event_id: t.health_event_id,
      title: t.title,
      done: 0,
    };
  }
  return {
    id: newId("task"),
    user_id: userId,
    pet_id: petId,
    date,
    time: t.time ?? null,
    category: t.category,
    source: "auto",
    catalog_item_id: t.catalog_item_id,
    health_event_id: null,
    title: t.title,
    done: 0,
    reason: t.reason ?? null,
    rank: t.rank ?? null,
    relaxed: Array.isArray(t.relaxed) ? t.relaxed : [],
  };
}

/** Agent 결과 중 저장할 행: 카탈로그 영역이 맞는 식단·활동, 이 반려동물의 건강 일정(이미 있는 일정의 할 일은 제외). */
async function rowsFromAgent(deps, userId, petId, date, agentTasks, existing) {
  const haveEvents = new Set(existing.filter((t) => t.health_event_id).map((t) => t.health_event_id));
  const rows = [];
  for (const t of agentTasks ?? []) {
    if (t.category === "health") {
      if (!t.health_event_id || haveEvents.has(t.health_event_id)) continue;
      const evt = await deps.repos.healthEvents.get(userId, t.health_event_id);
      if (!evt || evt.pet_id !== petId) continue;
      haveEvents.add(t.health_event_id);
      rows.push(toRow(userId, petId, date, t));
    } else if (
      ["diet", "activity"].includes(t.category) &&
      deps.catalog.get(t.catalog_item_id)?.category === t.category
    ) {
      rows.push(toRow(userId, petId, date, t));
    }
  }
  return rows;
}

function agentBody(userId, petId, date, extra = {}) {
  return {
    user_id: userId,
    pet_id: petId,
    date,
    keep_item_ids: [],
    category: null,
    exclude_item_ids: [],
    limit: null,
    ...extra,
  };
}

/** 그 날짜 목록. 오늘이고 비어 있으면 Agent로 만든다 (같은 반려동물 동시 요청은 한 번만 생성). */
export async function getOrCreateTasks(deps, userId, petId, date, today) {
  const existing = await deps.repos.tasks.listByDate(userId, petId, date);
  if (existing.length > 0 || date !== today) return { date, tasks: existing };
  const key = `${userId}:${petId}:${date}`;
  if (!inflight.has(key)) {
    inflight.set(
      key,
      (async () => {
        try {
          const again = await deps.repos.tasks.listByDate(userId, petId, date);
          if (again.length > 0) return { date, tasks: again };
          const plan = await deps.agent.generateTasks(agentBody(userId, petId, date));
          const rows = await rowsFromAgent(deps, userId, petId, date, plan.tasks, []);
          await deps.repos.tasks.putMany(userId, rows);
          return { date, tasks: rows };
        } finally {
          inflight.delete(key);
        }
      })(),
    );
  }
  try {
    return await inflight.get(key);
  } catch (err) {
    if (err instanceof AgentUnavailable)
      return { date, tasks: [], notice: NOTICE_UNAVAILABLE, retryable: true };
    throw err;
  }
}

/** 다시 생성: 완료·직접 추가·건강 항목은 남기고, 미완료 자동 식단·활동만 바꾼다. Agent가 실패하면 기존 목록 그대로 (503). */
export async function regenerateTasks(deps, userId, petId, date) {
  const existing = await deps.repos.tasks.listByDate(userId, petId, date);
  const keep = existing.filter((t) => t.done || t.source === "custom" || t.category === "health");
  const replace = existing.filter((t) => !keep.includes(t));
  const keepIds = [...new Set(keep.map((t) => t.catalog_item_id).filter(Boolean))];
  const plan = await deps.agent.generateTasks(agentBody(userId, petId, date, { keep_item_ids: keepIds })); // 실패 → 503, 아무것도 안 지움
  const rows = await rowsFromAgent(deps, userId, petId, date, plan.tasks, keep);
  for (const t of replace) await deps.repos.tasks.remove(userId, t.id);
  await deps.repos.tasks.putMany(userId, rows);
  return { date, tasks: [...keep, ...rows], keep_item_ids: keepIds };
}

/** 항목 하나 교체: 같은 영역에서 오늘 항목 전부를 빼고 1개. 결과가 없으면 기존 유지. */
export async function swapTask(deps, userId, task) {
  const sameDay = await deps.repos.tasks.listByDate(userId, task.pet_id, task.date);
  const exclude = [
    ...new Set([
      task.catalog_item_id,
      ...sameDay.filter((t) => t.category === task.category).map((t) => t.catalog_item_id),
    ]),
  ].filter(Boolean);
  const plan = await deps.agent.generateTasks(
    agentBody(userId, task.pet_id, task.date, {
      category: task.category,
      exclude_item_ids: exclude,
      limit: 1,
    }),
  );
  const [candidate] = await rowsFromAgent(
    deps,
    userId,
    task.pet_id,
    task.date,
    (plan.tasks ?? []).filter((t) => t.category === task.category && !exclude.includes(t.catalog_item_id)),
    sameDay,
  );
  if (!candidate) return { swapped: false, notice: NOTICE_NO_SWAP, task };
  const replacement = { ...candidate, time: task.time };
  await deps.repos.tasks.remove(userId, task.id);
  await deps.repos.tasks.put(userId, replacement);
  return { swapped: true, task: replacement, replaced: task.id };
}
