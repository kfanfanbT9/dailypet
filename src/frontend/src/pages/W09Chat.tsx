// W09 채팅 (W09-a~d): 질문·답변·근거 보기·승인 카드·자동 거절 표시. 응답 해석은 lib/chatView.ts 한 곳에서.
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/client";
import { chat } from "@/api/endpoints";
import type { ChatResponse, Decision } from "@/api/types";
import { Button } from "@/components/base/Button";
import { useToast } from "@/components/base/Toast";
import { ApprovalCard, type ApprovalStatus } from "@/components/chat/ApprovalCard";
import { BotBubble, PlainText, ThinkingBubble, UserBubble } from "@/components/chat/ChatBubble";
import { EvidencePanel } from "@/components/chat/EvidencePanel";
import { SourcesBox } from "@/components/chat/SourcesBox";
import { ThreadList } from "@/components/chat/ThreadList";
import { Mascot } from "@/components/mascot/Mascot";
import { qk } from "@/hooks/queries";
import { chatView, type BotView } from "@/lib/chatView";
import { errorMessage } from "@/lib/messages";
import { useCurrentPet, usePetLink } from "@/state/currentPet";

export const MAX_QUESTION = 1000;

const SUGGESTIONS: Record<"dog" | "cat", string[]> = {
  dog: ["간식으로 뭐가 좋아?", "오늘 산책은 얼마나 하면 돼?", "다음 예방접종은 언제야?"],
  cat: ["간식으로 뭐가 좋아?", "실내에서 할 놀이 추천해줘", "다음 예방접종은 언제야?"],
};

type UserMsg = { kind: "user"; id: number; text: string; failed?: boolean };
type BotMsg = { kind: "bot"; id: number; view: BotView; status?: ApprovalStatus; error?: string | null };
type NoticeMsg = { kind: "notice"; id: number; text: string };
type Msg = UserMsg | BotMsg | NoticeMsg;

let seq = 0;
const nextId = () => ++seq;

export default function W09Chat() {
  const { threadId: urlThread } = useParams();
  const navigate = useNavigate();
  const link = usePetLink();
  const qc = useQueryClient();
  const toast = useToast();
  const { pet, pets, select, onSwitch } = useCurrentPet();
  const species = pet?.species === "cat" ? "cat" : "dog";

  const [messages, setMessages] = useState<Msg[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef<string | null>(null); // 화면에 이미 반영한 thread (응답으로 받은 thread를 다시 불러오지 않게)
  const petRef = useRef(pet);
  const petsRef = useRef(pets);
  const messagesRef = useRef(messages);
  useEffect(() => {
    petRef.current = pet;
    petsRef.current = pets;
    messagesRef.current = messages;
  });

  const petReady = Boolean(pet);
  const hasPending = messages.some((m) => m.kind === "bot" && m.status === "pending");

  /** 대기 중 승인 카드를 "취소된 요청"으로 (실제 거절은 Agent가 다음 /query 때, phase1_task.md A-8) */
  const cancelPending = useCallback(() => {
    const had = messagesRef.current.some((m) => m.kind === "bot" && m.status === "pending");
    if (had)
      setMessages((ms) =>
        ms.map((m) => (m.kind === "bot" && m.status === "pending" ? { ...m, status: "cancelled" as const } : m)),
      );
    return had;
  }, []);

  // 지난 대화 불러오기 (/chat/:threadId). 다른 반려동물의 thread면 전환하지 않고 W10으로.
  useEffect(() => {
    if (!urlThread) {
      loaded.current = null;
      return;
    }
    if (loaded.current === urlThread) return;
    const p = petRef.current;
    if (!p) return;
    const toHistory = () => navigate(`/chat/history?pet=${p.id}`, { replace: true });
    if (!urlThread.includes(`_${p.id}_`)) {
      toHistory();
      return;
    }
    loaded.current = urlThread;
    let alive = true;
    chat
      .thread(urlThread)
      .then((d) => {
        if (!alive) return;
        if (d.pet_id !== p.id) return toHistory();
        const ms: Msg[] = [];
        d.messages.forEach((m, i) => {
          const view = chatView({ answer: m.answer, contexts: [], trace: m.trace }, petsRef.current);
          ms.push({ kind: "user", id: nextId(), text: m.question });
          ms.push({
            kind: "bot",
            id: nextId(),
            view,
            status: view.approval ? (i === d.messages.length - 1 ? "pending" : "closed") : undefined,
          });
        });
        setMessages(ms);
        setThreadId(urlThread);
      })
      .catch(() => alive && toHistory());
    return () => {
      alive = false;
    };
  }, [urlThread, navigate, petReady]);

  // 반려동물을 바꾸면: 대기 카드 취소 표시 + 토스트, 다음 질문은 새 thread
  useEffect(
    () =>
      onSwitch((_from, to) => {
        if (cancelPending()) toast("이전 일정 요청은 취소했어요");
        setThreadId(null);
        loaded.current = null;
        if (urlThread && to) navigate(`/chat?pet=${to}`, { replace: true });
      }),
    [onSwitch, cancelPending, toast, navigate, urlThread],
  );

  const applyResponse = (res: ChatResponse) => {
    const view = chatView(res, petsRef.current);
    setMessages((ms) => [...ms, { kind: "bot", id: nextId(), view, status: view.approval ? "pending" : undefined }]);
    if (view.preferenceSaved && pet) void qc.invalidateQueries({ queryKey: qk.prefs(pet.id) });
    if (res.thread_id && res.thread_id !== threadId) {
      setThreadId(res.thread_id);
      loaded.current = res.thread_id;
      navigate(link(`/chat/${res.thread_id}`), { replace: true });
    }
    if (pet) void qc.invalidateQueries({ queryKey: qk.threads(pet.id) });
  };

  const send = async (question: string, retryOf?: number) => {
    if (!pet || sending) return;
    const q = question.trim();
    if (!q || q.length > MAX_QUESTION) return;
    setError(null);
    setUnavailable(false);
    if (cancelPending()) setMessages((ms) => [...ms, { kind: "notice", id: nextId(), text: "이전 일정 요청은 취소했어요" }]);
    let userId = retryOf;
    if (retryOf) setMessages((ms) => ms.map((m) => (m.id === retryOf && m.kind === "user" ? { ...m, failed: false } : m)));
    else {
      userId = nextId();
      const id = userId;
      setMessages((ms) => [...ms, { kind: "user", id, text: q }]);
      setText("");
    }
    setSending(true);
    try {
      applyResponse(await chat.send(q, pet.id, threadId));
    } catch (e) {
      setMessages((ms) => ms.map((m) => (m.id === userId && m.kind === "user" ? { ...m, failed: true } : m)));
      if (e instanceof ApiError && e.status === 503) setUnavailable(true);
      else setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  const decide = async (msgId: number, decision: Decision) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || msg.kind !== "bot" || !msg.view.approval) return;
    const tid = msg.view.approval.threadId || threadId;
    if (!tid) return;
    const patch = (p: Partial<BotMsg>) =>
      setMessages((ms) => ms.map((m) => (m.id === msgId && m.kind === "bot" ? { ...m, ...p } : m)));
    patch({ status: "busy", error: null });
    try {
      const res = await chat.resume(tid, [decision]);
      patch({ status: decision.type === "reject" ? "rejected" : "approved" });
      setMessages((ms) => [...ms, { kind: "bot", id: nextId(), view: chatView(res, petsRef.current) }]);
      if (decision.type !== "reject" && pet) {
        void qc.invalidateQueries({ queryKey: qk.health(pet.id) });
        void qc.invalidateQueries({ queryKey: qk.notifications });
        void qc.invalidateQueries({ queryKey: ["tasks"] });
      }
    } catch (e) {
      const gone = e instanceof ApiError && (e.status === 403 || e.status === 404);
      patch(
        gone
          ? { status: "closed", error: "이미 처리되었거나 찾을 수 없는 요청이에요" }
          : { status: "pending", error: errorMessage(e) },
      );
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send(text);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void send(text);
    }
  };

  const newChat = () => {
    cancelPending();
    setMessages([]);
    setThreadId(null);
    loaded.current = null;
    navigate(link("/chat"));
  };

  const tooLong = text.length > MAX_QUESTION;
  const canSend = Boolean(pet) && !sending && text.trim().length > 0 && !tooLong;

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside aria-label="대화 기록" className="hidden w-sidebar shrink-0 lg:block">
        <h2 className="mb-2 text-body font-bold">대화 기록</h2>
        <ThreadList petId={pet?.id} activeId={threadId} />
      </aside>
      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="font-display text-title-1">{pet ? `${pet.name}와 상담` : "상담"}</h1>
          <div className="flex gap-2">
            <Link
              to={link("/chat/history")}
              className="inline-flex min-h-btn-sm items-center rounded-pill px-3 text-small font-bold lg:hidden"
            >
              <span aria-hidden="true">🗂</span>&nbsp;대화 기록
            </Link>
            <Button size="sm" variant="ghost" onClick={newChat}>
              <span aria-hidden="true">✎</span> 새 대화
            </Button>
          </div>
        </header>

        {messages.length === 0 && !sending && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Mascot species={species} size={96} decorative />
            <p className="text-body">무엇이든 물어봐 주세요. 식단·운동·건강 일정을 함께 챙겨 드릴게요.</p>
            <ul className="flex flex-wrap justify-center gap-2" aria-label="추천 질문">
              {SUGGESTIONS[species].map((s) => (
                <li key={s}>
                  <Button size="sm" variant="secondary" onClick={() => void send(s)} disabled={!pet || sending}>
                    {s}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <ol className="flex flex-col gap-4" aria-live="polite" aria-label="대화">
          {messages.map((m) => {
            if (m.kind === "user")
              return (
                <UserBubble
                  key={m.id}
                  text={m.text}
                  footer={
                    m.failed && (
                      <Button size="sm" variant="ghost" disabled={sending} onClick={() => void send(m.text, m.id)}>
                        다시 보내기
                      </Button>
                    )
                  }
                />
              );
            if (m.kind === "notice")
              return (
                <li key={m.id} className="text-center text-small text-muted">
                  {m.text}
                </li>
              );
            const v = m.view;
            return (
              <BotBubble
                key={m.id}
                species={species}
                mood={v.mood}
                tone={v.emergency ? "emergency" : "normal"}
                below={
                  <>
                    {v.approval && m.status && (
                      <ApprovalCard
                        approval={v.approval}
                        status={m.status}
                        error={m.error}
                        onApprove={() => void decide(m.id, { type: "approve" })}
                        onReject={() => void decide(m.id, { type: "reject" })}
                        onEdit={(due) =>
                          void decide(m.id, {
                            type: "edit",
                            edited_action: { name: v.approval!.tool, args: { ...v.approval!.args, due_date: due } },
                          })
                        }
                      />
                    )}
                    {v.isWeb && <SourcesBox sources={v.sources} />}
                    {v.preferenceSaved && (
                      <p className="text-small">
                        <span aria-hidden="true">💝</span> 취향에 저장했어요{" "}
                        <Link to={link("/preferences")} className="font-bold text-primary underline">
                          보기 ›
                        </Link>
                      </p>
                    )}
                    {v.switchTo && (
                      <Button size="sm" variant="secondary" onClick={() => select(v.switchTo!.petId)}>
                        {v.switchTo.name}(으)로 전환
                      </Button>
                    )}
                    <EvidencePanel contexts={v.contexts} steps={v.steps} />
                  </>
                }
              >
                {v.agentLabel && (
                  <p className="mb-1 text-caption text-muted">
                    <span aria-hidden="true">{v.agentIcon}</span> {v.agentLabel}가 답했어요
                  </p>
                )}
                {v.emergency && (
                  <p className="mb-1 font-bold">
                    <span aria-hidden="true">⚠️</span> 바로 동물병원에 연락해 주세요
                  </p>
                )}
                <PlainText text={v.text} />
              </BotBubble>
            );
          })}
          {sending && <ThinkingBubble species={species} />}
        </ol>

        <form onSubmit={onSubmit} className="flex flex-col gap-2" aria-label="질문 보내기">
          {unavailable && (
            <p role="alert" className="flex items-center gap-2 rounded-card bg-warning-bg p-3 text-small">
              <Mascot species={species} mood="sorry" size={24} decorative />
              잠시 후 다시 시도해 주세요
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-card bg-danger-bg p-3 text-small">
              {error}
            </p>
          )}
          {hasPending && (
            <p className="rounded-card bg-info-bg p-3 text-small">
              <span aria-hidden="true">ⓘ</span> 새로 질문하면 위 요청은 취소돼요
            </p>
          )}
          <label htmlFor="chat-input" className="sr-only">
            질문
          </label>
          <textarea
            id="chat-input"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={pet ? `${pet.name}에 대해 물어보세요` : "반려동물을 먼저 등록해 주세요"}
            aria-describedby="chat-help chat-count"
            aria-invalid={tooLong || undefined}
            className="w-full resize-none rounded-input bg-surface px-4 py-3 text-body [border:var(--border-input)_solid_var(--color-border)]"
          />
          <div className="flex items-center justify-between gap-2">
            <p id="chat-help" className="text-caption text-muted">
              전화번호·주소 같은 개인정보는 입력하지 않아도 돼요
            </p>
            <span id="chat-count" className={`tabular text-caption ${tooLong ? "text-danger" : "text-muted"}`}>
              {text.length.toLocaleString("ko-KR")} / {MAX_QUESTION.toLocaleString("ko-KR")}
            </span>
          </div>
          <Button type="submit" disabled={!canSend} loading={sending} className="self-end">
            보내기
          </Button>
        </form>
      </section>
    </div>
  );
}
