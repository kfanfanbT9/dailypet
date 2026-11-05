import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startFakeAgent } from "./fakeAgent.js";
import { TEST_KEY, USERS, createTestApp, loginAs } from "./helpers.js";

let fake;
beforeAll(async () => (fake = await startFakeAgent()));
afterAll(async () => fake.close());
beforeEach(() => fake.reset());

const KONGI_PLAN = (body) => ({
  date: body.date,
  tasks: body.category
    ? []
    : [
        {
          category: "diet",
          catalog_item_id: "diet_dog_puppy_meal_guide_01",
          title: "퍼피 급여",
          time: "08:00",
          reason: "어린 강아지",
          rank: 1,
          relaxed: [],
        },
        {
          category: "activity",
          catalog_item_id: "act_dog_daily_walk_01",
          title: "산책 20분",
          time: "18:00",
          reason: "기본",
          rank: 1,
          relaxed: [],
        },
        {
          category: "activity",
          catalog_item_id: "act_dog_nosework_find_it_01",
          title: "노즈워크",
          time: "19:30",
          reason: "👎 완화",
          rank: 2,
          relaxed: ["dislike"],
        },
        {
          category: "health",
          health_event_id: "evt_kongi_rabies",
          title: "💉 광견병 D-7 — 병원 예약하기",
          due_date: "2026-11-17",
        },
      ],
});

async function app(opts = {}) {
  return createTestApp({ agentUrl: fake.url, ...opts });
}

describe("오늘 할 일 생성 (S03)", () => {
  it("첫 조회 → Agent 1회, 다시 조회 → 0회·같은 개수, 시간순·건강은 맨 아래, relaxed 저장", async () => {
    fake.state.tasksGenerate = KONGI_PLAN;
    const t = await app();
    const a = await loginAs(t.app, "haneul");
    const first = await a.get("/api/pets/pet_kongi/tasks");
    expect(first.status).toBe(200);
    expect(fake.calls("/tasks/generate")).toHaveLength(1);
    expect(first.body.tasks.map((x) => x.time ?? "-")).toEqual(["08:00", "18:00", "19:30", "-"]);
    expect(first.body.tasks.at(-1)).toMatchObject({
      category: "health",
      health_event_id: "evt_kongi_rabies",
      done: false,
    });
    expect(first.body.tasks.find((x) => x.catalog_item_id === "act_dog_nosework_find_it_01").relaxed).toEqual(
      ["dislike"],
    );
    const second = await a.get("/api/pets/pet_kongi/tasks");
    expect(fake.calls("/tasks/generate")).toHaveLength(1);
    expect(second.body.tasks).toHaveLength(first.body.tasks.length);
  });

  it("요청 본문 user_id는 JWT 사용자, 헤더에 X-Agent-Api-Key", async () => {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    await a.get("/api/pets/pet_bori/tasks");
    const [call] = fake.calls("/tasks/generate");
    expect(call.body).toMatchObject({
      user_id: USERS.jiwoo.id,
      pet_id: "pet_bori",
      date: "2026-11-10",
      keep_item_ids: [],
    });
    expect(call.headers["x-agent-api-key"]).toBe(TEST_KEY);
  });

  it("동시 요청 2개 → Agent 1회", async () => {
    fake.state.delayMs = 150;
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    const [r1, r2] = await Promise.all([
      a.get("/api/pets/pet_bori/tasks"),
      a.get("/api/pets/pet_bori/tasks"),
    ]);
    expect(fake.calls("/tasks/generate")).toHaveLength(1);
    expect(r1.body.tasks.length).toBe(r2.body.tasks.length);
    expect((await t.repos.tasks.listByDate(USERS.jiwoo.id, "pet_bori", "2026-11-10")).length).toBe(
      r1.body.tasks.length,
    );
  });

  it("과거·미래 날짜는 만들지 않는다", async () => {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    expect((await a.get("/api/pets/pet_bori/tasks?date=2026-11-08")).body.tasks).toHaveLength(3);
    expect((await a.get("/api/pets/pet_bori/tasks?date=2026-11-12")).body.tasks).toEqual([]);
    expect(fake.calls("/tasks/generate")).toHaveLength(0);
  });

  it("S22: Agent 중지 + 오늘 목록 있음 → 정상 / 목록 없음 → tasks: [], notice, retryable", async () => {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    await a.get("/api/pets/pet_bori/tasks");
    fake.state.mode = "error";
    const ok = await a.get("/api/pets/pet_bori/tasks");
    expect(ok.body.tasks.length).toBeGreaterThan(0);
    const none = await a.get("/api/pets/pet_nabi/tasks");
    expect(none.status).toBe(200);
    expect(none.body).toMatchObject({ tasks: [], retryable: true });
    expect(none.body.notice).toBeTruthy();
    expect((await a.get("/api/pets")).status).toBe(200);
  });
});

describe("재생성·교체·완료·삭제 (S04)", () => {
  async function seeded() {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    const tasks = (await a.get("/api/pets/pet_bori/tasks")).body.tasks;
    return { t, a, tasks };
  }

  it("재생성: 완료 항목·직접 추가는 남고 keep_item_ids에 완료 항목 ID, confirm 없으면 400", async () => {
    const { a, tasks } = await seeded();
    const diet = tasks.find((x) => x.category === "diet");
    await a.patch(`/api/tasks/${diet.id}`).send({ done: true });
    const custom = (await a.post("/api/pets/pet_bori/tasks").send({ title: "빗질" })).body;
    expect((await a.post("/api/pets/pet_bori/tasks/generate").send({})).status).toBe(400);
    fake.state.tasksGenerate = (body) => ({
      date: body.date,
      tasks: [
        {
          category: "activity",
          catalog_item_id: "act_dog_daily_walk_01",
          title: "산책",
          time: "18:00",
          reason: "r",
          rank: 1,
          relaxed: [],
        },
      ],
    });
    const res = await a.post("/api/pets/pet_bori/tasks/generate").send({ confirm: true });
    expect(res.status).toBe(200);
    const ids = res.body.tasks.map((x) => x.id);
    expect(ids).toContain(diet.id);
    expect(ids).toContain(custom.id);
    expect(res.body.tasks.map((x) => x.catalog_item_id)).not.toContain("act_dog_nosework_find_it_01");
    expect(fake.calls("/tasks/generate").at(-1).body.keep_item_ids).toEqual([diet.catalog_item_id]);
  });

  it("재생성 중 Agent 장애 → 503, 기존 목록 그대로", async () => {
    const { t, a, tasks } = await seeded();
    fake.state.mode = "error";
    const res = await a.post("/api/pets/pet_bori/tasks/generate").send({ confirm: true });
    expect(res.status).toBe(503);
    expect(
      (await t.repos.tasks.listByDate(USERS.jiwoo.id, "pet_bori", "2026-11-10")).map((x) => x.id).sort(),
    ).toEqual(tasks.map((x) => x.id).sort());
  });

  it("교체: exclude_item_ids에 현재 항목 포함·limit 1·swap 신호 1건, 빈 결과 → swapped false·유지", async () => {
    const { t, a, tasks } = await seeded();
    const act = tasks.find((x) => x.category === "activity");
    fake.state.tasksGenerate = (body) => ({
      date: body.date,
      tasks: [
        {
          category: "activity",
          catalog_item_id: "act_dog_daily_walk_01",
          title: "산책 20분",
          time: "07:00",
          reason: "r",
          rank: 1,
          relaxed: [],
        },
      ],
    });
    const res = await a.post(`/api/tasks/${act.id}/swap`);
    expect(res.body).toMatchObject({
      swapped: true,
      task: { catalog_item_id: "act_dog_daily_walk_01", time: act.time },
    });
    const call = fake.calls("/tasks/generate").at(-1).body;
    expect(call).toMatchObject({ category: "activity", limit: 1, keep_item_ids: [] });
    expect(call.exclude_item_ids).toContain(act.catalog_item_id);
    const swaps = await t.repos.interactions.list(USERS.jiwoo.id, { pet_id: "pet_bori", signal: "swap" });
    expect(swaps.map((s) => s.catalog_item_id)).toEqual([act.catalog_item_id]);

    fake.state.tasksGenerate = (body) => ({ date: body.date, tasks: [] });
    const none = await a.post(`/api/tasks/${res.body.task.id}/swap`);
    expect(none.body).toMatchObject({ swapped: false });
    expect(await t.repos.tasks.get(USERS.jiwoo.id, res.body.task.id)).not.toBeNull();
    expect(
      (await t.repos.interactions.list(USERS.jiwoo.id, { pet_id: "pet_bori", signal: "swap" })).length,
    ).toBe(1);
  });

  it("완료 → complete 1건, 되돌리기 → 0건. 자동 항목 삭제 → remove 1건, 직접 추가 삭제 → 신호 없음", async () => {
    const { t, a, tasks } = await seeded();
    const diet = tasks.find((x) => x.category === "diet");
    const countSignal = async (signal) =>
      (
        await t.repos.interactions.list(USERS.jiwoo.id, {
          pet_id: "pet_bori",
          catalog_item_id: diet.catalog_item_id,
          signal,
        })
      ).filter((i) => i.created_at.startsWith("2026-11-10")).length;
    await a.patch(`/api/tasks/${diet.id}`).send({ done: true });
    expect(await countSignal("complete")).toBe(1);
    await a.patch(`/api/tasks/${diet.id}`).send({ done: false });
    expect(await countSignal("complete")).toBe(0);
    expect((await a.delete(`/api/tasks/${diet.id}`)).status).toBe(204);
    expect(await countSignal("remove")).toBe(1);
    const before = (await t.repos.interactions.list(USERS.jiwoo.id)).length;
    const custom = (await a.post("/api/pets/pet_bori/tasks").send({ title: "빗질", time: "21:00" })).body;
    await a.delete(`/api/tasks/${custom.id}`);
    expect((await t.repos.interactions.list(USERS.jiwoo.id)).length).toBe(before);
  });

  it("직접 추가: 카탈로그 항목은 custom 신호, 유해 식품·다른 종 항목은 400, 제목 수정은 custom만", async () => {
    const { t, a, tasks } = await seeded();
    const added = await a
      .post("/api/pets/pet_bori/tasks")
      .send({ catalog_item_id: "act_dog_daily_walk_01", time: "07:00" });
    expect(added.status).toBe(201);
    expect(added.body).toMatchObject({ category: "activity", source: "custom", title: expect.any(String) });
    expect((await t.repos.interactions.list(USERS.jiwoo.id, { signal: "custom" })).length).toBe(1);
    const harmful = t.catalog.list({ category: "diet" }).find((i) => i.recommendable === false);
    expect((await a.post("/api/pets/pet_bori/tasks").send({ catalog_item_id: harmful.item_id })).status).toBe(
      400,
    );
    expect(
      (await a.post("/api/pets/pet_bori/tasks").send({ catalog_item_id: "act_cat_wand_hunt_01" })).status,
    ).toBe(400);
    const auto = tasks.find((x) => x.category === "activity");
    expect((await a.patch(`/api/tasks/${auto.id}`).send({ title: "바꿈" })).status).toBe(400);
  });

  it("건강 할 일은 삭제 불가(400)", async () => {
    fake.state.tasksGenerate = KONGI_PLAN;
    const t = await app();
    const a = await loginAs(t.app, "haneul");
    const tasks = (await a.get("/api/pets/pet_kongi/tasks")).body.tasks;
    const h = tasks.find((x) => x.category === "health");
    expect((await a.delete(`/api/tasks/${h.id}`)).status).toBe(400);
  });

  it("mallory로 보리 할 일 PATCH/DELETE/swap → 404", async () => {
    const { t, tasks } = await seeded();
    const m = await loginAs(t.app, "mallory");
    const id = tasks[0].id;
    expect((await m.patch(`/api/tasks/${id}`).send({ done: true })).status).toBe(404);
    expect((await m.delete(`/api/tasks/${id}`)).status).toBe(404);
    expect((await m.post(`/api/tasks/${id}/swap`)).status).toBe(404);
    expect((await m.get("/api/pets/pet_bori/tasks")).status).toBe(404);
  });
});

describe("카탈로그 조회 — petId 안전 필터 (D5)", () => {
  it("petId를 주면 Agent /catalog/safe 결과로 좁힌다", async () => {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    const res = await a.get("/api/catalog?category=diet&species=dog&petId=pet_bori");
    expect(res.status).toBe(200);
    expect(res.body.map((i) => i.item_id).sort()).toEqual([
      "diet_dog_carrot_treat_01",
      "diet_dog_green_bean_treat_01",
    ]);
    const [call] = fake.calls("/catalog/safe");
    expect(call.body).toEqual({ user_id: USERS.jiwoo.id, pet_id: "pet_bori", category: "diet" });
    expect(call.headers["x-agent-api-key"]).toBe(TEST_KEY);
  });

  it("다른 사용자 petId → 404 (Agent 호출 0회), Agent 장애 → 503 (필터 없는 목록을 주지 않음)", async () => {
    const t = await app();
    const m = await loginAs(t.app, "mallory");
    expect((await m.get("/api/catalog?category=diet&petId=pet_bori")).status).toBe(404);
    expect(fake.calls("/catalog/safe")).toHaveLength(0);
    fake.state.mode = "error";
    const a = await loginAs(t.app, "jiwoo");
    expect((await a.get("/api/catalog?category=diet&petId=pet_bori")).status).toBe(503);
  });

  it("category=health는 정기점검 항목(W03 접종 이력용), 카테고리 없으면 식단·활동만", async () => {
    const t = await app();
    const a = await loginAs(t.app, "haneul");
    const health = (await a.get("/api/catalog?category=health&species=dog")).body;
    expect(health.length).toBeGreaterThan(0);
    expect(health.every((i) => i.category === "health" && i.item_id.startsWith("hc_dog_"))).toBe(true);
    expect(health.find((i) => i.item_id === "hc_dog_dhpp").type).toBe("vaccine");
    const all = (await a.get("/api/catalog?species=dog")).body;
    expect(all.some((i) => i.category === "health")).toBe(false);
  });
});

describe("카탈로그 조회", () => {
  it("/api/catalog?category=diet&species=dog에 harmful_food 없음", async () => {
    const t = await app();
    const a = await loginAs(t.app, "jiwoo");
    const res = await a.get("/api/catalog?category=diet&species=dog");
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.some((i) => i.subtype === "harmful_food")).toBe(false);
    expect(res.body.every((i) => i.species.includes("dog") && i.category === "diet")).toBe(true);
  });
});
