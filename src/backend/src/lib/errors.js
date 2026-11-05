// HTTP 오류와 공통 오류 본문 { error: { code, message } } (phase2_task.md 1.5).
import { log } from "./logger.js";

export class HttpError extends Error {
  /** @param {number} status @param {string} code @param {string} message 한국어 안내 @param {object} [extra] */
  constructor(status, code, message, extra = undefined) {
    super(code);
    this.status = status;
    this.code = code;
    this.userMessage = message;
    this.extra = extra;
  }
}

export const badRequest = (message, extra) => new HttpError(400, "bad_request", message, extra);
export const notFound = (message = "찾을 수 없어요.") => new HttpError(404, "not_found", message);
export const conflict = (code, message) => new HttpError(409, code, message);
export const unauthorized = (message = "로그인이 필요해요.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "접근할 수 없어요.") => new HttpError(403, "forbidden", message);

/** Agent 서버 장애 (연결 실패·타임아웃·5xx). */
export class AgentUnavailable extends Error {
  constructor(reason) {
    super("agent_unavailable");
    this.reason = reason;
  }
}

/** Express 오류 처리기. 예외 메시지·스택은 응답과 로그에 넣지 않는다 (이름만 로그). */
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ error: { code: err.code, message: err.userMessage, ...(err.extra ?? {}) } });
    return;
  }
  if (err instanceof AgentUnavailable) {
    res.status(503).json({ error: { code: "agent_unavailable", message: "잠시 후 다시 시도해 주세요." } });
    return;
  }
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: { code: "bad_request", message: "요청 형식이 올바르지 않아요." } });
    return;
  }
  log.error("internal_error", { error: err?.name ?? "Error" });
  res.status(500).json({ error: { code: "internal", message: "요청을 처리하는 중에 문제가 생겼어요." } });
}
