// 가짜 Agent 서버 — ARCHITECTURE.md 4.1·4.1.1·4.1.2 응답 모양을 돌려주고 요청을 기록한다.
// mode: "ok" | "error"(500) | "down"(연결 거부) / delayMs: 응답 지연
import express from "express";

export async function startFakeAgent() {
  const state = {
    mode: "ok",
    delayMs: 0,
    requests: [],
    /** (body) => 응답 본문 */
    tasksGenerate: (body) => ({
      date: body.date,
      tasks: body.category
        ? []
        : [
            {
              category: "diet",
              catalog_item_id: "diet_dog_weight_loss_plan_01",
              title: "체중 감량 급여 계획",
              time: "08:00",
              reason: "기본",
              rank: 1,
              relaxed: [],
            },
            {
              category: "activity",
              catalog_item_id: "act_dog_nosework_find_it_01",
              title: "노즈워크 '찾아' 게임 10~20분",
              time: "18:00",
              reason: "3회 이상 완료한 항목",
              rank: 1,
              relaxed: [],
            },
          ],
    }),
    query: (body) => {
      const thread = body.thread_id ?? `thr_${body.user_id}_${body.pet_id}_0123456789abcdef0123456789abcdef`;
      return {
        status: 200,
        body: {
          answer: "가짜 답변이에요.",
          contexts: [],
          trace: [
            { step: 1, type: "handoff", from: "supervisor", to: "diet_agent" },
            { step: 2, type: "final", agent: "supervisor", thread_id: thread },
          ],
        },
      };
    },
    resume: (_body) => ({
      status: 200,
      body: { answer: "처리했어요.", contexts: [], trace: [{ step: 1, type: "final", agent: "supervisor" }] },
    }),
  };

  const defaults = { tasksGenerate: state.tasksGenerate, query: state.query, resume: state.resume };

  const app = express();
  app.use(express.json());
  app.use(async (req, res, next) => {
    state.requests.push({ method: req.method, path: req.path, headers: { ...req.headers }, body: req.body });
    if (state.delayMs) await new Promise((r) => setTimeout(r, state.delayMs));
    if (state.mode === "error") return res.status(500).json({ detail: "fake error" });
    next();
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.post("/tasks/generate", (req, res) => res.json(state.tasksGenerate(req.body)));
  app.post("/query", (req, res) => {
    const r = state.query(req.body);
    res.status(r.status).json(r.body);
  });
  app.post("/query/resume", (req, res) => {
    const r = state.resume(req.body);
    res.status(r.status).json(r.body);
  });

  let server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const port = server.address().port;
  const sockets = new Set();
  server.on("connection", (s) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });

  return {
    state,
    url: `http://127.0.0.1:${port}`,
    /** 모드·지연·기록과 함께 바꾼 응답 함수도 기본값으로 되돌린다 (테스트 간 누수 방지) */
    reset() {
      Object.assign(state, defaults);
      state.mode = "ok";
      state.delayMs = 0;
      state.requests.length = 0;
    },
    calls: (path) => state.requests.filter((r) => r.path === path),
    /** 서버를 멈춰 연결 거부 상태로 만든다 */
    async stop() {
      for (const s of sockets) s.destroy();
      await new Promise((r) => server.close(r));
      server = null;
    },
    async close() {
      if (server) await this.stop();
    },
  };
}
