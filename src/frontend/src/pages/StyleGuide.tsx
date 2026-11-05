// 개발 전용 /_styleguide: 토큰·컴포넌트·마스코트를 5개 조합(밝게/밤하늘 × 개/고양이 + 움직임 줄이기)으로 확인.
import { useEffect, useState } from "react";
import type { Species } from "@/api/types";
import { Badge, HealthBadge } from "@/components/base/Badge";
import { Button } from "@/components/base/Button";
import { Input } from "@/components/base/Field";
import { EmptyState, ErrorState, ProgressBar, Skeleton } from "@/components/base/States";
import { DreamBackdrop } from "@/components/brand/DreamBackdrop";
import {
  CalendarDream,
  ChatDream,
  HeartDream,
  HomeDream,
  MoreDream,
  ScaleDream,
  UserDream,
} from "@/components/brand/DreamIcons";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Mascot, type Mood } from "@/components/mascot/Mascot";

const COMBOS = [
  { theme: "light", species: "dog", motion: "full", label: "밝게 · 강아지" },
  { theme: "light", species: "cat", motion: "full", label: "밝게 · 고양이" },
  { theme: "dark", species: "dog", motion: "full", label: "밤하늘 · 강아지" },
  { theme: "dark", species: "cat", motion: "full", label: "밤하늘 · 고양이" },
  { theme: "light", species: "dog", motion: "reduced", label: "움직임 줄이기" },
] as const;
const MOODS: Mood[] = ["default", "happy", "sorry", "worried", "celebrate"];

export default function StyleGuide() {
  const [i, setI] = useState(0);
  const combo = COMBOS[i];
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = combo.theme;
    root.dataset.species = combo.species;
    root.dataset.motion = combo.motion;
  }, [combo]);
  return (
    <main className="mx-auto flex max-w-content flex-col gap-6 p-6">
      <h1 className="font-display text-title-1">스타일 가이드</h1>
      <div role="group" aria-label="조합" className="flex flex-wrap gap-2">
        {COMBOS.map((c, idx) => (
          <Button
            key={c.label}
            size="sm"
            variant={idx === i ? "primary" : "secondary"}
            aria-pressed={idx === i}
            onClick={() => setI(idx)}
          >
            {c.label}
          </Button>
        ))}
      </div>
      <section aria-label="로고" className="flex flex-wrap items-end gap-4">
        <LogoMark size={160} label="DailyPet 로고" />
        <LogoMark size={96} />
        <Logo size={40} className="text-title-2" />
        <Logo size={32} className="text-title-2" />
      </section>
      <section aria-label="꿈동산 아이콘" className="flex flex-wrap items-center gap-4 text-text">
        {[HomeDream, CalendarDream, ScaleDream, ChatDream, HeartDream, UserDream, MoreDream].map((I, i) => (
          <span key={i} className="flex gap-1">
            <I />
            <I active />
          </span>
        ))}
      </section>
      <section aria-label="꿈동산 배경" className="overflow-hidden rounded-card">
        <DreamBackdrop />
      </section>
      <section aria-label="마스코트" className="flex flex-wrap items-end gap-4">
        {(["dog", "cat"] as Species[]).map((s) =>
          MOODS.map((m) => <Mascot key={s + m} species={s} mood={m} size={96} />),
        )}
        <Mascot species={combo.species} size={160} />
        <Mascot species={combo.species} size={32} />
        <Mascot species={combo.species} size={24} />
      </section>
      <section aria-label="버튼" className="flex flex-wrap gap-2">
        <Button>저장하기</Button>
        <Button variant="secondary">날짜 수정</Button>
        <Button variant="ghost">보기 ›</Button>
        <Button variant="danger">삭제</Button>
        <Button variant="danger-solid">삭제하기</Button>
        <Button loading>저장하기</Button>
        <Button disabled>비활성</Button>
        <Button size="sm">작은 버튼</Button>
      </section>
      <section aria-label="배지" className="flex flex-wrap gap-2">
        <HealthBadge status="scheduled" dDay={3} />
        <HealthBadge status="scheduled" dDay={0} />
        <HealthBadge status="overdue" dDay={-1} />
        <HealthBadge status="needs_history" dDay={-20} />
        <HealthBadge status="done" dDay={0} />
        <Badge tone="neutral" icon="✍️">
          직접 추가
        </Badge>
        <Badge tone="warning" icon="👎">
          싫어요 표시한 항목
        </Badge>
        <Badge tone="info" icon="ⓘ">
          프로필이 바뀌었어요
        </Badge>
      </section>
      <section aria-label="입력" className="grid gap-4 desktop:grid-cols-2">
        <Input label="이름" required placeholder="두부" />
        <Input label="체중" unit="kg" inputMode="decimal" error="0.5~100kg 사이로 입력해 주세요" />
      </section>
      <section aria-label="상태" className="grid gap-4 desktop:grid-cols-2">
        <ProgressBar done={2} total={6} label="오늘의 할 일 진행률" />
        <Skeleton />
        <EmptyState
          species={combo.species}
          title="아직 나눈 대화가 없어요"
          action={{ label: "대화 시작하기", onClick: () => {} }}
        />
        <ErrorState species={combo.species} onRetry={() => {}} />
      </section>
      <section aria-label="카테고리 카드" className="grid gap-3">
        {(["cat-diet", "cat-activity", "cat-health"] as const).map((c) => (
          <div key={c} className={`rounded-card bg-${c} p-4 shadow-1`}>
            {c}
          </div>
        ))}
      </section>
    </main>
  );
}
