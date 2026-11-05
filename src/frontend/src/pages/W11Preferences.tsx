// W11 내 취향 (F9·F11): 좋아해요 / 싫어해요(제외 기한) / 지켜야 할 조건 / 자주 한 활동(D4, Backend frequent).
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { preferences as prefsApi } from "@/api/endpoints";
import type { Preference } from "@/api/types";
import { Badge } from "@/components/base/Badge";
import { Button } from "@/components/base/Button";
import { ConfirmModal } from "@/components/base/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { qk, usePreferences } from "@/hooks/queries";
import { formatMD } from "@/lib/dates";
import { constraintLabel } from "@/lib/labels";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet } from "@/state/currentPet";

const prefName = (p: Preference) =>
  p.kind === "constraint" ? constraintLabel(p.target) : (p.item_name ?? p.note ?? p.target);

function Section({ title, icon, children }: { title: string; icon: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="rounded-card bg-surface p-4 shadow-1">
      <h2 className="mb-2 text-title-3 font-bold">
        <span aria-hidden="true">{icon}</span> {title}
      </h2>
      {children}
    </section>
  );
}

export default function W11Preferences() {
  const { pet } = useCurrentPet();
  const q = usePreferences(pet?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const [confirmShared, setConfirmShared] = useState<Preference | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!pet) return null;
  const refresh = () => qc.invalidateQueries({ queryKey: qk.prefs(pet.id) });

  const removeOne = async (p: Preference) => {
    setBusy(true);
    try {
      await prefsApi.removeOne(pet.id, p.id);
      toast(
        p.scope === "all_pets" ? "모든 반려동물에서 지웠어요" : "다음 추천부터 다시 후보에 들어가요",
      );
      setConfirmShared(null);
      await refresh();
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const onRemove = (p: Preference) => (p.scope === "all_pets" ? setConfirmShared(p) : void removeOne(p));

  const reset = async () => {
    setBusy(true);
    try {
      await prefsApi.reset(pet.id);
      setConfirmReset(false);
      toast(`${pet.name}의 취향을 초기화했어요`);
      await refresh();
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const row = (p: Preference, sub?: ReactNode) => (
    <li key={p.id} className="flex items-center gap-2 py-1">
      <div className="min-w-0 flex-1">
        <p className="text-body wrap-anywhere">{prefName(p)}</p>
        {sub}
      </div>
      {p.scope === "all_pets" && (
        <Badge tone="info" icon="👤">
          모든 아이 공통
        </Badge>
      )}
      <button
        type="button"
        aria-label={`${prefName(p)} 지우기`}
        onClick={() => onRemove(p)}
        className="flex min-h-touch min-w-touch items-center justify-center rounded-pill text-muted"
      >
        <X aria-hidden="true" className="h-4 w-4" />
      </button>
    </li>
  );
  const list = (items: Preference[], render: (p: Preference) => ReactNode) =>
    items.length ? <ul>{items.map(render)}</ul> : <p className="text-small text-muted">아직 없어요</p>;

  const d = q.data;
  const empty = d && !d.like.length && !d.dislike.length && !d.constraint.length && !(d.frequent ?? []).length;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">{pet.name}의 취향</h1>
      {q.isLoading && <Skeleton lines={4} label="취향을 불러오는 중이에요" />}
      {q.isError && <ErrorState species={pet.species} message="취향을 불러오지 못했어요" onRetry={() => void q.refetch()} />}
      {d && empty && (
        <EmptyState
          species={pet.species}
          title="아직 기억한 취향이 없어요. 할 일에서 👍/👎를 누르거나 채팅으로 알려 주세요."
        />
      )}
      {d && !empty && (
        <>
          <Section title="좋아해요" icon="👍">
            {list(d.like, (p) => row(p))}
          </Section>
          <Section title="싫어해요" icon="👎">
            {list(d.dislike, (p) =>
              row(
                p,
                <p className="text-small text-muted">
                  {p.excluded_now && p.excluded_until
                    ? `${formatMD(p.excluded_until)}까지 추천하지 않아요`
                    : "지금은 다시 추천돼요"}
                </p>,
              ),
            )}
          </Section>
          <Section title="지켜야 할 조건" icon="⏰">
            {list(d.constraint, (p) => row(p))}
          </Section>
          <Section title="자주 한 활동" icon="⭐">
            {(d.frequent ?? []).length ? (
              <ul>
                {d.frequent!.map((f) => (
                  <li key={f.catalog_item_id} className="flex justify-between py-1 text-body">
                    <span>{f.item_name ?? "카탈로그 항목"}</span>
                    <span className="tabular text-muted">{f.count}회</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-small text-muted">아직 없어요 (3번 이상 완료하면 여기에 보여요)</p>
            )}
          </Section>
        </>
      )}
      {d && !empty && (
        <Button variant="danger" className="self-center" onClick={() => setConfirmReset(true)}>
          <span aria-hidden="true">🗑</span> {pet.name}의 취향 전체 초기화
        </Button>
      )}

      <ConfirmModal
        open={Boolean(confirmShared)}
        title="공통 조건 지우기"
        confirmLabel="지우기"
        danger
        busy={busy}
        onClose={() => setConfirmShared(null)}
        onConfirm={() => (confirmShared ? removeOne(confirmShared) : undefined)}
      >
        <p>이 조건은 모든 반려동물에서 지워져요.</p>
      </ConfirmModal>
      <ConfirmModal
        open={confirmReset}
        title="취향 전체 초기화"
        confirmLabel="초기화"
        danger
        busy={busy}
        onClose={() => setConfirmReset(false)}
        onConfirm={reset}
      >
        <p>{pet.name}의 취향과 활동 기록 점수가 초기화돼요.</p>
      </ConfirmModal>
    </div>
  );
}
