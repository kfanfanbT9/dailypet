// 테스트 도우미: 메모리 저장소 + 시드 + 가짜 Agent로 앱을 만들고, 시드 계정 로그인 쿠키를 얻는다.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { createAgentClient } from "../src/agentClient.js";
import { createApp } from "../src/app.js";
import { loadCatalog } from "../src/catalog.js";
import { createCheckpoints } from "../src/checkpoints.js";
import { setLogSink } from "../src/lib/logger.js";
import { ROUTERS } from "../src/routes/index.js";
import { createMemoryStore } from "../src/store/memory.js";
import { createRepos } from "../src/store/repos.js";
import { loadSeedIntoStore } from "../src/seed/load.js";

export const DEMO_PASSWORD = "Demo!2345";
export const USERS = {
  haneul: { id: "usr_1c3544ae18bc", email: "haneul@demo.dailypet" },
  seojun: { id: "usr_a80678fb2f7a", email: "seojun@demo.dailypet" },
  jiwoo: { id: "usr_69d308a849e0", email: "jiwoo@demo.dailypet" },
  youngja: { id: "usr_d6eff68d8ef0", email: "youngja@demo.dailypet" },
  mallory: { id: "usr_39e92ecdda26", email: "mallory@demo.dailypet" },
  leaver: { id: "usr_3263e0395d81", email: "leaver@demo.dailypet" },
};
export const TEST_KEY = "test-agent-key";
export const TEST_JWT = "test-jwt-secret";

const sharedCatalog = loadCatalog();

/**
 * @param {object} [opts]
 * @param {string} [opts.today] 기준일 (기본 2026-11-10)
 * @param {string|null} [opts.variant] 시드 변형
 * @param {string} [opts.agentUrl] 가짜 Agent 주소 (없으면 닫힌 포트 → 장애 상태)
 * @param {string} [opts.checkpointPath]
 */
export async function createTestApp(opts = {}) {
  const state = { today: opts.today ?? "2026-11-10", faultInject: opts.faultInject ?? "" };
  const store = createMemoryStore();
  const catalog = sharedCatalog;
  await loadSeedIntoStore(store, catalog, { variant: opts.variant ?? null });
  const repos = createRepos(store, { catalog });
  const checkpointPath = opts.checkpointPath ?? join(mkdtempSync(join(tmpdir(), "dp-cp-")), "cp.sqlite");
  const config = {
    agentApiKey: TEST_KEY,
    jwtSecret: TEST_JWT,
    corsOrigin: "http://localhost:5173",
    checkpointPath,
    get faultInject() {
      return state.faultInject;
    },
    today: () => state.today,
  };
  const agent = createAgentClient({
    baseUrl: opts.agentUrl ?? "http://127.0.0.1:1",
    apiKey: TEST_KEY,
    timeouts: { tasks: 1000, query: opts.queryTimeoutMs ?? 2000, health: 500 },
  });
  const deps = {
    repos,
    catalog,
    agent,
    config,
    checkpoints: createCheckpoints(checkpointPath),
    routers: ROUTERS,
  };
  const app = createApp(deps);
  return {
    app,
    deps,
    store,
    repos,
    catalog,
    state,
    setToday: (d) => (state.today = d),
    setFault: (f) => (state.faultInject = f),
    http: () => request(app),
  };
}

/** 시드 계정으로 로그인한 supertest agent (쿠키 유지). */
export async function loginAs(app, who) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email: USERS[who].email, password: DEMO_PASSWORD });
  if (res.status !== 200) throw new Error(`로그인 실패 ${who}: ${res.status}`);
  return agent;
}

/** 로그를 모은다. 반환한 함수를 부르면 원래대로 돌리고 모은 줄을 돌려준다. */
export function captureLogs() {
  const lines = [];
  const prev = setLogSink((l) => lines.push(l));
  return () => {
    setLogSink(prev);
    return lines;
  };
}
