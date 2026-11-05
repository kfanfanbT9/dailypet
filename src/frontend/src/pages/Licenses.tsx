// lint-tokens-allow: font — 글꼴 이름을 라이선스 표시 내용으로 보여 준다 (스타일 값 아님)
// 내 정보 > 오픈소스·에셋 정보 (doc/assets.md 표시 문구를 옮긴 정적 화면). CC BY 에셋은 없다.
const ROWS = [
  { name: "Jua", kind: "글꼴", by: "Woowahan Brothers", license: "SIL Open Font License 1.1" },
  { name: "Nanum Gothic", kind: "글꼴", by: "NAVER", license: "SIL Open Font License 1.1" },
  { name: "Lucide", kind: "아이콘", by: "Lucide Contributors", license: "ISC License" },
  { name: "DailyPet 마스코트", kind: "일러스트", by: "DailyPet 자체 제작", license: "프로젝트 자체 저작물" },
];

export default function Licenses() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="font-display text-title-1">오픈소스·에셋 정보</h1>
      <ul className="flex flex-col gap-3">
        {ROWS.map((r) => (
          <li key={r.name} className="rounded-card bg-surface p-4 shadow-1">
            <p className="text-body font-bold">{r.name}</p>
            <p className="text-small text-muted">
              {r.kind} · {r.by} · {r.license}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-caption text-muted">다른 회사의 캐릭터·로고·이름·이미지는 쓰지 않아요.</p>
    </section>
  );
}
