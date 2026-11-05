// database/schema.md의 CHECK 제약을 JS로 옮긴 검증 (Chroma에는 제약이 없으므로 Backend가 보장한다).
import { badRequest } from "../lib/errors.js";
import { isValidDate, isValidTime } from "../lib/dates.js";

export const ENUMS = {
  species: ["dog", "cat"],
  sex: ["male", "female"],
  size: ["small", "medium", "large"],
  activity_level: ["low", "normal", "high"],
  health_type: ["vaccine", "checkup", "deworming", "heartworm", "external_parasite", "dental", "other"],
  health_status: ["scheduled", "done", "overdue", "needs_history"],
  task_category: ["diet", "activity", "health", "custom"],
  task_source: ["auto", "chat", "custom"],
  signal: ["like", "dislike", "complete", "swap", "remove", "custom"],
  pref_kind: ["like", "dislike", "constraint"],
};
export const WEIGHT_RANGE = { dog: [0.5, 100], cat: [0.3, 15] };
const ID_PREFIX = {
  users: "usr_",
  pets: "pet_",
  tasks: "task_",
  health_events: "evt_",
  weight_logs: "wt_",
  interactions: "int_",
  preferences: "pref_",
  chat_logs: "log_",
};
const CATALOG_PREFIX = { diet: "diet_", activity: "act_", health: "hc_" };

const isStr = (v) => typeof v === "string" && v.length > 0;
const isBool01 = (v) => v === 0 || v === 1 || v === true || v === false;
const isStrList = (v) => Array.isArray(v) && v.every((x) => typeof x === "string");

/** 행의 제약 위반 목록 [{ field, message }] (없으면 빈 배열). catalog는 카탈로그 참조 검사용. */
export function validateRow(collection, row, { catalog } = {}) {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  const need = (field) => {
    if (row[field] === undefined || row[field] === null || row[field] === "") err(field, "필수 값이에요.");
  };
  const oneOf = (field, values, optional = false) => {
    const v = row[field];
    if ((v === undefined || v === null) && optional) return;
    if (!values.includes(v)) err(field, `허용 값: ${values.join(", ")}`);
  };
  const date = (field, optional = false) => {
    const v = row[field];
    if ((v === undefined || v === null) && optional) return;
    if (!isValidDate(v)) err(field, "YYYY-MM-DD 형식의 실제 날짜여야 해요.");
  };
  const catalogRef = (field, category) => {
    const v = row[field];
    if (!isStr(v) || !v.startsWith(CATALOG_PREFIX[category])) {
      err(field, `${category} 카탈로그 항목 ID여야 해요.`);
    } else if (catalog && catalog.get(v)?.category !== category) {
      err(field, "카탈로그에 없는 항목이에요.");
    }
  };

  const prefix = ID_PREFIX[collection];
  if (!prefix) throw new Error(`알 수 없는 컬렉션: ${collection}`);
  if (!isStr(row.id) || !row.id.startsWith(prefix)) err("id", `${prefix}로 시작해야 해요.`);
  if (collection !== "users") {
    if (!isStr(row.user_id) || !row.user_id.startsWith("usr_")) err("user_id", "usr_로 시작해야 해요.");
  }
  const needsPet = !["users", "pets", "preferences"].includes(collection);
  if (needsPet && (!isStr(row.pet_id) || !row.pet_id.startsWith("pet_")))
    err("pet_id", "pet_로 시작해야 해요.");

  switch (collection) {
    case "users":
      need("email");
      if (isStr(row.email) && row.email !== row.email.toLowerCase()) err("email", "소문자여야 해요.");
      if (!isStr(row.password_hash) || !row.password_hash.startsWith("$2"))
        err("password_hash", "bcrypt 해시여야 해요.");
      need("nickname");
      break;
    case "pets": {
      need("name");
      oneOf("species", ENUMS.species);
      oneOf("sex", ENUMS.sex, true);
      oneOf("size", ENUMS.size, true);
      oneOf("activity_level", ENUMS.activity_level, true);
      date("birth_date");
      if (row.neutered !== undefined && !isBool01(row.neutered)) err("neutered", "0 또는 1이어야 해요.");
      for (const f of ["allergies", "conditions"]) {
        if (row[f] !== undefined && row[f] !== null && !isStrList(row[f])) err(f, "문자열 목록이어야 해요.");
      }
      const range = WEIGHT_RANGE[row.species];
      if (row.weight_kg !== undefined && row.weight_kg !== null && range) {
        if (typeof row.weight_kg !== "number" || row.weight_kg < range[0] || row.weight_kg > range[1]) {
          err("weight_kg", `${range[0]}~${range[1]}kg 사이여야 해요.`);
        }
      }
      break;
    }
    case "health_events":
      catalogRef("catalog_item_id", "health");
      oneOf("type", ENUMS.health_type);
      date("due_date");
      if (typeof row.due_ts !== "number") err("due_ts", "숫자여야 해요.");
      oneOf("status", ENUMS.health_status);
      date("completed_date", true);
      if ((row.status === "done") !== isStr(row.completed_date))
        err("completed_date", "완료(done)일 때만 완료일이 있어요.");
      if (
        row.dose_no !== undefined &&
        row.dose_no !== null &&
        !(Number.isInteger(row.dose_no) && row.dose_no >= 1)
      ) {
        err("dose_no", "1 이상의 정수여야 해요.");
      }
      break;
    case "tasks": {
      date("date");
      if (row.time !== undefined && row.time !== null && !isValidTime(row.time))
        err("time", "HH:MM 형식이어야 해요.");
      oneOf("category", ENUMS.task_category);
      oneOf("source", ENUMS.task_source);
      need("title");
      if (row.done !== undefined && !isBool01(row.done)) err("done", "0 또는 1이어야 해요.");
      const hasCat = isStr(row.catalog_item_id);
      const hasEvt = isStr(row.health_event_id);
      if (row.category === "diet" || row.category === "activity") {
        catalogRef("catalog_item_id", row.category);
        if (hasEvt) err("health_event_id", "식단·활동 할 일에는 건강 일정을 연결하지 않아요.");
      } else if (row.category === "health") {
        if (!hasEvt || !row.health_event_id.startsWith("evt_"))
          err("health_event_id", "건강 일정 ID가 필요해요.");
        if (hasCat) err("catalog_item_id", "건강 할 일에는 카탈로그 ID를 넣지 않아요.");
      } else if (row.category === "custom") {
        if (hasCat || hasEvt) err("category", "직접 입력 할 일에는 참조가 없어요.");
        if (row.source !== "custom") err("source", "직접 입력 할 일은 source=custom이에요.");
      }
      if (row.relaxed !== undefined && row.relaxed !== null && !isStrList(row.relaxed))
        err("relaxed", "문자열 목록이어야 해요.");
      break;
    }
    case "weight_logs":
      date("date");
      if (typeof row.weight_kg !== "number" || row.weight_kg < 0.3 || row.weight_kg > 100) {
        err("weight_kg", "0.3~100kg 사이여야 해요.");
      }
      break;
    case "interactions":
      oneOf("signal", ENUMS.signal);
      need("created_at");
      if (row.signal !== "custom" || isStr(row.catalog_item_id)) {
        if (!isStr(row.catalog_item_id)) err("catalog_item_id", "필수 값이에요.");
        else if (catalog && !catalog.has(row.catalog_item_id))
          err("catalog_item_id", "카탈로그에 없는 항목이에요.");
      }
      break;
    case "preferences":
      if (
        row.pet_id !== undefined &&
        row.pet_id !== null &&
        !(isStr(row.pet_id) && row.pet_id.startsWith("pet_"))
      ) {
        err("pet_id", "pet_로 시작해야 해요.");
      }
      oneOf("kind", ENUMS.pref_kind);
      need("target");
      if (typeof row.score !== "number") err("score", "숫자여야 해요.");
      date("excluded_until", true);
      if (row.excluded_until && row.kind !== "dislike") err("excluded_until", "싫어요(dislike)에만 있어요.");
      break;
    case "chat_logs":
      if (!isStr(row.thread_id) || !row.thread_id.startsWith(`thr_${row.user_id}_`)) {
        err("thread_id", "사용자 thread여야 해요.");
      }
      break;
    default:
      break;
  }
  return errors;
}

/** 위반이 있으면 400 (필드 이름 포함). */
export function assertValid(collection, row, opts) {
  const errors = validateRow(collection, row, opts);
  if (errors.length > 0) {
    throw badRequest(`입력값을 확인해 주세요: ${errors.map((e) => e.field).join(", ")}`, { fields: errors });
  }
}
