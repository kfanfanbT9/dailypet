// W04 반려동물 관리: 카드 목록, [수정] → W03, [삭제] → 이름 입력 확인 → 연쇄 삭제.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { pets as petsApi } from "@/api/endpoints";
import type { Pet } from "@/api/types";
import { Button } from "@/components/base/Button";
import { ConfirmModal } from "@/components/base/Modal";
import { EmptyState } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { Mascot } from "@/components/mascot/Mascot";
import { qk } from "@/hooks/queries";
import { ageText, todayKstBrowser } from "@/lib/dates";
import { tagLabel } from "@/lib/labels";
import { useCurrentPet } from "@/state/currentPet";
import { clearOutdated } from "@/state/outdated";

export default function W04Pets() {
  const { pets, pet: current, select } = useCurrentPet();
  const [target, setTarget] = useState<Pet | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();
  const today = todayKstBrowser();

  async function remove() {
    if (!target) return;
    setBusy(true);
    try {
      await petsApi.remove(target.id, target.name);
      clearOutdated(target.id);
      const rest = pets.filter((p) => p.id !== target.id);
      qc.setQueryData(qk.pets, rest);
      qc.removeQueries({ predicate: (q) => q.queryKey.includes(target.id) });
      if (current?.id === target.id && rest[0]) select(rest[0].id);
      toast(`${target.name}의 기록을 모두 지웠어요`);
      setTarget(null);
    } catch {
      toast("삭제하지 못했어요. 잠시 후 다시 시도해 주세요", { tone: "error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">우리 아이들</h1>
      {pets.length === 0 ? (
        <EmptyState
          title="첫 반려동물을 등록해 주세요"
          action={{ label: "등록하기", onClick: () => navigate("/pets/new") }}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {pets.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 rounded-card bg-surface p-4 shadow-1">
              <Mascot species={p.species} size={96} decorative />
              <div className="min-w-0 flex-1">
                <p className="text-title-3 font-bold">{p.name}</p>
                <p className="text-small text-muted">
                  {[p.breed, ageText(p.birth_date, today), p.weight_kg != null ? `${p.weight_kg}kg` : null]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
                {p.allergies.length > 0 && (
                  <p className="text-small text-muted">알레르기: {p.allergies.map(tagLabel).join(", ")}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate(`/pets/${p.id}/edit?pet=${p.id}`)}
                  aria-label={`${p.name} 수정`}
                >
                  수정
                </Button>
                <Button size="sm" variant="danger" onClick={() => setTarget(p)} aria-label={`${p.name} 삭제`}>
                  삭제
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => navigate("/pets/new")}>
        ＋ 새 반려동물 등록
      </Button>
      <ConfirmModal
        open={Boolean(target)}
        title="정말 보내시겠어요?"
        onClose={() => setTarget(null)}
        onConfirm={remove}
        confirmLabel="삭제하기"
        danger
        busy={busy}
        typeToConfirm={target ? { label: "확인을 위해 이름을 입력해 주세요", value: target.name } : undefined}
      >
        {target && (
          <div className="flex flex-col items-center gap-3 text-center">
            <Mascot species={target.species} mood="sorry" size={96} decorative />
            <p>
              {target.name}의 할 일, 건강 일정, 체중 기록, 취향, 대화 기록이 모두 지워지고 되돌릴 수 없어요.
            </p>
          </div>
        )}
      </ConfirmModal>
    </section>
  );
}
