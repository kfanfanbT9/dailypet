// trace → 사용자용 문구 표 (ARCHITECTURE.md 7.6, 유일한 위치). 표에 없는 항목은 "처리 중 단계", args는 절대 쓰지 않는다.
import type { TraceEvent } from "@/api/types";

export const AGENT_LABELS: Record<string, string> = {
  supervisor: "상담 도우미",
  diet_agent: "식단 도우미",
  exercise_agent: "운동 도우미",
  health_agent: "건강 도우미",
  general_agent: "상식 도우미",
};

export const AGENT_ICONS: Record<string, string> = {
  diet_agent: "🍽",
  exercise_agent: "🐾",
  health_agent: "💉",
  general_agent: "🌐",
  supervisor: "💬",
};

/** ARCHITECTURE.md 3.4의 도구 전부 */
export const TOOL_LABELS: Record<string, string> = {
  get_pet_profile: "프로필 확인",
  list_my_pets: "반려동물 목록 확인",
  calc_daily_calories: "하루 칼로리 계산",
  recommend_from_catalog: "카탈로그에서 추천 (안전 조건 적용)",
  get_preferences: "취향 확인",
  remember_preference: "취향 저장",
  web_search: "웹에서 찾아보기",
  get_health_schedule: "건강 일정 확인",
  get_upcoming_events: "다가오는 일정 확인",
  search_pet_knowledge: "지식 문서 검색",
  create_health_event: "건강 일정 등록 요청",
  update_health_event: "건강 일정 변경 요청",
};

export const UNKNOWN_STEP = "처리 중 단계";

const agentLabel = (name: unknown) => AGENT_LABELS[String(name)] ?? UNKNOWN_STEP;

/** trace 이벤트 → 사용자 문구 한 줄 (보여 줄 필요 없는 이벤트는 null) */
export function stepLabel(e: TraceEvent): string | null {
  switch (e.type) {
    case "handoff":
      return e.from === "supervisor" ? `상담 도우미 → ${agentLabel(e.to)}에게 전달` : `${agentLabel(e.from)}가 답을 정리했어요`;
    case "tool_call":
      return TOOL_LABELS[String(e.tool)] ?? UNKNOWN_STEP;
    case "guardrail":
      return "안전 확인";
    case "interrupt":
      return e.status === "cancelled" ? "이전 승인 요청 취소" : "승인 요청";
    case "error":
      return "잠시 문제가 생겼어요";
    case "tool_result":
    case "final":
      return null;
    default:
      return UNKNOWN_STEP;
  }
}

/** 단계 목록 (연속으로 같은 문구는 하나로 묶는다) */
export function traceSteps(trace: TraceEvent[]): string[] {
  const out: string[] = [];
  for (const e of trace) {
    const label = stepLabel(e);
    if (label && out[out.length - 1] !== label) out.push(label);
  }
  return out;
}
