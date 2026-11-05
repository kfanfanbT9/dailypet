import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { startFakeAgent } from "./fakeAgent.js";
import { TEST_KEY, USERS, captureLogs, createTestApp, loginAs } from "./helpers.js";

let fake;
beforeAll(async () => (fake = await startFakeAgent()));
afterAll(async () => fake.close());
beforeEach(() => fake.reset());

const COCO_THREAD = "thr_usr_3263e0395d81_pet_coco_0d6c1f3a";

function checkpointDb(threads) {
  const path = join(mkdtempSync(join(tmpdir(), "dp-cp-")), "cp.sqlite");
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE checkpoints (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  db.exec("CREATE TABLE writes (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  for (const t of threads) db.prepare("INSERT INTO checkpoints VALUES (?, '', '1')").run(t);
  db.close();
  return path;
}

describe("채팅 프록시", () => {
  it("Agent에 JWT user_id를 넘긴다 (본문 user_id 무시), 응답에 thread_id", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const a = await loginAs(t.app, "jiwoo");
    const res = await a
      .post("/api/chat")
      .send({ question: "보리 간식 추천해줘", petId: "pet_bori", user_id: USERS.mallory.id });
    expect(res.status).toBe(200);
    expect(Object.keys(res.body).sort()).toEqual(["answer", "contexts", "thread_id", "trace"]);
    const [call] = fake.calls("/query");
    expect(call.body).toEqual({
      question: "보리 간식 추천해줘",
      user_id: USERS.jiwoo.id,
      pet_id: "pet_bori",
    });
    expect(call.headers["x-agent-api-key"]).toBe(TEST_KEY);
    expect(res.body.thread_id).toMatch(/^thr_usr_69d308a849e0_pet_bori_/);
  });

  it("다른 사용자 petId → 404, 다른 반려동물·사용자 threadId → 404, Agent 호출 0회", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const a = await loginAs(t.app, "mallory");
    expect((await a.post("/api/chat").send({ question: "q", petId: "pet_bori" })).status).toBe(404);
    const j = await loginAs(t.app, "jiwoo");
    const nabiThread = "thr_usr_69d308a849e0_pet_nabi_0123456789abcdef";
    expect(
      (await j.post("/api/chat").send({ question: "q", petId: "pet_bori", threadId: nabiThread })).status,
    ).toBe(404);
    expect(fake.calls("/query")).toHaveLength(0);
  });

  it("isolation-04: 다른 사용자 thread로 resume → 403, Agent 호출 0회", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const m = await loginAs(t.app, "mallory");
    const res = await m
      .post("/api/chat/resume")
      .send({ threadId: "thr_usr_69d308a849e0_pet_bori_7a1e4c2b", decisions: [{ type: "approve" }] });
    expect(res.status).toBe(403);
    expect(fake.calls("/query/resume")).toHaveLength(0);
  });

  it("resume decisions 형식 검사, Agent 409는 같은 코드로", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const a = await loginAs(t.app, "jiwoo");
    const tid = "thr_usr_69d308a849e0_pet_bori_7a1e4c2b";
    expect(
      (await a.post("/api/chat/resume").send({ threadId: tid, decisions: [{ type: "maybe" }] })).status,
    ).toBe(400);
    fake.state.resume = () => ({
      status: 409,
      body: {
        answer: "승인을 기다리는 작업이 없어요.",
        contexts: [],
        trace: [{ step: 1, type: "error", reason: "no_pending_action" }],
      },
    });
    const res = await a.post("/api/chat/resume").send({ threadId: tid, decisions: [{ type: "approve" }] });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("no_pending_action");
    expect(fake.calls("/query/resume")[0].body).toEqual({
      user_id: USERS.jiwoo.id,
      thread_id: tid,
      decisions: [{ type: "approve" }],
    });
  });

  it("S22: Agent 중지 → /api/chat 503, /api/pets 정상", async () => {
    const t = await createTestApp({ agentUrl: "http://127.0.0.1:1" });
    const a = await loginAs(t.app, "jiwoo");
    const res = await a.post("/api/chat").send({ question: "보리 간식", petId: "pet_bori" });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe("agent_unavailable");
    expect((await a.get("/api/pets")).status).toBe(200);
  });

  it("응답 지연이 타임아웃을 넘으면 503 (타임아웃을 짧게 설정해 재현)", async () => {
    fake.state.delayMs = 400;
    const t = await createTestApp({ agentUrl: fake.url, queryTimeoutMs: 100 });
    const a = await loginAs(t.app, "jiwoo");
    expect((await a.post("/api/chat").send({ question: "보리 간식", petId: "pet_bori" })).status).toBe(503);
  });

  it("질문 1,000자 초과 400 (Agent 호출 0회)", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const a = await loginAs(t.app, "jiwoo");
    expect((await a.post("/api/chat").send({ question: "가".repeat(1001), petId: "pet_bori" })).status).toBe(
      400,
    );
    expect(fake.calls("/query")).toHaveLength(0);
  });

  it("로그에 질문·쿠키·AGENT_API_KEY가 없다", async () => {
    const t = await createTestApp({ agentUrl: fake.url });
    const a = await loginAs(t.app, "jiwoo");
    const stop = captureLogs();
    await a.post("/api/chat").send({ question: "비밀질문 010-1234-5678", petId: "pet_bori" });
    const logs = stop().join("\n");
    expect(logs).toContain("/api/chat");
    expect(logs).not.toContain("비밀질문");
    expect(logs).not.toContain("010-1234-5678");
    expect(logs).not.toContain("dp_session");
    expect(logs).not.toContain(TEST_KEY);
  });
});

describe("대화 기록 (S16)", () => {
  it("코코 대화 1건이 코코 목록에 나오고, 나비 목록에는 보리 대화가 없다", async () => {
    const t = await createTestApp();
    const leaver = await loginAs(t.app, "leaver");
    const list = (await leaver.get("/api/pets/pet_coco/threads")).body;
    expect(list).toMatchObject([
      { thread_id: COCO_THREAD, count: 1, title: "코코 하루에 물 얼마나 줘야 해?" },
    ]);
    const detail = (await leaver.get(`/api/threads/${COCO_THREAD}`)).body;
    expect(detail.messages).toHaveLength(1);
    const j = await loginAs(t.app, "jiwoo");
    await t.store.upsert("chat_logs", [
      {
        id: "log_bori_x",
        user_id: USERS.jiwoo.id,
        pet_id: "pet_bori",
        thread_id: "thr_usr_69d308a849e0_pet_bori_aaaaaaaa",
        question: "보리?",
        answer: "a",
        trace: [],
        created_at: "2026-11-10T09:00:00+09:00",
      },
    ]);
    expect((await j.get("/api/pets/pet_nabi/threads")).body).toEqual([]);
    expect((await j.get("/api/pets/pet_bori/threads")).body).toHaveLength(1);
    expect((await j.get(`/api/threads/${COCO_THREAD}`)).status).toBe(404);
  });

  it("thread 삭제 → chat_logs 0건, checkpoint 0건", async () => {
    const t = await createTestApp({ checkpointPath: checkpointDb([COCO_THREAD]) });
    const a = await loginAs(t.app, "leaver");
    expect(t.deps.checkpoints.countThread(COCO_THREAD)).toBe(1);
    expect((await a.delete(`/api/threads/${COCO_THREAD}`)).status).toBe(204);
    expect(await t.repos.chatLogs.list(USERS.leaver.id, { thread_id: COCO_THREAD })).toEqual([]);
    expect(t.deps.checkpoints.countThread(COCO_THREAD)).toBe(0);
    const m = await loginAs(t.app, "mallory");
    expect((await m.delete(`/api/threads/${COCO_THREAD}`)).status).toBe(404);
  });
});
