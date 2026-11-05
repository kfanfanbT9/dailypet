import { describe, expect, it } from "vitest";
import { USERS, createTestApp, loginAs } from "./helpers.js";

describe("체중 (S05, 보리)", () => {
  it("11/10 33.2kg 추가 → 프로필 33.2, 목록 35.0 → 34.0 → 33.2", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    const res = await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-10", weight_kg: 33.2 });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ pet_weight_kg: 33.2, tasks_outdated: true });
    expect((await a.get("/api/pets/pet_bori")).body.weight_kg).toBe(33.2);
    expect((await a.get("/api/pets/pet_bori/weights")).body.map((w) => w.weight_kg)).toEqual([
      35.0, 34.0, 33.2,
    ]);
  });

  it("개 0·150kg 400, 미래 날짜 400, 같은 날 409 → overwrite로 덮어씀(하루 1건)", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    for (const w of [0, 150])
      expect(
        (await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-10", weight_kg: w })).status,
      ).toBe(400);
    expect(
      (await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-11", weight_kg: 33 })).status,
    ).toBe(400);
    await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-10", weight_kg: 33.2 });
    const dup = await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-10", weight_kg: 33.0 });
    expect(dup.status).toBe(409);
    const ow = await a
      .post("/api/pets/pet_bori/weights")
      .send({ date: "2026-11-10", weight_kg: 33.0, overwrite: true });
    expect(ow.status).toBe(200);
    const logs = (await a.get("/api/pets/pet_bori/weights")).body.filter((w) => w.date === "2026-11-10");
    expect(logs).toHaveLength(1);
    expect(logs[0].weight_kg).toBe(33.0);
  });

  it("고양이 범위는 0.3~15kg", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    expect(
      (await a.post("/api/pets/pet_nabi/weights").send({ date: "2026-11-10", weight_kg: 16 })).status,
    ).toBe(400);
  });

  it("최신이 아닌 과거 날짜 추가 → 프로필 체중 그대로, 최신 삭제 → 남은 최신으로", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    const added = await a.post("/api/pets/pet_bori/weights").send({ date: "2026-11-10", weight_kg: 33.2 });
    await a.post("/api/pets/pet_bori/weights").send({ date: "2026-09-01", weight_kg: 36.0 });
    expect((await a.get("/api/pets/pet_bori")).body.weight_kg).toBe(33.2);
    const del = await a.delete(`/api/weights/${added.body.weight.id}`);
    expect(del.body.pet_weight_kg).toBe(34.0);
    expect((await a.get("/api/pets/pet_bori")).body.weight_kg).toBe(34.0);
  });

  it("mallory로 보리 체중 기록 삭제 → 404", async () => {
    const t = await createTestApp();
    const [w] = await t.repos.weights.list(USERS.jiwoo.id, { pet_id: "pet_bori" });
    const m = await loginAs(t.app, "mallory");
    expect((await m.delete(`/api/weights/${w.id}`)).status).toBe(404);
  });
});

describe("취향 (S04·S21)", () => {
  it("모카 👍 → like 행 id가 Python remember_preference와 같다 (pref_pet_mocha_350835c502)", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "seojun");
    const res = await a
      .post("/api/pets/pet_mocha/feedback")
      .send({ itemId: "act_cat_kibble_chase_01", signal: "like" });
    expect(res.status).toBe(201);
    const pref = await t.repos.preferences.get(USERS.seojun.id, "pref_pet_mocha_350835c502");
    expect(pref).toMatchObject({
      kind: "like",
      target: "act_cat_kibble_chase_01",
      score: 3,
      excluded_until: null,
    });
  });

  it("11/08 👎 → excluded_until 2026-11-14, 👍 후 👎 → like 행 없음", async () => {
    const t = await createTestApp({ today: "2026-11-08" });
    const a = await loginAs(t.app, "seojun");
    await a.post("/api/pets/pet_mocha/feedback").send({ itemId: "act_cat_kibble_chase_01", signal: "like" });
    await a
      .post("/api/pets/pet_mocha/feedback")
      .send({ itemId: "act_cat_kibble_chase_01", signal: "dislike" });
    const prefs = (await a.get("/api/pets/pet_mocha/preferences")).body;
    expect(prefs.like.map((p) => p.target)).not.toContain("act_cat_kibble_chase_01");
    const d = prefs.dislike.find((p) => p.target === "act_cat_kibble_chase_01");
    expect(d).toMatchObject({ excluded_until: "2026-11-14", excluded_now: true, score: -3, scope: "pet" });
    const ints = await t.repos.interactions.list(USERS.seojun.id, {
      catalog_item_id: "act_cat_kibble_chase_01",
    });
    expect(ints.map((i) => i.signal).sort()).toEqual(["dislike", "like"]);
  });

  it("박서준 공통 제약이 모카 취향 화면에 scope all_pets로 나온다, 공통 행 삭제 응답도 all_pets", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "seojun");
    const prefs = (await a.get("/api/pets/pet_mocha/preferences")).body;
    expect(prefs.constraint).toMatchObject([{ target: "activity_time_after:19:00", scope: "all_pets" }]);
    const del = await a.delete("/api/pets/pet_mocha/preferences/pref_seojun_time_constraint");
    expect(del.body).toEqual({ deleted: "pref_seojun_time_constraint", scope: "all_pets" });
  });

  it("S21: 보리 전체 초기화 → 취향 빈 목록(공통 제외), 보리 신호 0건, 나비 그대로", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    await a
      .post("/api/pets/pet_bori/feedback")
      .send({ itemId: "act_dog_nosework_find_it_01", signal: "like" });
    await a.post("/api/pets/pet_nabi/feedback").send({ itemId: "act_cat_wand_hunt_01", signal: "like" });
    const nabiBefore = await t.repos.interactions.list(USERS.jiwoo.id, { pet_id: "pet_nabi" });
    const res = await a.delete("/api/pets/pet_bori/preferences");
    expect(res.status).toBe(200);
    const prefs = (await a.get("/api/pets/pet_bori/preferences")).body;
    expect([...prefs.like, ...prefs.dislike, ...prefs.constraint]).toEqual([]);
    expect(await t.repos.interactions.list(USERS.jiwoo.id, { pet_id: "pet_bori" })).toEqual([]);
    expect(await t.repos.interactions.list(USERS.jiwoo.id, { pet_id: "pet_nabi" })).toEqual(nabiBefore);
  });

  it("D4: 보리 노즈워크 완료 3회 → frequent에 이름·횟수, 2회 이하는 없음, 초기화하면 빈 목록", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "jiwoo");
    const prefs = (await a.get("/api/pets/pet_bori/preferences")).body;
    expect(prefs.frequent).toEqual([
      { catalog_item_id: "act_dog_nosework_find_it_01", item_name: expect.any(String), count: 3 },
    ]);
    expect((await a.get("/api/pets/pet_nabi/preferences")).body.frequent).toEqual([]);
    await a.delete("/api/pets/pet_bori/preferences");
    expect((await a.get("/api/pets/pet_bori/preferences")).body.frequent).toEqual([]);
  });

  it("없는 카탈로그 ID 400, 다른 반려동물의 취향 행 삭제 404", async () => {
    const t = await createTestApp();
    const a = await loginAs(t.app, "seojun");
    expect(
      (await a.post("/api/pets/pet_mocha/feedback").send({ itemId: "act_cat_fake_99", signal: "like" }))
        .status,
    ).toBe(400);
    const j = await loginAs(t.app, "jiwoo");
    expect((await j.delete("/api/pets/pet_bori/preferences/pref_mocha_dislike_wand")).status).toBe(404);
  });
});
