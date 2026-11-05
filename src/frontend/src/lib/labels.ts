// 태그·값의 한국어 이름 표 (ARCHITECTURE.md 5장 "태그 어휘와 화면 이름", D9). 이 파일 한 곳에만 둔다.

export const ALLERGY_LABELS: Record<string, string> = {
  chicken: "닭고기",
  fish: "생선",
};

export const CONDITION_LABELS: Record<string, string> = {
  joint_disease: "관절 질환",
  obesity_severe: "고도 비만",
  post_surgery: "수술 후 회복 중",
  brachycephalic: "단두종",
  ear_infection: "귀 염증",
  skin_disease: "피부 질환",
  heart_disease: "심장 질환",
  diabetes: "당뇨",
};

export const AGE_GROUP_LABELS = { junior: "어린 동물", adult: "성체", senior: "시니어" } as const;
export const SPECIES_LABELS = { dog: "강아지", cat: "고양이" } as const;
export const SIZE_LABELS = { small: "소형", medium: "중형", large: "대형" } as const;
export const ACTIVITY_LABELS = { low: "낮음", normal: "보통", high: "높음" } as const;
export const CATEGORY_LABELS = {
  diet: "식단",
  activity: "활동",
  health: "건강 일정",
  custom: "직접 추가",
} as const;
export const INTENSITY_LABELS: Record<string, string> = { low: "저강도", medium: "중강도", high: "고강도" };

export const tagLabel = (tag: string) => ALLERGY_LABELS[tag] ?? CONDITION_LABELS[tag] ?? tag;

export const TAG_LABELS: Record<string, string> = {
  outdoor: "실외",
  indoor: "실내",
  social: "다른 동물과 함께",
  hot_weather_risk: "더운 날 주의",
};

/** constraint 형식 4종(ARCHITECTURE.md 3.8) → 사람이 읽는 문구. 자유 텍스트는 그대로 */
export function constraintLabel(target: string): string {
  const time = /^activity_time_(after|before):(\d{2}:\d{2})$/.exec(target);
  if (time) return `놀이·산책은 ${time[2]} ${time[1] === "after" ? "이후" : "이전"}`;
  const tag = /^exclude_tag:(.+)$/.exec(target);
  if (tag) return `${TAG_LABELS[tag[1]] ?? tag[1]} 활동은 빼 주세요`;
  const max = /^max_duration_min:(\d+)$/.exec(target);
  if (max) return `활동은 ${max[1]}분 이내로`;
  return target;
}
