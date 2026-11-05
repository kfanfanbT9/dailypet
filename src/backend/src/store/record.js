// Chroma 저장 형식 (ARCHITECTURE.md 5.1) — Python src/retriever.py encode_app_record와 같은 규칙.
import { epochFromIso } from "../lib/dates.js";

export const APP_COLLECTIONS = [
  "users",
  "pets",
  "tasks",
  "health_events",
  "weight_logs",
  "interactions",
  "preferences",
  "chat_logs",
];
// 카탈로그·지식 컬렉션은 Backend가 열거나 지우지 않는다 (시드 리셋에서도 명시적으로 제외).
export const PROTECTED_COLLECTIONS = ["catalog_activity", "catalog_diet", "catalog_health", "pet_knowledge"];
export const DUMMY_EMBEDDING = [0.0];

const EXCLUDED_METADATA_FIELDS = new Set([
  "id",
  "default_times",
  "trace",
  "question",
  "answer",
  "memo",
  "password_hash",
]);
const TIMESTAMP_FIELDS = { created_at: "created_ts", updated_at: "updated_ts" };

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeysDeep(value[k])]),
    );
  }
  return value;
}

/** 엔터티 한 행 → { id, document, metadata }. document는 키를 정렬한 JSON(원본). */
export function encodeAppRecord(row) {
  if (!row?.id) throw new Error("행에 id가 없다");
  const metadata = {};
  for (const [key, value] of Object.entries(row)) {
    if (EXCLUDED_METADATA_FIELDS.has(key) || value === null || value === undefined) continue;
    if (["boolean", "number", "string"].includes(typeof value)) {
      metadata[key] = value;
    } else if (Array.isArray(value) && value.length > 0 && value.every((v) => typeof v === "string")) {
      metadata[key] = [...value];
    }
  }
  for (const [src, dst] of Object.entries(TIMESTAMP_FIELDS)) {
    if (typeof row[src] === "string") metadata[dst] = epochFromIso(row[src]);
  }
  return { id: row.id, document: JSON.stringify(sortKeysDeep(row)), metadata };
}

export function decodeAppRecord(document) {
  return JSON.parse(document);
}

/** where 조건 결합: 빈 조건은 빼고, 1개면 그대로, 2개 이상이면 $and (Chroma는 원소 1개짜리 $and를 거부). */
export function whereAll(...conds) {
  const parts = conds.filter((c) => c && Object.keys(c).length > 0);
  if (parts.length === 0) return undefined;
  if (parts.length === 1) return parts[0];
  return { $and: parts };
}
