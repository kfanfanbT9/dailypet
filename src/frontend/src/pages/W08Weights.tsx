// W08 체중 기록 (F12): 입력·종별 범위·미래 날짜 막음, 409 덮어쓰기 확인, 자체 SVG 꺾은선, 기록 삭제.
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { ApiError } from "@/api/client";
import { weights as weightsApi } from "@/api/endpoints";
import type { WeightLog } from "@/api/types";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { ConfirmModal } from "@/components/base/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { Mascot } from "@/components/mascot/Mascot";
import { qk, useWeights } from "@/hooks/queries";
import { formatMD, todayKstBrowser } from "@/lib/dates";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet } from "@/state/currentPet";
import { markOutdated } from "@/state/outdated";

export const WEIGHT_RANGE = { dog: [0.5, 100], cat: [0.3, 15] } as const;

/** 자체 SVG 꺾은선: 점마다 값 글자(색만으로 구분하지 않음) + 스크린리더용 표 */
export function WeightChart({ logs }: { logs: WeightLog[] }) {
  const W = 320;
  const H = 160;
  const pad = 28;
  const vals = logs.map((l) => l.weight_kg);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const x = (i: number) => (logs.length === 1 ? W / 2 : pad + (i * (W - pad * 2)) / (logs.length - 1));
  const y = (v: number) => H - pad - ((v - lo) / span) * (H - pad * 2);
  const points = logs.map((l, i) => `${x(i)},${y(l.weight_kg)}`).join(" ");
  return (
    <figure className="rounded-card bg-surface p-4 shadow-1">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="wchart-title">
        <title id="wchart-title">
          체중 추이: {logs.map((l) => `${formatMD(l.date)} ${l.weight_kg}kg`).join(", ")}
        </title>
        {logs.length > 1 && (
          <polyline points={points} fill="none" stroke="var(--color-primary)" strokeWidth={2.5} strokeLinejoin="round" />
        )}
        {logs.map((l, i) => (
          <g key={l.id} data-testid="weight-point">
            <circle cx={x(i)} cy={y(l.weight_kg)} r={5} fill="var(--color-primary)" />
            <text x={x(i)} y={y(l.weight_kg) - 10} textAnchor="middle" fontSize={11} fill="var(--color-text)">
              {l.weight_kg}
            </text>
            <text x={x(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--color-text-muted)">
              {formatMD(l.date).split(" ")[0]}
            </text>
          </g>
        ))}
      </svg>
      <table className="sr-only">
        <caption>체중 기록</caption>
        <thead>
          <tr>
            <th>날짜</th>
            <th>체중(kg)</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{l.date}</td>
              <td>{l.weight_kg}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export default function W08Weights() {
  const { pet } = useCurrentPet();
  const q = useWeights(pet?.id);
  const qc = useQueryClient();
  const toast = useToast();
  const today = todayKstBrowser();
  const [date, setDate] = useState(today);
  const [kg, setKg] = useState("");
  const [errors, setErrors] = useState<{ date?: string; kg?: string }>({});
  const [busy, setBusy] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  const [toDelete, setToDelete] = useState<WeightLog | null>(null);

  if (!pet) return null;
  const [lo, hi] = WEIGHT_RANGE[pet.species];

  const afterChange = async () => {
    markOutdated(pet.id);
    await Promise.all([
      qc.invalidateQueries({ queryKey: qk.weights(pet.id) }),
      qc.invalidateQueries({ queryKey: qk.pets }),
      qc.invalidateQueries({ queryKey: qk.pet(pet.id) }),
    ]);
  };

  const save = async (force = false) => {
    const value = Number(kg);
    const errs: typeof errors = {};
    if (!date) errs.date = "날짜를 입력해 주세요";
    else if (date > today) errs.date = "미래 날짜는 기록할 수 없어요";
    if (!kg || Number.isNaN(value)) errs.kg = "체중을 입력해 주세요";
    else if (value < lo || value > hi) errs.kg = `체중은 ${lo}~${hi}kg 사이로 입력해 주세요`;
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await weightsApi.add(pet.id, date, value, force);
      setOverwrite(false);
      setKg("");
      toast(`${formatMD(date)} ${value}kg 기록했어요`);
      await afterChange();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setOverwrite(true);
      else toast(errorMessage(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void save();
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await weightsApi.remove(toDelete.id);
      setToDelete(null);
      toast("기록을 지웠어요");
      await afterChange();
    } catch (e) {
      toast(errorMessage(e), { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const logs = [...(q.data ?? [])].sort((a, b) => a.date.localeCompare(b.date));
  const diff = logs.length > 1 ? Math.round((logs[logs.length - 1].weight_kg - logs[0].weight_kg) * 10) / 10 : 0;
  const remark =
    logs.length < 2
      ? "기록이 쌓이면 변화를 보여 드릴게요"
      : diff === 0
        ? "첫 기록과 같아요"
        : `첫 기록보다 ${Math.abs(diff)}kg ${diff < 0 ? "줄었어요" : "늘었어요"}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">{pet.name} 체중 기록</h1>
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-1">
        <div className="grid gap-3 md:grid-cols-2">
          <Input
            label="날짜"
            type="date"
            max={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            error={errors.date}
            required
          />
          <Input
            label="체중"
            type="number"
            inputMode="decimal"
            step="0.1"
            unit="kg"
            value={kg}
            onChange={(e) => setKg(e.target.value)}
            error={errors.kg}
            hint={`${pet.species === "cat" ? "고양이" : "강아지"}는 ${lo}~${hi}kg`}
            required
          />
        </div>
        <Button type="submit" loading={busy} className="self-end">
          기록하기
        </Button>
      </form>

      {q.isLoading && <Skeleton lines={3} label="체중 기록을 불러오는 중이에요" />}
      {q.isError && <ErrorState species={pet.species} onRetry={() => void q.refetch()} />}
      {q.data && logs.length === 0 && <EmptyState species={pet.species} title="아직 체중 기록이 없어요" />}
      {logs.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <Mascot species={pet.species} size={32} decorative />
            <p className="text-body">{remark}</p>
          </div>
          <WeightChart logs={logs} />
          <section aria-label="기록 목록" className="rounded-card bg-surface p-4 shadow-1">
            <ul className="flex flex-col">
              {[...logs].reverse().map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-2 py-1">
                  <span className="tabular text-body">
                    {formatMD(l.date)} · <strong>{l.weight_kg}kg</strong>
                  </span>
                  <button
                    type="button"
                    aria-label={`${formatMD(l.date)} 기록 삭제`}
                    onClick={() => setToDelete(l)}
                    className="flex min-h-touch min-w-touch items-center justify-center rounded-pill text-muted"
                  >
                    <Trash2 aria-hidden="true" className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <ConfirmModal
        open={overwrite}
        title="덮어쓸까요?"
        confirmLabel="덮어쓰기"
        busy={busy}
        onClose={() => setOverwrite(false)}
        onConfirm={() => save(true)}
      >
        <p>이 날짜에 기록이 있어요. 덮어쓸까요?</p>
      </ConfirmModal>
      <ConfirmModal
        open={Boolean(toDelete)}
        title="기록 삭제"
        confirmLabel="삭제"
        danger
        busy={busy}
        onClose={() => setToDelete(null)}
        onConfirm={remove}
      >
        <p>{toDelete && `${formatMD(toDelete.date)} ${toDelete.weight_kg}kg 기록을 지울까요?`}</p>
      </ConfirmModal>
    </div>
  );
}
