// W05-b 알림 목록 시트: 사용자의 모든 반려동물 일정 (서버 순서: 지연 → 오늘 → D-1 → D-7).
// 항목을 누르면 그 반려동물로 전환 후 W07.
import { ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { NotificationItem } from "@/api/types";
import { HealthBadge } from "@/components/base/Badge";
import { Modal } from "@/components/base/Modal";
import { formatMD } from "@/lib/dates";

export function noteTitle(n: NotificationItem) {
  return `${n.name}${n.dose_no ? ` ${n.dose_no}차` : ""}`;
}

export function NotificationSheet({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: NotificationItem[];
}) {
  const navigate = useNavigate();
  return (
    <Modal open={open} title="알림" onClose={onClose}>
      {items.length === 0 ? (
        <p className="py-4 text-muted">지금 알려 드릴 일정이 없어요.</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((n) => (
            <li key={n.event_id} className="[border-bottom:1px_solid_var(--color-border)]">
              <button
                type="button"
                className="flex min-h-touch w-full items-center gap-3 py-3 text-left"
                onClick={() => {
                  onClose();
                  navigate(`/health?pet=${n.pet_id}&event=${n.event_id}`);
                }}
              >
                <HealthBadge status={n.kind === "overdue" ? "overdue" : "scheduled"} dDay={n.d_day} />
                <span className="flex-1 wrap-anywhere">
                  {noteTitle(n)} ({n.pet_name})
                </span>
                <span className="tabular text-small text-muted">{formatMD(n.due_date)}</span>
                <ChevronRight aria-hidden="true" className="text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-caption text-muted">
        <span aria-hidden="true">ⓘ </span>D-7 · D-1 · 당일 · 지연된 일정만 알려 드려요. (&quot;이력 확인
        필요&quot; 일정은 건강 일정 화면에서 따로 보여요)
      </p>
    </Modal>
  );
}
