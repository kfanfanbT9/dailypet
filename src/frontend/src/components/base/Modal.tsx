// 모달·하단 시트 (Style-guide.md 7.9): 모바일은 하단 시트, 데스크톱은 가운데(최대 440px).
// 포커스를 안에 가두고, Esc·바깥 누르기로 닫고(입력 확인 모달은 바깥 닫기 막음), 닫으면 연 요소로 포커스를 돌려준다.
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMotionReduced } from "@/state/settings";
import { Button } from "./Button";

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** 바깥 눌러 닫기 막기 (입력 확인 모달) */
  dismissOnBackdrop?: boolean;
}

export function Modal({ open, title, onClose, children, footer, dismissOnBackdrop = true }: ModalProps) {
  const reduced = useMotionReduced();
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const t = setTimeout(() => {
      const first = panel.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panel.current)?.focus();
    }, 0);
    return () => {
      clearTimeout(t);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== "Tab" || !panel.current) return;
    const nodes = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    if (nodes.length === 0) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className="fixed inset-0 z-40 flex items-end justify-center bg-scrim desktop:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduced ? 0.12 : 0.2 }}
          onMouseDown={(e) => {
            if (dismissOnBackdrop && e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            onKeyDown={onKeyDown}
            initial={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={reduced ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduced ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={reduced ? { duration: 0.12 } : { type: "spring", stiffness: 400, damping: 30 }}
            className="max-h-[90dvh] w-full max-w-modal overflow-y-auto rounded-t-sheet bg-surface p-6 shadow-3 desktop:rounded-sheet"
          >
            <h2 id={titleId} className="mb-4 font-display text-title-2 text-text">
              {title}
            </h2>
            <div className="text-body text-text">{children}</div>
            {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  confirmLabel: string;
  children?: ReactNode;
  /** 파괴적 작업: 이 값을 정확히 입력해야 확인 버튼이 켜진다 (반려동물 이름·가입 이메일) */
  typeToConfirm?: { label: string; value: string; normalize?: (s: string) => string };
  danger?: boolean;
  busy?: boolean;
}

export function ConfirmModal({
  open,
  title,
  onClose,
  onConfirm,
  confirmLabel,
  children,
  typeToConfirm,
  danger,
  busy,
}: ConfirmProps) {
  const [typed, setTyped] = useState("");
  const [wasOpen, setWasOpen] = useState(open);
  const inputId = useId();
  // 닫히면 입력을 비운다 (렌더 중 이전 값과 비교해 갱신하는 React 권장 방식, effect 없이)
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) setTyped("");
  }
  const norm = typeToConfirm?.normalize ?? ((s: string) => s.trim());
  const ok = !typeToConfirm || norm(typed) === norm(typeToConfirm.value);
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      dismissOnBackdrop={!typeToConfirm}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            variant={danger ? "danger-solid" : "primary"}
            disabled={!ok}
            loading={busy}
            onClick={() => ok && onConfirm()}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
      {typeToConfirm && (
        <div className="mt-4 flex flex-col gap-1">
          <label htmlFor={inputId} className="text-small font-bold">
            {typeToConfirm.label}
          </label>
          <input
            id={inputId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className="min-h-btn-md rounded-input bg-surface px-4 text-body text-text [border:var(--border-input)_solid_var(--color-border)]"
          />
        </div>
      )}
    </Modal>
  );
}
