// 채팅 응답(answer·contexts·trace) → 말풍선 표시 모델 (판정 근거: ARCHITECTURE.md 4.1 "화면 판정 근거", D3).
import type { ChatResponse, Pet, TraceEvent } from "@/api/types";
import { AGENT_ICONS, AGENT_LABELS, traceSteps } from "./traceLabels";
import type { Mood } from "@/components/mascot/Mascot";

export interface ApprovalModel {
  tool: string;
  args: Record<string, unknown>; // 수정 승인(edit)에만 쓰고 화면에 보여 주지 않는다
  summary: { action: "create" | "update"; item_name: string | null; due_date: string | null; dose_no: number | null; event_id?: string | null };
  threadId: string;
}

export interface BotView {
  text: string;
  agent: string | null;
  agentLabel: string | null;
  agentIcon: string | null;
  contexts: string[];
  steps: string[];
  approval: ApprovalModel | null;
  sources: string[];
  isWeb: boolean;
  emergency: boolean;
  blocked: boolean;
  preferenceSaved: boolean;
  switchTo: { petId: string; name: string } | null;
  mood: Mood;
}

const CATALOG_ID_PAREN = /\s*\((?:act|diet|hc)_[a-z0-9_]+\)/g;
const CATALOG_ID_BARE = /\b(?:act|diet|hc)_[a-z0-9_]+\b/g;

/** 화면 표시용 답변: 카탈로그 ID 표기를 지운다 (D6). HTML로 해석하지 않으므로 그 밖의 가공은 하지 않는다 */
export function displayText(answer: string): string {
  return answer.replace(CATALOG_ID_PAREN, "").replace(CATALOG_ID_BARE, "").replace(/[ \t]+\n/g, "\n");
}

/** http(s) URL만 허용 */
export function safeUrl(u: unknown): string | null {
  if (typeof u !== "string") return null;
  try {
    const url = new URL(u);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function chatView(res: Pick<ChatResponse, "answer" | "contexts" | "trace">, pets: Pet[] = []): BotView {
  const trace: TraceEvent[] = res.trace ?? [];
  const handoffs = trace.filter((e) => e.type === "handoff" && e.from === "supervisor");
  const agent = handoffs.length ? String(handoffs[handoffs.length - 1].to) : null;
  const interrupt = trace.find((e) => e.type === "interrupt" && e.status !== "cancelled");
  const webResults = trace.filter((e) => e.type === "tool_result" && e.tool === "web_search");
  const sources = [...new Set(webResults.flatMap((e) => (Array.isArray(e.sources) ? e.sources : [])).map(safeUrl).filter((u): u is string => Boolean(u)))];
  const isWeb = trace.some((e) => e.type === "tool_call" && e.tool === "web_search");
  const emergency = trace.some((e) => e.type === "final" && e.emergency === true);
  const blocked = trace.some((e) => e.type === "guardrail" && e.stage === "input");
  const preferenceSaved = trace.some((e) => e.type === "tool_call" && e.tool === "remember_preference");
  const m = /([^\s"'“”]+?)(?:를|을)\s*선택한 뒤 요청해 주세요/.exec(res.answer);
  const target = m ? pets.find((p) => p.name === m[1]) : undefined;
  const outOfScope = !agent && !interrupt && !blocked && trace.every((e) => e.type === "final");
  return {
    text: displayText(res.answer),
    agent,
    agentLabel: agent ? (AGENT_LABELS[agent] ?? null) : null,
    agentIcon: agent ? (AGENT_ICONS[agent] ?? null) : null,
    contexts: res.contexts ?? [],
    steps: traceSteps(trace),
    approval: interrupt
      ? {
          tool: String(interrupt.tool),
          args: (interrupt.args as Record<string, unknown>) ?? {},
          summary: (interrupt.summary as ApprovalModel["summary"]) ?? { action: "create", item_name: null, due_date: null, dose_no: null },
          threadId: String(interrupt.thread_id ?? ""),
        }
      : null,
    sources,
    isWeb,
    emergency,
    blocked,
    preferenceSaved,
    switchTo: target ? { petId: target.id, name: target.name } : null,
    mood: emergency ? "worried" : blocked || outOfScope ? "sorry" : "default",
  };
}
