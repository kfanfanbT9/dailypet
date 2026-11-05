// 서버 시작 시·매일 실행할 작업 목록.
import { log } from "../lib/logger.js";
import { cleanupOrphans } from "../services/cascade.js";
import { markOverdue } from "./overdue.js";

async function overdueJob(deps) {
  const n = await markOverdue(deps.repos.store, deps.config.today());
  if (n) log.info("overdue_marked", { count: n });
}

export const STARTUP_JOBS = [cleanupOrphans, overdueJob];
export const DAILY_JOBS = [overdueJob];
