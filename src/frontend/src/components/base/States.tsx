// 빈 상태·영역 오류·스켈레톤·진행 막대·탭 (Style-guide.md 7.10, 7.12).
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import type { Species } from "@/api/types";
import { Mascot } from "@/components/mascot/Mascot";
import { Button } from "./Button";

export function EmptyState({
  species = "dog",
  title,
  action,
}: {
  species?: Species;
  title: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <Mascot species={species} mood="default" size={96} decorative />
      <p className="font-display text-title-2 text-text">{title}</p>
      {action && <Button onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}

/** 그 영역만 오류로 보여 준다 (S22). 나머지 영역은 정상. */
export function ErrorState({
  species = "dog",
  message = "잠시 후 다시 시도해 주세요",
  onRetry,
}: {
  species?: Species;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-card bg-surface p-6 text-center shadow-1"
    >
      <Mascot species={species} mood="sorry" size={96} decorative />
      <p className="text-body text-text">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          다시 시도
        </Button>
      )}
    </div>
  );
}

export function Skeleton({ lines = 3, label = "불러오는 중이에요" }: { lines?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} aria-hidden="true" className="skeleton min-h-btn-md rounded-card" />
      ))}
    </div>
  );
}

export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
        className="h-bar flex-1 overflow-hidden rounded-pill bg-border"
      >
        <div
          className="h-full rounded-pill bg-accent transition-all duration-base"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="tabular text-small font-bold text-text">
        {done}/{total}
      </span>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = (i + d + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className="flex gap-2">
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          role="tab"
          type="button"
          aria-selected={t.value === value}
          tabIndex={t.value === value ? 0 : -1}
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => onKey(e, i)}
          className={`min-h-touch rounded-pill px-4 text-small font-bold ${
            t.value === value ? "bg-species text-species-strong" : "bg-surface text-muted"
          }`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
