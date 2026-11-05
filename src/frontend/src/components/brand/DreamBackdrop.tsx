// 꿈동산 배경 띠 (자체 제작, doc/assets.md): 겹친 언덕·구름·별·달. 의미 토큰 색만 써서 밤하늘 테마에서도 맞는다.
// 장식이므로 aria-hidden. 별 반짝임은 global.css의 .dp-twinkle (움직임 줄이기면 멈춤).
import { STAR_PATH } from "./Logo";

export function DreamBackdrop({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={`pointer-events-none block w-full ${className}`}
    >
      {/* 달 */}
      <circle cx="330" cy="30" r="14" fill="var(--color-accent)" />
      <circle cx="337" cy="25" r="12" fill="var(--color-bg)" />
      {/* 별 */}
      <g fill="var(--color-accent)">
        <path className="dp-twinkle" d={STAR_PATH} transform="translate(60 26)" />
        <path className="dp-twinkle dp-twinkle-2" d={STAR_PATH} transform="translate(150 14) scale(0.6)" />
        <path className="dp-twinkle dp-twinkle-3" d={STAR_PATH} transform="translate(250 34) scale(0.8)" />
        <path className="dp-twinkle dp-twinkle-2" d={STAR_PATH} transform="translate(372 58) scale(0.5)" />
      </g>
      {/* 구름 */}
      <g fill="var(--color-surface)">
        <ellipse cx="100" cy="56" rx="26" ry="10" />
        <ellipse cx="114" cy="48" rx="16" ry="11" />
        <ellipse cx="280" cy="66" rx="22" ry="8" />
        <ellipse cx="292" cy="60" rx="12" ry="8" />
      </g>
      {/* 언덕 */}
      <path d="M0 92 Q90 60 190 86 T400 78 V120 H0 Z" fill="var(--color-sky)" />
      <path d="M0 106 Q120 80 240 100 T400 96 V120 H0 Z" fill="var(--color-mint)" />
    </svg>
  );
}
