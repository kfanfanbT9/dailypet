// 대화 목록 (W10과 W09 데스크톱 왼쪽 칸이 같이 쓴다)
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/base/States";
import { useThreads } from "@/hooks/queries";
import { formatMD } from "@/lib/dates";
import { usePetLink } from "@/state/currentPet";

export function ThreadList({ petId, activeId }: { petId?: string; activeId?: string | null }) {
  const q = useThreads(petId);
  const link = usePetLink();
  if (q.isLoading) return <Skeleton lines={3} label="대화 기록을 불러오는 중이에요" />;
  if (q.isError) return <p className="text-small text-muted">대화 기록을 불러오지 못했어요.</p>;
  const list = q.data ?? [];
  if (!list.length) return <p className="text-small text-muted">아직 대화가 없어요.</p>;
  return (
    <ul className="flex flex-col gap-1">
      {list.map((t) => (
        <li key={t.thread_id}>
          <Link
            to={link(`/chat/${t.thread_id}`)}
            aria-current={t.thread_id === activeId ? "page" : undefined}
            className={`flex min-h-touch flex-col justify-center rounded-input px-3 py-2 ${
              t.thread_id === activeId ? "bg-surface shadow-1" : ""
            }`}
          >
            <span className="truncate text-small font-bold">{t.title}</span>
            <span className="tabular text-caption text-muted">
              {formatMD(t.last_at.slice(0, 10))} · {t.count}개
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
