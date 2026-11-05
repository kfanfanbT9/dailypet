import { describe, expect, it } from "vitest";
import { loadCatalog } from "../src/catalog.js";
import { createMemoryStore, matchWhere } from "../src/store/memory.js";
import { createRepos } from "../src/store/repos.js";
import { validateRow } from "../src/store/validate.js";
import { loadSeedIntoStore, readSeed, validateSeed } from "../src/seed/load.js";
import { USERS } from "./helpers.js";

const catalog = loadCatalog();
const fields = (c, row) => validateRow(c, row, { catalog }).map((e) => e.field);
const pet = {
  id: "pet_x",
  user_id: "usr_a",
  name: "x",
  species: "dog",
  birth_date: "2025-01-01",
  weight_kg: 5,
};
const task = {
  id: "task_x",
  user_id: "usr_a",
  pet_id: "pet_x",
  date: "2026-11-10",
  category: "diet",
  source: "auto",
  title: "t",
  done: 0,
};

describe("validate (schema.md CHECK)", () => {
  it("시드 전체가 제약을 지킨다", () => {
    expect(validateSeed(readSeed().rows, catalog)).toEqual([]);
    expect(catalog.size).toBe(107);
  });
  it("species rabbit → 400 대상", () =>
    expect(fields("pets", { ...pet, species: "rabbit" })).toContain("species"));
  it("2026-02-30은 날짜가 아니다", () =>
    expect(fields("pets", { ...pet, birth_date: "2026-02-30" })).toContain("birth_date"));
  it("개 체중 150kg 범위 밖", () =>
    expect(fields("pets", { ...pet, weight_kg: 150 })).toContain("weight_kg"));
  it("diet 할 일에 act_* ID 금지", () =>
    expect(fields("tasks", { ...task, catalog_item_id: "act_dog_nosework_find_it_01" })).toContain(
      "catalog_item_id",
    ));
  it("diet 할 일에 diet 카탈로그 ID는 통과", () =>
    expect(fields("tasks", { ...task, catalog_item_id: "diet_dog_weight_loss_plan_01" })).toEqual([]));
  it("custom 영역은 source=custom", () =>
    expect(fields("tasks", { ...task, category: "custom", source: "auto" })).toContain("source"));
  it("done인데 completed_date 없으면 위반", () => {
    const evt = {
      id: "evt_x",
      user_id: "usr_a",
      pet_id: "pet_x",
      catalog_item_id: "hc_dog_rabies",
      type: "vaccine",
      due_date: "2026-11-17",
      due_ts: 1,
      status: "done",
    };
    expect(fields("health_events", evt)).toContain("completed_date");
  });
  it("excluded_until은 dislike 전용", () => {
    const pref = {
      id: "pref_x",
      user_id: "usr_a",
      pet_id: null,
      kind: "like",
      target: "x",
      score: 3,
      excluded_until: "2026-11-14",
    };
    expect(fields("preferences", pref)).toContain("excluded_until");
  });
});

describe("메모리 저장소 where", () => {
  it("지원 연산", () => {
    const m = { user_id: "u", tags: ["a", "b"], n: 5 };
    expect(matchWhere(m, { $and: [{ user_id: "u" }, { n: { $gte: 5 } }] })).toBe(true);
    expect(matchWhere(m, { tags: { $contains: "a" } })).toBe(true);
    expect(matchWhere(m, { n: { $in: [1, 2] } })).toBe(false);
    expect(matchWhere(m, { n: { $ne: 5 } })).toBe(false);
  });
  it("지원하지 않는 연산·잘못된 $and는 예외", () => {
    expect(() => matchWhere({}, { n: { $gt: 1 } })).toThrow();
    expect(() => matchWhere({}, { $or: [{ a: 1 }, { b: 2 }] })).toThrow();
    expect(() => matchWhere({}, { $and: [{ a: 1 }] })).toThrow();
  });
});

describe("repos", () => {
  it("userId 없이 부르면 예외, 다른 사용자 id로 get → null", async () => {
    const store = createMemoryStore();
    await loadSeedIntoStore(store, catalog);
    const repos = createRepos(store, { catalog });
    await expect(repos.pets.list()).rejects.toThrow();
    await expect(repos.pets.get(undefined, "pet_bori")).rejects.toThrow();
    expect(await repos.pets.get(USERS.mallory.id, "pet_bori")).toBeNull();
    expect((await repos.pets.get(USERS.jiwoo.id, "pet_bori")).name).toBe("보리");
    expect((await repos.pets.list(USERS.jiwoo.id)).map((p) => p.id)).toEqual(["pet_bori", "pet_nabi"]);
    await expect(
      repos.pets.put(USERS.mallory.id, { ...(await repos.pets.get(USERS.jiwoo.id, "pet_bori")) }),
    ).rejects.toThrow();
  });
  it("쓰기 전에 검증 (400)", async () => {
    const store = createMemoryStore();
    const repos = createRepos(store, { catalog });
    await expect(
      repos.pets.put("usr_a", { ...pet, user_id: "usr_a", species: "rabbit" }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
