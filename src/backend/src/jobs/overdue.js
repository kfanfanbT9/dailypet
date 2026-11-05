// scheduled → overdue 갱신 (ARCHITECTURE.md 6장). cron 매일 KST 00:05 + 서버 시작 시 + 시드 리셋 끝.
// 모든 사용자 대상의 유일한 작업이라 repos의 userId 강제를 우회하는 내부 전용 함수다 (라우트에서 import 금지).
import { kstMidnightEpoch } from "../lib/dates.js";

export async function markOverdue(store, today) {
  const rows = await store.get("health_events", {
    where: { $and: [{ status: "scheduled" }, { due_ts: { $lte: kstMidnightEpoch(today) - 1 } }] },
  });
  const updated = rows.map(({ row }) => ({ ...row, status: "overdue" }));
  if (updated.length) await store.upsert("health_events", updated);
  return updated.length;
}
