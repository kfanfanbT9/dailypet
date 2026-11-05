// 취향 신호 기록 (F9·F11): interactions 원본 + 👍/👎는 preferences 요약 갱신.
// 점수 계산(감쇠·단골·반복)은 Python 추천 엔진이 interactions로 한다 — 여기서는 원본과 요약만 쓴다 (CLAUDE.md 4.2).
import { addDays, nowKstIsoOn } from "../lib/dates.js";
import { badRequest } from "../lib/errors.js";
import { newId, prefId } from "../lib/ids.js";

export const PREF_SCORE = { like: 3, dislike: -3, constraint: 0 }; // Python tools.py remember_preference와 같음
export const DISLIKE_EXCLUDE_DAYS = 6; // 신호일 + 6일까지 제외 (7일)

/** @returns {Promise<object>} 저장한 interaction 행 */
export async function recordSignal(deps, userId, petId, { itemId, signal, today, note = "" }) {
  if (itemId !== null && itemId !== undefined && !deps.catalog.has(itemId)) {
    throw badRequest("카탈로그에 없는 항목이에요.", { fields: [{ field: "itemId" }] });
  }
  if (signal !== "custom" && !itemId)
    throw badRequest("항목 ID가 필요해요.", { fields: [{ field: "itemId" }] });
  const now = nowKstIsoOn(today);
  const interaction = {
    id: newId("int"),
    user_id: userId,
    pet_id: petId,
    catalog_item_id: itemId ?? null,
    signal,
    created_at: now,
  };
  await deps.repos.interactions.put(userId, interaction);

  if (signal === "like" || signal === "dislike") {
    const opposite = signal === "like" ? "dislike" : "like";
    await deps.repos.preferences.remove(userId, prefId({ userId, petId, kind: opposite, target: itemId }));
    await deps.repos.preferences.put(userId, {
      id: prefId({ userId, petId, kind: signal, target: itemId }),
      user_id: userId,
      pet_id: petId,
      kind: signal,
      target: itemId,
      note,
      score: PREF_SCORE[signal],
      excluded_until: signal === "dislike" ? addDays(today, DISLIKE_EXCLUDE_DAYS) : null,
      updated_at: now,
    });
  }
  return interaction;
}

/** 같은 날 그 항목의 마지막 complete 신호를 지운다 (완료 체크 되돌리기). */
export async function undoComplete(deps, userId, petId, itemId, date) {
  const rows = await deps.repos.interactions.list(userId, {
    pet_id: petId,
    catalog_item_id: itemId,
    signal: "complete",
  });
  const sameDay = rows
    .filter((r) => r.created_at.slice(0, 10) === date)
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id));
  if (sameDay[0]) await deps.repos.interactions.remove(userId, sameDay[0].id);
  return Boolean(sameDay[0]);
}
