// 건강 일정 API (F5): 목록·완료(다음 회차)·날짜 변경·이력 입력, 알림.
import express from "express";
import { z } from "zod";
import { parseBody } from "../auth/index.js";
import { dDay, kstMidnightEpoch, withinDays } from "../lib/dates.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { completeEvent } from "../services/healthSchedule.js";
import { listNotifications } from "../services/notifications.js";
import { loadPet, zDate } from "./common.js";

export const HEALTH_TASK_DAYS = 7;
const completeSchema = z.object({ completed_date: zDate });
const patchSchema = z.object({ due_date: zDate.optional(), last_done_date: zDate.optional() }).strict();

async function loadEvent(deps, userId, eventId) {
  const evt = await deps.repos.healthEvents.get(userId, eventId);
  if (!evt) throw notFound("건강 일정을 찾을 수 없어요.");
  return evt;
}

/** 일정 변경에 맞춰 그 일정의 할 일을 맞춘다: 완료 → 할 일 done, 7일 밖으로 이동 → 미완료 할 일 삭제 */
async function syncHealthTasks(deps, userId, event, today) {
  const tasks = await deps.repos.tasks.list(userId, { health_event_id: event.id });
  for (const t of tasks) {
    if (event.status === "done" && !t.done) {
      await deps.repos.tasks.put(userId, { ...t, done: 1 });
    } else if (!t.done && event.status !== "done" && !withinDays(event.due_date, today, HEALTH_TASK_DAYS)) {
      await deps.repos.tasks.remove(userId, t.id);
    }
  }
}

async function finish(deps, userId, event, pet, doneDate, today) {
  const { done, next } = completeEvent(event, pet, doneDate, today, deps.catalog);
  await deps.repos.healthEvents.put(userId, done);
  if (next) await deps.repos.healthEvents.put(userId, next);
  await syncHealthTasks(deps, userId, done, today);
  return { event: done, next };
}

export function healthRouter(deps) {
  const r = express.Router();
  const today = () => deps.config.today();

  r.get("/pets/:id/health-events", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const t = today();
    const events = (await deps.repos.healthEvents.list(req.userId, { pet_id: pet.id })).map((e) => ({
      ...e,
      name: deps.catalog.get(e.catalog_item_id)?.name ?? e.type,
      d_day: dDay(e.due_date, t),
    }));
    const byDue = (a, b) => a.due_date.localeCompare(b.due_date) || a.id.localeCompare(b.id);
    res.json({
      needs_history: events.filter((e) => e.status === "needs_history").sort(byDue),
      upcoming: events.filter((e) => e.status === "scheduled" || e.status === "overdue").sort(byDue),
      done: events.filter((e) => e.status === "done").sort((a, b) => byDue(b, a)),
    });
  });

  r.patch("/health-events/:id/complete", async (req, res) => {
    const evt = await loadEvent(deps, req.userId, req.params.id);
    const { completed_date } = parseBody(completeSchema, req.body);
    const t = today();
    if (completed_date > t)
      throw badRequest("완료일은 오늘보다 뒤일 수 없어요.", { fields: [{ field: "completed_date" }] });
    if (evt.status === "done") throw conflict("already_done", "이미 완료한 일정이에요.");
    const pet = await loadPet(deps, req.userId, evt.pet_id);
    res.json(await finish(deps, req.userId, evt, pet, completed_date, t));
  });

  r.patch("/health-events/:id", async (req, res) => {
    const evt = await loadEvent(deps, req.userId, req.params.id);
    const body = parseBody(patchSchema, req.body);
    const t = today();
    if ((body.due_date === undefined) === (body.last_done_date === undefined)) {
      throw badRequest("날짜 변경(due_date) 또는 이력 입력(last_done_date) 중 하나만 보내 주세요.");
    }
    if (evt.status === "done") throw conflict("already_done", "이미 완료한 일정이에요.");
    if (body.due_date !== undefined) {
      if (body.due_date < t)
        throw badRequest("지난 날짜로는 바꿀 수 없어요.", { fields: [{ field: "due_date" }] });
      const updated = {
        ...evt,
        due_date: body.due_date,
        due_ts: kstMidnightEpoch(body.due_date),
        status: "scheduled",
      };
      await deps.repos.healthEvents.put(req.userId, updated);
      await syncHealthTasks(deps, req.userId, updated, t);
      return res.json({ event: updated, next: null });
    }
    if (body.last_done_date > t) {
      throw badRequest("마지막 날짜는 오늘보다 뒤일 수 없어요.", { fields: [{ field: "last_done_date" }] });
    }
    const pet = await loadPet(deps, req.userId, evt.pet_id);
    res.json(await finish(deps, req.userId, evt, pet, body.last_done_date, t));
  });

  r.get("/notifications", async (req, res) => {
    res.json(await listNotifications(deps, req.userId, today()));
  });

  return r;
}
