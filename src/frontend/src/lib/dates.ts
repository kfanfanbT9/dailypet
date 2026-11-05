// 날짜 표시 형식 (wireframe 13장, Style-guide.md 11장). 날짜 문자열은 이미 KST 날짜(YYYY-MM-DD)다.
// 화면이 계산하는 것은 표시 형식과 연령 구간 미리보기(W03)뿐이다 — D-day·알림 판정은 서버 값을 쓴다.
import type { AgeGroup, Species } from "@/api/types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function parts(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, utc: new Date(Date.UTC(y, m - 1, d)) };
}

/** "2026-11-13" → "11/13 (금)" */
export function formatMD(date: string): string {
  const { m, d, utc } = parts(date);
  return `${m}/${d} (${WEEKDAYS[utc.getUTCDay()]})`;
}

/** "2026-11-10" → "11월 10일 화요일" */
export function formatLong(date: string): string {
  const { m, d, utc } = parts(date);
  return `${m}월 ${d}일 ${WEEKDAYS[utc.getUTCDay()]}요일`;
}

/** 서버가 준 d_day(due - today) → "D-3" | "내일" | "오늘" | "지연됨" */
export function dDayLabel(dDay: number): string {
  if (dDay < 0) return "지연됨";
  if (dDay === 0) return "오늘";
  if (dDay === 1) return "내일";
  return `D-${dDay}`;
}

/** 브라우저 기준 KST 오늘 (표시 보조용. 서버 응답의 date가 있으면 그것을 쓴다) */
export function todayKstBrowser(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, n: number): string {
  const { utc } = parts(date);
  utc.setUTCDate(utc.getUTCDate() + n);
  return utc.toISOString().slice(0, 10);
}

// ── 연령 구간 미리보기 (Python src/config.py·Node lib/dates.js와 같은 규칙, date_cases.json으로 검증) ──
function lastDay(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function ageMonths(birth: string, on: string): number {
  const b = parts(birth);
  const o = parts(on);
  if (o.utc < b.utc) return 0;
  let months = (o.y - b.y) * 12 + (o.m - b.m);
  if (o.d < Math.min(b.d, lastDay(o.y, o.m))) months -= 1;
  return months;
}

export function ageGroup(
  species: Species,
  size: string | null | undefined,
  birth: string,
  on: string,
): AgeGroup {
  const months = ageMonths(birth, on);
  if (months < 12) return "junior";
  const seniorYears = species === "dog" && size === "large" ? 6 : 7;
  return months >= seniorYears * 12 ? "senior" : "adult";
}

/** "3개월" / "2세 8개월" */
export function ageText(birth: string, on: string): string {
  const months = ageMonths(birth, on);
  if (months < 12) return `${months}개월`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  return m ? `${y}세 ${m}개월` : `${y}세`;
}
