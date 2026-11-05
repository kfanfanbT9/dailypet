// npm run test:chroma — 실제 Chroma 서버(CHROMA_HOST/PORT)의 테스트 전용 database(dailypet_test)만 쓴다.
import { AdminClient } from "chromadb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog.js";
import { createChromaStore, ensureDatabase } from "../src/store/chroma.js";
import { createMemoryStore } from "../src/store/memory.js";
import { loadSeedIntoStore } from "../src/seed/load.js";

const host = process.env.CHROMA_HOST || "localhost";
const port = Number(process.env.CHROMA_PORT || 8001);
const database = "dailypet_test";
const catalog = loadCatalog();

// 같은 조회를 메모리 저장소와 실제 Chroma에 보내 결과를 비교한다 (where 해석 차이 방지)
const QUERIES = [
  ["pets", { where: { user_id: "usr_69d308a849e0" } }],
  ["pets", { where: { allergies: { $contains: "chicken" } } }],
  ["pets", { where: { $and: [{ species: "cat" }, { neutered: 1 }] } }],
  [
    "tasks",
    { where: { $and: [{ user_id: "usr_69d308a849e0" }, { pet_id: "pet_bori" }, { date: "2026-11-08" }] } },
  ],
  ["tasks", { where: { done: { $ne: 1 } } }],
  ["health_events", { where: { status: { $in: ["scheduled", "overdue"] } } }],
  ["health_events", { where: { $and: [{ status: "scheduled" }, { due_ts: { $lte: 1794841200 } }] } }],
  ["interactions", { where: { $and: [{ pet_id: "pet_bori" }, { signal: "complete" }] } }],
  ["preferences", { where: { kind: "dislike" } }],
  ["weight_logs", { where: { $and: [{ pet_id: "pet_bori" }, { weight_kg: { $gte: 34 } }] } }],
];

describe("Chroma 통합 (dailypet_test)", () => {
  let chroma;
  let memory;
  beforeAll(async () => {
    await ensureDatabase({ host, port, database });
    chroma = createChromaStore({ host, port, database });
    await chroma.heartbeat();
    memory = createMemoryStore();
    await loadSeedIntoStore(chroma, catalog);
    await loadSeedIntoStore(memory, catalog);
  }, 60000);

  afterAll(async () => {
    try {
      await new AdminClient({ host, port }).deleteDatabase({ name: database, tenant: "default_tenant" });
    } catch {
      // 정리 실패는 무시
    }
  });

  it("heartbeat와 리스트 메타데이터 $contains", async () => {
    expect(await chroma.heartbeat()).toBe(true);
    const rows = await chroma.get("pets", { where: { allergies: { $contains: "chicken" } } });
    expect(rows.map((r) => r.id)).toEqual(["pet_bori"]);
  });

  it.each(QUERIES.map((q, i) => [i + 1, ...q]))(
    "조회 %i (%s) 결과가 메모리 저장소와 같다",
    async (_i, name, q) => {
      const ids = async (s) => (await s.get(name, q)).map((r) => r.id).sort();
      expect(await ids(chroma)).toEqual(await ids(memory));
      expect((await ids(chroma)).length).toBeGreaterThan(0);
    },
  );

  it("보호 컬렉션은 열지 않는다", async () => {
    await expect(chroma.get("catalog_activity")).rejects.toThrow();
    await expect(chroma.resetCollections(["pet_knowledge"])).rejects.toThrow();
  });
});
