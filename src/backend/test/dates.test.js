import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ROOT } from "../src/config.js";
import {
  addDays,
  ageGroup,
  ageMonths,
  dDay,
  isValidDate,
  kstMidnightEpoch,
  nowKstIso,
  todayKst,
  withinDays,
} from "../src/lib/dates.js";

const cases = JSON.parse(readFileSync(join(ROOT, "src", "tests", "fixtures", "date_cases.json"), "utf8"));
const seedEvents = JSON.parse(readFileSync(join(ROOT, "data", "seed", "health_events.json"), "utf8"));

describe("date_cases.json (Python과 같은 기준 사례)", () => {
  it.each(cases.age_group)("$note", (c) => {
    expect(ageMonths(c.birth, c.on)).toBe(c.months);
    expect(ageGroup({ species: c.species, size: c.size, birthDate: c.birth }, c.on)).toBe(c.group);
  });
  it.each(cases.d_day)("$note", (c) => {
    expect(dDay(c.due, c.today)).toBe(c.d_day);
    expect(withinDays(c.due, c.today, 7)).toBe(c.within_7);
  });
});

describe("오늘·epoch", () => {
  it("TODAY_OVERRIDE가 우선하고, 서버 TZ와 관계없다", () => {
    expect(todayKst({ TODAY_OVERRIDE: "2026-11-10" })).toBe("2026-11-10");
    // 2026-11-10 15:30 UTC = 11-11 00:30 KST
    expect(todayKst({}, new Date(Date.UTC(2026, 10, 10, 15, 30)))).toBe("2026-11-11");
    expect(todayKst({}, new Date(Date.UTC(2026, 10, 10, 14, 59)))).toBe("2026-11-10");
  });
  it("TODAY_OVERRIDE 형식 오류는 예외", () => {
    expect(() => todayKst({ TODAY_OVERRIDE: "2026/11/10" })).toThrow();
  });
  it("시드 due_ts = KST 자정 epoch", () => {
    for (const e of seedEvents) expect(kstMidnightEpoch(e.due_date)).toBe(e.due_ts);
  });
  it("날짜 산술과 검증", () => {
    expect(addDays("2026-11-08", 6)).toBe("2026-11-14");
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(nowKstIso(new Date(Date.UTC(2026, 10, 9, 22, 30)))).toBe("2026-11-10T07:30:00+09:00");
  });
});

describe("nowKstIsoOn", () => {
  it("설정상 오늘 날짜 + 지금 시각", async () => {
    const { nowKstIsoOn } = await import("../src/lib/dates.js");
    expect(nowKstIsoOn("2026-11-10", new Date(Date.UTC(2026, 10, 4, 22, 30)))).toBe(
      "2026-11-10T07:30:00+09:00",
    );
  });
});
