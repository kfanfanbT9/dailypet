// 로그: 메서드·경로·상태·소요 시간만 (phase2_task.md 1.5). 요청·응답 본문, 쿠키, 키는 남기지 않는다.
import { maskPii } from "./mask.js";

let sink = (line) => process.stdout.write(`${line}\n`);

/** 테스트에서 로그를 모으려고 출력 대상을 바꾼다. 이전 대상을 돌려준다. */
export function setLogSink(fn) {
  const prev = sink;
  sink = fn;
  return prev;
}

function write(level, event, fields = {}) {
  const parts = Object.entries(fields).map(([k, v]) => `${k}=${maskPii(String(v))}`);
  sink([new Date().toISOString(), level, event, ...parts].join(" "));
}

export const log = {
  info: (event, fields) => write("INFO", event, fields),
  warn: (event, fields) => write("WARN", event, fields),
  error: (event, fields) => write("ERROR", event, fields),
};

/** Express 요청 로그 미들웨어. 쿼리스트링은 남기지 않는다. */
export function requestLogger(req, res, next) {
  const started = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - started) / 1e6;
    log.info("request", {
      method: req.method,
      path: req.originalUrl.split("?")[0],
      status: res.statusCode,
      ms: ms.toFixed(1),
    });
  });
  next();
}
