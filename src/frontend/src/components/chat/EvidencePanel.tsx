// 근거 보기 (W09-a): contexts 발췌 + trace 단계(사용자 문구). args·식별자·영어 도구 이름은 보여 주지 않는다.
import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";

export function EvidencePanel({ contexts, steps }: { contexts: string[]; steps: string[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  if (!contexts.length && !steps.length) return null;
  return (
    <div className="text-small text-muted">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-touch items-center gap-1 rounded-pill px-2 font-bold"
      >
        <span aria-hidden="true">🔎</span> 근거 보기
        <ChevronDown aria-hidden="true" className={`h-4 w-4 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={id} className="flex flex-col gap-3 px-2 pb-2">
          {contexts.length > 0 && (
            <section aria-label="참고한 자료">
              <h4 className="font-bold">참고한 자료 {contexts.length}개</h4>
              <ul className="mt-1 flex list-disc flex-col gap-1 pl-5">
                {contexts.map((c, i) => (
                  <li key={i} className="whitespace-pre-wrap wrap-anywhere">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {steps.length > 0 && (
            <section aria-label="처리 과정">
              <h4 className="font-bold">처리 과정</h4>
              <ol className="mt-1 flex list-decimal flex-col gap-1 pl-5">
                {steps.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
