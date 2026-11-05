// MSW 핸들러 — ARCHITECTURE.md 4.2의 모든 /api/* (wireframe 14장). 개발(dev:mock)·테스트 공용.
import { http, HttpResponse, delay, type JsonBodyType } from "msw";
import type { ChatResponse, TraceEvent } from "@/api/types";
import {
  CATALOG,
  MOCK_PASSWORD,
  addDays,
  catalogById,
  db,
  dDay,
  generatePlan,
  newId,
  presentEvent,
  presentPet,
  presentPrefs,
  presentTask,
  presentWeights,
  safeCandidates,
  syncPetWeight,
  toTaskRow,
  userPets,
} from "./db";

type Raw = Record<string, unknown>;
const err = (status: number, code: string, message = "", fields?: string[]) =>
  HttpResponse.json(
    { error: { code, message, ...(fields ? { fields: fields.map((field) => ({ field })) } : {}) } },
    { status },
  );
const ok = (body: JsonBodyType, status = 200) => HttpResponse.json(body, { status });

function failure(key: string) {
  const status = db.failures[key];
  return status
    ? err(status, status === 503 ? "agent_unavailable" : status === 500 ? "internal" : `http_${status}`)
    : null;
}

function currentUser(): Raw | null {
  return db.session ? (db.users.find((u) => u.id === db.session) ?? null) : null;
}

function requireUser() {
  const u = currentUser();
  if (!u) throw err(401, "unauthorized", "로그인이 필요해요.");
  return u;
}
function ownPet(userId: unknown, petId: string) {
  const p = db.pets.find((x) => x.id === petId && x.user_id === userId);
  if (!p) throw err(404, "not_found", "반려동물을 찾을 수 없어요.");
  return p;
}
function ownRow(list: Raw[], userId: unknown, id: string) {
  const r = list.find((x) => x.id === id && x.user_id === userId);
  if (!r) throw err(404, "not_found");
  return r;
}
type Info = { request: Request; params: Record<string, string | readonly string[] | undefined> };
const guard = (fn: (info: Info) => Promise<Response> | Response) => async (info: Info) => {
  try {
    return await fn(info);
  } catch (e) {
    if (e instanceof Response) return e;
    throw e;
  }
};
const body = async (request: Request): Promise<Raw> =>
  ((await request.json().catch(() => ({}))) ?? {}) as Raw;
const nowIso = () => `${db.today}T09:00:00+09:00`;

function recordSignal(user: Raw, petId: string, itemId: string | null, signal: string) {
  db.interactions.push({
    id: newId("int"),
    user_id: user.id,
    pet_id: petId,
    catalog_item_id: itemId,
    signal,
    created_at: nowIso(),
  });
  if (signal === "like" || signal === "dislike") {
    const opposite = signal === "like" ? "dislike" : "like";
    db.prefs = db.prefs.filter((p) => !(p.pet_id === petId && p.target === itemId && p.kind === opposite));
    db.prefs = db.prefs.filter((p) => !(p.pet_id === petId && p.target === itemId && p.kind === signal));
    db.prefs.push({
      id: newId("pref"),
      user_id: user.id,
      pet_id: petId,
      kind: signal,
      target: itemId,
      note: "",
      score: signal === "like" ? 3 : -3,
      excluded_until: signal === "dislike" ? addDays(db.today, 6) : null,
      updated_at: nowIso(),
    });
  }
}

// ── 채팅 목 응답 (trace 형식은 ARCHITECTURE.md 4.1 표) ──
export function mockChat(question: string, pet: Raw, threadId: string): ChatResponse {
  const steps: Omit<TraceEvent, "step">[] = [];
  let answer: string;
  let contexts: string[] = [];
  const q = question;
  const handoff = (to: string) => {
    steps.push({ type: "handoff", from: "supervisor", to });
  };
  const back = (from: string) => steps.push({ type: "handoff", from, to: "supervisor" });
  let interrupted = false;
  let emergency = false;
  if (/무시|시스템 프롬프트|도구 이름/.test(q)) {
    steps.push({ type: "guardrail", stage: "input", agent: "api", reason: "injection" });
    answer = "그 요청은 도와드릴 수 없어요. 반려동물 돌봄에 대해 물어봐 주세요.";
  } else if (/등록해|잡아줘/.test(q)) {
    handoff("health_agent");
    steps.push({
      type: "tool_call",
      agent: "health_agent",
      tool: "create_health_event",
      args: { catalog_item_id: "hc_cat_rabies", due_date: "2026-12-01" },
    });
    steps.push({
      type: "interrupt",
      agent: "health_agent",
      tool: "create_health_event",
      args: { catalog_item_id: "hc_cat_rabies", due_date: "2026-12-01" },
      summary: {
        action: "create",
        item_name: "광견병 예방접종",
        due_date: "2026-12-01",
        dose_no: null,
        pet_id: pet.id,
      },
      thread_id: threadId,
    });
    answer = "다음 작업을 승인해 주세요.\n- 건강 일정 등록: 광견병 예방접종(hc_cat_rabies) 2026-12-01";
    interrupted = true;
  } else if (/KTX|이사|여행|웹/.test(q)) {
    handoff("general_agent");
    steps.push({
      type: "tool_call",
      agent: "general_agent",
      tool: "web_search",
      args: { query: "강아지 KTX 탑승" },
    });
    steps.push({
      type: "tool_result",
      agent: "general_agent",
      tool: "web_search",
      status: "ok",
      count: 2,
      sources: ["https://www.letskorail.com/", "https://www.avma.org/"],
    });
    back("general_agent");
    contexts = ["코레일 안내 (https://www.letskorail.com/): 소형 반려동물은 이동장에 넣어 동반할 수 있어요."];
    answer =
      "소형견은 이동장에 넣으면 KTX에 함께 탈 수 있어요.\n\n출처\n- https://www.letskorail.com/\n- https://www.avma.org/\n\n일반 정보이며 수의사 상담을 대체하지 않아요.";
  } else if (/먹었|토해|경련/.test(q)) {
    emergency = true;
    handoff("general_agent");
    back("general_agent");
    answer =
      "초콜릿은 강아지에게 위험해요. 먹은 양과 시간을 확인하고 바로 가까운 동물병원(야간에는 24시 응급 동물병원)에 가 주세요.";
  } else if (/좋아해|싫어해/.test(q)) {
    handoff("exercise_agent");
    steps.push({
      type: "tool_call",
      agent: "exercise_agent",
      tool: "remember_preference",
      args: { kind: "like", target: "act_cat_kibble_chase_01" },
    });
    steps.push({ type: "tool_result", agent: "exercise_agent", tool: "remember_preference", status: "ok" });
    back("exercise_agent");
    answer = "사료 던져 쫓기 놀이를 좋아한다고 기억해 둘게요!";
  } else if (/식단.*운동|운동.*식단/.test(q)) {
    handoff("diet_agent");
    back("diet_agent");
    handoff("exercise_agent");
    back("exercise_agent");
    contexts = ["노령묘는 소량씩 자주 급여해요.", "관절이 약하면 짧은 저강도 놀이가 좋아요."];
    answer = "식단은 하루 3~4회 나눠 주고, 운동은 10분 이내 저강도 놀이가 좋아요.";
  } else if (/비트코인|주식|앵무새/.test(q)) {
    answer = "죄송해요. 강아지·고양이 돌봄에 대해서만 도와드릴 수 있어요.";
  } else {
    handoff("diet_agent");
    steps.push({
      type: "tool_call",
      agent: "diet_agent",
      tool: "recommend_from_catalog",
      args: { category: "diet", query: "간식", k: 3 },
    });
    steps.push({
      type: "tool_result",
      agent: "diet_agent",
      tool: "recommend_from_catalog",
      status: "ok",
      count: 2,
      item_ids: ["diet_dog_carrot_treat_01", "diet_dog_green_bean_treat_01"],
    });
    back("diet_agent");
    contexts = [
      "당근은 저칼로리 간식으로 좋아요. 잘게 썰어 주세요.",
      "그린빈은 체중 관리 중인 강아지 간식으로 쓸 수 있어요.",
    ];
    answer = `${pet.name}에게는 당근 간식이나 그린빈 간식이 좋아요. 닭고기 알레르기가 있어 닭고기 토핑은 뺐어요.`;
  }
  if (!interrupted)
    steps.push({
      type: "final",
      agent: "supervisor",
      thread_id: threadId,
      ...(emergency ? { emergency: true } : {}),
    });
  return {
    answer,
    contexts,
    trace: steps.map((s, i) => ({ step: i + 1, ...s }) as TraceEvent),
    thread_id: threadId,
  };
}

export const handlers = [
  // ── 인증 ──
  http.post("/api/auth/login", async ({ request }) => {
    const b = await body(request);
    const user = db.users.find(
      (u) =>
        u.email ===
        String(b.email ?? "")
          .trim()
          .toLowerCase(),
    );
    if (!user || b.password !== MOCK_PASSWORD)
      return err(401, "unauthorized", "이메일 또는 비밀번호를 확인해 주세요.");
    db.session = user.id as string;
    return ok({ user_id: user.id, email: user.email, nickname: user.nickname });
  }),
  http.post("/api/auth/signup", async ({ request }) => {
    const b = await body(request);
    const email = String(b.email ?? "")
      .trim()
      .toLowerCase();
    if (db.users.some((u) => u.email === email))
      return err(409, "email_taken", "이미 사용 중인 이메일이에요.");
    const user = {
      id: newId("usr"),
      email,
      nickname: String(b.nickname ?? "").trim(),
      password_hash: "$2b$mock",
      created_at: nowIso(),
    };
    db.users.push(user);
    db.session = user.id;
    return ok({ user_id: user.id, email, nickname: user.nickname }, 201);
  }),
  http.post("/api/auth/logout", () => {
    db.session = null;
    return new HttpResponse(null, { status: 204 });
  }),
  http.get(
    "/api/me",
    guard(() => {
      const u = requireUser();
      return ok({ user_id: u.id, email: u.email, nickname: u.nickname, created_at: u.created_at });
    }),
  ),
  http.delete(
    "/api/me",
    guard(async ({ request }) => {
      const u = requireUser();
      const b = await body(request);
      if (
        String(b.confirm_email ?? "")
          .trim()
          .toLowerCase() !== u.email
      )
        return err(400, "bad_request");
      for (const k of ["pets", "tasks", "events", "weights", "interactions", "prefs", "chat"] as const) {
        db[k] = db[k].filter((r) => r.user_id !== u.id);
      }
      db.users = db.users.filter((x) => x.id !== u.id);
      db.session = null;
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ── 반려동물 ──
  http.get(
    "/api/pets",
    guard(() => ok(userPets(requireUser().id as string).map(presentPet))),
  ),
  http.post(
    "/api/pets",
    guard(async ({ request }) => {
      const u = requireUser();
      const b = await body(request);
      const missing = ["name", "species", "birth_date", "weight_kg"].filter(
        (f) => b[f] === undefined || b[f] === "",
      );
      if (missing.length) return err(400, "bad_request", "입력값을 확인해 주세요", missing);
      const { health_history: _h, ...rest } = b;
      const pet: Raw = {
        breed: "",
        sex: null,
        size: null,
        activity_level: null,
        allergies: [],
        conditions: [],
        memo: "",
        default_times: {},
        ...rest,
        neutered: b.neutered ? 1 : 0,
        id: newId("pet"),
        user_id: u.id,
        created_at: nowIso(),
      };
      db.pets.push(pet);
      // 초기 일정표 (간단 흉내: 종별 핵심 접종 1차, 지났으면 needs_history)
      const core =
        pet.species === "dog" ? ["hc_dog_dhpp", "hc_dog_rabies"] : ["hc_cat_fvrcp", "hc_cat_rabies"];
      for (const id of core) {
        const item = catalogById.get(id) as unknown as {
          type: string;
          dose_schedule?: { at_age_weeks?: number }[];
        };
        const due = addDays(String(pet.birth_date), 7 * (item.dose_schedule?.[0]?.at_age_weeks ?? 8));
        db.events.push({
          id: newId("evt"),
          user_id: u.id,
          pet_id: pet.id,
          catalog_item_id: id,
          type: item.type,
          dose_no: 1,
          due_date: due,
          due_ts: 0,
          status: due < db.today ? "needs_history" : "scheduled",
          completed_date: null,
        });
      }
      return ok(presentPet(pet), 201);
    }),
  ),
  http.get(
    "/api/pets/:id",
    guard(({ params }) => ok(presentPet(ownPet(requireUser().id, params.id as string)))),
  ),
  http.put(
    "/api/pets/:id",
    guard(async ({ params, request }) => {
      const pet = ownPet(requireUser().id, params.id as string);
      const b = await body(request);
      if (b.species && b.species !== pet.species) return err(400, "bad_request", "", ["species"]);
      Object.assign(pet, b, "neutered" in b ? { neutered: b.neutered ? 1 : 0 } : {});
      return ok({ ...presentPet(pet), tasks_outdated: true });
    }),
  ),
  http.delete(
    "/api/pets/:id",
    guard(async ({ params, request }) => {
      const pet = ownPet(requireUser().id, params.id as string);
      const f = failure("deletePet");
      if (f) return f;
      const b = await body(request);
      if (String(b.confirm_name ?? "").trim() !== pet.name) return err(400, "bad_request");
      for (const k of ["tasks", "events", "weights", "interactions", "chat"] as const)
        db[k] = db[k].filter((r) => r.pet_id !== pet.id);
      db.prefs = db.prefs.filter((r) => r.pet_id !== pet.id);
      db.pets = db.pets.filter((p) => p.id !== pet.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),

  // ── 할 일 ──
  http.get(
    "/api/pets/:id/tasks",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const date = new URL(request.url).searchParams.get("date") ?? db.today;
      const existing = db.tasks.filter((t) => t.pet_id === pet.id && t.date === date);
      if (existing.length || date !== db.today) return ok({ date, tasks: existing.map(presentTask) });
      if (db.failures.tasks === 503)
        return ok({
          date,
          tasks: [],
          notice: "추천을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
          retryable: true,
        });
      await delay(10);
      const rows = generatePlan(pet).map((t) => toTaskRow(pet, t));
      db.tasks.push(...rows);
      return ok({ date, tasks: rows.map(presentTask) });
    }),
  ),
  http.post(
    "/api/pets/:id/tasks/generate",
    guard(async ({ params }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const f = failure("regenerate");
      if (f) return f;
      const today = db.tasks.filter((t) => t.pet_id === pet.id && t.date === db.today);
      const keep = today.filter((t) => t.done || t.source === "custom" || t.category === "health");
      db.tasks = db.tasks.filter((t) => !(t.pet_id === pet.id && t.date === db.today && !keep.includes(t)));
      const rows = generatePlan(pet, { exclude: keep.map((t) => t.catalog_item_id as string) })
        .filter((t) => t.category !== "health" || !keep.some((k) => k.health_event_id === t.health_event_id))
        .map((t) => toTaskRow(pet, t));
      db.tasks.push(...rows);
      return ok({ date: db.today, tasks: [...keep, ...rows].map(presentTask) });
    }),
  ),
  http.post(
    "/api/pets/:id/tasks",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const b = await body(request);
      let row: Raw;
      if (b.catalog_item_id) {
        const item = catalogById.get(b.catalog_item_id as string);
        if (!item || item.recommendable === false) return err(400, "bad_request", "", ["catalog_item_id"]);
        row = { category: item.category, catalog_item_id: item.item_id, title: item.name };
        recordSignal(u, pet.id as string, item.item_id, "custom");
      } else {
        row = { category: "custom", catalog_item_id: null, title: b.title };
      }
      const task = {
        id: newId("task"),
        user_id: u.id,
        pet_id: pet.id,
        date: db.today,
        time: b.time ?? null,
        source: "custom",
        health_event_id: null,
        done: 0,
        ...row,
      };
      db.tasks.push(task);
      return ok(presentTask(task), 201);
    }),
  ),
  http.patch(
    "/api/tasks/:id",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const task = ownRow(db.tasks, u.id, params.id as string);
      const f = failure("patchTask");
      if (f) return f;
      const b = await body(request);
      if (b.done !== undefined) {
        if (b.done && !task.done && task.catalog_item_id)
          recordSignal(u, task.pet_id as string, task.catalog_item_id as string, "complete");
        task.done = b.done ? 1 : 0;
      }
      if (b.time !== undefined) task.time = b.time;
      if (b.title !== undefined) task.title = b.title;
      return ok(presentTask(task));
    }),
  ),
  http.delete(
    "/api/tasks/:id",
    guard(({ params }) => {
      const u = requireUser();
      const task = ownRow(db.tasks, u.id, params.id as string);
      if (task.category === "health") return err(400, "bad_request");
      db.tasks = db.tasks.filter((t) => t.id !== task.id);
      if (task.source === "auto" && task.catalog_item_id)
        recordSignal(u, task.pet_id as string, task.catalog_item_id as string, "remove");
      return new HttpResponse(null, { status: 204 });
    }),
  ),
  http.post(
    "/api/tasks/:id/swap",
    guard(({ params }) => {
      const u = requireUser();
      const task = ownRow(db.tasks, u.id, params.id as string);
      const pet = ownPet(u.id, task.pet_id as string);
      const sameDay = db.tasks.filter(
        (t) => t.pet_id === pet.id && t.date === task.date && t.category === task.category,
      );
      const [cand] = generatePlan(pet, {
        category: task.category as "diet" | "activity",
        exclude: sameDay.map((t) => t.catalog_item_id as string),
        limit: 1,
      });
      if (!cand) return ok({ swapped: false, notice: "더 추천할 항목이 없어요.", task: presentTask(task) });
      const row = { ...toTaskRow(pet, cand), time: task.time, date: task.date };
      db.tasks = db.tasks.filter((t) => t.id !== task.id);
      db.tasks.push(row);
      recordSignal(u, pet.id as string, task.catalog_item_id as string, "swap");
      return ok({ swapped: true, task: presentTask(row), replaced: task.id });
    }),
  ),
  http.post(
    "/api/pets/:id/feedback",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const b = await body(request);
      recordSignal(u, pet.id as string, (b.itemId as string) ?? null, b.signal as string);
      return ok({ ok: true }, 201);
    }),
  ),

  // ── 건강 일정·알림 ──
  http.get(
    "/api/pets/:id/health-events",
    guard(({ params }) => {
      const pet = ownPet(requireUser().id, params.id as string);
      const events = db.events.filter((e) => e.pet_id === pet.id).map(presentEvent);
      const byDue = (a: { due_date: string }, b: { due_date: string }) =>
        a.due_date.localeCompare(b.due_date);
      return ok({
        needs_history: events.filter((e) => e.status === "needs_history").sort(byDue),
        upcoming: events.filter((e) => e.status === "scheduled" || e.status === "overdue").sort(byDue),
        done: events.filter((e) => e.status === "done").sort((a, b) => byDue(b, a)),
      });
    }),
  ),
  http.patch(
    "/api/health-events/:id/complete",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const evt = ownRow(db.events, u.id, params.id as string);
      const b = await body(request);
      if (String(b.completed_date) > db.today) return err(400, "bad_request", "", ["completed_date"]);
      if (evt.status === "done") return err(409, "already_done");
      evt.status = "done";
      evt.completed_date = b.completed_date;
      let next = null;
      if (evt.catalog_item_id === "hc_dog_dhpp" && evt.dose_no === 3) {
        next = {
          ...evt,
          id: newId("evt"),
          dose_no: 4,
          due_date: addDays(String(b.completed_date), 28),
          status: "scheduled",
          completed_date: null,
        };
        db.events.push(next);
      }
      db.tasks.filter((t) => t.health_event_id === evt.id).forEach((t) => (t.done = 1));
      return ok({ event: presentEvent(evt), next: next ? presentEvent(next) : null });
    }),
  ),
  http.patch(
    "/api/health-events/:id",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const evt = ownRow(db.events, u.id, params.id as string);
      const b = await body(request);
      if (b.due_date) {
        evt.due_date = b.due_date;
        evt.status = "scheduled";
        return ok({ event: presentEvent(evt), next: null });
      }
      evt.status = "done";
      evt.completed_date = b.last_done_date;
      const next = {
        ...evt,
        id: newId("evt"),
        due_date: addDays(String(b.last_done_date), 28),
        status: "scheduled",
        completed_date: null,
      };
      db.events.push(next);
      return ok({ event: presentEvent(evt), next: presentEvent(next) });
    }),
  ),
  http.get(
    "/api/notifications",
    guard(() => {
      const u = requireUser();
      const pets = userPets(u.id as string);
      const names = new Map(pets.map((p) => [p.id, p.name]));
      const order = { overdue: 0, today: 1, d1: 2, d7: 3 } as const;
      const items = db.events
        .filter((e) => names.has(e.pet_id) && (e.status === "scheduled" || e.status === "overdue"))
        .map((e) => {
          const d = dDay(e.due_date as string);
          const kind =
            e.status === "overdue" ? "overdue" : d === 7 ? "d7" : d === 1 ? "d1" : d === 0 ? "today" : null;
          return kind
            ? {
                event_id: e.id,
                pet_id: e.pet_id,
                pet_name: names.get(e.pet_id),
                catalog_item_id: e.catalog_item_id,
                name: catalogById.get(e.catalog_item_id as string)?.name ?? e.type,
                dose_no: e.dose_no ?? null,
                due_date: e.due_date,
                d_day: d,
                kind,
              }
            : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => order[a.kind as keyof typeof order] - order[b.kind as keyof typeof order]);
      return ok(items);
    }),
  ),

  // ── 체중·취향 ──
  http.get(
    "/api/pets/:id/weights",
    guard(({ params }) =>
      ok(
        presentWeights(ownPet(requireUser().id, params.id as string).id as string) as unknown as JsonBodyType,
      ),
    ),
  ),
  http.post(
    "/api/pets/:id/weights",
    guard(async ({ params, request }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const b = await body(request);
      const [lo, hi] = pet.species === "dog" ? [0.5, 100] : [0.3, 15];
      if (typeof b.weight_kg !== "number" || b.weight_kg < lo || b.weight_kg > hi)
        return err(400, "bad_request", "", ["weight_kg"]);
      const existing = db.weights.find((w) => w.pet_id === pet.id && w.date === b.date);
      if (existing && !b.overwrite) return err(409, "weight_exists");
      const row = existing ?? { id: newId("wt"), user_id: u.id, pet_id: pet.id, date: b.date };
      row.weight_kg = b.weight_kg;
      if (!existing) db.weights.push(row);
      syncPetWeight(pet);
      return ok({ weight: row, pet_weight_kg: pet.weight_kg, tasks_outdated: true }, existing ? 200 : 201);
    }),
  ),
  http.delete(
    "/api/weights/:id",
    guard(({ params }) => {
      const u = requireUser();
      const row = ownRow(db.weights, u.id, params.id as string);
      db.weights = db.weights.filter((w) => w.id !== row.id);
      const pet = ownPet(u.id, row.pet_id as string);
      syncPetWeight(pet);
      return ok({ pet_weight_kg: pet.weight_kg, tasks_outdated: true });
    }),
  ),
  http.get(
    "/api/pets/:id/preferences",
    guard(({ params }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      return ok(presentPrefs(pet.id as string, u.id as string) as unknown as JsonBodyType);
    }),
  ),
  http.delete(
    "/api/pets/:id/preferences/:prefId",
    guard(({ params }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const pref = db.prefs.find(
        (p) => p.id === params.prefId && p.user_id === u.id && (!p.pet_id || p.pet_id === pet.id),
      );
      if (!pref) return err(404, "not_found");
      db.prefs = db.prefs.filter((p) => p !== pref);
      return ok({ deleted: pref.id, scope: pref.pet_id ? "pet" : "all_pets" });
    }),
  ),
  http.delete(
    "/api/pets/:id/preferences",
    guard(({ params }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      db.prefs = db.prefs.filter((p) => p.pet_id !== pet.id);
      db.interactions = db.interactions.filter((p) => p.pet_id !== pet.id);
      return ok({ ok: true });
    }),
  ),

  // ── 카탈로그 (petId가 있으면 반려동물 기준 안전 필터, D5) ──
  http.get(
    "/api/catalog",
    guard(({ request }) => {
      const u = requireUser();
      const q = new URL(request.url).searchParams;
      const petId = q.get("petId");
      const category = q.get("category");
      let items = CATALOG.filter(
        (c) =>
          c.recommendable !== false &&
          (!category || c.category === category) &&
          (!q.get("species") || c.species.includes(q.get("species")!)),
      );
      if (petId && (category === "diet" || category === "activity")) {
        const pet = ownPet(u.id, petId);
        const allowed = new Set(safeCandidates(pet, category).map((c) => c.item_id));
        items = items.filter((c) => allowed.has(c.item_id));
      }
      return ok(
        items.map((c) => ({
          item_id: c.item_id,
          name: c.name,
          category: c.category,
          species: c.species,
          intensity: c.intensity ?? null,
          subtype: c.subtype ?? null,
          type: c.type ?? null,
          summary: (c.description ?? "").slice(0, 80),
          allergens: c.allergens ?? [],
          contraindications: c.contraindications ?? [],
        })),
      );
    }),
  ),

  // ── 채팅·대화 기록 ──
  http.post(
    "/api/chat",
    guard(async ({ request }) => {
      const u = requireUser();
      const b = await body(request);
      const pet = ownPet(u.id, b.petId as string);
      const f = failure("chat");
      if (f) return f;
      await delay(20);
      const threadId =
        (b.threadId as string) ?? `thr_${u.id}_${pet.id}_${(seq2++).toString(16).padStart(8, "0")}`;
      const res = mockChat(String(b.question), pet, threadId);
      db.chat.push({
        id: newId("log"),
        user_id: u.id,
        pet_id: pet.id,
        thread_id: threadId,
        question: b.question,
        answer: res.answer,
        trace: res.trace,
        created_at: `${db.today}T10:${String(db.chat.length).padStart(2, "0")}:00+09:00`,
      });
      return ok(res as unknown as JsonBodyType);
    }),
  ),
  http.post(
    "/api/chat/resume",
    guard(async ({ request }) => {
      const u = requireUser();
      const b = await body(request);
      const threadId = String(b.threadId);
      if (!threadId.startsWith(`thr_${u.id}_`)) return err(403, "forbidden");
      const decision = (b.decisions as { type: string }[])[0]?.type;
      const answer =
        decision === "reject"
          ? "알겠어요. 일정을 등록하지 않았어요."
          : "광견병 예방접종을 12/1로 등록했어요.";
      return ok({
        answer,
        contexts: [],
        trace: [{ step: 1, type: "final", agent: "supervisor", thread_id: threadId }],
        thread_id: threadId,
      });
    }),
  ),
  http.get(
    "/api/pets/:id/threads",
    guard(({ params }) => {
      const u = requireUser();
      const pet = ownPet(u.id, params.id as string);
      const map = new Map<string, Raw>();
      for (const l of db.chat
        .filter((c) => c.pet_id === pet.id)
        .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))) {
        const t = map.get(l.thread_id as string) ?? {
          thread_id: l.thread_id,
          started_at: l.created_at,
          title: String(l.question).slice(0, 30),
          count: 0,
        };
        t.last_at = l.created_at;
        t.count = (t.count as number) + 1;
        map.set(l.thread_id as string, t);
      }
      return ok(
        [...map.values()].sort((a, b) => String(b.last_at).localeCompare(String(a.last_at))) as JsonBodyType,
      );
    }),
  ),
  http.get(
    "/api/threads/:id",
    guard(({ params }) => {
      const u = requireUser();
      const logs = db.chat.filter((c) => c.thread_id === params.id && c.user_id === u.id);
      if (!logs.length) return err(404, "not_found");
      return ok({
        thread_id: params.id,
        pet_id: logs[0].pet_id,
        messages: logs.map(({ question, answer, trace, created_at }) => ({
          question,
          answer,
          trace,
          created_at,
        })),
      } as JsonBodyType);
    }),
  ),
  http.delete(
    "/api/threads/:id",
    guard(({ params }) => {
      const u = requireUser();
      if (!String(params.id).startsWith(`thr_${u.id}_`)) return err(404, "not_found");
      db.chat = db.chat.filter((c) => c.thread_id !== params.id);
      return new HttpResponse(null, { status: 204 });
    }),
  ),
];

let seq2 = 0xa0000000;
export { dDay };
