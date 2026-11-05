// 인증 (F0): 가입·로그인·로그아웃, requireAuth (JWT httpOnly 쿠키).
import bcrypt from "bcryptjs";
import express from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { nowKstIso } from "../lib/dates.js";
import { badRequest, conflict, unauthorized } from "../lib/errors.js";
import { normalizeEmail, userIdFromEmail } from "../lib/ids.js";

export const COOKIE = "dp_session";
const TOKEN_TTL_S = 7 * 24 * 3600;
const BCRYPT_COST = 10;
const COOKIE_OPTS = { httpOnly: true, sameSite: "lax", secure: false, path: "/" }; // 로컬 데모라 Secure 끔

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email()),
  password: z.string().min(8).max(72),
  nickname: z.string().trim().min(1).max(20),
});
const loginSchema = z.object({ email: z.string().min(1), password: z.string().min(1) });

/** zod 검사 → 실패하면 400 (입력 값은 응답에 넣지 않고 필드 이름만). */
export function parseBody(schema, body) {
  const r = schema.safeParse(body ?? {});
  if (!r.success) {
    const fields = [...new Set(r.error.issues.map((i) => i.path.join(".") || "body"))];
    throw badRequest(`입력값을 확인해 주세요: ${fields.join(", ")}`, {
      fields: fields.map((field) => ({ field })),
    });
  }
  return r.data;
}

export function issueSession(res, userId, secret) {
  const token = jwt.sign({ sub: userId }, secret, { expiresIn: TOKEN_TTL_S, algorithm: "HS256" });
  res.cookie(COOKIE, token, { ...COOKIE_OPTS, maxAge: TOKEN_TTL_S * 1000 });
}

export function clearSession(res) {
  res.clearCookie(COOKIE, COOKIE_OPTS);
}

/** 쿠키 검증 → req.userId. 토큰이 유효해도 users에 없으면(탈퇴 후) 401. */
export function requireAuth(deps) {
  return async (req, _res, next) => {
    try {
      const token = req.cookies?.[COOKIE];
      if (!token) throw unauthorized();
      let payload;
      try {
        payload = jwt.verify(token, deps.config.jwtSecret, { algorithms: ["HS256"] });
      } catch {
        throw unauthorized();
      }
      if (typeof payload.sub !== "string" || !payload.sub.startsWith("usr_")) throw unauthorized();
      if (!(await deps.repos.users.getById(payload.sub))) throw unauthorized();
      req.userId = payload.sub;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function authRouter(deps) {
  const r = express.Router();

  r.post("/signup", async (req, res) => {
    const { email, password, nickname } = parseBody(signupSchema, req.body);
    const id = userIdFromEmail(email);
    if (await deps.repos.users.getById(id)) throw conflict("email_taken", "이미 사용 중인 이메일이에요.");
    const user = {
      id,
      email,
      password_hash: await bcrypt.hash(password, BCRYPT_COST),
      nickname,
      created_at: nowKstIso(),
    };
    await deps.repos.users.create(user);
    issueSession(res, id, deps.config.jwtSecret);
    res.status(201).json({ user_id: id, email, nickname, created_at: user.created_at });
  });

  r.post("/login", async (req, res) => {
    const { email, password } = parseBody(loginSchema, req.body);
    const user = await deps.repos.users.getById(userIdFromEmail(normalizeEmail(email)));
    const ok = user ? await bcrypt.compare(password, user.password_hash) : false;
    if (!ok) throw unauthorized("이메일 또는 비밀번호를 확인해 주세요.");
    issueSession(res, user.id, deps.config.jwtSecret);
    res.json({ user_id: user.id, email: user.email, nickname: user.nickname });
  });

  r.post("/logout", (_req, res) => {
    clearSession(res);
    res.status(204).end();
  });

  return r;
}
