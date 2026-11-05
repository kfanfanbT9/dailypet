import cases from "@fixtures/date_cases.json";
import { describe, expect, it } from "vitest";
import { ageGroup, ageMonths, ageText, dDayLabel, formatLong, formatMD } from "./dates";

describe("date_cases.json — Python·Node와 같은 연령 구간", () => {
  it.each(cases.age_group)("$note", (c) => {
    expect(ageMonths(c.birth, c.on)).toBe(c.months);
    expect(ageGroup(c.species as "dog" | "cat", c.size, c.birth, c.on)).toBe(c.group);
  });
});

describe("표시 형식", () => {
  it("formatMD·formatLong (KST 날짜 문자열, 서버 TZ 무관)", () => {
    expect(formatMD("2026-11-13")).toBe("11/13 (금)");
    expect(formatMD("2026-12-12")).toBe("12/12 (토)");
    expect(formatLong("2026-11-10")).toBe("11월 10일 화요일");
  });
  it("dDayLabel: D-7, 내일, 오늘, 지연됨", () => {
    expect(dDayLabel(7)).toBe("D-7");
    expect(dDayLabel(1)).toBe("내일");
    expect(dDayLabel(0)).toBe("오늘");
    expect(dDayLabel(-2)).toBe("지연됨");
  });
  it("ageText", () => {
    expect(ageText("2026-08-01", "2026-11-10")).toBe("3개월");
    expect(ageText("2024-02-20", "2026-11-10")).toBe("2세 8개월");
  });
});
