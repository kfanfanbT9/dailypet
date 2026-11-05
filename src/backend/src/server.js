// Backend 서버 (:3000). 시작 시 고아 정리·overdue 갱신을 한 번 돌리고, 매일 KST 00:05 cron을 등록한다.
import cron from "node-cron";
import { createAgentClient } from "./agentClient.js";
import { createApp } from "./app.js";
import { loadCatalog } from "./catalog.js";
import { createCheckpoints } from "./checkpoints.js";
import { ConfigError, loadConfig } from "./config.js";
import { log } from "./lib/logger.js";
import { ROUTERS } from "./routes/index.js";
import { createChromaStore } from "./store/chroma.js";
import { createRepos } from "./store/repos.js";
import { STARTUP_JOBS, DAILY_JOBS } from "./jobs/index.js";

async function main() {
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message); // 키 이름만 (값 없음)
      process.exit(1);
    }
    throw err;
  }
  const catalog = loadCatalog();
  const store = createChromaStore(config.chroma);
  const repos = createRepos(store, { catalog });
  const agent = createAgentClient({ baseUrl: config.agentUrl, apiKey: config.agentApiKey });
  const deps = {
    repos,
    catalog,
    agent,
    config,
    checkpoints: createCheckpoints(config.checkpointPath),
    routers: ROUTERS,
  };

  await store.heartbeat();
  for (const job of STARTUP_JOBS) await job(deps);
  cron.schedule(
    "5 0 * * *",
    async () => {
      for (const job of DAILY_JOBS)
        await job(deps).catch((e) => log.error("daily_job_failed", { error: e.name }));
    },
    { timezone: "Asia/Seoul" },
  );

  createApp(deps).listen(config.port, () =>
    log.info("listening", { port: config.port, today: config.today() }),
  );
}

main().catch((err) => {
  log.error("startup_failed", { error: err?.name ?? "Error" });
  process.exit(1);
});
