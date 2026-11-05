// W10 대화 기록 (F14): 선택한 반려동물의 대화만, 최근 순. 항목 → 이어서 대화, ⋯ → 삭제.
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { chat } from "@/api/endpoints";
import type { ThreadSummary } from "@/api/types";
import { ConfirmModal } from "@/components/base/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { qk, useThreads } from "@/hooks/queries";
import { formatMD } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet, usePetLink } from "@/state/currentPet";

export default function W10History() {
  const { pet } = useCurrentPet();
  const q = useThreads(pet?.id);
  const link = usePetLink();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const [target, setTarget] = useState<ThreadSummary | null>(null);
  const [busy, setBusy] = useState(false);
  if (!pet) return null;

  const remove = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await chat.removeThread(target.thread_id);
      qc.setQueryData<ThreadSummary[]>(qk.threads(pet.id), (old) =>
        (old ?? []).filter((t) => t.thread_id !== target.thread_id),
      );
      qc.removeQueries({ queryKey: qk.thread(target.thread_id) });
      setTarget(null);
      toast("대화를 지웠어요");
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">{pet.name} 대화 기록</h1>
      {q.isLoading && <Skeleton lines={3} label="대화 기록을 불러오는 중이에요" />}
      {q.isError && <ErrorState species={pet.species} onRetry={() => void q.refetch()} />}
      {q.data && q.data.length === 0 && (
        <EmptyState
          species={pet.species}
          title="아직 나눈 대화가 없어요"
          action={{ label: "대화 시작하기", onClick: () => navigate(link("/chat")) }}
        />
      )}
      {q.data && q.data.length > 0 && (
        <ul aria-label="대화 목록" className="flex flex-col gap-2">
          {q.data.map((t) => (
            <li key={t.thread_id} className="flex items-center gap-2 rounded-card bg-surface p-3 shadow-1">
              <Link to={link(`/chat/${t.thread_id}`)} className="flex min-h-touch min-w-0 flex-1 flex-col justify-center">
                <span className="truncate text-body font-bold">{t.title}</span>
                <span className="tabular text-caption text-muted">
                  {formatMD(t.last_at.slice(0, 10))} · 메시지 {t.count}개
                </span>
              </Link>
              <button
                type="button"
                aria-label={`"${t.title}" 대화 삭제`}
                onClick={() => setTarget(t)}
                className="flex min-h-touch min-w-touch items-center justify-center rounded-pill text-muted"
              >
                <Trash2 aria-hidden="true" className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <ConfirmModal
        open={Boolean(target)}
        title="대화 삭제"
        confirmLabel="삭제"
        danger
        busy={busy}
        onClose={() => setTarget(null)}
        onConfirm={remove}
      >
        <p>이 대화를 지울까요? 지운 대화는 되살릴 수 없어요.</p>
      </ConfirmModal>
    </div>
  );
}
