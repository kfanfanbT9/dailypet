// 승인 카드 (W09-c, Style-guide.md 7.7). 화면 내용은 interrupt.summary만 쓰고 args는 보여 주지 않는다.
import { useState } from "react";
import { Badge } from "@/components/base/Badge";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import type { ApprovalModel } from "@/lib/chatView";
import { formatMD } from "@/lib/dates";

export type ApprovalStatus = "pending" | "busy" | "approved" | "rejected" | "cancelled" | "closed";

export interface ApprovalCardProps {
  approval: ApprovalModel;
  status: ApprovalStatus;
  error?: string | null;
  onApprove: () => void;
  onEdit: (dueDate: string) => void;
  onReject: () => void;
}

export function ApprovalCard({ approval, status, error, onApprove, onEdit, onReject }: ApprovalCardProps) {
  const s = approval.summary;
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(s.due_date ?? "");
  const busy = status === "busy";
  const active = status === "pending" || busy;
  return (
    <section
      aria-label="승인 요청"
      className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-1 [border:var(--border-strong)_solid_var(--color-accent)]"
    >
      <h3 className="text-body font-bold">
        {s.action === "update" ? "이렇게 변경할까요?" : "이렇게 등록할까요?"}
      </h3>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small">
        <dt className="text-muted">일정</dt>
        <dd className="font-bold">{s.item_name ?? "건강 일정"}</dd>
        <dt className="text-muted">날짜</dt>
        <dd className="tabular">{s.due_date ? formatMD(s.due_date) : "-"}</dd>
        {s.dose_no != null && (
          <>
            <dt className="text-muted">회차</dt>
            <dd>{s.dose_no}차</dd>
          </>
        )}
      </dl>
      {active && editing && (
        <Input label="날짜" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      )}
      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
      {active ? (
        <div className="flex flex-wrap gap-2">
          {editing ? (
            <Button size="sm" loading={busy} disabled={!date} onClick={() => onEdit(date)}>
              수정해서 승인
            </Button>
          ) : (
            <Button size="sm" loading={busy} onClick={onApprove}>
              승인
            </Button>
          )}
          {!editing && (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setEditing(true)}>
              날짜 수정
            </Button>
          )}
          <Button size="sm" variant="danger" disabled={busy} onClick={onReject}>
            거절
          </Button>
        </div>
      ) : (
        <div>
          {status === "approved" && (
            <Badge tone="success" icon="✓">
              {s.action === "update" ? "변경했어요" : "등록했어요"}
            </Badge>
          )}
          {status === "rejected" && <Badge tone="neutral">{s.action === "update" ? "변경하지 않았어요" : "등록하지 않았어요"}</Badge>}
          {status === "cancelled" && (
            <Badge tone="neutral" icon="⊘">
              취소된 요청
            </Badge>
          )}
          {status === "closed" && <Badge tone="neutral">처리된 요청</Badge>}
        </div>
      )}
    </section>
  );
}
