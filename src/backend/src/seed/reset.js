// npm run seed:reset [-- --variant <이름>] — 데모·평가용 시드 적재 (data/seed/README.md).
// 1) 앱 데이터 컬렉션 8종 비우고 다시 만들기 (카탈로그·지식 컬렉션은 제외)
// 2) checkpoint 비우기 — 파일 삭제 대신 테이블을 비운다 (Agent가 연 SQLite 연결을 깨지 않기 위해)
// 3) 시드 검증 → 적재 (하나라도 실패하면 아무것도 쓰지 않음)  4) setup_queries를 Agent에 실행
// 5) overdue 갱신  6) 컬렉션별 건수 출력
import { isAbsolute, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createAgentClient, threadIdFromTrace } from "../agentClient.js";
import { loadCatalog } from "../catalog.js";
import { createCheckpoints } from "../checkpoints.js";
import { loadConfig } from "../config.js";
import { markOverdue } from "../jobs/overdue.js";
import { createChromaStore, ensureDatabase } from "../store/chroma.js";
import { loadSeedIntoStore } from "./load.js";

export function parseArgs(argv) {
  const i = argv.indexOf("--variant");
  return { variant: i >= 0 ? argv[i + 1] : null };
}

/** CHECKPOINT_PATH가 data/checkpoints/ 안에 있는지 (밖이면 거부) */
export function checkpointInside(path, dir) {
  const rel = relative(resolve(dir), resolve(path));
  return rel !== "" && !rel.startsWith("..") && !isAbsolute(rel);
}

/** 시드 리셋 본체 (테스트는 메모리 저장소·가짜 Agent를 넣어 부른다). */
export async function resetSeed({
  store,
  catalog,
  agent,
  checkpoints,
  today,
  variant = null,
  out = console.log,
}) {
  const cleared = checkpoints ? checkpoints.clearAll() : 0;
  const { counts, setupQueries } = await loadSeedIntoStore(store, catalog, { variant });
  for (const q of setupQueries) {
    const r = await agent.query({
      question: q.question,
      user_id: q.user_id,
      pet_id: q.pet_id,
      thread_id: q.thread_id,
    });
    const types = (r.body?.trace ?? []).map((e) => e.type);
    if (r.status !== 200 || (q.expect?.trace_type && !types.includes(q.expect.trace_type))) {
      throw new Error(`setup_query 실패: status=${r.status} trace=${types.join(",")}`);
    }
    out(`  setup_query 완료: thread=${threadIdFromTrace(r.body.trace) ?? q.thread_id}`);
  }
  const overdue = await markOverdue(store, today);
  out(
    `시드 적재 완료${variant ? ` (변형 ${variant})` : ""} — checkpoint 행 ${cleared}개 삭제, overdue ${overdue}건`,
  );
  for (const [name, n] of Object.entries(counts)) out(`  ${name}: ${n}`);
  return { counts, overdue };
}

async function main() {
  const { variant } = parseArgs(process.argv.slice(2));
  const config = loadConfig(process.env, { requireSecrets: false });
  if (!checkpointInside(config.checkpointPath, config.checkpointDir)) {
    throw new Error("CHECKPOINT_PATH가 data/checkpoints/ 밖에 있어 비우지 않는다");
  }
  await ensureDatabase(config.chroma);
  const store = createChromaStore(config.chroma);
  await store.heartbeat();
  const agent = createAgentClient({ baseUrl: config.agentUrl, apiKey: config.agentApiKey ?? "" });
  await resetSeed({
    store,
    catalog: loadCatalog(),
    agent,
    checkpoints: createCheckpoints(config.checkpointPath),
    today: config.today(),
    variant,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((err) => {
    console.error(`시드 리셋 실패: ${err.message}`);
    for (const p of err.problems ?? []) console.error(`  ${p}`);
    process.exit(1);
  });
}
