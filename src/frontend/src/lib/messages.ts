// 오류 코드 → 한국어 문구 (Style-guide.md 11장: 탓하지 않고 방법을). 서버 메시지 원문 대신 코드로 고른다.
import { ApiError } from "@/api/client";

const BY_CODE: Record<string, string> = {
  network: "잠시 연결이 불안정해요. 다시 시도해 주세요.",
  agent_unavailable: "잠시 후 다시 시도해 주세요.",
  email_taken: "이미 사용 중인 이메일이에요.",
  weight_exists: "이 날짜에 기록이 있어요. 덮어쓸까요?",
  already_done: "이미 완료한 일정이에요.",
  unauthorized: "다시 로그인해 주세요.",
  not_found: "찾을 수 없어요.",
  forbidden: "이미 처리되었거나 찾을 수 없는 요청이에요.",
  no_pending_action: "이미 처리되었거나 찾을 수 없는 요청이에요.",
  internal: "요청을 처리하는 중에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.",
};

const BY_STATUS: Record<number, string> = {
  400: "입력한 내용을 확인해 주세요.",
  401: BY_CODE.unauthorized,
  403: BY_CODE.forbidden,
  404: BY_CODE.not_found,
  409: "이미 처리된 요청이에요.",
  503: BY_CODE.agent_unavailable,
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return BY_CODE[err.code] ?? BY_STATUS[err.status] ?? BY_CODE.internal;
  return BY_CODE.internal;
}
