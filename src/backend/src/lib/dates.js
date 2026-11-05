// 날짜 규칙 — Python src/config.py와 같은 규칙 (CLAUDE.md 4.5.3, ARCHITECTURE.md 5.1 공유 기준 사례).
// 날짜는 'YYYY-MM-DD' 문자열(KST)로 다루고, 산술은 UTC 자정 Date로 해서 서버 TZ에 영향받지 않게 한다.

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const KST_OFFSET_S = 9 * 3600;
export const JUNIOR_MAX_MONTHS = 12;
export const SENIOR_YEARS = 7;
export const LARGE_DOG_SENIOR_YEARS = 6;

/** 실제 있는 날짜인 'YYYY-MM-DD'이면 true. */
export function isValidDate(value) {
  if (typeof value !== "string") return false;
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

function toUtc(value) {
  if (!isValidDate(value)) throw new Error(`날짜 형식이 아니다: ${value}`);
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtc(d) {
  return d.toISOString().slice(0, 10);
}

const kstFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** KST 오늘. TODAY_OVERRIDE가 있으면 그 날짜 (형식이 틀리면 예외). */
export function todayKst(env = process.env, now = new Date()) {
  const override = env.TODAY_OVERRIDE?.trim();
  if (override) {
    if (!isValidDate(override)) throw new Error("TODAY_OVERRIDE는 YYYY-MM-DD 형식이어야 한다");
    return override;
  }
  return kstFormatter.format(now);
}

export function addDays(date, n) {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUtc(d);
}

function lastDayOfMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate(); // month: 1~12
}

/** 만 나이(개월). 기념일 당일에 한 달이 찬다. 그 달에 같은 날이 없으면 말일 (2/29 → 평년 2/28). */
export function ageMonths(birth, on) {
  const b = toUtc(birth);
  const o = toUtc(on);
  if (o < b) throw new Error("기준일이 생일보다 앞선다");
  const by = b.getUTCFullYear();
  const bm = b.getUTCMonth() + 1;
  const oy = o.getUTCFullYear();
  const om = o.getUTCMonth() + 1;
  let months = (oy - by) * 12 + (om - bm);
  const anniversaryDay = Math.min(b.getUTCDate(), lastDayOfMonth(oy, om));
  if (o.getUTCDate() < anniversaryDay) months -= 1;
  return months;
}

/** 연령 구간: 어린 < 12개월 / 시니어 ≥ 7세 (대형견 ≥ 6세) / 성체. */
export function ageGroup({ species, size, birthDate }, on) {
  const months = ageMonths(birthDate, on);
  if (months < JUNIOR_MAX_MONTHS) return "junior";
  const seniorYears = species === "dog" && size === "large" ? LARGE_DOG_SENIOR_YEARS : SENIOR_YEARS;
  return months >= seniorYears * 12 ? "senior" : "adult";
}

/** 남은 일수 (오늘 0, 지난 날짜 음수). */
export function dDay(due, today) {
  return Math.round((toUtc(due) - toUtc(today)) / 86400000);
}

/** 오늘부터 days일 이내 (D-0 ~ D-days, 경계 포함). 지난 날짜는 제외. */
export function withinDays(due, today, days) {
  const n = dDay(due, today);
  return n >= 0 && n <= days;
}

/** KST 자정 epoch 초 (health_events.due_ts). */
export function kstMidnightEpoch(date) {
  return toUtc(date).getTime() / 1000 - KST_OFFSET_S;
}

/** ISO 8601 시각(오프셋 포함) → epoch 초 (Python int(datetime.fromisoformat(v).timestamp())). */
export function epochFromIso(iso) {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new Error(`시각 형식이 아니다: ${iso}`);
  return Math.floor(ms / 1000);
}

/** 지금 KST 시각 'YYYY-MM-DDTHH:MM:SS+09:00'. */
export function nowKstIso(now = new Date()) {
  const k = new Date(now.getTime() + KST_OFFSET_S * 1000);
  return `${k.toISOString().slice(0, 19)}+09:00`;
}

/** 'HH:MM' 형식이면 true. */
export function isValidTime(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}
