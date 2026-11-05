// W06 할 일 직접 추가: 직접 입력(제목+시간) / 추천 목록에서 고르기(서버가 반려동물 기준 안전 필터를 적용한 목록, D5).
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { tasks as tasksApi } from "@/api/endpoints";
import type { Pet } from "@/api/types";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { Modal } from "@/components/base/Modal";
import { Tabs } from "@/components/base/States";
import { useToast } from "@/components/base/Toast";
import { qk, useCatalog } from "@/hooks/queries";
import { INTENSITY_LABELS } from "@/lib/labels";
import { errorMessage } from "@/lib/messages";

export function AddTaskModal({ open, onClose, pet }: { open: boolean; onClose: () => void; pet: Pet }) {
  const [mode, setMode] = useState<"direct" | "catalog">("direct");
  const [title, setTitle] = useState("");
  const [time, setTime] = useState("");
  const [area, setArea] = useState<"diet" | "activity">("activity");
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const qc = useQueryClient();
  const toast = useToast();
  const list = useCatalog(
    { category: area, species: pet.species, petId: pet.id },
    open && mode === "catalog",
  );
  const items = (list.data ?? []).filter((i) => !search.trim() || i.name.includes(search.trim()));

  async function add() {
    setError(null);
    if (mode === "direct" && !title.trim()) return setError("할 일 이름을 입력해 주세요");
    if (mode === "catalog" && !picked) return setError("추가할 항목을 골라 주세요");
    setBusy(true);
    try {
      await tasksApi.add(
        pet.id,
        mode === "direct"
          ? { title: title.trim(), time: time || null }
          : { catalog_item_id: picked!, time: time || null },
      );
      await qc.invalidateQueries({ queryKey: qk.tasks(pet.id) });
      toast("할 일을 추가했어요");
      setTitle("");
      setTime("");
      setPicked(null);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      title="할 일 직접 추가"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={add} loading={busy}>
            추가하기
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Tabs
          label="추가 방식"
          value={mode}
          onChange={(v) => {
            setMode(v);
            setError(null);
          }}
          tabs={[
            { value: "direct", label: "직접 입력" },
            { value: "catalog", label: "추천 목록에서 고르기" },
          ]}
        />
        {mode === "direct" ? (
          <Input
            label="할 일"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={60}
            placeholder="빗질"
          />
        ) : (
          <div className="flex flex-col gap-3">
            <Tabs
              label="영역"
              value={area}
              onChange={(v) => {
                setArea(v);
                setPicked(null);
              }}
              tabs={[
                { value: "diet", label: "식단" },
                { value: "activity", label: "활동" },
              ]}
            />
            <Input label="검색" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
            {list.isError ? (
              <p role="alert" className="text-small text-danger">
                지금은 목록을 불러오지 못했어요. 직접 입력으로 추가하거나 잠시 후 다시 시도해 주세요.
              </p>
            ) : list.isLoading ? (
              <p role="status" className="text-small text-muted">
                불러오는 중이에요
              </p>
            ) : (
              <fieldset className="flex max-h-[40dvh] flex-col gap-1 overflow-y-auto">
                <legend className="sr-only">추가할 항목</legend>
                {items.map((i) => (
                  <label
                    key={i.item_id}
                    className="flex min-h-touch cursor-pointer items-center gap-3 rounded-sm px-2"
                  >
                    <input
                      type="radio"
                      name="catalog-item"
                      checked={picked === i.item_id}
                      onChange={() => setPicked(i.item_id)}
                      className="h-4 w-4"
                    />
                    <span className="flex-1">{i.name}</span>
                    {i.intensity && (
                      <span className="text-small text-muted">{INTENSITY_LABELS[i.intensity]}</span>
                    )}
                  </label>
                ))}
                {items.length === 0 && <p className="text-small text-muted">맞는 항목이 없어요.</p>}
              </fieldset>
            )}
            <p className="text-caption text-muted">
              ⓘ {pet.name}에게 맞는 항목만 보여요 (종·연령·알레르기·질환)
            </p>
          </div>
        )}
        <Input label="시간 (선택)" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        {error && (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
