// 루트 .env 설정. 필수 키가 없으면 키 이름만 알리고 실패한다 (값은 어디에도 출력하지 않는다).
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { todayKst } from "./lib/dates.js";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const REQUIRED = ["AGENT_API_KEY", "JWT_SECRET"];

export class ConfigError extends Error {}

/** 환경변수(+ 루트 .env)에서 설정을 읽는다. 이미 있는 환경변수가 우선한다 (Python과 같은 규칙). */
export function loadConfig(env = process.env, { envFile = join(ROOT, ".env"), requireSecrets = true } = {}) {
  if (envFile) dotenv.config({ path: envFile, override: false, quiet: true, processEnv: env });
  if (requireSecrets) {
    const missing = REQUIRED.filter((k) => !env[k]);
    if (missing.length) throw new ConfigError(`.env에 필요한 키가 없다: ${missing.join(", ")}`);
  }
  todayKst(env); // TODAY_OVERRIDE 형식이 틀리면 시작할 때 실패
  const port = Number(env.CHROMA_PORT || 8001);
  if (!Number.isInteger(port)) throw new ConfigError("CHROMA_PORT는 숫자여야 한다");
  const checkpoint = env.CHECKPOINT_PATH || "data/checkpoints/checkpoints.sqlite";
  return Object.freeze({
    chroma: { host: env.CHROMA_HOST || "localhost", port, database: env.CHROMA_DATABASE || undefined },
    agentUrl: (env.AGENT_URL || "http://localhost:8000").replace(/\/$/, ""),
    agentApiKey: env.AGENT_API_KEY,
    jwtSecret: env.JWT_SECRET,
    checkpointPath: isAbsolute(checkpoint) ? checkpoint : join(ROOT, checkpoint),
    checkpointDir: join(ROOT, "data", "checkpoints"),
    faultInject: env.FAULT_INJECT || "",
    port: Number(env.PORT || 3000),
    corsOrigin: "http://localhost:5173",
    today: () => todayKst(env),
  });
}
