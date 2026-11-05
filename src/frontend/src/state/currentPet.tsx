// 선택된 반려동물 (phase3_task.md 1.5): URL ?pet=<id>가 기준, 마지막 선택은 localStorage.
// 목록에 없는 id(다른 사용자 것 등)면 첫 반려동물로 바꾸고, 그 id로는 요청하지 않는다.
import { useQuery } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { pets as petsApi } from "@/api/endpoints";
import type { Pet } from "@/api/types";

const LAST_KEY = "dp.pet";

function safeGet() {
  try {
    return window.localStorage.getItem(LAST_KEY);
  } catch {
    return null;
  }
}
function safeSet(id: string) {
  try {
    window.localStorage.setItem(LAST_KEY, id);
  } catch {
    // 무시
  }
}

type SwitchListener = (from: string | null, to: string | null) => void;

interface CurrentPetValue {
  pets: Pet[];
  pet: Pet | null;
  isLoading: boolean;
  isError: boolean;
  select: (petId: string) => void;
  /** 반려동물 전환 구독 (채팅 승인 대기 자동 거절 표시용) */
  onSwitch: (fn: SwitchListener) => () => void;
}

const Ctx = createContext<CurrentPetValue | null>(null);

export function CurrentPetProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ["pets"], queryFn: petsApi.list });
  const list = useMemo(() => query.data ?? [], [query.data]);
  const listeners = useRef(new Set<SwitchListener>());
  const prevId = useRef<string | null>(null);

  const wanted = params.get("pet") ?? safeGet();
  const pet = list.find((p) => p.id === wanted) ?? list[0] ?? null;

  // URL을 실제 선택값과 맞춘다 (없는 id → 첫 반려동물)
  useEffect(() => {
    if (!query.data) return;
    const current = params.get("pet");
    if (pet && current !== pet.id) {
      const next = new URLSearchParams(params);
      next.set("pet", pet.id);
      setParams(next, { replace: true });
    } else if (!pet && current) {
      const next = new URLSearchParams(params);
      next.delete("pet");
      setParams(next, { replace: true });
    }
  }, [pet, params, setParams, query.data]);

  useEffect(() => {
    document.documentElement.dataset.species = pet?.species ?? "dog";
    if (pet) safeSet(pet.id);
    const from = prevId.current;
    const to = pet?.id ?? null;
    if (from !== null && from !== to) listeners.current.forEach((fn) => fn(from, to));
    prevId.current = to;
  }, [pet]);

  const select = useCallback(
    (petId: string) => {
      const next = new URLSearchParams(params);
      next.set("pet", petId);
      setParams(next);
    },
    [params, setParams],
  );

  const onSwitch = useCallback((fn: SwitchListener) => {
    listeners.current.add(fn);
    return () => {
      listeners.current.delete(fn);
    };
  }, []);

  return (
    <Ctx.Provider
      value={{ pets: list, pet, isLoading: query.isLoading, isError: query.isError, select, onSwitch }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useCurrentPet(): CurrentPetValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("CurrentPetProvider가 필요하다");
  return ctx;
}

/** 링크에 현재 반려동물 쿼리를 붙인다 */
export function usePetLink() {
  const { pet } = useCurrentPet();
  return (path: string) => (pet ? `${path}${path.includes("?") ? "&" : "?"}pet=${pet.id}` : path);
}
