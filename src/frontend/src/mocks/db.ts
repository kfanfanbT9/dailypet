// MSW 목 데이터 — data/seed/*.json과 카탈로그로 만든다 (phase3_task.md 1.4). 기준일 2026-11-10.
// Backend 규칙(ARCHITECTURE.md 4.2·6장)을 화면 확인에 필요한 만큼만 흉내 낸다. 응답 모양은 api/types를 거친다.
import activities from "../../../../data/catalog/activities.json";
import diets from "../../../../data/catalog/diets.json";
import healthChecks from "../../../../data/catalog/health_checks.json";
import seedChat from "@seed/chat_logs.json";
import seedEvents from "@seed/health_events.json";
import seedInteractions from "@seed/interactions.json";
import seedPets from "@seed/pets.json";
import seedPrefs from "@seed/preferences.json";
import seedTasks from "@seed/tasks.json";
import seedUsers from "@seed/users.json";
import seedWeights from "@seed/weight_logs.json";
import type { AgeGroup, HealthEvent, Pet, Preference, Task, TraceEvent, WeightLog } from "@/api/types";
import { ageGroup, addDays } from "@/lib/dates";

export const MOCK_PASSWORD = "Demo!2345";

export interface CatalogRaw {
  item_id: string;
  name: string;
  category: "diet" | "activity" | "health";
  species: string[];
  age_groups?: string[];
  intensity?: string;
  subtype?: string;
  type?: string;
  description?: string;
  allergens?: string[];
  contraindications?: string[];
  recommendable?: boolean;
  tags?: string[];
  duration_min?: { min?: number; max?: number };
}
export const CATALOG: CatalogRaw[] = [...activities, ...diets, ...healthChecks] as CatalogRaw[];
export const catalogById = new Map(CATALOG.map((c) => [c.item_id, c]));

type Raw = Record<string, unknown>;
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;
let seq = 1;
export const newId = (p: string) => `${p}_mock${(seq++).toString(36).padStart(6, "0")}`;

export interface MockDb {
  today: string;
  users: Raw[];
  pets: Raw[];
  tasks: Raw[];
  events: Raw[];
  weights: Raw[];
  interactions: Raw[];
  prefs: Raw[];
  chat: Raw[];
  session: string | null;
  failures: Record<string, number>; // 엔드포인트 키 → 강제 상태 코드 (테스트용)
}

function fresh(): MockDb {
  return {
    today: "2026-11-10",
    users: clone(seedUsers as Raw[]),
    pets: clone(seedPets as Raw[]),
    tasks: clone(seedTasks as Raw[]),
    events: clone(seedEvents as Raw[]),
    weights: clone(seedWeights as Raw[]),
    interactions: clone(seedInteractions as Raw[]),
    prefs: clone(seedPrefs as Raw[]),
    chat: clone(seedChat as Raw[]),
    session: null,
    failures: {},
  };
}

export let db: MockDb = fresh();
export function resetMockDb() {
  db = fresh();
}

// ── 표현 (Backend presentPet·presentTask와 같은 모양) ──
export function presentPet(p: Raw): Pet {
  const pet = p as unknown as Pet & { neutered: number | boolean };
  return {
    ...pet,
    neutered: Boolean(pet.neutered),
    age_group: ageGroup(pet.species, pet.size, pet.birth_date, db.today) as AgeGroup,
  };
}
export const presentTask = (t: Raw): Task => ({ ...(t as unknown as Task), done: Boolean(t.done) });

export function dDay(due: string, today = db.today) {
  return Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
}

export function presentEvent(e: Raw): HealthEvent {
  const item = catalogById.get(e.catalog_item_id as string);
  return {
    ...(e as unknown as HealthEvent),
    name: item?.name ?? String(e.type),
    d_day: dDay(e.due_date as string),
  };
}

export const userPets = (userId: string) =>
  db.pets
    .filter((p) => p.user_id === userId)
    .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));

// ── 할 일 생성 (Agent /tasks/generate를 흉내: 안전 필터 + 시드 시나리오 값) ──
export function safeCandidates(pet: Raw, category: "diet" | "activity"): CatalogRaw[] {
  const group = ageGroup(
    pet.species as "dog" | "cat",
    pet.size as string | null,
    pet.birth_date as string,
    db.today,
  );
  const allergies = (pet.allergies as string[]) ?? [];
  const conditions = (pet.conditions as string[]) ?? [];
  const disliked = new Set(
    db.prefs
      .filter(
        (p) =>
          p.pet_id === pet.id &&
          p.kind === "dislike" &&
          p.excluded_until &&
          db.today <= String(p.excluded_until),
      )
      .map((p) => p.target),
  );
  return CATALOG.filter(
    (c) =>
      c.category === category &&
      c.recommendable !== false &&
      c.species.includes(pet.species as string) &&
      (!c.age_groups || c.age_groups.includes(group)) &&
      !(c.allergens ?? []).some((a) => allergies.includes(a)) &&
      !(c.contraindications ?? []).some((x) => conditions.includes(x)) &&
      !disliked.has(c.item_id),
  );
}

function titleOf(c: CatalogRaw) {
  const d = c.duration_min;
  if (c.category === "activity" && d?.min)
    return d.max && d.max !== d.min ? `${c.name} ${d.min}~${d.max}분` : `${c.name} ${d.min}분`;
  return c.name;
}

export function generatePlan(
  pet: Raw,
  opts: { category?: "diet" | "activity"; exclude?: string[]; limit?: number } = {},
) {
  const exclude = new Set(opts.exclude ?? []);
  const areas = opts.category ? [opts.category] : (["diet", "activity"] as const);
  const constraint = db.prefs.find(
    (p) => p.user_id === pet.user_id && !p.pet_id && String(p.target).startsWith("activity_time_after:"),
  );
  const after = constraint ? String(constraint.target).split(":").slice(1).join(":") : null;
  const out: Raw[] = [];
  for (const area of areas) {
    const pool = safeCandidates(pet, area).filter((c) => !exclude.has(c.item_id));
    const n = opts.limit ?? (area === "diet" ? 1 : 2);
    pool.slice(0, n).forEach((c, i) => {
      const time =
        area === "diet" ? "08:00" : after ? (i === 0 ? "19:30" : "20:30") : i === 0 ? "18:00" : "19:30";
      out.push({
        category: area,
        catalog_item_id: c.item_id,
        title: titleOf(c),
        time,
        reason: "기본 추천",
        rank: i + 1,
        relaxed: [],
      });
    });
  }
  if (!opts.category) {
    for (const e of db.events.filter((x) => x.pet_id === pet.id)) {
      const d = dDay(e.due_date as string);
      if (e.status === "overdue" || (e.status === "scheduled" && d >= 0 && d <= 7)) {
        const item = catalogById.get(e.catalog_item_id as string);
        const name = (item?.name ?? "건강 일정").split(/[(（·]/)[0].trim();
        out.push({
          category: "health",
          health_event_id: e.id,
          title: `💉 ${name}${e.dose_no ? ` ${e.dose_no}차` : ""} ${d < 0 ? "지연됨" : d === 0 ? "오늘" : `D-${d}`} — 병원 예약하기`,
        });
      }
    }
  }
  return out;
}

export function toTaskRow(pet: Raw, t: Raw): Raw {
  return {
    id: newId("task"),
    user_id: pet.user_id,
    pet_id: pet.id,
    date: db.today,
    time: (t.time as string) ?? null,
    category: t.category,
    source: "auto",
    catalog_item_id: t.catalog_item_id ?? null,
    health_event_id: t.health_event_id ?? null,
    title: t.title,
    done: 0,
    reason: t.reason ?? null,
    rank: t.rank ?? null,
    relaxed: (t.relaxed as string[]) ?? [],
  };
}

export function presentPrefs(petId: string, userId: string) {
  const rows = db.prefs.filter((p) => p.user_id === userId && (!p.pet_id || p.pet_id === petId));
  const view = (p: Raw): Preference =>
    ({
      ...(p as unknown as Preference),
      scope: p.pet_id ? "pet" : "all_pets",
      item_name: catalogById.get(p.target as string)?.name ?? null,
      ...(p.kind === "dislike"
        ? { excluded_now: Boolean(p.excluded_until && db.today <= String(p.excluded_until)) }
        : {}),
    }) as Preference;
  const counts = new Map<string, number>();
  for (const i of db.interactions.filter((x) => x.pet_id === petId && x.signal === "complete")) {
    counts.set(i.catalog_item_id as string, (counts.get(i.catalog_item_id as string) ?? 0) + 1);
  }
  return {
    like: rows.filter((p) => p.kind === "like").map(view),
    dislike: rows.filter((p) => p.kind === "dislike").map(view),
    constraint: rows.filter((p) => p.kind === "constraint").map(view),
    frequent: [...counts]
      .filter(([, n]) => n >= 3)
      .map(([id, n]) => ({ catalog_item_id: id, item_name: catalogById.get(id)?.name ?? null, count: n })),
  };
}

export function presentWeights(petId: string): WeightLog[] {
  return db.weights
    .filter((w) => w.pet_id === petId)
    .sort((a, b) => String(a.date).localeCompare(String(b.date))) as unknown as WeightLog[];
}

export function syncPetWeight(pet: Raw) {
  const logs = presentWeights(pet.id as string);
  if (logs.length) pet.weight_kg = logs[logs.length - 1].weight_kg;
}

export { addDays };
export type { TraceEvent };
