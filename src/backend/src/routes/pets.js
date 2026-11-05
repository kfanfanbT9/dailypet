// 반려동물 API (F1): 목록·등록(초기 건강 일정표)·조회·수정·삭제(연쇄).
import express from "express";
import { z } from "zod";
import { parseBody } from "../auth/index.js";
import { nowKstIso } from "../lib/dates.js";
import { badRequest } from "../lib/errors.js";
import { newId } from "../lib/ids.js";
import { ENUMS } from "../store/validate.js";
import { deletePet } from "../services/cascade.js";
import { initialEvents, validateHistory } from "../services/healthSchedule.js";
import { loadPet, presentPet, zDate, zTime } from "./common.js";

const tag = z.string().trim().min(1).max(40);
const optional = {
  breed: z.string().trim().max(40).optional(),
  sex: z.enum(ENUMS.sex).nullable().optional(),
  neutered: z.boolean().optional(),
  size: z.enum(ENUMS.size).nullable().optional(),
  activity_level: z.enum(ENUMS.activity_level).nullable().optional(),
  allergies: z.array(tag).max(20).optional(),
  conditions: z.array(tag).max(20).optional(),
  memo: z.string().max(500).optional(),
  default_times: z
    .object({ meal: z.array(zTime).max(6).optional(), walk: z.array(zTime).max(6).optional() })
    .strict()
    .optional(),
};
const createSchema = z.object({
  name: z.string().trim().min(1).max(20),
  species: z.enum(ENUMS.species),
  birth_date: zDate,
  weight_kg: z.number().positive(),
  ...optional,
  health_history: z
    .array(
      z.object({
        catalog_item_id: z.string(),
        last_done_date: z.string(),
        dose_no: z.number().int().optional(),
      }),
    )
    .max(50)
    .optional(),
});
const updateSchema = z.object({
  name: z.string().trim().min(1).max(20).optional(),
  species: z.enum(ENUMS.species).optional(),
  birth_date: zDate.optional(),
  weight_kg: z.number().positive().optional(),
  ...optional,
});
const deleteSchema = z.object({ confirm_name: z.string().min(1) });

function toStored(input) {
  const out = { ...input };
  if ("neutered" in out) out.neutered = out.neutered ? 1 : 0;
  return out;
}

export function petsRouter(deps) {
  const r = express.Router();
  const today = () => deps.config.today();

  r.get("/pets", async (req, res) => {
    const pets = await deps.repos.pets.list(req.userId);
    res.json(pets.map((p) => presentPet(p, today())));
  });

  r.post("/pets", async (req, res) => {
    const { health_history, ...input } = parseBody(createSchema, req.body);
    if (input.birth_date > today())
      throw badRequest("생년월일은 오늘보다 뒤일 수 없어요.", { fields: [{ field: "birth_date" }] });
    const history = validateHistory(health_history, input.species, today(), deps.catalog);
    const pet = {
      breed: "",
      sex: null,
      neutered: 0,
      size: null,
      activity_level: null,
      allergies: [],
      conditions: [],
      memo: "",
      default_times: {},
      ...toStored(input),
      id: newId("pet", 10),
      user_id: req.userId,
      created_at: nowKstIso(),
    };
    await deps.repos.pets.put(req.userId, pet);
    try {
      const events = initialEvents(pet, history, today(), deps.catalog);
      await deps.repos.healthEvents.putMany(req.userId, events);
    } catch (err) {
      await deletePet(deps, req.userId, pet.id); // 일정 생성 실패 → 방금 만든 반려동물 삭제
      throw err;
    }
    res.status(201).json(presentPet(pet, today()));
  });

  r.get("/pets/:id", async (req, res) => {
    res.json(presentPet(await loadPet(deps, req.userId, req.params.id), today()));
  });

  r.put("/pets/:id", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const input = parseBody(updateSchema, req.body);
    if (input.species && input.species !== pet.species) {
      throw badRequest("종은 바꿀 수 없어요. 새 반려동물로 등록해 주세요.", {
        fields: [{ field: "species" }],
      });
    }
    if (input.birth_date && input.birth_date > today()) {
      throw badRequest("생년월일은 오늘보다 뒤일 수 없어요.", { fields: [{ field: "birth_date" }] });
    }
    const updated = { ...pet, ...toStored(input), id: pet.id, user_id: pet.user_id, species: pet.species };
    await deps.repos.pets.put(req.userId, updated);
    // 오늘 할 일은 자동으로 바꾸지 않고 "할 일 다시 제안"을 안내한다 (F1)
    res.json({ ...presentPet(updated, today()), tasks_outdated: true });
  });

  r.delete("/pets/:id", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const { confirm_name } = parseBody(deleteSchema, req.body);
    if (confirm_name.trim() !== pet.name) throw badRequest("반려동물 이름을 정확히 입력해 주세요.");
    await deletePet(deps, req.userId, pet.id);
    res.status(204).end();
  });

  return r;
}
