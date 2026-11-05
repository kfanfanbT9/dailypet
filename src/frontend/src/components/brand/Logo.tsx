// 꿈동산 로고 (doc/assets.md, Style-guide.md 8장): 자체 제작 SVG. 둥근 하늘 배지 + 초승달·별 + 구름 + 언덕 위 개·고양이.
// 색은 tokens.css 팔레트 변수만 쓴다. public/favicon.svg는 같은 그림의 정적 사본이다 (값을 바꾸면 함께 바꾼다).
import { useId } from "react";

export type LogoSize = 32 | 40 | 96 | 160;

const INK = "var(--palette-ink-900)";
const LINE = { stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
export const STAR_PATH = "M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z";

/** 엠블럼 그림 (viewBox 0 0 100 100) — Logo와 파비콘 생성이 같이 쓴다 */
export function LogoArt({ clipId }: { clipId: string }) {
  return (
    <>
      <defs>
        <clipPath id={clipId}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>
      <circle cx="50" cy="50" r="46" fill="var(--palette-sky-100)" />
      <g clipPath={`url(#${clipId})`}>
        {/* 초승달 */}
        <circle cx="70" cy="28" r="11" fill="var(--palette-gold-300)" />
        <circle cx="75" cy="24" r="9.5" fill="var(--palette-sky-100)" />
        {/* 별 */}
        <g fill="var(--palette-gold-300)">
          <path d={STAR_PATH} transform="translate(26 22) scale(0.9)" />
          <path d={STAR_PATH} transform="translate(46 14) scale(0.55)" />
          <path d={STAR_PATH} transform="translate(86 46) scale(0.6)" />
        </g>
        {/* 구름 */}
        <g fill="var(--palette-white)">
          <ellipse cx="24" cy="44" rx="12" ry="6" />
          <ellipse cx="31" cy="40" rx="8" ry="6" />
        </g>
        {/* 언덕 (뒤·앞) */}
        <path d="M0 70 Q28 52 56 66 T100 62 V100 H0 Z" fill="var(--palette-mint-200)" />
        {/* 개 (처진 귀가 볼 옆으로 내려온다 — 둥근 귀 세 개 실루엣을 피한다) */}
        <circle cx="39" cy="74" r="11" fill="var(--palette-butter-100)" {...LINE} strokeWidth={2} />
        <ellipse cx="28.5" cy="79" rx="4" ry="8.5" transform="rotate(12 28.5 79)" fill="var(--palette-gold-300)" {...LINE} strokeWidth={2} />
        <ellipse cx="49.5" cy="79" rx="4" ry="8.5" transform="rotate(-12 49.5 79)" fill="var(--palette-gold-300)" {...LINE} strokeWidth={2} />
        <circle cx="35.5" cy="73" r="1.8" fill={INK} />
        <circle cx="42.5" cy="73" r="1.8" fill={INK} />
        <ellipse cx="39" cy="77" rx="2" ry="1.5" fill={INK} />
        {/* 고양이 */}
        <path d="M53 70 Q52 58 59 64 Z" fill="var(--palette-pink-200)" {...LINE} strokeWidth={2} />
        <path d="M71 70 Q72 58 65 64 Z" fill="var(--palette-pink-200)" {...LINE} strokeWidth={2} />
        <circle cx="62" cy="75" r="11" fill="var(--palette-pink-100)" {...LINE} strokeWidth={2} />
        <circle cx="58.5" cy="74" r="1.8" fill={INK} />
        <circle cx="65.5" cy="74" r="1.8" fill={INK} />
        <path d="M60.5 77.5 h3 l-1.5 1.5 z" fill="var(--palette-pink-700)" />
        {/* 앞 언덕 */}
        <path d="M0 84 Q36 72 64 82 T100 80 V100 H0 Z" fill="var(--palette-mint-100)" {...LINE} strokeWidth={2} />
      </g>
      <circle cx="50" cy="50" r="46" fill="none" {...LINE} />
    </>
  );
}

export function LogoMark({ size = 40, label }: { size?: LogoSize; label?: string }) {
  const clipId = `logo-clip-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="shrink-0"
    >
      <LogoArt clipId={clipId} />
    </svg>
  );
}

/** 엠블럼 + "DailyPet" 글자. 글자가 접근 가능한 이름이므로 엠블럼은 장식이다 */
export function Logo({ size = 40, className = "" }: { size?: LogoSize; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-display text-text ${className}`}>
      <LogoMark size={size} />
      DailyPet
    </span>
  );
}
