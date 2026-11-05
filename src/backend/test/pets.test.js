import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { cleanupOrphans } from "../src/services/cascade.js";
import { APP_COLLECTIONS } from "../src/store/record.js";
import { USERS, createTestApp, loginAs } from "./helpers.js";

const BASE = { name: "두부", species: "dog", birth_date: "2026-08-01", weight_kg: 2.0 };

async function snapshotOthers(store, exceptUser) {
  const out = {};
  for (const n of APP_COLLECTIONS)
    out[n] = (await store.get(n)).filter((r) => r.row.user_id !== exceptUser && r.id !== exceptUser).length;
  return out;
}

function checkpointDb(threads) {
  const path = join(mkdtempSync(join(tmpdir(), "dp-cp-")), "cp.sqlite");
  const db = new DatabaseSync(path);
  db.exec("CREATE TABLE checkpoints (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  db.exec("CREATE TABLE writes (thread_id TEXT, checkpoint_ns TEXT, checkpoint_id TEXT)");
  for (const t of threads) {
    db.prepare("INSERT INTO checkpoints VALUES (?, '', '1')").run(t);
    db.prepare("INSERT INTO writes VALUES (?, '', '1')").run(t);
  }
  db.close();
  return path;
}

describe("반려동물 API (F1)", () => {
  it("S01: 두부 등록 → 어린 동물, 기본 일정표 (DHPP 1차·광견병 needs_history)", async () => {
    const t = await createTestApp();
    const agent = request.agent(t.app);
    await agent
      .post("/api/auth/signup")
      .send({ email: "newbie@demo.dailypet", password: "Spring!2026", nickname: "새봄" });
    const res = await agent.post("/api/pets").send({ ...BASE, breed: "말티즈", sex: "male", size: "small" });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "두부", age_group: "junior", neutered: false });
    expect(res.body.id).toMatch(/^pet_[a-z0-9]{10}$/);
    const h = (await agent.get(`/api/pets/${res.body.id}/health-events`)).body;
    const dhpp = h.needs_history.find((e) => e.catalog_item_id === "hc_dog_dhpp");
    expect(dhpp).toMatchObject({ dose_no: 1, due_date: "2026-09-12", status: "needs_history" });
    expect([...h.needs_history, ...h.upcoming].some((e) => e.catalog_item_id === "hc_dog_rabies")).toBe(true);
    expect((await agent.get("/api/pets")).body.map((p) => p.name)).toEqual(["두부"]);
  });

  it("이력이 있으면 다음 회차를 이력 기준으로 만든다", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "haneul");
    const res = await a.post("/api/pets").send({
      ...BASE,
      health_history: [{ catalog_item_id: "hc_dog_dhpp", last_done_date: "2026-10-30", dose_no: 2 }],
    });
    const h = (await a.get(`/api/pets/${res.body.id}/health-events`)).body;
    expect(h.upcoming.find((e) => e.catalog_item_id === "hc_dog_dhpp")).toMatchObject({
      dose_no: 3,
      due_date: "2026-11-20",
    });
  });

  it.each(["name", "species", "birth_date", "weight_kg"])(
    "필수값 %s가 빠지면 400 (필드 이름 포함)",
    async (field) => {
      const t = await createTestApp();
      const a = await loginAs(t.app, "haneul");
      const body = { ...BASE };
      delete body[field];
      const res = await a.post("/api/pets").send(body);
      expect(res.status).toBe(400);
      expect(res.body.error.fields.map((f) => f.field)).toContain(field);
    },
  );

  it("species rabbit·미래 생일·종별 체중 범위 → 400", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "haneul");
    expect((await a.post("/api/pets").send({ ...BASE, species: "rabbit" })).status).toBe(400);
    expect((await a.post("/api/pets").send({ ...BASE, birth_date: "2026-12-01" })).status).toBe(400);
    expect((await a.post("/api/pets").send({ ...BASE, species: "cat", weight_kg: 20 })).status).toBe(400);
    expect(await t.store.count("pets")).toBe(7);
  });

  it("PUT activity_level → 오늘 할 일 그대로, tasks_outdated, species 변경은 400", async () => {
    const t = await createTestApp({ today: "2026-11-08" });
    const a = await loginAs(t.app, "jiwoo");
    const before = await t.repos.tasks.listByDate(USERS.jiwoo.id, "pet_bori", "2026-11-08");
    const res = await a.put("/api/pets/pet_bori").send({ activity_level: "low" });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ activity_level: "low", tasks_outdated: true });
    expect(await t.repos.tasks.listByDate(USERS.jiwoo.id, "pet_bori", "2026-11-08")).toEqual(before);
    expect((await a.put("/api/pets/pet_bori").send({ species: "cat" })).status).toBe(400);
  });

  it("isolation-01: mallory로 보리 GET/PUT/DELETE → 404, 보리 그대로", async () => {
    const t = await createTestApp();
    const m = await loginAs(t.app, "mallory");
    const before = await t.repos.pets.get(USERS.jiwoo.id, "pet_bori");
    expect((await m.get("/api/pets/pet_bori")).status).toBe(404);
    expect((await m.put("/api/pets/pet_bori").send({ name: "해킹" })).status).toBe(404);
    expect((await m.delete("/api/pets/pet_bori").send({ confirm_name: "보리" })).status).toBe(404);
    expect((await m.get("/api/pets/pet_bori/health-events")).status).toBe(404);
    expect(await t.repos.pets.get(USERS.jiwoo.id, "pet_bori")).toEqual(before);
  });
});

describe("연쇄 삭제 (S20)", () => {
  const COCO_THREAD = "thr_usr_3263e0395d81_pet_coco_0d6c1f3a";
  const OTHER_THREAD = "thr_usr_69d308a849e0_pet_bori_aaaaaaaa";

  it("DELETE pet_coco → 모든 컬렉션·checkpoint에서 코코 0건, 다른 사용자 변화 없음", async () => {
    const t = await createTestApp({ checkpointPath: checkpointDb([COCO_THREAD, OTHER_THREAD]) });
    const a = await loginAs(t.app, "leaver");
    const others = await snapshotOthers(t.store, USERS.leaver.id);
    expect((await a.delete("/api/pets/pet_coco").send({ confirm_name: "틀림" })).status).toBe(400);
    expect(await t.repos.pets.get(USERS.leaver.id, "pet_coco")).not.toBeNull();
    expect((await a.delete("/api/pets/pet_coco").send({ confirm_name: "코코" })).status).toBe(204);
    for (const n of APP_COLLECTIONS) {
      expect(
        (await t.store.get(n)).filter((r) => r.row.pet_id === "pet_coco" || r.id === "pet_coco"),
      ).toEqual([]);
    }
    expect(t.deps.checkpoints.countThread(COCO_THREAD)).toBe(0);
    expect(t.deps.checkpoints.countThread(OTHER_THREAD)).toBe(2);
    expect(await snapshotOthers(t.store, USERS.leaver.id)).toEqual(others);
  });

  it("DELETE /api/me → leaver 행 0건, 같은 이메일로 다시 가입", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "leaver");
    expect((await a.delete("/api/me").send({ confirm_email: "wrong@demo.dailypet" })).status).toBe(400);
    expect((await a.delete("/api/me").send({ confirm_email: "LEAVER@demo.dailypet" })).status).toBe(204);
    for (const n of APP_COLLECTIONS) {
      expect(
        (await t.store.get(n)).filter((r) => r.row.user_id === USERS.leaver.id || r.id === USERS.leaver.id),
      ).toEqual([]);
    }
    expect((await a.get("/api/me")).status).toBe(401);
    const again = await t
      .http()
      .post("/api/auth/signup")
      .send({ email: "leaver@demo.dailypet", password: "NewPass!123", nickname: "다시" });
    expect(again.status).toBe(201);
  });

  it("FAULT_INJECT=delete_after:health_events → 500, 프로필 남음 → 해제 후 다시 삭제하면 완료", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "leaver");
    t.setFault("delete_after:health_events");
    expect((await a.delete("/api/pets/pet_coco").send({ confirm_name: "코코" })).status).toBe(500);
    expect(await t.repos.pets.get(USERS.leaver.id, "pet_coco")).not.toBeNull();
    expect(await t.repos.tasks.list(USERS.leaver.id, { pet_id: "pet_coco" })).toEqual([]);
    expect(await t.repos.weights.list(USERS.leaver.id, { pet_id: "pet_coco" })).not.toEqual([]);
    t.setFault("");
    expect((await a.delete("/api/pets/pet_coco").send({ confirm_name: "코코" })).status).toBe(204);
    expect(await t.repos.weights.list(USERS.leaver.id, { pet_id: "pet_coco" })).toEqual([]);
  });

  it("고아 정리: 반려동물 행만 지운 상태 → 하위 데이터 정리, 사용자 없는 반려동물은 연쇄 삭제", async () => {
    const t = await createTestApp();
    await t.store.delete("pets", { ids: ["pet_coco"] });
    await t.store.delete("users", { ids: [USERS.youngja.id] });
    const counts = await cleanupOrphans(t.deps);
    expect(counts.pets).toBe(1); // 호두 (사용자 없음)
    expect(counts.rows).toBeGreaterThan(0);
    for (const n of APP_COLLECTIONS) {
      const left = (await t.store.get(n)).filter((r) => ["pet_coco", "pet_hodu"].includes(r.row.pet_id));
      expect(left).toEqual([]);
    }
    expect((await t.store.get("preferences")).some((r) => r.row.user_id === USERS.leaver.id)).toBe(false);
    expect(await cleanupOrphans(t.deps)).toEqual({ pets: 0, rows: 0 });
  });
});
