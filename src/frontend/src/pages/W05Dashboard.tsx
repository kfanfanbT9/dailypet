// W05 대시보드 (오늘의 할 일 + 알림 배너 + 체중 카드). 추천·D-day는 서버 값을 그대로 쓴다.
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "@/api/client";
import { tasks as tasksApi } from "@/api/endpoints";
import type { Task, TasksResponse } from "@/api/types";
import { Button } from "@/components/base/Button";
import { ConfirmModal } from "@/components/base/Modal";
import { EmptyState, ErrorState, ProgressBar, Skeleton } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { AddTaskModal } from "@/components/domain/AddTaskModal";
import { noteTitle } from "@/components/domain/NotificationSheet";
import { TaskCard } from "@/components/domain/TaskCard";
import { Mascot } from "@/components/mascot/Mascot";
import { qk, useCatalog, useNotifications, useTodayTasks } from "@/hooks/queries";
import { addDays, dDayLabel, formatLong, formatMD } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet } from "@/state/currentPet";
import { clearOutdated, useOutdated } from "@/state/outdated";
import { useMotionReduced } from "@/state/settings";

export function sortTasks(list: Task[]): Task[] {
  return [...list].sort((a, b) => {
    if (!a.time && !b.time) return a.id.localeCompare(b.id);
    if (!a.time) return 1;
    if (!b.time) return -1;
    return a.time.localeCompare(b.time) || a.id.localeCompare(b.id);
  });
}

function greeting(name: string, tasks: Task[]) {
  if (tasks.some((t) => t.category === "activity")) return `오늘 ${name}랑 산책·놀이하는 날이에요!`;
  return `오늘도 ${name}와 반짝이는 하루 보내요!`;
}

export default function W05Dashboard() {
  const { pet, pets, isLoading: petsLoading } = useCurrentPet();
  const navigate = useNavigate();
  if (petsLoading) return <Skeleton />;
  if (!pet) {
    return (
      <EmptyState
        title={pets.length === 0 ? "첫 반려동물을 등록해 주세요" : "반려동물을 골라 주세요"}
        action={{ label: "등록하기", onClick: () => navigate("/pets/new") }}
      />
    );
  }
  return <Dashboard key={pet.id} />;
}

function Dashboard() {
  const { pet } = useCurrentPet();
  const p = pet!;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const reduced = useMotionReduced();
  const tasksQ = useTodayTasks(p.id);
  const notes = useNotifications();
  const catalogQ = useCatalog({ species: p.species });
  const outdated = useOutdated(p.id);
  const [adding, setAdding] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<Record<string, "like" | "dislike">>({});
  const pendingDeletes = useRef(new Set<string>());
  const key = qk.tasks(p.id);

  // 되돌리기 시간이 지나기 전에 화면을 떠나면 그때 삭제한다 (ARCHITECTURE.md 4.2)
  useEffect(() => {
    const pending = pendingDeletes.current;
    return () => {
      for (const id of pending) void tasksApi.remove(id).catch(() => {});
      pending.clear();
    };
  }, []);

  const catalogMap = useMemo(
    () => new Map((catalogQ.data ?? []).map((i) => [i.item_id, i])),
    [catalogQ.data],
  );
  const data = tasksQ.data;
  const visible = useMemo(
    () => sortTasks((data?.tasks ?? []).filter((t) => !hidden.has(t.id))),
    [data, hidden],
  );
  const doneCount = visible.filter((t) => t.done).length;
  const today = data?.date;
  const allDone = visible.length > 0 && doneCount === visible.length;
  const topNote = notes.data?.[0];

  const patchCache = (fn: (list: Task[]) => Task[]) =>
    qc.setQueryData<TasksResponse>(key, (old) => (old ? { ...old, tasks: fn(old.tasks) } : old));

  async function toggleDone(task: Task, done: boolean) {
    const prev = qc.getQueryData<TasksResponse>(key);
    patchCache((l) => l.map((t) => (t.id === task.id ? { ...t, done } : t)));
    try {
      await tasksApi.patch(task.id, { done });
      if (done && visible.every((t) => t.id === task.id || t.done)) toast("오늘 할 일을 모두 마쳤어요! 🎉");
    } catch (err) {
      qc.setQueryData(key, prev);
      toast(errorMessage(err), { tone: "error" });
    }
  }

  async function sendFeedback(task: Task, signal: "like" | "dislike") {
    try {
      await tasksApi.feedback(p.id, task.catalog_item_id, signal);
      setFeedback((f) => ({ ...f, [task.id]: signal }));
      qc.invalidateQueries({ queryKey: qk.prefs(p.id) });
      toast(
        signal === "dislike" && today
          ? `${formatMD(addDays(today, 6))}까지 추천하지 않아요`
          : "기억해 둘게요",
      );
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  async function swap(task: Task) {
    try {
      const r = await tasksApi.swap(task.id);
      if (!r.swapped) return toast("더 추천할 항목이 없어요");
      patchCache((l) => l.map((t) => (t.id === task.id ? r.task : t)));
      toast("다른 항목으로 바꿨어요");
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  async function changeTime(task: Task, time: string | null) {
    try {
      const updated = await tasksApi.patch(task.id, { time });
      patchCache((l) => l.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      toast(errorMessage(err), { tone: "error" });
    }
  }

  function remove(task: Task) {
    setHidden((h) => new Set(h).add(task.id));
    pendingDeletes.current.add(task.id);
    toast("할 일을 지웠어요", {
      action: {
        label: "되돌리기",
        onAction: () => {
          pendingDeletes.current.delete(task.id);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(task.id);
            return n;
          });
        },
      },
      onExpire: () => {
        if (!pendingDeletes.current.delete(task.id)) return; // 이미 처리됨(화면 이탈·되돌리기)
        tasksApi
          .remove(task.id)
          .then(() => patchCache((l) => l.filter((t) => t.id !== task.id)))
          .catch((err) => {
            setHidden((h) => {
              const n = new Set(h);
              n.delete(task.id);
              return n;
            });
            toast(errorMessage(err), { tone: "error" });
          });
      },
    });
  }

  async function regenerate() {
    setRegenBusy(true);
    try {
      const r = await tasksApi.regenerate(p.id);
      qc.setQueryData(key, r);
      clearOutdated(p.id);
      toast("할 일을 다시 만들었어요");
      setRegenOpen(false);
    } catch (err) {
      toast(
        err instanceof ApiError && err.status === 503
          ? "지금은 다시 제안할 수 없어요. 잠시 후 다시 시도해 주세요"
          : errorMessage(err),
        { tone: "error" },
      );
      setRegenOpen(false);
    } finally {
      setRegenBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {topNote && (
        <div
          className={`flex items-center gap-3 rounded-card p-4 shadow-1 ${topNote.kind === "overdue" ? "bg-danger-bg" : "bg-warning-bg"}`}
        >
          <span aria-hidden="true">{topNote.kind === "overdue" ? "⚠️" : "💉"}</span>
          <p className="flex-1 wrap-anywhere text-body">
            <span className={`font-bold ${topNote.kind === "overdue" ? "text-danger" : "text-warning"}`}>
              {dDayLabel(topNote.d_day)}
            </span>{" "}
            · {noteTitle(topNote)} ({topNote.pet_name}) {formatMD(topNote.due_date)}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate(`/health?pet=${topNote.pet_id}&event=${topNote.event_id}`)}
          >
            보기 ›
          </Button>
        </div>
      )}
      {outdated && (
        <div className="flex flex-wrap items-center gap-3 rounded-card bg-info-bg p-4 shadow-1">
          <p className="flex-1 text-body">
            <span aria-hidden="true">ⓘ </span>
            <span className="font-bold text-info">프로필이 바뀌었어요.</span> 바뀐 정보로 다시 제안받을까요?
          </p>
          <Button size="sm" onClick={() => setRegenOpen(true)}>
            할 일 다시 제안
          </Button>
        </div>
      )}

      <section aria-labelledby="today-title" className="flex flex-col gap-3 rounded-card bg-species p-4">
        <div className="flex items-center gap-3">
          <Mascot species={p.species} mood={allDone ? "celebrate" : "happy"} size={96} decorative />
          <div className="min-w-0">
            <p className="font-display text-title-2">
              {allDone ? "오늘 할 일을 모두 마쳤어요!" : greeting(p.name, visible)}
            </p>
            <h1 id="today-title" className="text-small text-text">
              {today ? `${formatLong(today)} · ` : ""}오늘의 할 일 {doneCount}/{visible.length}
            </h1>
          </div>
        </div>
        <ProgressBar done={doneCount} total={visible.length} label="오늘의 할 일 진행률" />
      </section>

      <section aria-label="할 일 목록" className="flex flex-col gap-3">
        {tasksQ.isLoading ? (
          <div className="flex flex-col items-center gap-3">
            <Mascot species={p.species} size={96} decorative className={reduced ? "" : "animate-bounce"} />
            <Skeleton lines={3} label="오늘의 할 일을 만들고 있어요" />
          </div>
        ) : tasksQ.isError || data?.retryable ? (
          <ErrorState
            species={p.species}
            message="추천을 불러오지 못했어요"
            onRetry={() => tasksQ.refetch()}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            species={p.species}
            title="오늘 할 일이 비어 있어요"
            action={{ label: "＋ 직접 추가", onClick: () => setAdding(true) }}
          />
        ) : (
          <ul className="grid gap-3 desktop:grid-cols-2">
            <AnimatePresence initial={false}>
              {visible.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  item={t.catalog_item_id ? catalogMap.get(t.catalog_item_id) : undefined}
                  liked={feedback[t.id] ?? null}
                  onToggleDone={(d) => toggleDone(t, d)}
                  onFeedback={(s) => sendFeedback(t, s)}
                  onSwap={() => swap(t)}
                  onChangeTime={(time) => changeTime(t, time)}
                  onDelete={() => remove(t)}
                  onOpenHealth={() => navigate(`/health?pet=${p.id}&event=${t.health_event_id}`)}
                />
              ))}
            </AnimatePresence>
          </ul>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setAdding(true)}>
            ＋ 직접 추가
          </Button>
          <Button variant="secondary" onClick={() => setRegenOpen(true)} disabled={!data || data.retryable}>
            ↻ 할 일 다시 제안
          </Button>
        </div>
      </section>

      <section
        aria-label="체중"
        className="flex items-center justify-between rounded-card bg-surface p-4 shadow-1"
      >
        <p className="text-body">
          <span aria-hidden="true">⚖️ </span>
          체중{" "}
          <span className="tabular font-bold">{p.weight_kg != null ? `${p.weight_kg}kg` : "기록 없음"}</span>
        </p>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/weights?pet=${p.id}`)}>
          기록하기 ›
        </Button>
      </section>

      <AddTaskModal open={adding} onClose={() => setAdding(false)} pet={p} />
      <ConfirmModal
        open={regenOpen}
        title="오늘 할 일을 다시 만들까요?"
        onClose={() => setRegenOpen(false)}
        onConfirm={regenerate}
        confirmLabel="다시 만들기"
        busy={regenBusy}
      >
        <ul className="flex flex-col gap-1">
          <li>✔ 완료한 항목과 직접 추가한 항목은 그대로 둬요</li>
          <li>↻ 아직 안 한 제안 항목만 바뀌어요</li>
        </ul>
      </ConfirmModal>
    </div>
  );
}
