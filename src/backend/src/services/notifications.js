// 알림 (ARCHITECTURE.md 6장): scheduled D-7·D-1·D-day, overdue. needs_history·done 제외.
import { dDay } from "../lib/dates.js";

const KIND_BY_DDAY = { 7: "d7", 1: "d1", 0: "today" };
const ORDER = { overdue: 0, today: 1, d1: 2, d7: 3 };

export function notificationKind(event, today) {
  if (event.status === "overdue") return "overdue";
  if (event.status !== "scheduled") return null;
  return KIND_BY_DDAY[dDay(event.due_date, today)] ?? null;
}

export async function listNotifications(deps, userId, today) {
  const pets = await deps.repos.pets.list(userId);
  const names = new Map(pets.map((p) => [p.id, p.name]));
  const events = await deps.repos.healthEvents.list(userId, { status: { $in: ["scheduled", "overdue"] } });
  return events
    .filter((e) => names.has(e.pet_id))
    .map((e) => ({ e, kind: notificationKind(e, today) }))
    .filter(({ kind }) => kind)
    .map(({ e, kind }) => ({
      event_id: e.id,
      pet_id: e.pet_id,
      pet_name: names.get(e.pet_id),
      catalog_item_id: e.catalog_item_id,
      name: deps.catalog.get(e.catalog_item_id)?.name ?? e.type,
      dose_no: e.dose_no ?? null,
      due_date: e.due_date,
      d_day: dDay(e.due_date, today),
      kind,
    }))
    .sort(
      (a, b) =>
        ORDER[a.kind] - ORDER[b.kind] ||
        a.due_date.localeCompare(b.due_date) ||
        a.event_id.localeCompare(b.event_id),
    );
}
