// 자체 제작 마스코트 (doc/assets.md, Style-guide.md 8장): 코드로 그린 SVG, 외부 에셋 없음.
// 개 = 둥근 얼굴 + 아래로 처진 둥근 귀, 고양이 = 둥근 얼굴 + 둥근 삼각 귀 + 수염. 표정은 눈·눈썹·입만 바꾼다.
// 색은 tokens.css 팔레트 변수만 쓴다. 다른 회사 캐릭터를 떠올리게 하는 실루엣(동그란 귀 세 개, 리본 등)을 쓰지 않는다.
import type { Species } from "@/api/types";

export type Mood = "default" | "happy" | "sorry" | "worried" | "celebrate";
export type MascotSize = 24 | 32 | 96 | 160;

const MOOD_LABEL: Record<Mood, string> = {
  default: "기본",
  happy: "기쁨",
  sorry: "미안",
  worried: "걱정",
  celebrate: "축하",
};
const SPECIES_LABEL: Record<Species, string> = { dog: "강아지", cat: "고양이" };

const INK = "var(--palette-ink-900)";
const STROKE = {
  stroke: INK,
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function Eyes({ mood }: { mood: Mood }) {
  if (mood === "happy" || mood === "celebrate") {
    // 웃는 눈 (^ ^)
    return (
      <g fill="none" {...STROKE}>
        <path d="M34 52 q6 -7 12 0" />
        <path d="M54 52 q6 -7 12 0" />
      </g>
    );
  }
  const brows =
    mood === "sorry" ? (
      <g fill="none" {...STROKE}>
        <path d="M33 40 l12 4" />
        <path d="M67 40 l-12 4" />
      </g>
    ) : mood === "worried" ? (
      <g fill="none" {...STROKE}>
        <path d="M33 44 l12 -4" />
        <path d="M67 44 l-12 -4" />
      </g>
    ) : null;
  return (
    <g>
      {brows}
      <circle cx="40" cy="52" r="6" fill={INK} />
      <circle cx="60" cy="52" r="6" fill={INK} />
      <circle cx="42" cy="50" r="2" fill="var(--palette-white)" />
      <circle cx="62" cy="50" r="2" fill="var(--palette-white)" />
    </g>
  );
}

function Mouth({ mood }: { mood: Mood }) {
  if (mood === "happy" || mood === "celebrate") {
    return <path d="M42 64 q8 10 16 0 z" fill="var(--palette-pink-700)" {...STROKE} strokeWidth={2} />;
  }
  if (mood === "sorry") return <path d="M44 68 q6 -5 12 0" fill="none" {...STROKE} />;
  if (mood === "worried") return <path d="M43 67 q3.5 -3 7 0 q3.5 3 7 0" fill="none" {...STROKE} />;
  return <path d="M44 64 q6 6 12 0" fill="none" {...STROKE} />;
}

function Sparkles() {
  const star = "M0 -6 L1.6 -1.6 L6 0 L1.6 1.6 L0 6 L-1.6 1.6 L-6 0 L-1.6 -1.6 Z";
  return (
    <g fill="var(--palette-gold-300)">
      <path d={star} transform="translate(14 18)" />
      <path d={star} transform="translate(88 22) scale(0.8)" />
      <path d={star} transform="translate(90 80) scale(0.6)" />
    </g>
  );
}

function Dog({ mood }: { mood: Mood }) {
  return (
    <>
      {/* 처진 귀 */}
      <ellipse
        cx="22"
        cy="48"
        rx="10"
        ry="20"
        transform="rotate(18 22 48)"
        fill="var(--palette-gold-300)"
        {...STROKE}
      />
      <ellipse
        cx="78"
        cy="48"
        rx="10"
        ry="20"
        transform="rotate(-18 78 48)"
        fill="var(--palette-gold-300)"
        {...STROKE}
      />
      {/* 얼굴 */}
      <circle cx="50" cy="54" r="30" fill="var(--palette-butter-100)" {...STROKE} />
      {/* 주둥이 */}
      <ellipse cx="50" cy="64" rx="13" ry="10" fill="var(--palette-white)" />
      <Eyes mood={mood} />
      <ellipse cx="50" cy="60" rx="4.5" ry="3.5" fill={INK} />
      <Mouth mood={mood} />
      <circle cx="30" cy="62" r="4" fill="var(--palette-pink-200)" />
      <circle cx="70" cy="62" r="4" fill="var(--palette-pink-200)" />
    </>
  );
}

function Cat({ mood }: { mood: Mood }) {
  return (
    <>
      {/* 둥근 삼각 귀 */}
      <path d="M26 36 Q24 14 38 26 Z" fill="var(--palette-pink-200)" {...STROKE} />
      <path d="M74 36 Q76 14 62 26 Z" fill="var(--palette-pink-200)" {...STROKE} />
      {/* 얼굴 */}
      <circle cx="50" cy="54" r="30" fill="var(--palette-pink-100)" {...STROKE} />
      <Eyes mood={mood} />
      <path d="M47 60 h6 l-3 3 z" fill="var(--palette-pink-700)" />
      <Mouth mood={mood} />
      {/* 수염 */}
      <g fill="none" stroke="var(--palette-ink-600)" strokeWidth={1.8} strokeLinecap="round">
        <path d="M30 60 h-12" />
        <path d="M30 65 l-11 3" />
        <path d="M70 60 h12" />
        <path d="M70 65 l11 3" />
      </g>
      <circle cx="32" cy="66" r="3.5" fill="var(--palette-pink-200)" />
      <circle cx="68" cy="66" r="3.5" fill="var(--palette-pink-200)" />
    </>
  );
}

interface Props {
  species: Species;
  mood?: Mood;
  size?: MascotSize;
  /** 장식이면 true (옆에 같은 뜻의 글자가 있을 때) */
  decorative?: boolean;
  className?: string;
}

export function Mascot({ species, mood = "default", size = 96, decorative = false, className = "" }: Props) {
  const label = `${SPECIES_LABEL[species]} 마스코트 (${MOOD_LABEL[mood]})`;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : label}
      data-mood={mood}
      data-species={species}
      className={`shrink-0 [filter:drop-shadow(0_0_1px_var(--palette-white))] ${className}`}
    >
      {species === "dog" ? <Dog mood={mood} /> : <Cat mood={mood} />}
      {mood === "celebrate" && <Sparkles />}
    </svg>
  );
}

export const DogMascot = (p: Omit<Props, "species">) => <Mascot species="dog" {...p} />;
export const CatMascot = (p: Omit<Props, "species">) => <Mascot species="cat" {...p} />;
