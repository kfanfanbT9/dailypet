// 로그용 PII 마스킹 — Python src/agent.py PII_RULES 중 로그에 필요한 것만 (CLAUDE.md 4.7).
// Backend 로그에는 본문을 남기지 않으므로, 예외 메시지 등에 사용자 입력이 섞일 때만 쓴다.

const RULES = [
  [/(?<!\d)\d{6}-?[1-4]\d{6}(?!\d)/g, "[REDACTED_RRN]"],
  [/(?<![\d-])\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}(?![\d-])/g, "[REDACTED_CARD]"],
  [/(?<!\d)01[016-9]-?\d{3,4}-?\d{4}(?!\d)/g, "[REDACTED_PHONE]"],
  [/(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![A-Za-z])/g, "[REDACTED_EMAIL]"],
  [/(?<![\d.])(?:\d{1,3}\.){3}\d{1,3}(?![\d.])/g, "[REDACTED_IP]"],
];

export function maskPii(text) {
  let out = String(text ?? "");
  for (const [re, replacement] of RULES) out = out.replace(re, replacement);
  return out;
}
