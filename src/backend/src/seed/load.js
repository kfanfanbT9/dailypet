// 시드 읽기·검증·적재 (data/seed/README.md). seed:reset CLI와 테스트가 같이 쓴다.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "../config.js";
import { APP_COLLECTIONS } from "../store/record.js";
import { validateRow } from "../store/validate.js";

export const SEED_DIR = join(ROOT, "data", "seed");

const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));

/** 기본 시드에 변형(update → add → delete)을 적용한 컬렉션별 행과 setup_queries. */
export function readSeed(variant = null, dir = SEED_DIR) {
  const rows = Object.fromEntries(
    APP_COLLECTIONS.map((n) => [n, structuredClone(readJson(join(dir, `${n}.json`)))]),
  );
  if (!variant) return { rows, setupQueries: [] };
  if (!/^[a-z0-9_]+$/.test(variant)) throw new Error(`변형 이름이 올바르지 않다: ${variant}`);
  const spec = readJson(join(dir, "variants", `${variant}.json`));
  for (const [name, patches] of Object.entries(spec.update ?? {})) {
    const byId = new Map(rows[name].map((r) => [r.id, r]));
    for (const patch of patches) {
      if (!byId.has(patch.id)) throw new Error(`변형 ${variant}: ${name}에 ${patch.id}가 없다`);
      Object.assign(byId.get(patch.id), structuredClone(patch));
    }
  }
  for (const [name, extra] of Object.entries(spec.add ?? {})) {
    const existing = new Set(rows[name].map((r) => r.id));
    const dup = extra.filter((r) => existing.has(r.id)).map((r) => r.id);
    if (dup.length) throw new Error(`변형 ${variant}: ${name} id 중복 ${dup.join(", ")}`);
    rows[name].push(...structuredClone(extra));
  }
  for (const key of ["delete", "remove"]) {
    for (const [name, ids] of Object.entries(spec[key] ?? {})) {
      const drop = new Set(ids);
      rows[name] = rows[name].filter((r) => !drop.has(r.id));
    }
  }
  return { rows, setupQueries: spec.setup_queries ?? [] };
}

/** 전체 행 검증. 위반 목록 ["컬렉션/id: 필드 ..."] (없으면 빈 배열). */
export function validateSeed(rows, catalog) {
  const problems = [];
  for (const [name, list] of Object.entries(rows)) {
    for (const row of list) {
      const errs = validateRow(name, row, { catalog });
      if (errs.length) problems.push(`${name}/${row.id}: ${errs.map((e) => e.field).join(", ")}`);
    }
  }
  return problems;
}

/** 앱 데이터 컬렉션을 비우고 시드를 적재한다. 검증에 실패하면 아무것도 쓰지 않고 예외. */
export async function loadSeedIntoStore(store, catalog, { variant = null, dir = SEED_DIR } = {}) {
  const { rows, setupQueries } = readSeed(variant, dir);
  const problems = validateSeed(rows, catalog);
  if (problems.length) {
    const err = new Error(`시드 검증 실패 ${problems.length}건 — 아무것도 쓰지 않았다`);
    err.problems = problems;
    throw err;
  }
  await store.resetCollections(APP_COLLECTIONS);
  const counts = {};
  for (const name of APP_COLLECTIONS) {
    await store.upsert(name, rows[name]);
    counts[name] = await store.count(name);
  }
  return { counts, setupQueries };
}
