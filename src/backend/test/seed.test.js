import { cpSync, mkdtempSync, readFileSync as readFile, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAgentClient } from "../src/agentClient.js";
import { loadCatalog } from "../src/catalog.js";
import { createCheckpoints } from "../src/checkpoints.js";
import { SEED_DIR, loadSeedIntoStore } from "../src/seed/load.js";
import { checkpointInside, resetSeed } from "../src/seed/reset.js";
import { createMemoryStore } from "../src/store/memory.js";
import { APP_COLLECTIONS } from "../src/store/record.js";
import { startFakeAgent } from "./fakeAgent.js";
import { TEST_KEY } from "./helpers.js";

const catalog = loadCatalog();
const quiet = () => {};

function seedFileCounts() {
  return Object.fromEntries(
    APP_COLLECTIONS.map((n) => [n, JSON.parse(readFile(join(SEED_DIR, `${n}.json`), "utf8")).length]),
  );
}

async function snapshot(store) {
  const out = {};
  for (const n of APP_COLLECTIONS) {
    out[n] = (await store.get(n)).map((r) => [r.id, r.row]).sort(([a], [b]) => a.localeCompare(b));
  }
  return out;
}

function makeCheckpointDb() {
  const path = join(mkdtempSync(join(tmpdir(), "dp-seed-")), "cp.sqlite");
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE checkpoints (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  db.exec("CREATE TABLE writes (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  db.prepare("INSERT INTO checkpoints VALUES (?, '', '1')").run("thr_a");
  db.prepare("INSERT INTO writes VALUES (?, '', '1')").run("thr_a");
  db.close();
  return path;
}

describe("seed:reset", () => {
  let fake;
  beforeAll(async () => (fake = await startFakeAgent()));
  afterAll(async () => fake.close());
  const agentClient = () => createAgentClient({ baseUrl: fake.url, apiKey: TEST_KEY });

  it("건수가 시드 파일과 같고, 사용자 6·반려동물 7", async () => {
    const store = createMemoryStore();
    const { counts } = await resetSeed({
      store,
      catalog,
      agent: agentClient(),
      today: "2026-11-10",
      out: quiet,
    });
    expect(counts).toEqual(seedFileCounts());
    expect(counts.users).toBe(6);
    expect(counts.pets).toBe(7);
  });

  it("두 번 연속 실행해도 id 집합과 document가 같다", async () => {
    const store = createMemoryStore();
    await resetSeed({ store, catalog, agent: agentClient(), today: "2026-11-10", out: quiet });
    const first = await snapshot(store);
    await store.upsert("pets", [{ ...first.pets[0][1], name: "바뀜" }]);
    await resetSeed({ store, catalog, agent: agentClient(), today: "2026-11-10", out: quiet });
    expect(await snapshot(store)).toEqual(first);
  });

  it("카탈로그 컬렉션 표시 행은 그대로 남는다", async () => {
    const store = createMemoryStore();
    await store.rawPut("catalog_activity", "marker", "{}", { m: 1 });
    await resetSeed({ store, catalog, agent: agentClient(), today: "2026-11-10", out: quiet });
    expect((await store.get("catalog_activity")).map((r) => r.id)).toEqual(["marker"]);
  });

  it("변형 mocha_joint · hodu_dislikes", async () => {
    const store = createMemoryStore();
    await resetSeed({
      store,
      catalog,
      agent: agentClient(),
      today: "2026-11-10",
      variant: "mocha_joint",
      out: quiet,
    });
    const [mocha] = await store.get("pets", { ids: ["pet_mocha"] });
    expect(mocha.row.conditions).toContain("joint_disease");
    await resetSeed({
      store,
      catalog,
      agent: agentClient(),
      today: "2026-11-10",
      variant: "hodu_dislikes",
      out: quiet,
    });
    const dislikes = await store.get("interactions", {
      where: { $and: [{ pet_id: "pet_hodu" }, { signal: "dislike" }] },
    });
    expect(dislikes.length).toBe(9);
  });

  it("bori_pending_hitl → setup_queries를 시드 순서대로 Agent에 보낸다", async () => {
    fake.reset();
    fake.state.query = (body) => ({
      status: 200,
      body: {
        answer: "승인해 주세요",
        contexts: [],
        trace: [{ type: "interrupt", tool: "create_health_event", thread_id: body.thread_id }],
      },
    });
    const store = createMemoryStore();
    await resetSeed({
      store,
      catalog,
      agent: agentClient(),
      today: "2026-11-10",
      variant: "bori_pending_hitl",
      out: quiet,
    });
    const calls = fake.calls("/query");
    expect(calls).toHaveLength(1);
    expect(calls[0].body).toMatchObject({
      user_id: "usr_69d308a849e0",
      pet_id: "pet_bori",
      thread_id: "thr_usr_69d308a849e0_pet_bori_7a1e4c2b",
    });
    expect(calls[0].headers["x-agent-api-key"]).toBe(TEST_KEY);
  });

  it("Agent가 꺼져 있으면 setup_queries 변형은 실패한다", async () => {
    const down = createAgentClient({ baseUrl: "http://127.0.0.1:1", apiKey: TEST_KEY });
    await expect(
      resetSeed({
        store: createMemoryStore(),
        catalog,
        agent: down,
        today: "2026-11-10",
        variant: "bori_pending_hitl",
        out: quiet,
      }),
    ).rejects.toThrow();
  });

  it("잘못된 행이 섞인 시드 → 실패하고 아무것도 쓰지 않는다", async () => {
    const dir = mkdtempSync(join(tmpdir(), "dp-badseed-"));
    cpSync(SEED_DIR, dir, { recursive: true });
    const pets = JSON.parse(readFile(join(dir, "pets.json"), "utf8"));
    pets[0].species = "rabbit";
    writeFileSync(join(dir, "pets.json"), JSON.stringify(pets));
    const store = createMemoryStore();
    await store.upsert("users", [{ id: "usr_keep", email: "k@k.k", password_hash: "$2b$x", nickname: "k" }]);
    await expect(loadSeedIntoStore(store, catalog, { dir })).rejects.toThrow(/검증 실패/);
    expect((await store.get("users")).map((r) => r.id)).toEqual(["usr_keep"]);
  });

  it("checkpoint는 테이블을 비우고 파일은 남긴다", async () => {
    const path = makeCheckpointDb();
    const cps = createCheckpoints(path);
    expect(cps.countThread("thr_a")).toBe(2);
    await resetSeed({
      store: createMemoryStore(),
      catalog,
      agent: agentClient(),
      checkpoints: cps,
      today: "2026-11-10",
      out: quiet,
    });
    expect(cps.countThread("thr_a")).toBe(0);
  });

  it("CHECKPOINT_PATH가 data/checkpoints 밖이면 거부", () => {
    expect(checkpointInside("/root/data/checkpoints/cp.sqlite", "/root/data/checkpoints")).toBe(true);
    expect(checkpointInside("/root/data/other.sqlite", "/root/data/checkpoints")).toBe(false);
    expect(checkpointInside("/root/data/checkpoints", "/root/data/checkpoints")).toBe(false);
  });
});
