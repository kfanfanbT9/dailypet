// 채팅 프록시·대화 기록 (F6·F14). chat_logs는 Agent만 쓰고 Backend는 읽기·삭제만 한다 (ARCHITECTURE.md 5장).
// Backend 로그에는 질문·답변을 남기지 않는다 (요청 로그는 경로·상태·시간만).
import express from "express";
import { z } from "zod";
import { parseBody } from "../auth/index.js";
import { threadIdFromTrace } from "../agentClient.js";
import { HttpError, forbidden, notFound } from "../lib/errors.js";
import { parseThreadId } from "../lib/ids.js";
import { loadPet } from "./common.js";

export const MAX_QUESTION = 1000; // Agent 입력 가드레일과 같은 값
const chatSchema = z.object({
  question: z.string().trim().min(1).max(MAX_QUESTION),
  petId: z.string().min(1),
  threadId: z.string().min(1).optional(),
});
const decision = z.discriminatedUnion("type", [
  z.object({ type: z.literal("approve") }).strict(),
  z
    .object({
      type: z.literal("edit"),
      edited_action: z.object({ name: z.string(), args: z.record(z.string(), z.unknown()) }),
    })
    .strict(),
  z.object({ type: z.literal("reject"), message: z.string().max(300).optional() }).strict(),
]);
const resumeSchema = z.object({ threadId: z.string().min(1), decisions: z.array(decision).min(1).max(10) });

/** Agent 4xx 응답(세 키)을 Backend 오류 본문으로 바꾼다. */
function agentError(r) {
  const reason = r.body?.trace?.find((e) => e.type === "error")?.reason ?? "agent_error";
  return new HttpError(r.status, reason, r.body?.answer ?? "요청을 처리하지 못했어요.");
}

export function chatRouter(deps) {
  const r = express.Router();

  r.post("/chat", async (req, res) => {
    const { question, petId, threadId } = parseBody(chatSchema, req.body);
    const pet = await loadPet(deps, req.userId, petId);
    if (threadId) {
      const parsed = parseThreadId(threadId);
      if (!parsed || parsed.userId !== req.userId || parsed.petId !== pet.id)
        throw notFound("대화를 찾을 수 없어요.");
    }
    // user_id·pet_id는 인증된 값만 넘긴다 (본문의 user_id는 스키마에 없어 무시됨)
    const result = await deps.agent.query({
      question,
      user_id: req.userId,
      pet_id: pet.id,
      ...(threadId ? { thread_id: threadId } : {}),
    });
    if (result.status !== 200) throw agentError(result);
    res.json({ ...result.body, thread_id: threadIdFromTrace(result.body.trace) ?? threadId ?? null });
  });

  r.post("/chat/resume", async (req, res) => {
    const { threadId, decisions } = parseBody(resumeSchema, req.body);
    const parsed = parseThreadId(threadId);
    if (!parsed || parsed.userId !== req.userId) throw forbidden("이 대화에는 접근할 수 없어요.");
    const result = await deps.agent.resume({ user_id: req.userId, thread_id: threadId, decisions });
    if (result.status !== 200) throw agentError(result);
    res.json({ ...result.body, thread_id: threadId });
  });

  r.get("/pets/:id/threads", async (req, res) => {
    const pet = await loadPet(deps, req.userId, req.params.id);
    const logs = await deps.repos.chatLogs.list(req.userId, { pet_id: pet.id });
    const threads = new Map();
    for (const l of logs.sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const t = threads.get(l.thread_id) ?? {
        thread_id: l.thread_id,
        started_at: l.created_at,
        title: l.question.slice(0, 30),
        count: 0,
      };
      t.last_at = l.created_at;
      t.count += 1;
      threads.set(l.thread_id, t);
    }
    res.json([...threads.values()].sort((a, b) => b.last_at.localeCompare(a.last_at)));
  });

  r.get("/threads/:threadId", async (req, res) => {
    const parsed = parseThreadId(req.params.threadId);
    if (!parsed || parsed.userId !== req.userId) throw notFound("대화를 찾을 수 없어요.");
    const logs = await deps.repos.chatLogs.list(req.userId, { thread_id: req.params.threadId });
    if (logs.length === 0) throw notFound("대화를 찾을 수 없어요.");
    res.json({
      thread_id: req.params.threadId,
      pet_id: logs[0].pet_id,
      messages: logs
        .sort((a, b) => a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id))
        .map(({ question, answer, trace, created_at }) => ({ question, answer, trace, created_at })),
    });
  });

  r.delete("/threads/:threadId", async (req, res) => {
    const parsed = parseThreadId(req.params.threadId);
    if (!parsed || parsed.userId !== req.userId) throw notFound("대화를 찾을 수 없어요.");
    await deps.repos.chatLogs.removeWhere(req.userId, { thread_id: req.params.threadId });
    deps.checkpoints?.deleteThreads([req.params.threadId]);
    res.status(204).end();
  });

  return r;
}
