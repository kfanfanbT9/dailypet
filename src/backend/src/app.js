// createApp(deps) — Express 앱 생성. 테스트는 메모리 저장소·가짜 Agent·오늘 날짜 함수를 주입한다.
import cookieParser from "cookie-parser";
import express from "express";
import { errorHandler, notFound } from "./lib/errors.js";
import { requestLogger } from "./lib/logger.js";

/**
 * @param {object} deps
 * @param {ReturnType<import('./store/repos.js').createRepos>} deps.repos
 * @param {ReturnType<import('./catalog.js').loadCatalog>} deps.catalog
 * @param {object} deps.agent agentClient
 * @param {object} deps.config loadConfig 결과 (today(), jwtSecret, corsOrigin ...)
 * @param {object} [deps.checkpoints] { deleteThreads(ids) }
 * @param {Array<[string, Function]>} [deps.routers] [경로, 라우터 생성 함수(deps)] 목록
 */
export function createApp(deps) {
  const app = express();
  app.disable("x-powered-by");
  app.use(requestLogger);
  app.use(express.json({ limit: "100kb" }));
  app.use(cookieParser());
  app.use((req, res, next) => {
    // 개발 중 Frontend(Vite :5173)만 허용, 쿠키 포함 (phase2_task.md 1.5)
    if (req.headers.origin === deps.config.corsOrigin) {
      res.set("Access-Control-Allow-Origin", deps.config.corsOrigin);
      res.set("Access-Control-Allow-Credentials", "true");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE");
      if (req.method === "OPTIONS") return res.sendStatus(204);
    }
    next();
  });

  app.get("/health", async (_req, res) => {
    const status = { chroma: "ok", agent: "ok", today: deps.config.today() };
    try {
      await deps.repos.store.heartbeat();
    } catch {
      status.chroma = "down";
    }
    try {
      await deps.agent.health();
    } catch {
      status.agent = "down";
    }
    res.json(status);
  });

  for (const [path, make] of deps.routers ?? []) app.use(path, make(deps));

  app.use((_req, _res, next) => next(notFound()));
  app.use(errorHandler);
  return app;
}
