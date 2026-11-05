// 체중(F12)·취향(F9·F11) API.
import express from "express";
import { z } from "zod";
import { parseBody } from "../auth/index.js";
import { badRequest, conflict, notFound } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { ENUMS, WEIGHT_RANGE } from "../store/validate.js";
import { recordSignal } from "../services/signals.js";
import { loadPet, zDate } from "./common.js";

const weightSchema = z.object({ date: zDate, weight_kg: z.number(), overwrite: z.boolean().optional() });
const feedbackSchema = z.object({
  itemId: z.string().min(1).nullable().optional(),
  signal: z.enum(ENUMS.signal),
});

/** 가장 최근 날짜 기록으로 프로필 체중 갱신 (기록이 없으면 그대로). */
async function syncPetWeight(deps, userId, pet) {
  const logs = await deps.repos.weights.list(userId, { pet_id: pet.id });
  if (logs.length === 0) return pet;
  const latest = logs.reduce((a, b) => (b.date > a.date ? b : a));
  if (latest.weight_kg === pet.weight_kg) return pet;
  const updated = { ...pet, weight_kg: latest.weight_kg };
  await deps.repos.pets.put(userId, updated);
  return updated;
}

const FREQUENT_MIN = 3;

export function prefsRouter(deps) {
  const r = express.Router();
  const today = () => deps.config.today();

  r.get("/pets/:id/weights", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const logs = await deps.repos.weights.list(req.userId, { pet_id: pet.id });
    res.json(logs.sort((a, b) => a.date.localeCompare(b.date)));
  });

  r.post("/pets/:id/weights", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const { date, weight_kg, overwrite } = parseBody(weightSchema, req.body);
    const [lo, hi] = WEIGHT_RANGE[pet.species];
    if (weight_kg < lo || weight_kg > hi) {
      throw badRequest(`체중은 ${lo}~${hi}kg 사이로 입력해 주세요.`, { fields: [{ field: "weight_kg" }] });
    }
    if (date > today()) throw badRequest("미래 날짜는 기록할 수 없어요.", { fields: [{ field: "date" }] });
    const [existing] = await deps.repos.weights.list(req.userId, { pet_id: pet.id, date });
    if (existing && !overwrite) throw conflict("weight_exists", "이 날짜에 이미 기록이 있어요. 덮어쓸까요?");
    const row = { id: existing?.id ?? newId("wt"), user_id: req.userId, pet_id: pet.id, date, weight_kg };
    await deps.repos.weights.put(req.userId, row);
    const updated = await syncPetWeight(deps, req.userId, pet);
    res
      .status(existing ? 200 : 201)
      .json({ weight: row, pet_weight_kg: updated.weight_kg, tasks_outdated: true });
  });

  r.delete("/weights/:weightId", async (req, res) => {
    const row = await deps.repos.weights.get(req.userId, req.params.weightId);
    if (!row) throw notFound("체중 기록을 찾을 수 없어요.");
    const pet = await loadPet(deps, req.userId, row.pet_id);
    await deps.repos.weights.remove(req.userId, row.id);
    const updated = await syncPetWeight(deps, req.userId, pet);
    res.json({ pet_weight_kg: updated.weight_kg, tasks_outdated: true });
  });

  r.post("/pets/:id/feedback", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const { itemId, signal } = parseBody(feedbackSchema, req.body);
    const row = await recordSignal(deps, req.userId, pet.id, {
      itemId: itemId ?? null,
      signal,
      today: today(),
    });
    res.status(201).json(row);
  });

  r.get("/pets/:id/preferences", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const t = today();
    const rows = (await deps.repos.preferences.list(req.userId)).filter(
      (p) => !p.pet_id || p.pet_id === pet.id,
    );
    const view = (p) => ({
      ...p,
      scope: p.pet_id ? "pet" : "all_pets",
      item_name: deps.catalog.get(p.target)?.name ?? null,
      ...(p.kind === "dislike" ? { excluded_now: Boolean(p.excluded_until && t <= p.excluded_until) } : {}),
    });
    const sorted = rows.sort(
      (a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "") || a.id.localeCompare(b.id),
    );
    // 자주 한 활동 (D4): 완료 3회 이상 카탈로그 항목. 화면 표시용 집계이며 점수 계산은 Python 한 곳 (CLAUDE.md 4.2)
    const counts = new Map();
    for (const i of await deps.repos.interactions.list(req.userId, { pet_id: pet.id, signal: "complete" })) {
      if (i.catalog_item_id) counts.set(i.catalog_item_id, (counts.get(i.catalog_item_id) ?? 0) + 1);
    }
    const frequent = [...counts]
      .filter(([, n]) => n >= FREQUENT_MIN)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([id, count]) => ({ catalog_item_id: id, item_name: deps.catalog.get(id)?.name ?? null, count }));
    res.json({
      frequent,
      like: sorted.filter((p) => p.kind === "like").map(view),
      dislike: sorted.filter((p) => p.kind === "dislike").map(view),
      constraint: sorted.filter((p) => p.kind === "constraint").map(view),
    });
  });

  r.delete("/pets/:id/preferences/:prefId", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const pref = await deps.repos.preferences.get(req.userId, req.params.prefId);
    if (!pref || (pref.pet_id && pref.pet_id !== pet.id)) throw notFound("취향 항목을 찾을 수 없어요.");
    await deps.repos.preferences.remove(req.userId, pref.id);
    res.json({ deleted: pref.id, scope: pref.pet_id ? "pet" : "all_pets" });
  });

  // 전체 초기화: 그 반려동물의 취향과 신호 원본(완료 횟수 포함)을 지운다. 사용자 공통 행은 남긴다 (3.8)
  r.delete("/pets/:id/preferences", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const prefs = await deps.repos.preferences.removeWhere(req.userId, { pet_id: pet.id });
    const interactions = await deps.repos.interactions.removeWhere(req.userId, { pet_id: pet.id });
    res.json({ preferences: prefs, interactions });
  });

  return r;
}
