// npm run test:agent — 실제 Agent(:8000) + 실제 Chroma(:8001) 통합 확인 (A-9 이후).
// ⚠️ Agent는 기본 database의 앱 데이터를 읽으므로 이 테스트는 data/chroma(데모 데이터)를 쓴다.
//    시작과 끝에 기본 시드로 되돌린다 (seed:reset과 같음). 채팅 테스트는 Bedrock을 호출한다.
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgentClient } from "../src/agentClient.js";
import { createApp } from "../src/app.js";
import { loadCatalog } from "../src/catalog.js";
import { createCheckpoints } from "../src/checkpoints.js";
import { loadConfig } from "../src/config.js";
import { markOverdue } from "../src/jobs/overdue.js";
import { ROUTERS } from "../src/routes/index.js";
import { createChromaStore } from "../src/store/chroma.js";
import { createRepos } from "../src/store/repos.js";
import { loadSeedIntoStore } from "../src/seed/load.js";
import { DEMO_PASSWORD, USERS } from "./helpers.js";

const TODAY = "2026-11-10";
const env = { ...process.env };
const base = loadConfig(env, { requireSecrets: false });
const catalog = loadCatalog();
const store = createChromaStore({ host: base.chroma.host, port: base.chroma.port });
const config = { ...base, jwtSecret: "agent-test-jwt", today: () => TODAY };
const agent = createAgentClient({ baseUrl: base.agentUrl, apiKey: base.agentApiKey ?? "" });
const deps = {
  repos: createRepos(store, { catalog }),
  catalog,
  agent,
  config,
  checkpoints: createCheckpoints(base.checkpointPath),
  routers: ROUTERS,
};
const app = createApp(deps);

async function reseed() {
  await loadSeedIntoStore(store, catalog);
  await markOverdue(store, TODAY);
}

async function login(who) {
  const a = request.agent(app);
  const res = await a.post("/api/auth/login").send({ email: USERS[who].email, password: DEMO_PASSWORD });
  expect(res.status).toBe(200);
  return a;
}

describe("실제 Agent 통합", () => {
  beforeAll(async () => {
    if (!base.agentApiKey) throw new Error("AGENT_API_KEY가 없다 (.env)");
    await agent.health(); // Agent가 꺼져 있으면 여기서 실패
    await reseed();
  }, 60000);
  afterAll(async () => reseed(), 60000);

  it("보리 11/10 할 일 생성: 식단·활동 1개 이상, 활동 상위 3개에 노즈워크, 1초 이내", async () => {
    const a = await login("jiwoo");
    const t0 = performance.now();
    const res = await a.get("/api/pets/pet_bori/tasks");
    const ms = performance.now() - t0;
    expect(res.status).toBe(200);
    const acts = res.body.tasks.filter((t) => t.category === "activity");
    expect(res.body.tasks.some((t) => t.category === "diet")).toBe(true);
    expect(acts.length).toBeGreaterThan(0);
    expect(acts.filter((t) => t.rank <= 3).map((t) => t.catalog_item_id)).toContain(
      "act_dog_nosework_find_it_01",
    );
    expect(res.body.tasks.every((t) => t.category === "health" || catalog.has(t.catalog_item_id))).toBe(true);
    expect(ms).toBeLessThan(1000);
  });

  it("교체: 같은 영역의 다른 카탈로그 항목 또는 swapped:false", async () => {
    const a = await login("jiwoo");
    const tasks = (await a.get("/api/pets/pet_bori/tasks")).body.tasks;
    const act = tasks.find((t) => t.category === "activity");
    const res = await a.post(`/api/tasks/${act.id}/swap`);
    expect(res.status).toBe(200);
    if (res.body.swapped) {
      expect(res.body.task.category).toBe("activity");
      expect(tasks.map((t) => t.catalog_item_id)).not.toContain(res.body.task.catalog_item_id);
    }
  });

  it("S06 대화 → 같은 thread로 이어서 질문 → 대화 목록에 thread 1개(2건)", async () => {
    const a = await login("jiwoo");
    const first = await a.post("/api/chat").send({ question: "보리 간식 추천해줘", petId: "pet_bori" });
    expect(first.status).toBe(200);
    expect(first.body.thread_id).toMatch(/^thr_usr_69d308a849e0_pet_bori_/);
    expect(first.body.answer).not.toContain("diet_dog_chicken_topping_01"); // 닭고기 알레르기
    const second = await a
      .post("/api/chat")
      .send({ question: "그중 칼로리가 낮은 건?", petId: "pet_bori", threadId: first.body.thread_id });
    expect(second.status).toBe(200);
    expect(second.body.thread_id).toBe(first.body.thread_id);
    const threads = (await a.get("/api/pets/pet_bori/threads")).body;
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({ thread_id: first.body.thread_id, count: 2 });
  }, 240000);

  it("HITL: 일정 등록 요청 → 승인 대기 → resume 승인 → 일정 저장, 다른 사용자 resume 403", async () => {
    const a = await login("jiwoo");
    const res = await a
      .post("/api/chat")
      .send({ question: "나비 광견병 접종 2026-12-01로 등록해줘", petId: "pet_nabi" });
    expect(res.status).toBe(200);
    const intr = res.body.trace.find((e) => e.type === "interrupt");
    expect(intr?.tool).toBe("create_health_event");
    const m = await login("mallory");
    expect(
      (
        await m
          .post("/api/chat/resume")
          .send({ threadId: res.body.thread_id, decisions: [{ type: "approve" }] })
      ).status,
    ).toBe(403);
    const done = await a
      .post("/api/chat/resume")
      .send({ threadId: res.body.thread_id, decisions: [{ type: "approve" }] });
    expect(done.status).toBe(200);
    const events = await deps.repos.healthEvents.list(USERS.jiwoo.id, {
      pet_id: "pet_nabi",
      due_date: "2026-12-01",
    });
    expect(events.map((e) => e.catalog_item_id)).toContain("hc_cat_rabies");
  }, 240000);
});
