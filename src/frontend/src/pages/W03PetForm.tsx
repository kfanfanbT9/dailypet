// W03 반려동물 등록·수정 (/pets/new, /pets/:id/edit). 필수: 이름·종·생년월일·체중.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, X } from "lucide-react";
import { useMemo, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { pets as petsApi } from "@/api/endpoints";
import type { HealthHistoryInput, Pet, PetInput, Species } from "@/api/types";
import { Button } from "@/components/base/Button";
import { FieldShell, Input, TextArea } from "@/components/base/Field";
import { useToast } from "@/components/base/Toast";
import { Mascot } from "@/components/mascot/Mascot";
import { qk, useCatalog } from "@/hooks/queries";
import { ageGroup, ageText, todayKstBrowser } from "@/lib/dates";
import {
  ACTIVITY_LABELS,
  AGE_GROUP_LABELS,
  ALLERGY_LABELS,
  CONDITION_LABELS,
  SIZE_LABELS,
} from "@/lib/labels";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet } from "@/state/currentPet";
import { markOutdated } from "@/state/outdated";

type Req = "name" | "species" | "birth_date" | "weight_kg";
const WEIGHT_RANGE: Record<Species, [number, number]> = { dog: [0.5, 100], cat: [0.3, 15] };

interface FormState {
  name: string;
  species: Species | "";
  breed: string;
  sex: "male" | "female" | "";
  neutered: boolean;
  birth_date: string;
  weight: string;
  size: "small" | "medium" | "large" | "";
  activity_level: "low" | "normal" | "high" | "";
  allergies: string[];
  conditions: string[];
  memo: string;
  meal: string[];
  walk: string[];
}

function fromPet(p?: Pet): FormState {
  return {
    name: p?.name ?? "",
    species: p?.species ?? "",
    breed: p?.breed ?? "",
    sex: p?.sex ?? "",
    neutered: p?.neutered ?? false,
    birth_date: p?.birth_date ?? "",
    weight: p?.weight_kg != null ? String(p.weight_kg) : "",
    size: p?.size ?? "",
    activity_level: p?.activity_level ?? "",
    allergies: p?.allergies ?? [],
    conditions: p?.conditions ?? [],
    memo: p?.memo ?? "",
    meal: p?.default_times?.meal ?? [],
    walk: p?.default_times?.walk ?? [],
  };
}

function Radios<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
  error,
  required,
}: {
  legend: string;
  name: string;
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined} aria-required={required || undefined}>
      <legend className="mb-1 text-small font-bold">
        {legend}
        {required && (
          <span aria-hidden="true" className="text-danger">
            {" "}
            *
          </span>
        )}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-touch cursor-pointer items-center gap-2 rounded-pill px-4 ${value === o.value ? "bg-species text-species-strong font-bold" : "bg-surface shadow-1"}`}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="h-4 w-4"
            />
            {o.label}
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-err`} className="mt-1 text-caption text-danger">
          <span aria-hidden="true">⚠️ </span>
          {error}
        </p>
      )}
    </fieldset>
  );
}

function Chips({
  legend,
  all,
  selected,
  onChange,
}: {
  legend: string;
  all: Record<string, string>;
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-small font-bold">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {Object.entries(all).map(([tag, label]) => {
          const on = selected.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? selected.filter((t) => t !== tag) : [...selected, tag])}
              className={`min-h-touch rounded-pill px-3 text-small ${on ? "bg-pink font-bold text-text" : "bg-surface text-muted shadow-1"}`}
            >
              {on ? "✓ " : ""}
              {label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function TimeList({
  label,
  icon,
  values,
  onChange,
}: {
  label: string;
  icon: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="min-w-24 text-small font-bold">
        <span aria-hidden="true">{icon} </span>
        {label}
      </span>
      {values.map((t, i) => (
        <span key={i} className="flex items-center gap-1">
          <input
            type="time"
            aria-label={`${label} 시간 ${i + 1}`}
            value={t}
            onChange={(e) => onChange(values.map((v, j) => (j === i ? e.target.value : v)))}
            className="min-h-touch rounded-input bg-surface px-3 [border:var(--border-input)_solid_var(--color-border)]"
          />
          <button
            type="button"
            aria-label={`${label} 시간 ${i + 1} 지우기`}
            onClick={() => onChange(values.filter((_, j) => j !== i))}
            className="flex min-h-touch min-w-touch items-center justify-center text-muted"
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
      <button
        type="button"
        aria-label={`${label} 시간 추가`}
        onClick={() => onChange([...values, "08:00"])}
        className="flex min-h-touch min-w-touch items-center justify-center rounded-pill bg-surface text-primary shadow-1"
      >
        <Plus aria-hidden="true" />
      </button>
    </div>
  );
}

export default function W03PetForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const existing = useQuery({
    queryKey: qk.pet(id ?? ""),
    queryFn: () => petsApi.get(id!),
    enabled: editing,
  });
  if (editing && existing.isLoading) return <p role="status">불러오는 중이에요</p>;
  if (editing && existing.isError) return <p className="py-12 text-center text-muted">찾을 수 없어요.</p>;
  return <PetForm key={existing.data?.id ?? "new"} pet={existing.data} />;
}

function PetForm({ pet }: { pet?: Pet }) {
  const editing = Boolean(pet);
  const [f, setF] = useState<FormState>(() => fromPet(pet));
  const [history, setHistory] = useState<Record<string, { date: string; dose: string }>>({});
  const [errors, setErrors] = useState<Partial<Record<Req | "form", string>>>({});
  const [busy, setBusy] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const birthRef = useRef<HTMLInputElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const toast = useToast();
  const { select } = useCurrentPet();
  const today = todayKstBrowser();
  const healthItems = useCatalog(
    { category: "health", species: f.species || undefined },
    !editing && Boolean(f.species),
  );

  const preview = useMemo(() => {
    if (!f.birth_date || !f.species || f.birth_date > today) return null;
    return `${AGE_GROUP_LABELS[ageGroup(f.species, f.size || null, f.birth_date, today)]} (${ageText(f.birth_date, today)})`;
  }, [f.birth_date, f.species, f.size, today]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF((s) => ({ ...s, [k]: v }));

  function validate() {
    const e: Partial<Record<Req, string>> = {};
    if (!f.name.trim()) e.name = "이름을 입력해 주세요";
    if (!f.species) e.species = "강아지 또는 고양이를 골라 주세요";
    if (!f.birth_date) e.birth_date = "생년월일을 입력해 주세요";
    else if (f.birth_date > today) e.birth_date = "생년월일은 오늘보다 뒤일 수 없어요";
    const w = Number(f.weight);
    if (!f.weight) e.weight_kg = "체중을 입력해 주세요";
    else if (
      f.species &&
      (!Number.isFinite(w) || w < WEIGHT_RANGE[f.species][0] || w > WEIGHT_RANGE[f.species][1])
    ) {
      e.weight_kg = `체중은 ${WEIGHT_RANGE[f.species][0]}~${WEIGHT_RANGE[f.species][1]}kg 사이로 입력해 주세요`;
    }
    return e;
  }

  function focusFirst(e: Partial<Record<string, string>>) {
    if (e.name) nameRef.current?.focus();
    else if (e.species) document.querySelector<HTMLInputElement>('input[name="species"]')?.focus();
    else if (e.birth_date) birthRef.current?.focus();
    else if (e.weight_kg) weightRef.current?.focus();
  }

  async function submit(ev: FormEvent) {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return focusFirst(e);
    const input: PetInput = {
      name: f.name.trim(),
      species: f.species as Species,
      birth_date: f.birth_date,
      weight_kg: Number(f.weight),
      breed: f.breed.trim(),
      sex: f.sex || null,
      neutered: f.neutered,
      size: f.species === "dog" ? f.size || null : null,
      activity_level: f.activity_level || null,
      allergies: f.allergies,
      conditions: f.conditions,
      memo: f.memo,
      default_times: { meal: f.meal.filter(Boolean), walk: f.walk.filter(Boolean) },
    };
    if (!editing) {
      const hist: HealthHistoryInput[] = Object.entries(history)
        .filter(([, h]) => h.date)
        .map(([catalog_item_id, h]) => ({
          catalog_item_id,
          last_done_date: h.date,
          ...(h.dose ? { dose_no: Number(h.dose) } : {}),
        }));
      if (hist.length) input.health_history = hist;
    }
    setBusy(true);
    try {
      const saved = editing
        ? await petsApi.update(pet!.id, { ...input, species: undefined })
        : await petsApi.create(input);
      await qc.invalidateQueries({ queryKey: qk.pets });
      qc.removeQueries({ queryKey: qk.pet(saved.id) });
      if (editing && saved.tasks_outdated) markOutdated(saved.id);
      toast(editing ? "저장했어요" : `${saved.name}를 만나서 반가워요!`);
      select(saved.id);
      navigate(`/?pet=${saved.id}`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && err.fields.length) {
        const next: Partial<Record<Req, string>> = {};
        for (const fld of err.fields)
          if (["name", "species", "birth_date", "weight_kg"].includes(fld))
            next[fld as Req] = "입력한 내용을 확인해 주세요";
        setErrors({ ...next, form: Object.keys(next).length ? undefined : errorMessage(err) });
        focusFirst(next);
      } else {
        setErrors({ form: errorMessage(err) });
      }
    } finally {
      setBusy(false);
    }
  }

  const range = f.species ? WEIGHT_RANGE[f.species] : null;
  return (
    <section className="flex flex-col gap-6">
      <header className="flex items-center gap-2">
        <Link
          to={editing ? `/pets?pet=${pet!.id}` : "/"}
          aria-label="뒤로"
          className="flex min-h-touch min-w-touch items-center justify-center"
        >
          <ArrowLeft aria-hidden="true" />
        </Link>
        <h1 className="font-display text-title-1">
          {editing ? `${pet!.name} 정보 수정` : "반려동물 등록하기"}
        </h1>
      </header>
      <form onSubmit={submit} noValidate className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {photo ? (
            <img src={photo} alt="선택한 사진 미리보기" className="h-24 w-24 rounded-pill object-cover" />
          ) : (
            <Mascot species={f.species || "dog"} size={96} decorative />
          )}
          <label className="flex flex-col gap-1 text-small">
            <span className="font-bold">사진 선택 (선택사항)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ? URL.createObjectURL(e.target.files[0]) : null)}
            />
            <span className="text-caption text-muted">
              이 기기에서 미리보기만 해요. 저장은 다음 버전에서 지원해요.
            </span>
          </label>
        </div>
        <Input
          ref={nameRef}
          label="이름"
          required
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
        />
        {editing ? (
          <p className="text-small">
            <span className="font-bold">종</span> · {f.species === "dog" ? "🐶 강아지" : "🐱 고양이"}{" "}
            <span className="text-muted">(종은 바꿀 수 없어요)</span>
          </p>
        ) : (
          <div>
            <Radios
              legend="종"
              name="species"
              required
              value={f.species}
              options={[
                { value: "dog", label: "🐶 강아지" },
                { value: "cat", label: "🐱 고양이" },
              ]}
              onChange={(v) => set("species", v)}
              error={errors.species}
            />
            <p className="mt-1 text-caption text-muted">ⓘ 다른 동물은 지원 예정이에요</p>
          </div>
        )}
        <Input label="품종" value={f.breed} onChange={(e) => set("breed", e.target.value)} />
        <div className="flex flex-wrap items-end gap-4">
          <Radios
            legend="성별"
            name="sex"
            value={f.sex}
            options={[
              { value: "male", label: "수컷" },
              { value: "female", label: "암컷" },
            ]}
            onChange={(v) => set("sex", v)}
          />
          <label className="flex min-h-touch items-center gap-2">
            <input
              type="checkbox"
              checked={f.neutered}
              onChange={(e) => set("neutered", e.target.checked)}
              className="h-5 w-5"
            />
            중성화했어요
          </label>
        </div>
        <Input
          ref={birthRef}
          label="생년월일"
          required
          type="date"
          max={today}
          value={f.birth_date}
          onChange={(e) => set("birth_date", e.target.value)}
          error={errors.birth_date}
          hint={preview ? `→ ${preview}` : undefined}
        />
        <Input
          ref={weightRef}
          label="체중"
          required
          unit="kg"
          inputMode="decimal"
          value={f.weight}
          onChange={(e) => set("weight", e.target.value)}
          error={errors.weight_kg}
          hint={
            range
              ? `${f.species === "dog" ? "강아지" : "고양이"}는 ${range[0]}~${range[1]}kg 사이로 입력해 주세요`
              : undefined
          }
        />
        {f.species === "dog" && (
          <Radios
            legend="크기"
            name="size"
            value={f.size}
            options={(["small", "medium", "large"] as const).map((v) => ({
              value: v,
              label: SIZE_LABELS[v],
            }))}
            onChange={(v) => set("size", v)}
          />
        )}
        <Radios
          legend="활동량"
          name="activity"
          value={f.activity_level}
          options={(["low", "normal", "high"] as const).map((v) => ({ value: v, label: ACTIVITY_LABELS[v] }))}
          onChange={(v) => set("activity_level", v)}
        />
        <div className="flex flex-col gap-4 rounded-card bg-surface p-4 shadow-1">
          <h2 className="text-title-3 font-bold">건강 정보</h2>
          <Chips
            legend="알레르기"
            all={ALLERGY_LABELS}
            selected={f.allergies}
            onChange={(v) => set("allergies", v)}
          />
          <Chips
            legend="질환"
            all={CONDITION_LABELS}
            selected={f.conditions}
            onChange={(v) => set("conditions", v)}
          />
          <TextArea
            label="메모"
            rows={2}
            value={f.memo}
            onChange={(e) => set("memo", e.target.value)}
            hint="목록에 없는 건강 정보는 메모에 적어 주세요"
          />
        </div>
        <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-1">
          <h2 className="text-title-3 font-bold">기본 시간대 (할 일에 자동으로 붙어요)</h2>
          <TimeList label="급여" icon="🍚" values={f.meal} onChange={(v) => set("meal", v)} />
          <TimeList label="산책·놀이" icon="🐾" values={f.walk} onChange={(v) => set("walk", v)} />
        </div>
        {!editing && f.species && (
          <div className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-1">
            <h2 className="text-title-3 font-bold">접종·검진 이력 (선택)</h2>
            {(healthItems.data ?? []).map((it) => (
              <FieldShell key={it.item_id} label={`${it.name} — 마지막으로 한 날`}>
                {({ id, describedBy }) => (
                  <div className="flex flex-wrap gap-2">
                    <input
                      id={id}
                      type="date"
                      max={today}
                      aria-describedby={describedBy}
                      value={history[it.item_id]?.date ?? ""}
                      onChange={(e) =>
                        setHistory((h) => ({
                          ...h,
                          [it.item_id]: { date: e.target.value, dose: h[it.item_id]?.dose ?? "" },
                        }))
                      }
                      className="min-h-touch rounded-input bg-surface px-3 [border:var(--border-input)_solid_var(--color-border)]"
                    />
                    <input
                      type="number"
                      min={1}
                      aria-label={`${it.name} 회차 (선택)`}
                      placeholder="회차"
                      value={history[it.item_id]?.dose ?? ""}
                      onChange={(e) =>
                        setHistory((h) => ({
                          ...h,
                          [it.item_id]: { date: h[it.item_id]?.date ?? "", dose: e.target.value },
                        }))
                      }
                      className="min-h-touch w-24 rounded-input bg-surface px-3 [border:var(--border-input)_solid_var(--color-border)]"
                    />
                  </div>
                )}
              </FieldShell>
            ))}
            <p className="text-caption text-muted">
              ⓘ 모르면 비워 두세요. 권장 시기가 지난 항목은 &quot;이력 확인 필요&quot;로 표시돼요
            </p>
          </div>
        )}
        {errors.form && (
          <p role="alert" className="text-small text-danger">
            {errors.form}
          </p>
        )}
        <Button type="submit" loading={busy}>
          저장하기
        </Button>
      </form>
    </section>
  );
}
