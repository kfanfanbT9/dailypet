// 할 일 카드 (Style-guide.md 7.4, wireframe W05). 건강 할 일에는 👍/👎/바꾸기가 없다.
import { AnimatePresence, motion } from "framer-motion";
import { Check, MoreHorizontal, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { CatalogItem, Task } from "@/api/types";
import { Badge } from "@/components/base/Badge";
import { Modal } from "@/components/base/Modal";
import { Button } from "@/components/base/Button";
import { CATEGORY_LABELS, INTENSITY_LABELS } from "@/lib/labels";
import { useMotionReduced } from "@/state/settings";

const BAND: Record<Task["category"], string> = {
  diet: "bg-cat-diet [box-shadow:inset_var(--border-band)_0_0_var(--color-accent),var(--shadow-1)]",
  activity: "bg-cat-activity [box-shadow:inset_var(--border-band)_0_0_var(--color-mint),var(--shadow-1)]",
  health: "bg-cat-health [box-shadow:inset_var(--border-band)_0_0_var(--color-pink),var(--shadow-1)]",
  custom: "bg-surface [box-shadow:inset_var(--border-band)_0_0_var(--color-border),var(--shadow-1)]",
};
const ICON: Record<Task["category"], string> = { diet: "🍚", activity: "🐾", health: "💉", custom: "✍️" };

/** 반짝임 파티클 (12개 이하, 움직임 줄이기면 그리지 않음) */
function Sparkles() {
  return (
    <span aria-hidden="true" data-testid="sparkles" className="pointer-events-none absolute inset-0">
      {Array.from({ length: 8 }, (_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 h-2 w-2 rounded-pill bg-accent"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(angle) * 28, y: Math.sin(angle) * 28, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.6 }}
          />
        );
      })}
    </span>
  );
}

export interface TaskCardProps {
  task: Task;
  item?: CatalogItem;
  liked?: "like" | "dislike" | null;
  onToggleDone: (done: boolean) => void;
  onFeedback: (signal: "like" | "dislike") => void;
  onSwap: () => void;
  onChangeTime: (time: string | null) => void;
  onDelete: () => void;
  onOpenHealth: () => void;
}

export function TaskCard({
  task,
  item,
  liked,
  onToggleDone,
  onFeedback,
  onSwap,
  onChangeTime,
  onDelete,
  onOpenHealth,
}: TaskCardProps) {
  const reduced = useMotionReduced();
  const [burst, setBurst] = useState(0);
  const [menu, setMenu] = useState(false);
  const [timeEdit, setTimeEdit] = useState(false);
  const [time, setTime] = useState(task.time ?? "");
  const isHealth = task.category === "health";
  const isCustom = task.source === "custom";
  const relaxedDislike = task.relaxed?.includes("dislike");
  const relaxedConstraint = task.relaxed?.includes("constraint");
  const meta = [
    task.category === "custom" ? null : CATEGORY_LABELS[task.category], // 직접 추가는 배지로 보여 준다
    item?.intensity ? INTENSITY_LABELS[item.intensity] : null,
    relaxedDislike ? "후보가 부족해 다시 넣었어요" : null,
    relaxedConstraint ? "정한 시간 외 항목이에요" : null,
  ].filter(Boolean);

  const toggle = () => {
    const next = !task.done;
    if (next && !reduced) setBurst((b) => b + 1);
    onToggleDone(next);
  };

  return (
    <motion.li
      layout={!reduced}
      initial={false}
      exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
      className={`relative flex gap-3 rounded-card p-4 ${BAND[task.category]}`}
    >
      <motion.button
        type="button"
        role="checkbox"
        aria-checked={task.done}
        aria-label={`${task.title} 완료`}
        onClick={toggle}
        animate={!reduced && task.done ? { scale: [1, 1.2, 1] } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 18 }}
        className="relative flex min-h-touch min-w-touch shrink-0 items-center justify-center"
      >
        <span
          className={`flex h-check w-check items-center justify-center rounded-pill [border:var(--border-strong)_solid_currentColor] ${
            task.done ? "bg-success text-surface [border-color:var(--color-success)]" : "text-muted"
          }`}
        >
          {task.done && <Check aria-hidden="true" className="h-4 w-4" />}
        </span>
        <AnimatePresence>{burst > 0 && !reduced && <Sparkles key={burst} />}</AnimatePresence>
      </motion.button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          {task.time && <span className="tabular text-body font-bold text-text">{task.time}</span>}
          <p
            className={`min-w-0 flex-1 text-body font-bold wrap-anywhere ${task.done ? "text-muted line-through" : "text-text"}`}
          >
            <span aria-hidden="true">{ICON[task.category]} </span>
            {task.title}
          </p>
          {isCustom && (
            <Badge tone="neutral" icon="✍️">
              직접 추가
            </Badge>
          )}
          {relaxedDislike && (
            <Badge tone="warning" icon="👎">
              싫어요 표시한 항목
            </Badge>
          )}
        </div>
        <p className="text-small text-muted">{meta.join(" · ")}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {isHealth ? (
            <Button size="sm" variant="ghost" onClick={onOpenHealth}>
              일정 ›
            </Button>
          ) : (
            <>
              {task.catalog_item_id && (
                <>
                  <button
                    type="button"
                    aria-label="좋아요"
                    aria-pressed={liked === "like"}
                    onClick={() => onFeedback("like")}
                    className={`min-h-touch min-w-touch rounded-pill ${liked === "like" ? "bg-sky" : ""}`}
                  >
                    👍
                  </button>
                  <button
                    type="button"
                    aria-label="싫어요"
                    aria-pressed={liked === "dislike"}
                    onClick={() => onFeedback("dislike")}
                    className={`min-h-touch min-w-touch rounded-pill ${liked === "dislike" ? "bg-pink" : ""}`}
                  >
                    👎
                  </button>
                </>
              )}
              {task.source === "auto" && (
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<RefreshCw aria-hidden="true" className="h-4 w-4" />}
                  onClick={onSwap}
                >
                  바꾸기
                </Button>
              )}
              <button
                type="button"
                aria-label={`${task.title} 메뉴`}
                aria-expanded={menu}
                onClick={() => setMenu((m) => !m)}
                className="min-h-touch min-w-touch rounded-pill text-muted"
              >
                <MoreHorizontal aria-hidden="true" className="mx-auto" />
              </button>
              {menu && (
                <span role="menu" className="flex gap-1">
                  <Button
                    role="menuitem"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setMenu(false);
                      setTimeEdit(true);
                    }}
                  >
                    시간 변경
                  </Button>
                  <Button
                    role="menuitem"
                    size="sm"
                    variant="danger"
                    onClick={() => {
                      setMenu(false);
                      onDelete();
                    }}
                  >
                    삭제
                  </Button>
                </span>
              )}
            </>
          )}
        </div>
      </div>
      <Modal
        open={timeEdit}
        title="시간 변경"
        onClose={() => setTimeEdit(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setTimeEdit(false)}>
              취소
            </Button>
            <Button
              onClick={() => {
                onChangeTime(time || null);
                setTimeEdit(false);
              }}
            >
              저장하기
            </Button>
          </>
        }
      >
        <label className="flex flex-col gap-1 text-small font-bold">
          시간
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="min-h-btn-md rounded-input bg-surface px-4 text-body [border:var(--border-input)_solid_var(--color-border)]"
          />
        </label>
      </Modal>
    </motion.li>
  );
}
