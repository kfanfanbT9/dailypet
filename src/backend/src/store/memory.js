// 테스트용 메모리 저장소 — Chroma 저장소와 같은 인터페이스 (phase2_task.md 1.4).
// where는 이 프로젝트가 쓰는 연산만 지원한다: $and, $eq, $ne, $in, $gte, $lte, $contains.
// 그 밖의 연산은 예외를 내서 실제 Chroma와 다르게 통과하는 일을 막는다.
import { decodeAppRecord, encodeAppRecord } from "./record.js";

const OPS = new Set(["$eq", "$ne", "$in", "$gte", "$lte", "$contains"]);

function matchField(value, cond) {
  if (cond === null || typeof cond !== "object" || Array.isArray(cond)) return value === cond;
  const entries = Object.entries(cond);
  if (entries.length !== 1) throw new Error("필드 조건은 연산자 1개만 쓴다");
  const [op, arg] = entries[0];
  if (!OPS.has(op)) throw new Error(`메모리 저장소가 지원하지 않는 연산: ${op}`);
  switch (op) {
    case "$eq":
      return value === arg;
    case "$ne":
      return value !== arg;
    case "$in":
      return Array.isArray(arg) && arg.includes(value);
    case "$gte":
      return typeof value === "number" && value >= arg;
    case "$lte":
      return typeof value === "number" && value <= arg;
    case "$contains":
      return Array.isArray(value) && value.includes(arg);
    default:
      return false;
  }
}

export function matchWhere(metadata, where) {
  if (!where) return true;
  const keys = Object.keys(where);
  if (keys.length !== 1) throw new Error("where는 키 1개(필드 또는 $and)여야 한다");
  const [key] = keys;
  if (key === "$and") {
    if (!Array.isArray(where.$and) || where.$and.length < 2) throw new Error("$and는 조건 2개 이상");
    return where.$and.every((w) => matchWhere(metadata, w));
  }
  if (key.startsWith("$")) throw new Error(`메모리 저장소가 지원하지 않는 연산: ${key}`);
  return matchField(metadata[key], where[key]);
}

export function createMemoryStore() {
  /** @type {Map<string, Map<string, {document: string, metadata: object}>>} */
  const collections = new Map();
  const col = (name) => {
    if (!collections.has(name)) collections.set(name, new Map());
    return collections.get(name);
  };

  return {
    kind: "memory",
    async get(name, { ids, where, limit } = {}) {
      const out = [];
      for (const [id, rec] of col(name)) {
        if (ids && !ids.includes(id)) continue;
        if (!matchWhere(rec.metadata, where)) continue;
        out.push({ id, row: decodeAppRecord(rec.document), metadata: rec.metadata });
        if (limit && out.length >= limit) break;
      }
      return out;
    },
    async upsert(name, rows) {
      for (const row of rows) {
        const { id, document, metadata } = encodeAppRecord(row);
        col(name).set(id, { document, metadata });
      }
    },
    async delete(name, { ids, where } = {}) {
      if (!ids && !where) throw new Error("delete에는 ids 또는 where가 필요하다");
      for (const [id, rec] of [...col(name)]) {
        if (ids && !ids.includes(id)) continue;
        if (!matchWhere(rec.metadata, where)) continue;
        col(name).delete(id);
      }
    },
    async count(name) {
      return col(name).size;
    },
    async resetCollections(names) {
      for (const n of names) collections.set(n, new Map());
    },
    async listCollections() {
      return [...collections.keys()];
    },
    /** 테스트용: 보호 컬렉션 표시 행 넣기 등 원본 그대로 쓰기 */
    async rawPut(name, id, document, metadata) {
      col(name).set(id, { document, metadata });
    },
    async heartbeat() {
      return true;
    },
  };
}
