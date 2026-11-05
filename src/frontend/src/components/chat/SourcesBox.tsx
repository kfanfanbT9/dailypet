// 웹 검색 출처 박스 (W09-b): http(s) 링크만, 새 창 + noopener. 저장·할 일 추가 버튼 없음.
import { safeUrl } from "@/lib/chatView";

export function SourcesBox({ sources }: { sources: string[] }) {
  const links = sources.map(safeUrl).filter((u): u is string => Boolean(u));
  return (
    <aside aria-label="웹 검색 출처" className="flex flex-col gap-1 rounded-card bg-info-bg p-3 text-caption text-text">
      <p className="font-bold">
        <span aria-hidden="true">🌐</span> 상식 도우미가 웹에서 찾아봤어요
      </p>
      {links.length > 0 && (
        <ul className="flex flex-col gap-1">
          {links.map((u) => (
            <li key={u}>
              <a href={u} target="_blank" rel="noopener noreferrer" className="text-info underline wrap-anywhere">
                {new URL(u).hostname}
              </a>
            </li>
          ))}
        </ul>
      )}
      <p>
        <span aria-hidden="true">ⓘ</span> 일반 정보예요. 정확한 판단은 수의사와 상담하세요.
      </p>
    </aside>
  );
}
