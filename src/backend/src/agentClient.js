// Agent 서버 호출 (X-Agent-Api-Key). 연결 실패·타임아웃·5xx → AgentUnavailable (라우트에서 503).
// 4xx는 { status, body }로 돌려줘 호출 쪽이 같은 코드로 넘길 수 있게 한다.
import { AgentUnavailable } from "./lib/errors.js";

export const TIMEOUTS = { tasks: 5000, query: 60000, health: 2000 };

export function createAgentClient({ baseUrl, apiKey, fetchImpl = globalThis.fetch, timeouts = TIMEOUTS }) {
  async function call(method, path, body, timeoutMs) {
    let res;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json", "X-Agent-Api-Key": apiKey },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err) {
      throw new AgentUnavailable(err?.name === "TimeoutError" ? "timeout" : "connection");
    }
    if (res.status >= 500) throw new AgentUnavailable(`status_${res.status}`);
    const data = await res.json().catch(() => null);
    return { status: res.status, body: data };
  }

  return {
    /** POST /tasks/generate — LLM 없음, 5초 타임아웃. 4xx면 예외. */
    async generateTasks(body) {
      const r = await call("POST", "/tasks/generate", body, timeouts.tasks);
      if (r.status !== 200) throw new AgentUnavailable(`status_${r.status}`);
      return r.body;
    },
    /** POST /query — 60초 타임아웃. */
    query: (body) => call("POST", "/query", body, timeouts.query),
    /** POST /query/resume */
    resume: (body) => call("POST", "/query/resume", body, timeouts.query),
    async health() {
      const r = await call("GET", "/health", undefined, timeouts.health);
      if (r.status !== 200) throw new AgentUnavailable(`status_${r.status}`);
      return r.body;
    },
  };
}

/** Agent 응답 trace에서 thread_id를 꺼낸다 (final 또는 interrupt 이벤트, ARCHITECTURE.md 4.1 표). */
export function threadIdFromTrace(trace) {
  for (const e of [...(trace ?? [])].reverse()) {
    if ((e.type === "final" || e.type === "interrupt") && e.thread_id && e.status !== "cancelled")
      return e.thread_id;
  }
  return null;
}
