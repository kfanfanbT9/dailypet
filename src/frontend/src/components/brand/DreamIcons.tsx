// 꿈동산 내비 아이콘 (자체 제작, doc/assets.md): Lucide와 같은 24 격자·선 2px·둥근 끝 + 별·하트 포인트.
// active면 몸통을 --color-sky로 채운다. 선 색은 currentColor (글자색을 따름).
import type { ReactNode, SVGProps } from "react";

export type DreamIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { active?: boolean };
export type DreamIcon = (p: DreamIconProps) => ReactNode;

const FILL = "var(--color-sky)";
const STAR = "M0 -3 L.8 -.8 L3 0 L.8 .8 L0 3 L-.8 .8 L-3 0 L-.8 -.8 Z";

function Base({ active, children, ...rest }: Omit<DreamIconProps, "children"> & { children: (fill: string) => ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children(active ? FILL : "none")}
    </svg>
  );
}

const Star = ({ x, y, s = 1 }: { x: number; y: number; s?: number }) => (
  <path d={STAR} transform={`translate(${x} ${y}) scale(${s})`} fill="var(--color-accent)" stroke="none" />
);

/** 오늘: 별이 뜬 작은 집 */
export const HomeDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <path d="M3.5 11 L11 4.5 L18.5 11 V20 H3.5 Z" fill={f} />
        <path d="M9 20 v-5 h4 v5" />
        <Star x={20} y={4.5} s={1.1} />
      </>
    )}
  </Base>
);

/** 건강 일정: 하트가 그려진 달력 */
export const CalendarDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" fill={f} />
        <path d="M8 3v4M16 3v4M3.5 10h17" />
        <path d="M12 18 l-2.6-2.5 a1.6 1.6 0 0 1 2.6-1.9 a1.6 1.6 0 0 1 2.6 1.9 Z" />
      </>
    )}
  </Base>
);

/** 체중 기록: 둥근 체중계 */
export const ScaleDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="5" fill={f} />
        <path d="M8 10 a4.5 4.5 0 0 1 8 0" />
        <path d="M12 10 l1.5-2" />
      </>
    )}
  </Base>
);

/** 채팅: 구름 말풍선 */
export const ChatDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <path
          d="M7 18 h10 a3.8 3.8 0 0 0 .6-7.6 a5.6 5.6 0 0 0-10.7-1 A4.3 4.3 0 0 0 7 18 Z"
          fill={f}
        />
        <path d="M8.5 18 l-2.5 3 l4.5-1.6" />
      </>
    )}
  </Base>
);

/** 내 취향: 반짝이는 하트 */
export const HeartDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <path d="M11 20 l-6.6-6.4 a4.2 4.2 0 0 1 6.6-5.2 a4.2 4.2 0 0 1 6.6 5.2 Z" fill={f} />
        <Star x={19.5} y={4.5} s={1.1} />
      </>
    )}
  </Base>
);

/** 내 정보: 별 머리핀을 단 사람 */
export const UserDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <circle cx="12" cy="8.5" r="4" fill={f} />
        <path d="M4.5 20.5 a7.5 7.5 0 0 1 15 0" />
        <Star x={17.5} y={4} s={0.9} />
      </>
    )}
  </Base>
);

/** 더보기: 초승달과 줄 */
export const MoreDream: DreamIcon = (p) => (
  <Base {...p}>
    {(f) => (
      <>
        <path d="M4 7h9M4 12h12M4 17h12" />
        <path d="M20.5 4.5 a3.5 3.5 0 1 0 0 6 a3 3 0 0 1 0-6 Z" fill={f === "none" ? "var(--color-accent)" : f} stroke="none" />
      </>
    )}
  </Base>
);
