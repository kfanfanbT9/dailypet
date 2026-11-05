// id 규칙 — Python과 같은 규칙 (ARCHITECTURE.md 5장·5.1 공유 기준 사례).
import { createHash, randomBytes, randomUUID } from "node:crypto";

function sha256Hex(text) {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

/** usr_ + sha256(소문자 이메일) 앞 12자리. 같은 이메일은 같은 id → 중복 저장이 구조적으로 불가능. */
export function userIdFromEmail(email) {
  return `usr_${sha256Hex(normalizeEmail(email)).slice(0, 12)}`;
}

/** 무작위 id: <prefix>_ + 소문자 영숫자 n자리 (시드 id와 겹치지 않게 무작위). */
export function newId(prefix, n = 12) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = randomBytes(n);
  let out = "";
  for (const b of bytes) out += alphabet[b % alphabet.length];
  return `${prefix}_${out}`;
}

/** 취향 행 id: pref_{pet_id 또는 user_id}_{sha256("kind|target")[:10]} (tools.py remember_preference와 같음). */
export function prefId({ userId, petId, kind, target }) {
  return `pref_${petId || userId}_${sha256Hex(`${kind}|${target}`).slice(0, 10)}`;
}

const THREAD_RE = /^thr_(usr_[A-Za-z0-9]+)_(pet_[A-Za-z0-9]+)_([0-9a-f]{8,32})$/;

export function newThreadId(userId, petId) {
  return `thr_${userId}_${petId}_${randomUUID().replaceAll("-", "")}`;
}

/** { userId, petId } 또는 형식이 틀리면 null. */
export function parseThreadId(threadId) {
  const m = THREAD_RE.exec(threadId ?? "");
  return m ? { userId: m[1], petId: m[2] } : null;
}
