// 건강 일정표 계산 (ARCHITECTURE.md 6.1). 순수 함수 + 저장 도우미.
import { addDays, ageGroup, kstMidnightEpoch } from "../lib/dates.js";
import { badRequest } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { isValidDate } from "../lib/dates.js";

const weeks = (n) => n * 7;
const later = (a, b) => (a > b ? a : b);

function schedule(item) {
  return Array.isArray(item.dose_schedule) && item.dose_schedule.length ? item.dose_schedule : null;
}

/** dose_schedule의 회차별 누적 권장 주령 [{dose_no, week}] */
export function cumulativeWeeks(ds) {
  let week = 0;
  return ds.map((d) => {
    week =
      d.at_age_weeks !== undefined && d.at_age_weeks !== null
        ? d.at_age_weeks
        : week + (d.after_prev_weeks ?? 0);
    return { dose_no: d.dose_no, week };
  });
}

/** 회차를 모르는 완료: 완료일 당시 주령 이하인 마지막 회차 (최소 1차). */
export function estimateDose(ds, birthDate, doneDate) {
  const ageWeeks = Math.floor((Date.parse(doneDate) - Date.parse(birthDate)) / (7 * 86400000));
  const cum = cumulativeWeeks(ds);
  let dose = cum[0].dose_no;
  for (const c of cum) if (c.week <= ageWeeks) dose = c.dose_no;
  return dose;
}

/** 완료일 기준 다음 일정 { due_date, dose_no } 또는 null (6.1 "다음 일정"). */
export function nextAfter(item, { doseNo, doneDate, birthDate }) {
  const ds = schedule(item);
  if (ds) {
    const dose = doseNo ?? estimateDose(ds, birthDate, doneDate);
    const next = ds.find((d) => d.dose_no === dose + 1);
    if (next)
      return { due_date: addDays(doneDate, weeks(next.after_prev_weeks ?? 0)), dose_no: next.dose_no };
    if (item.booster_interval_days)
      return { due_date: addDays(doneDate, item.booster_interval_days), dose_no: null };
    return null;
  }
  if (item.interval_days) return { due_date: addDays(doneDate, item.interval_days), dose_no: null };
  return null;
}

function eventRow(pet, item, { due_date, dose_no, status }) {
  return {
    id: newId("evt"),
    user_id: pet.user_id,
    pet_id: pet.id,
    catalog_item_id: item.item_id,
    type: item.type,
    dose_no: dose_no ?? null,
    due_date,
    due_ts: kstMidnightEpoch(due_date),
    status,
    completed_date: null,
  };
}

/** 이력 입력 검증: 카탈로그 정기점검 항목, 종 일치, 과거·오늘 날짜. */
export function validateHistory(history, species, today, catalog) {
  const out = new Map();
  for (const [i, h] of (history ?? []).entries()) {
    const item = catalog.get(h?.catalog_item_id);
    if (!item || item.category !== "health" || !item.species.includes(species)) {
      throw badRequest("건강 이력의 항목을 확인해 주세요.", {
        fields: [{ field: `health_history.${i}.catalog_item_id` }],
      });
    }
    if (!isValidDate(h.last_done_date) || h.last_done_date > today) {
      throw badRequest("건강 이력 날짜를 확인해 주세요.", {
        fields: [{ field: `health_history.${i}.last_done_date` }],
      });
    }
    if (h.dose_no !== undefined && h.dose_no !== null && !(Number.isInteger(h.dose_no) && h.dose_no >= 1)) {
      throw badRequest("건강 이력 회차를 확인해 주세요.", {
        fields: [{ field: `health_history.${i}.dose_no` }],
      });
    }
    out.set(item.item_id, h);
  }
  return out;
}

/** 초기 일정표 (6.1). 저장하지 않고 행 목록을 돌려준다. */
export function initialEvents(pet, historyMap, today, catalog) {
  const group = ageGroup({ species: pet.species, size: pet.size, birthDate: pet.birth_date }, today);
  const rows = [];
  for (const item of catalog.healthItems(pet.species)) {
    if (!item.age_groups?.includes(group)) continue;
    const h = historyMap.get(item.item_id);
    const ds = schedule(item);
    const startDate =
      item.start_age_weeks !== null && item.start_age_weeks !== undefined
        ? addDays(pet.birth_date, weeks(item.start_age_weeks))
        : null;
    if (ds || item.interval_days) {
      if (h) {
        const next = nextAfter(item, {
          doseNo: h.dose_no ?? null,
          doneDate: h.last_done_date,
          birthDate: pet.birth_date,
        });
        if (next)
          rows.push(
            eventRow(pet, item, { ...next, status: next.due_date < today ? "overdue" : "scheduled" }),
          );
      } else if (ds) {
        const due = addDays(pet.birth_date, weeks(ds[0].at_age_weeks ?? 0));
        rows.push(
          eventRow(pet, item, {
            due_date: due,
            dose_no: ds[0].dose_no,
            status: due < today ? "needs_history" : "scheduled",
          }),
        );
      } else if (group !== "junior" && (startDate === null || startDate < today)) {
        rows.push(eventRow(pet, item, { due_date: startDate ?? today, status: "needs_history" }));
      } else {
        rows.push(eventRow(pet, item, { due_date: later(startDate ?? today, today), status: "scheduled" }));
      }
    } else if (startDate && !h) {
      rows.push(eventRow(pet, item, { due_date: later(startDate, today), status: "scheduled" }));
    }
  }
  return rows;
}

/** 완료 처리 → 이 일정 done + 다음 일정 행 (저장은 호출 쪽). */
export function completeEvent(event, pet, completedDate, today, catalog) {
  const item = catalog.get(event.catalog_item_id);
  const done = { ...event, status: "done", completed_date: completedDate };
  const next = item
    ? nextAfter(item, { doseNo: event.dose_no ?? null, doneDate: completedDate, birthDate: pet.birth_date })
    : null;
  const nextRow = next
    ? eventRow(pet, item, { ...next, status: next.due_date < today ? "overdue" : "scheduled" })
    : null;
  return { done, next: nextRow };
}
