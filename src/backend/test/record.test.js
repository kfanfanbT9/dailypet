import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../src/config.js";
import { userIdFromEmail, prefId, parseThreadId, newThreadId } from "../src/lib/ids.js";
import { decodeAppRecord, encodeAppRecord, whereAll } from "../src/store/record.js";

const fixture = JSON.parse(readFileSync(join(ROOT, "src", "tests", "fixtures", "app_records.json"), "utf8"));
const rows = (name) => JSON.parse(readFileSync(join(ROOT, "data", "seed", `${name}.json`), "utf8"));

describe("encodeAppRecord = Python encode_app_record (app_records.json)", () => {
  for (const [collection, records] of Object.entries(fixture)) {
    it(`${collection} ${records.length}행`, () => {
      const seed = rows(collection);
      expect(seed.length).toBe(records.length);
      seed.forEach((row, i) => {
        const enc = encodeAppRecord(row);
        expect(enc.id).toBe(records[i].id);
        expect(decodeAppRecord(enc.document)).toEqual(JSON.parse(records[i].document));
        expect(enc.metadata).toEqual(records[i].metadata);
      });
    });
  }

  it("document는 키를 정렬하고, metadata는 null·빈 리스트·객체·긴 텍스트를 뺀다", () => {
    const enc = encodeAppRecord({
      id: "pet_x",
      z: 1,
      a: null,
      tags: [],
      allergies: ["chicken"],
      default_times: { meal: ["08:00"] },
      memo: "긴 메모",
      created_at: "2026-11-10T07:30:00+09:00",
    });
    expect(enc.document.indexOf('"a"')).toBeLessThan(enc.document.indexOf('"z"'));
    expect(enc.metadata).toEqual({
      z: 1,
      allergies: ["chicken"],
      created_at: "2026-11-10T07:30:00+09:00",
      created_ts: 1794263400,
    });
  });
});

describe("id 규칙", () => {
  it("user_id = usr_ + sha256(소문자 이메일)[:12] — 시드 6명", () => {
    for (const u of rows("users")) expect(userIdFromEmail(u.email.toUpperCase())).toBe(u.id);
    expect(userIdFromEmail("NewBie@Demo.DailyPet")).toBe("usr_fce210e795d0");
  });
  it("prefId는 Python remember_preference와 같은 규칙", () => {
    // python: hashlib.sha256("like|act_cat_kibble_chase_01".encode()).hexdigest()[:10]
    expect(
      prefId({ userId: "usr_a", petId: "pet_mocha", kind: "like", target: "act_cat_kibble_chase_01" }),
    ).toBe("pref_pet_mocha_350835c502");
    expect(prefId({ userId: "usr_a", petId: null, kind: "constraint", target: "x" })).toMatch(/^pref_usr_a_/);
  });
  it("thread_id 생성·파싱", () => {
    const t = newThreadId("usr_69d308a849e0", "pet_bori");
    expect(parseThreadId(t)).toEqual({ userId: "usr_69d308a849e0", petId: "pet_bori" });
    expect(parseThreadId("thr_bad")).toBeNull();
  });
  it("whereAll은 빈 조건을 빼고 1개면 $and를 쓰지 않는다", () => {
    expect(whereAll({ a: 1 }, undefined, {})).toEqual({ a: 1 });
    expect(whereAll()).toBeUndefined();
    expect(whereAll({ a: 1 }, { b: 2 })).toEqual({ $and: [{ a: 1 }, { b: 2 }] });
  });
});
