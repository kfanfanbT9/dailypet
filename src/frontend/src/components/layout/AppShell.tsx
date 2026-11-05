// W00 공통 레이아웃: 헤더(🔔·프로필) + 반려동물 탭 + 모바일 하단 내비 5칸 / 데스크톱 사이드바 240px·본문 최대 960px.
import {
  Bell,
  CalendarHeart,
  Heart,
  Home,
  Menu,
  MessageCircle,
  Scale,
  Settings,
  Plus,
  UserRound,
} from "lucide-react";
import { useState, type KeyboardEvent, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Mascot } from "@/components/mascot/Mascot";
import { NotificationSheet } from "@/components/domain/NotificationSheet";
import { useNotifications } from "@/hooks/queries";
import { useCurrentPet, usePetLink } from "@/state/currentPet";

const MOBILE_NAV = [
  { to: "/", label: "오늘", icon: Home },
  { to: "/health", label: "일정", icon: CalendarHeart },
  { to: "/chat", label: "채팅", icon: MessageCircle },
  { to: "/preferences", label: "취향", icon: Heart },
  { to: "/me", label: "더보기", icon: Menu },
];
const SIDE_NAV = [
  { to: "/", label: "오늘", icon: Home },
  { to: "/health", label: "건강 일정", icon: CalendarHeart },
  { to: "/weights", label: "체중 기록", icon: Scale },
  { to: "/chat", label: "채팅", icon: MessageCircle },
  { to: "/preferences", label: "내 취향", icon: Heart },
  { to: "/me", label: "내 정보", icon: UserRound },
];

function PetTabs() {
  const { pets, pet, select } = useCurrentPet();
  const link = usePetLink();
  const onKey = (e: KeyboardEvent, i: number) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const next = pets[(i + d + pets.length) % pets.length];
    select(next.id);
    document.getElementById(`pet-tab-${next.id}`)?.focus();
  };
  if (pets.length === 0) {
    return (
      <p className="text-small text-muted">
        첫 반려동물을 등록해 주세요{" "}
        <Link to="/pets/new" className="font-bold">
          등록하기
        </Link>
      </p>
    );
  }
  return (
    <div className="flex min-w-0 items-center gap-2">
      <div role="tablist" aria-label="반려동물 선택" className="flex min-w-0 gap-2 overflow-x-auto py-1">
        {pets.map((p, i) => {
          const selected = p.id === pet?.id;
          return (
            <button
              key={p.id}
              id={`pet-tab-${p.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(p.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={`flex min-h-touch shrink-0 items-center gap-2 rounded-pill px-3 text-body font-bold ${
                selected ? "bg-species text-text [box-shadow:inset_0_calc(-1*var(--border-band))_0_var(--color-species-strong)]" : "bg-surface text-text shadow-1"
              }`}
            >
              <Mascot species={p.species} size={24} decorative />
              {p.name}
            </button>
          );
        })}
      </div>
      <Link
        to="/pets/new"
        aria-label="반려동물 등록"
        className="flex min-h-touch min-w-touch items-center justify-center rounded-pill bg-surface text-primary shadow-1"
      >
        <Plus aria-hidden="true" />
      </Link>
      <Link
        to={link("/pets")}
        aria-label="반려동물 관리"
        className="flex min-h-touch min-w-touch items-center justify-center rounded-pill bg-surface text-primary shadow-1"
      >
        <Settings aria-hidden="true" />
      </Link>
    </div>
  );
}

function NavItem({
  to,
  label,
  icon: Icon,
  variant,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  variant: "bottom" | "side";
}) {
  const link = usePetLink();
  const { pathname } = useLocation();
  const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
  if (variant === "bottom") {
    return (
      <NavLink
        to={link(to)}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-touch flex-1 flex-col items-center justify-center gap-1 text-caption ${
          active
            ? "text-primary [box-shadow:inset_0_var(--border-band)_0_var(--color-primary)]"
            : "text-muted"
        }`}
      >
        <Icon aria-hidden="true" />
        {label}
      </NavLink>
    );
  }
  return (
    <NavLink
      to={link(to)}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-touch items-center gap-3 rounded-pill px-4 text-body ${active ? "bg-sky font-bold text-text" : "text-text"}`}
    >
      <Icon aria-hidden="true" />
      {label}
    </NavLink>
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { data: notes } = useNotifications();
  const [sheet, setSheet] = useState(false);
  const navigate = useNavigate();
  const link = usePetLink();
  const count = notes?.length ?? 0;
  const { pet } = useCurrentPet();
  return (
    <div className="min-h-dvh desktop:flex">
      <a href="#main" className="sr-only focus:not-sr-only">
        본문으로 건너뛰기
      </a>
      <aside className="hidden w-sidebar shrink-0 flex-col gap-2 p-4 desktop:flex">
        <p className="mb-4 px-4 font-display text-title-2 text-text">
          <span aria-hidden="true">✨ </span>DailyPet
        </p>
        <nav aria-label="주 메뉴" className="flex flex-col gap-1">
          {SIDE_NAV.map((n) => (
            <NavItem key={n.to} {...n} variant="side" />
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-col gap-2 bg-bg px-4 py-2 tablet:px-6">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-title-2 text-text desktop:hidden">
              <span aria-hidden="true">✨ </span>DailyPet
            </p>
            <div className="hidden min-w-0 flex-1 desktop:block">
              <PetTabs />
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label={`알림 ${count}개`}
                onClick={() => setSheet(true)}
                className="relative flex min-h-touch min-w-touch items-center justify-center rounded-pill text-text"
              >
                <Bell aria-hidden="true" />
                {count > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute right-1 top-1 min-w-5 rounded-pill bg-danger px-1 text-caption font-bold [color:var(--color-on-danger)]"
                  >
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </button>
              <button
                type="button"
                aria-label="내 정보"
                onClick={() => navigate(link("/me"))}
                className="flex min-h-touch min-w-touch items-center justify-center rounded-pill"
              >
                <Mascot species={pet?.species ?? "dog"} size={32} decorative />
              </button>
            </div>
          </div>
          <div className="desktop:hidden">
            <PetTabs />
          </div>
        </header>
        <main
          id="main"
          className="mx-auto w-full max-w-tablet flex-1 px-4 pb-safe pt-4 tablet:px-6 desktop:max-w-content desktop:pb-12"
        >
          {children ?? <Outlet />}
        </main>
      </div>
      <nav
        aria-label="주 메뉴"
        className="fixed inset-x-0 bottom-0 z-30 flex h-nav bg-surface shadow-3 [padding-bottom:env(safe-area-inset-bottom)] desktop:hidden"
      >
        {MOBILE_NAV.map((n) => (
          <NavItem key={n.to} {...n} variant="bottom" />
        ))}
      </nav>
      <NotificationSheet open={sheet} onClose={() => setSheet(false)} items={notes ?? []} />
    </div>
  );
}
