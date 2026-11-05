// 채팅 말풍선 (Style-guide.md 7.6). 답변은 일반 텍스트로만 렌더한다 (HTML 해석 금지, 줄바꿈은 whitespace-pre-wrap).
import type { ReactNode } from "react";
import { Mascot, type Mood } from "@/components/mascot/Mascot";
import { useMotionReduced } from "@/state/settings";

type Species = "dog" | "cat";

export function UserBubble({ text, footer }: { text: string; footer?: ReactNode }) {
  return (
    <li className="flex flex-col items-end gap-1">
      <p className="max-w-[80%] whitespace-pre-wrap rounded-bubble rounded-br-tail bg-primary px-4 py-3 text-body text-on-primary wrap-anywhere">
        {text}
      </p>
      {footer}
    </li>
  );
}

export function BotBubble({
  species,
  mood = "default",
  tone = "normal",
  children,
  below,
}: {
  species: Species;
  mood?: Mood;
  tone?: "normal" | "emergency";
  children: ReactNode;
  below?: ReactNode;
}) {
  return (
    <li className="flex items-start gap-2">
      <Mascot species={species} mood={mood} size={32} decorative />
      <div className="flex min-w-0 max-w-[85%] flex-col gap-2">
        <div
          className={`rounded-bubble rounded-bl-tail px-4 py-3 text-body text-text shadow-1 ${
            tone === "emergency" ? "bg-danger-bg" : "bg-surface"
          }`}
        >
          {children}
        </div>
        {below}
      </div>
    </li>
  );
}

/** 답변 본문: 일반 텍스트. React가 문자열을 이스케이프하므로 태그가 그대로 글자로 보인다 */
export function PlainText({ text }: { text: string }) {
  return <p className="whitespace-pre-wrap wrap-anywhere">{text}</p>;
}

export function ThinkingBubble({ species }: { species: Species }) {
  const reduced = useMotionReduced();
  return (
    <li className="flex items-start gap-2">
      <Mascot species={species} size={32} decorative />
      <p className="rounded-bubble rounded-bl-tail bg-surface px-4 py-3 text-body text-muted shadow-1">
        {reduced ? (
          "생각 중…"
        ) : (
          <span aria-hidden="true" className="inline-flex gap-1">
            생각 중
            <span className="animate-bounce">.</span>
            <span className="animate-bounce [animation-delay:150ms]">.</span>
            <span className="animate-bounce [animation-delay:300ms]">.</span>
          </span>
        )}
        <span className="sr-only">답변을 준비하고 있어요</span>
      </p>
    </li>
  );
}
