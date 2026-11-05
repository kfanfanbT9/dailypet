// 상태 배지 (Style-guide.md 7.5): 색 + 아이콘 + 글자. 색만으로 구분하지 않는다.
import type { ReactNode } from "react";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const TONE: Record<BadgeTone, string> = {
  success: "bg-success-bg text-success",
  warning: "bg-warning-bg text-warning",
  danger: "bg-danger-bg text-danger",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
};

export function Badge({ tone, icon, children }: { tone: BadgeTone; icon?: ReactNode; children: ReactNode }) {
  return (
    <span
      className={`inline-flex min-h-badge items-center gap-1 whitespace-nowrap rounded-pill px-2 text-small ${TONE[tone]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}

/** 건강 일정 상태 배지 (서버 d_day·status 그대로) */
export function HealthBadge({ status, dDay }: { status: string; dDay: number }) {
  if (status === "done")
    return (
      <Badge tone="success" icon="✓">
        완료
      </Badge>
    );
  if (status === "needs_history")
    return (
      <Badge tone="warning" icon="ⓘ">
        이력 확인 필요
      </Badge>
    );
  if (status === "overdue" || dDay < 0)
    return (
      <Badge tone="danger" icon="⚠️">
        지연됨
      </Badge>
    );
  if (dDay === 0)
    return (
      <Badge tone="warning" icon="⏰">
        오늘
      </Badge>
    );
  if (dDay === 1)
    return (
      <Badge tone="warning" icon="⏰">
        D-1
      </Badge>
    );
  return <Badge tone={dDay <= 7 ? "warning" : "neutral"} icon="⏰">{`D-${dDay}`}</Badge>;
}
