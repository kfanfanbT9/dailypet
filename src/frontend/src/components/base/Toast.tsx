// 토스트 (Style-guide.md 7.8): 하단 중앙, 3초(되돌리기 있으면 5초), 마우스·포커스가 있으면 멈춤.
// role="status", 오류만 role="alert". 움직임 줄이기면 페이드만.
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useMotionReduced } from "@/state/settings";

export const TOAST_MS = 3000;
export const TOAST_UNDO_MS = 5000;

interface ToastItem {
  id: number;
  message: string;
  tone: "info" | "error";
  action?: { label: string; onAction: () => void };
  onExpire?: () => void;
}

type ShowToast = (
  message: string,
  opts?: { tone?: "info" | "error"; action?: ToastItem["action"]; onExpire?: () => void },
) => void;

const ToastContext = createContext<ShowToast | null>(null);

function ToastView({ item, onDone }: { item: ToastItem; onDone: (expired: boolean) => void }) {
  const reduced = useMotionReduced();
  const [paused, setPaused] = useState(false);
  const remaining = useRef(item.action ? TOAST_UNDO_MS : TOAST_MS);
  const started = useRef(0);

  useEffect(() => {
    if (paused) return;
    started.current = Date.now();
    const t = setTimeout(() => onDone(true), remaining.current);
    return () => {
      clearTimeout(t);
      remaining.current -= Date.now() - started.current;
    };
  }, [paused, onDone]);

  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 }}
      animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 400, damping: 18 }}
      role={item.tone === "error" ? "alert" : "status"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex max-w-line items-center gap-3 rounded-pill bg-raised px-5 py-3 text-body text-text shadow-3"
    >
      <span>{item.message}</span>
      {item.action && (
        <button
          type="button"
          className="min-h-touch rounded-pill px-3 font-bold text-primary"
          onClick={() => {
            item.action!.onAction();
            onDone(false);
          }}
        >
          {item.action.label}
        </button>
      )}
    </motion.div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const live = useRef(new Map<number, ToastItem>()); // 콜백은 상태 갱신 함수 밖에서 한 번만 부른다

  const show = useCallback<ShowToast>((message, opts = {}) => {
    const item: ToastItem = {
      id: nextId.current++,
      message,
      tone: opts.tone ?? "info",
      action: opts.action,
      onExpire: opts.onExpire,
    };
    live.current.set(item.id, item);
    setItems((prev) => [...prev, item]);
  }, []);

  const done = useCallback((id: number, expired: boolean) => {
    const item = live.current.get(id);
    if (!item) return;
    live.current.delete(id);
    if (expired) item.onExpire?.();
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 px-4 pb-safe desktop:pb-6">
        <AnimatePresence>
          {items.map((item) => (
            <ToastView key={item.id} item={item} onDone={(expired) => done(item.id, expired)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ShowToast {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastProvider가 필요하다");
  return ctx;
}
