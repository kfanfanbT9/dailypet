// W07 건강 일정: 이력 확인 필요 / 다가오는 일정 / 지난 기록, 리스트·캘린더. 다음 일정은 저장 후 서버 응답으로 보여 준다 (D2).
import { useQueryClient } from "@tanstack/react-query";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { health as healthApi } from "@/api/endpoints";
import type { HealthEvent, HealthUpdateResponse } from "@/api/types";
import { HealthBadge } from "@/components/base/Badge";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { Modal } from "@/components/base/Modal";
import { EmptyState, ErrorState, Skeleton, Tabs } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { qk, useHealthEvents } from "@/hooks/queries";
import { addDays, formatMD, todayKstBrowser } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet } from "@/state/currentPet";

type Action = { kind: "complete" | "lastDone" | "due"; event: HealthEvent };

const evTitle = (e: HealthEvent) => `${e.name}${e.dose_no ? ` ${e.dose_no}차` : ""}`;

/** 서버의 오늘 = due_date - d_day (Backend TODAY_OVERRIDE와 맞추기 위해, 브라우저 시계는 보조) */
function serverToday(events: HealthEvent[]): string {
  const e = events[0];
  return e ? addDays(e.due_date, -e.d_day) : todayKstBrowser();
}

function ActionModal({
  action,
  today,
  onClose,
}: {
  action: Action | null;
  today: string;
  onClose: () => void;
}) {
  const { pet } = useCurrentPet();
  const qc = useQueryClient();
  const toast = useToast();
  const [date, setDate] = useState(today);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<HealthUpdateResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<Action | null>(null);
  if (action !== shownFor) {
    setShownFor(action);
    setDate(today);
    setResult(null);
    setError(null);
  }
  if (!action) return null;
  const e = action.event;
  const isPastOnly = action.kind !== "due";
  const title =
    action.kind === "complete"
      ? `${evTitle(e)} 완료`
      : action.kind === "lastDone"
        ? `${evTitle(e)} 마지막 날짜 입력`
        : `${evTitle(e)} 날짜 정하기`;

  async function save() {
    if (!date) return setError("날짜를 입력해 주세요");
    if (isPastOnly && date > today) return setError("오늘보다 뒤의 날짜는 입력할 수 없어요");
    if (!isPastOnly && date < today) return setError("지난 날짜로는 정할 수 없어요");
    setBusy(true);
    try {
      const r =
        action!.kind === "complete"
          ? await healthApi.complete(e.id, date)
          : action!.kind === "lastDone"
            ? await healthApi.setLastDone(e.id, date)
            : await healthApi.setDue(e.id, date);
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.health(pet!.id) }),
        qc.invalidateQueries({ queryKey: qk.notifications }),
        qc.invalidateQueries({ queryKey: qk.tasks(pet!.id) }),
      ]);
      if (r.next) setResult(r);
      else {
        toast(action!.kind === "due" ? "날짜를 바꿨어요" : "기록했어요");
        onClose();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open
      title={title}
      onClose={onClose}
      footer={
        result ? (
          <Button onClick={onClose}>확인</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={onClose}>
              취소
            </Button>
            <Button onClick={save} loading={busy}>
              {action.kind === "complete" ? "완료하기" : "저장하기"}
            </Button>
          </>
        )
      }
    >
      {result?.next ? (
        <p className="text-body">
          <span aria-hidden="true">✨ </span>다음 일정:{" "}
          {result.next.dose_no ? `${result.next.dose_no}차 · ` : ""}
          {formatMD(result.next.due_date)}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <Input
            label={
              action.kind === "complete"
                ? "실제로 한 날"
                : action.kind === "lastDone"
                  ? "마지막으로 한 날"
                  : "예정일"
            }
            type="date"
            max={isPastOnly ? today : undefined}
            min={isPastOnly ? undefined : today}
            value={date}
            onChange={(ev) => setDate(ev.target.value)}
            error={error}
          />
          {isPastOnly && (
            <p className="text-caption text-muted">ⓘ 다음 일정은 실제로 한 날을 기준으로 잡아요</p>
          )}
        </div>
      )}
    </Modal>
  );
}

function EventCard({
  e,
  onAction,
  highlight,
}: {
  e: HealthEvent;
  onAction: (a: Action) => void;
  highlight: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "center" });
  }, [highlight]);
  return (
    <li
      ref={ref}
      data-event-id={e.id}
      className={`flex flex-wrap items-center gap-3 rounded-card bg-surface p-4 shadow-1 ${highlight ? "[outline:var(--border-strong)_solid_var(--color-accent)]" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-body font-bold wrap-anywhere">
          <span aria-hidden="true">💉 </span>
          {evTitle(e)}
        </p>
        <p className="tabular text-small text-muted">{formatMD(e.due_date)}</p>
      </div>
      <HealthBadge status={e.status} dDay={e.d_day} />
      <Button size="sm" onClick={() => onAction({ kind: "complete", event: e })}>
        완료
      </Button>
      <button
        type="button"
        aria-label={`${evTitle(e)} 메뉴`}
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
        className="min-h-touch min-w-touch text-muted"
      >
        <MoreHorizontal aria-hidden="true" className="mx-auto" />
      </button>
      {menu && (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setMenu(false);
            onAction({ kind: "due", event: e });
          }}
        >
          날짜 변경
        </Button>
      )}
    </li>
  );
}

function Calendar({ events, today }: { events: HealthEvent[]; today: string }) {
  const [focus, setFocus] = useState(today);
  const month = focus.slice(0, 7);
  const first = `${month}-01`;
  const startDow = new Date(`${first}T00:00:00Z`).getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0),
  ).getUTCDate();
  const byDate = useMemo(() => {
    const m = new Map<string, HealthEvent[]>();
    for (const e of events) m.set(e.due_date, [...(m.get(e.due_date) ?? []), e]);
    return m;
  }, [events]);
  const cells: (string | null)[] = [
    ...Array(startDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  while (cells.length % 7) cells.push(null);
  const onKey = (ev: KeyboardEvent) => {
    const d = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[ev.key];
    if (!d) return;
    ev.preventDefault();
    const next = addDays(focus, d);
    setFocus(next);
    setTimeout(() => document.getElementById(`cal-${next}`)?.focus(), 0);
  };
  const selected = byDate.get(focus) ?? [];
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Button size="sm" variant="ghost" onClick={() => setFocus(addDays(first, -1).slice(0, 8) + "01")}>
          ‹ 이전 달
        </Button>
        <p className="font-bold">{Number(month.slice(5, 7))}월</p>
        <Button size="sm" variant="ghost" onClick={() => setFocus(addDays(first, daysInMonth))}>
          다음 달 ›
        </Button>
      </div>
      <div
        role="grid"
        aria-label={`${month} 건강 일정 달력`}
        onKeyDown={onKey}
        className="grid grid-cols-7 gap-1 text-center"
      >
        {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
          <div key={d} role="columnheader" className="text-caption text-muted">
            {d}
          </div>
        ))}
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <div key={r} role="row" className="contents">
            {cells.slice(r * 7, r * 7 + 7).map((c, i) =>
              c ? (
                <button
                  key={c}
                  id={`cal-${c}`}
                  role="gridcell"
                  type="button"
                  tabIndex={c === focus ? 0 : -1}
                  aria-selected={c === focus}
                  aria-label={`${formatMD(c)}${byDate.has(c) ? `, 일정 ${byDate.get(c)!.length}개` : ""}`}
                  onClick={() => setFocus(c)}
                  className={`min-h-touch rounded-sm ${c === focus ? "bg-species font-bold" : ""}`}
                >
                  {Number(c.slice(8))}
                  {byDate.has(c) && (
                    <span aria-hidden="true" className="mx-auto block h-1 w-1 rounded-pill bg-danger" />
                  )}
                </button>
              ) : (
                <span key={`e${i}`} role="gridcell" aria-hidden="true" />
              ),
            )}
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-1">
        {selected.length === 0 ? (
          <li className="text-small text-muted">{formatMD(focus)}에는 일정이 없어요</li>
        ) : (
          selected.map((e) => (
            <li key={e.id}>
              {evTitle(e)} · <HealthBadge status={e.status} dDay={e.d_day} />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default function W07Health() {
  const { pet, isLoading } = useCurrentPet();
  const q = useHealthEvents(pet?.id);
  const [params] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [action, setAction] = useState<Action | null>(null);
  const highlight = params.get("event");
  if (isLoading) return <Skeleton />;
  if (!pet) return <EmptyState title="첫 반려동물을 등록해 주세요" />;
  const data = q.data;
  const all = data ? [...data.needs_history, ...data.upcoming, ...data.done] : [];
  const today = serverToday(all);
  return (
    <section className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-title-1">💉 {pet.name}의 건강 일정</h1>
        <Tabs
          label="보기 방식"
          value={view}
          onChange={setView}
          tabs={[
            { value: "list", label: "리스트" },
            { value: "calendar", label: "캘린더" },
          ]}
        />
      </div>
      {q.isLoading ? (
        <Skeleton />
      ) : q.isError ? (
        <ErrorState species={pet.species} onRetry={() => q.refetch()} />
      ) : view === "calendar" ? (
        <Calendar events={[...data!.needs_history, ...data!.upcoming]} today={today} />
      ) : (
        <>
          {data!.needs_history.length > 0 && (
            <section
              aria-labelledby="nh-title"
              className="flex flex-col gap-3 rounded-card bg-warning-bg p-4"
            >
              <h2 id="nh-title" className="font-bold text-warning">
                <span aria-hidden="true">⚠ </span>이력 확인 필요
              </h2>
              <ul className="flex flex-col gap-3">
                {data!.needs_history.map((e) => (
                  <li key={e.id} data-event-id={e.id} className="flex flex-col gap-2">
                    <p className="text-body font-bold">
                      {evTitle(e)}{" "}
                      <span className="text-small font-normal text-muted">권장 {formatMD(e.due_date)}</span>
                    </p>
                    <p className="text-small">마지막으로 한 날을 알려주시면 다음 일정을 잡아 드려요</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => setAction({ kind: "lastDone", event: e })}>
                        마지막 날짜 입력
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setAction({ kind: "due", event: e })}
                      >
                        날짜 정하기
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="up-title" className="flex flex-col gap-3">
            <h2 id="up-title" className="text-title-3 font-bold">
              다가오는 일정
            </h2>
            {data!.upcoming.length === 0 ? (
              <p className="text-muted">다가오는 일정이 없어요.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data!.upcoming.map((e) => (
                  <EventCard key={e.id} e={e} onAction={setAction} highlight={highlight === e.id} />
                ))}
              </ul>
            )}
          </section>
          {data!.done.length > 0 && (
            <details className="rounded-card bg-surface p-4 shadow-1">
              <summary className="min-h-touch cursor-pointer font-bold">지난 기록</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {data!.done.map((e) => (
                  <li key={e.id} className="text-small">
                    ✔ {evTitle(e)} · {e.completed_date ? formatMD(e.completed_date) : ""} 완료
                  </li>
                ))}
              </ul>
            </details>
          )}
        </>
      )}
      <p className="text-caption text-muted">
        ⓘ 일정은 일반 권장 시기예요. 정확한 시기는 동물병원과 상의해 주세요.
      </p>
      <ActionModal action={action} today={today} onClose={() => setAction(null)} />
    </section>
  );
}
