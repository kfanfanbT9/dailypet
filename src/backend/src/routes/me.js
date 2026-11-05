// GET /api/me, DELETE /api/me { confirm_email } — 회원 탈퇴는 가입 이메일을 입력해야 실행 (F0).
import express from "express";
import { z } from "zod";
import { clearSession, parseBody } from "../auth/index.js";
import { badRequest } from "../lib/errors.js";
import { normalizeEmail } from "../lib/ids.js";
import { deleteUser } from "../services/cascade.js";

const deleteSchema = z.object({ confirm_email: z.string().min(1) });

export function meRouter(deps) {
  const r = express.Router();

  r.get("/me", async (req, res) => {
    const u = await deps.repos.users.getById(req.userId);
    res.json({ user_id: u.id, email: u.email, nickname: u.nickname, created_at: u.created_at });
  });

  r.delete("/me", async (req, res) => {
    const { confirm_email } = parseBody(deleteSchema, req.body);
    const u = await deps.repos.users.getById(req.userId);
    if (normalizeEmail(confirm_email) !== u.email) throw badRequest("가입한 이메일을 정확히 입력해 주세요.");
    await deleteUser(deps, req.userId);
    clearSession(res);
    res.status(204).end();
  });

  return r;
}
