// 할 일 API (F2·F13)와 직접 추가용 카탈로그 조회.
import express from "express";
import { z } from "zod";
import { parseBody } from "../auth/index.js";
import { badRequest, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { ENUMS } from "../store/validate.js";
import { recordSignal, undoComplete } from "../services/signals.js";
import { getOrCreateTasks, regenerateTasks, swapTask } from "../services/tasks.js";
import { loadPet, presentTask, sortTasks, zDate, zTime } from "./common.js";

const dateQuery = z.object({ date: zDate.optional() });
const regenSchema = z.object({ confirm: z.literal(true) });
const addSchema = z.union([
  z
    .object({
      title: z.string().trim().min(1).max(60),
      time: zTime.nullable().optional(),
      date: zDate.optional(),
    })
    .strict(),
  z
    .object({ catalog_item_id: z.string().min(1), time: zTime.nullable().optional(), date: zDate.optional() })
    .strict(),
]);
const patchSchema = z
  .object({
    done: z.boolean().optional(),
    time: zTime.nullable().optional(),
    title: z.string().trim().min(1).max(60).optional(),
  })
  .strict();
const catalogQuery = z.object({
  category: z.enum(["diet", "activity", "health"]).optional(),
  species: z.enum(ENUMS.species).optional(),
  petId: z.string().min(1).optional(),
});

async function loadTask(deps, userId, taskId) {
  const task = await deps.repos.tasks.get(userId, taskId);
  if (!task) throw notFound("할 일을 찾을 수 없어요.");
  return task;
}

const present = (result) => ({ ...result, tasks: sortTasks(result.tasks).map(presentTask) });

export function tasksRouter(deps) {
  const r = express.Router();
  const today = () => deps.config.today();

  r.get("/pets/:id/tasks", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const { date } = parseBody(dateQuery, req.query);
    res.json(present(await getOrCreateTasks(deps, req.userId, pet.id, date ?? today(), today())));
  });

  r.post("/pets/:id/tasks/generate", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    parseBody(regenSchema, req.body);
    const { keep_item_ids: _k, ...result } = await regenerateTasks(deps, req.userId, pet.id, today());
    res.json(present(result));
  });

  r.post("/pets/:id/tasks", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const body = parseBody(addSchema, req.body);
    const date = body.date ?? today();
    if (date < today()) throw badRequest("지난 날짜에는 추가할 수 없어요.", { fields: [{ field: "date" }] });
    let row = {
      id: newId("task"),
      user_id: req.userId,
      pet_id: pet.id,
      date,
      time: body.time ?? null,
      done: 0,
      source: "custom",
      health_event_id: null,
    };
    if (body.catalog_item_id) {
      const item = deps.catalog.get(body.catalog_item_id);
      // 직접 추가도 카탈로그 식단·활동 중 추천 가능한 항목만 (유해 식품 등 recommendable:false 제외, CLAUDE.md 4.5)
      if (
        !item ||
        !["diet", "activity"].includes(item.category) ||
        item.recommendable === false ||
        !item.species.includes(pet.species)
      ) {
        throw badRequest("추가할 수 없는 항목이에요.", { fields: [{ field: "catalog_item_id" }] });
      }
      row = { ...row, category: item.category, catalog_item_id: item.item_id, title: item.name };
      await deps.repos.tasks.put(req.userId, row);
      await recordSignal(deps, req.userId, pet.id, {
        itemId: item.item_id,
        signal: "custom",
        today: today(),
      });
    } else {
      row = { ...row, category: "custom", catalog_item_id: null, title: body.title };
      await deps.repos.tasks.put(req.userId, row);
    }
    res.status(201).json(presentTask(row));
  });

  r.patch("/tasks/:taskId", async (req, res) => {
    const task = await loadTask(deps, req.userId, req.params.taskId);
    const body = parseBody(patchSchema, req.body);
    if (body.title !== undefined && task.category !== "custom") {
      throw badRequest("직접 입력한 할 일만 내용을 바꿀 수 있어요.", { fields: [{ field: "title" }] });
    }
    const updated = { ...task };
    if (body.time !== undefined) updated.time = body.time;
    if (body.title !== undefined) updated.title = body.title;
    if (body.done !== undefined) updated.done = body.done ? 1 : 0;
    await deps.repos.tasks.put(req.userId, updated);
    if (task.catalog_item_id && Boolean(task.done) !== Boolean(updated.done)) {
      if (updated.done) {
        await recordSignal(deps, req.userId, task.pet_id, {
          itemId: task.catalog_item_id,
          signal: "complete",
          today: today(),
        });
      } else {
        await undoComplete(deps, req.userId, task.pet_id, task.catalog_item_id, today());
      }
    }
    res.json(presentTask(updated));
  });

  r.delete("/tasks/:taskId", async (req, res) => {
    const task = await loadTask(deps, req.userId, req.params.taskId);
    if (task.category === "health") throw badRequest("건강 할 일은 건강 일정 화면에서 처리해 주세요.");
    await deps.repos.tasks.remove(req.userId, task.id);
    if (task.source === "auto" && task.catalog_item_id) {
      await recordSignal(deps, req.userId, task.pet_id, {
        itemId: task.catalog_item_id,
        signal: "remove",
        today: today(),
      });
    }
    res.status(204).end();
  });

  r.post("/tasks/:taskId/swap", async (req, res) => {
    const task = await loadTask(deps, req.userId, req.params.taskId);
    if (!["diet", "activity"].includes(task.category) || task.source !== "auto") {
      throw badRequest("자동으로 제안된 식단·활동만 바꿀 수 있어요.");
    }
    const result = await swapTask(deps, req.userId, task);
    if (result.swapped) {
      await recordSignal(deps, req.userId, task.pet_id, {
        itemId: task.catalog_item_id,
        signal: "swap",
        today: today(),
      });
    }
    res.json({ ...result, task: presentTask(result.task) });
  });

  r.get("/catalog", async (req, res) => {
    const { category, species, petId } = parseBody(catalogQuery, req.query);
    let allowed = null;
    if (petId) {
      // 반려동물 기준 안전 필터는 Agent(Python)에만 있다 — 실패하면 필터 없는 목록 대신 503 (4.2, 4.1.3)
      const pet = await loadPet(deps, req.userId, petId);
      if (category !== "diet" && category !== "activity")
        throw badRequest("petId는 식단·활동 목록에만 쓸 수 있어요.");
      allowed = new Set(await deps.agent.safeCatalog({ user_id: req.userId, pet_id: pet.id, category }));
    }
    const items = deps.catalog
      .list({ category, species, recommendableOnly: true })
      .filter((it) => (category ? true : it.category !== "health")) // 카테고리 없으면 직접 추가용(식단·활동)만
      .filter((it) => !allowed || allowed.has(it.item_id))
      .map((it) => ({
        item_id: it.item_id,
        name: it.name,
        category: it.category,
        species: it.species,
        intensity: it.intensity ?? null,
        subtype: it.subtype ?? null,
        type: it.type ?? null,
        summary: (it.description ?? "").slice(0, 80),
      }));
    res.json(items);
  });

  return r;
}
