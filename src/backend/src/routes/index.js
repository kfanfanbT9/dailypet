// 라우터 목록 [마운트 경로, 생성 함수(deps)].
// /api/auth/*를 뺀 모든 /api 라우트는 apiRouter 안에 있어 requireAuth를 구조적으로 거친다.
import express from "express";
import { authRouter, requireAuth } from "../auth/index.js";
import { healthRouter } from "./health.js";
import { meRouter } from "./me.js";
import { petsRouter } from "./pets.js";
import { prefsRouter } from "./prefs.js";
import { tasksRouter } from "./tasks.js";
import { chatRouter } from "./chat.js";

/** 인증이 필요한 하위 라우터들 */
export const PROTECTED = [meRouter, petsRouter, healthRouter, prefsRouter, tasksRouter, chatRouter];

export function apiRouter(deps) {
  const r = express.Router();
  r.use(requireAuth(deps));
  for (const make of PROTECTED) r.use(make(deps));
  return r;
}

export const ROUTERS = [
  ["/api/auth", authRouter],
  ["/api", apiRouter],
];
