"""화면 시나리오 중 Agent가 필요한 검증 포인트를 실제 서버로 확인한다 (phase4_task.md E-2c).

    python -m evaluation.scenario_check --run <실행 id> --phase main     # S01·S05·S09(초코 포함)·S10·S13·S16(1)·S21
    (Agent 서버 재시작)
    python -m evaluation.scenario_check --run <실행 id> --phase s16b     # S16 재시작 후 이어서 대화·삭제

Backend(`EVAL_BACKEND_URL`) `/api/*`로 시드 계정에 로그인해 화면과 같은 경로로 호출한다.
결과는 `evaluation/results/<실행 id>/scenario_check.json` (마스킹된 값만, 판정 근거 발췌).
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Any

import httpx

from evaluation.dataset import DEFAULT_TODAY, load_catalog, load_seed
from evaluation.judges import catalog_ids_in, sub_agent_handoffs, tool_calls
from evaluation.run_eval import RESULTS_DIR, RunStore, backend_url, env, secret_values, seed_reset

USERS = {"P1": "usr_1c3544ae18bc", "P2": "usr_a80678fb2f7a", "P3": "usr_69d308a849e0", "P4": "usr_d6eff68d8ef0"}
CHAT_TIMEOUT = 120


def login(user_id: str) -> httpx.Client:
    email = next(u["email"] for u in load_seed("users") if u["id"] == user_id)
    c = httpx.Client(base_url=backend_url(), timeout=CHAT_TIMEOUT)
    r = c.post("/api/auth/login", json={"email": email, "password": env("EVAL_DEMO_PASSWORD")})
    r.raise_for_status()
    return c


def chat(c: httpx.Client, pet_id: str, question: str, thread_id: str | None = None) -> dict[str, Any]:
    body: dict[str, Any] = {"question": question, "petId": pet_id}
    if thread_id:
        body["threadId"] = thread_id
    r = c.post("/api/chat", json=body)
    r.raise_for_status()
    return r.json()


def _check(name: str, ok: bool, evidence: Any) -> dict[str, Any]:
    print(f"  {'✔' if ok else '✘'} {name}", flush=True)
    return {"check": name, "passed": bool(ok), "evidence": evidence}


def s01() -> list[dict[str, Any]]:
    """가입 → 두부 등록 → 첫 할 일 조회 (실제 /tasks/generate). 비밀번호는 실행 때마다 무작위로 만든다."""
    import secrets
    import time

    seed_reset(None, DEFAULT_TODAY)
    c = httpx.Client(base_url=backend_url(), timeout=CHAT_TIMEOUT)
    c.post("/api/auth/signup", json={"email": "newbie@demo.dailypet", "password": secrets.token_urlsafe(12),
                                     "nickname": "새봄"}).raise_for_status()
    pet = c.post("/api/pets", json={"name": "두부", "species": "dog", "birth_date": "2026-08-01", "weight_kg": 2.0,
                                    "breed": "말티즈", "sex": "male", "size": "small"}).json()
    t0 = time.perf_counter()
    tasks = c.get(f"/api/pets/{pet['id']}/tasks").json()["tasks"]
    ms = round((time.perf_counter() - t0) * 1000, 1)
    catalog = load_catalog()
    items = [t for t in tasks if t.get("category") in ("diet", "activity")]
    junior = all("junior" in catalog.get(t.get("catalog_item_id"), {}).get("age_groups", []) for t in items)
    cats = {t["category"] for t in items}
    c.post("/api/auth/logout")
    after = c.get("/api/pets").status_code
    return [
        _check("S01 자동 생성 할 일이 모두 카탈로그 ID + junior, 식단·활동 각 1개 이상",
               bool(items) and junior and {"diet", "activity"} <= cats,
               [t.get("catalog_item_id") for t in items]),
        _check("S01 첫 할 일 조회(Backend → /tasks/generate) 1초 이내", ms < 1000, {"ms": ms}),
        _check("S01 로그아웃 후 /api/pets 401", after == 401, {"status": after}),
    ]


def s05() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P3"])
    before = sorted(t["id"] for t in c.get("/api/pets/pet_bori/tasks").json()["tasks"])
    c.post("/api/pets/pet_bori/weights", json={"date": DEFAULT_TODAY, "weight_kg": 33.2}).raise_for_status()
    res = chat(c, "pet_bori", "보리 하루에 얼마나 먹여야 해?")
    calc = tool_calls(res["trace"], "calc_daily_calories")
    weights = [a.get("args", {}).get("weight_kg") for a in calc]
    after = sorted(t["id"] for t in c.get("/api/pets/pet_bori/tasks").json()["tasks"])
    ans = res["answer"]
    return [
        # calc_daily_calories는 인자가 없으면 프로필 체중을 쓴다 → 인자 또는 답변의 체중으로 확인
        _check("S05 calc_daily_calories가 33.2kg 기준 (34.0 아님)",
               bool(calc) and (33.2 in weights or ("33.2" in ans and "34.0kg" not in ans)),
               {"calc_args": [a.get("args") for a in calc], "answer": ans[:160]}),
        _check("S05 답변에 하루 kcal과 끼니별 가이드", "kcal" in ans and any(k in ans for k in ("끼니", "하루 2회", "회 나눠", "회로 나눠")),
               ans[:300]),
        _check("S05 체중 기록·채팅 후 오늘 tasks 그대로", before == after, {"before": len(before), "after": len(after)}),
    ]


def s09() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P3"])
    res = chat(c, "pet_bori", "보리랑 나비 각각 하루에 물을 얼마나 줘야 해?")
    ids = catalog_ids_in(res["answer"])
    res2 = chat(c, "pet_bori", "나비 검진 일정 잡아줘", res.get("thread_id"))
    interrupts = [e for e in res2["trace"] if e.get("type") == "interrupt" and e.get("status") != "cancelled"]
    # 예외 흐름: 등록되지 않은 이름 → "찾지 못했다"는 뜻이면 통과 (문구는 모델이 만든다)
    res3 = chat(c, "pet_bori", "초코 산책은 얼마나 시켜야 해?")
    a3 = res3["answer"]
    return [
        _check("S09 등록되지 않은 이름 '초코' → 찾지 못했다는 안내",
               "초코" in a3 and any(k in a3 for k in ("찾지 못", "등록되지 않", "등록된 반려동물", "없어요", "목록에 없")), a3[:200]),
        _check("S09 보리·나비 각각 답함 (같은 사용자 소유 조회)", "보리" in res["answer"] and "나비" in res["answer"],
               {"ids": ids, "tools": [e.get("tool") for e in tool_calls(res["trace"])]}),
        _check("S09 선택 안 된 나비 쓰기 요청 → interrupt 없음 + 선택 안내",
               not interrupts and "나비" in res2["answer"] and "선택" in res2["answer"], res2["answer"][:200]),
    ]


def s10() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P4"])

    def senior_due() -> str | None:
        body = c.get("/api/pets/pet_hodu/health-events").json()  # {needs_history, upcoming, done} (routes/health.js)
        evs = [e for k in ("needs_history", "upcoming", "done") for e in body.get(k, [])]
        return next((e["due_date"] for e in evs if e["id"] == "evt_hodu_senior"), None)

    d0 = senior_due()
    res = chat(c, "pet_hodu", "호두 노령 검진 다음 달 3일로 바꿔줘")
    intr = [e for e in res["trace"] if e.get("type") == "interrupt" and e.get("tool") == "update_health_event"]
    args = intr[0].get("args", {}) if intr else {}
    d1 = senior_due()
    out = [
        _check("S10 update_health_event interrupt (새 일정이 아니라 evt_hodu_senior 수정)",
               bool(intr) and args.get("event_id") == "evt_hodu_senior", args),
        _check("S10 '다음 달 3일' → 2026-12-03", args.get("due_date") == "2026-12-03", args),
        _check("S10 승인 전 health_events 그대로", d0 == d1 == "2026-12-07", {"before": d0, "pending": d1}),
    ]
    if intr:
        r = c.post("/api/chat/resume", json={"threadId": res["thread_id"], "decisions": [{"type": "approve"}]})
        out.append(_check("S10 승인 후 due_date 2026-12-03", r.status_code == 200 and senior_due() == "2026-12-03",
                          {"status": r.status_code, "due": senior_due()}))
    return out


def s13() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P1"])
    res = chat(c, "pet_kongi", "어질리티가 뭐야?")
    return [_check("S13 정보 질문 '어질리티가 뭐야?' → general_agent", "general_agent" in sub_agent_handoffs(res["trace"]),
                   {"handoffs": sub_agent_handoffs(res["trace"])})]


def s21() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P3"])
    res = chat(c, "pet_bori", "보리는 연어를 엄청 좋아해. 그리고 수영은 싫어해")
    remembers = tool_calls(res["trace"], "remember_preference")
    prefs = c.get("/api/pets/pet_bori/preferences").json()
    dislikes = [p["target"] for p in prefs["dislike"]]
    likes = [p["target"] for p in prefs["like"]]
    res2 = chat(c, "pet_bori", "보리 운동 추천해줘")
    rec = [i for e in res2["trace"] if e.get("type") == "tool_result" and e.get("tool") == "recommend_from_catalog"
           for i in (e.get("item_ids") or [])]
    c.delete("/api/pets/pet_bori/preferences").raise_for_status()
    after = c.get("/api/pets/pet_bori/preferences").json()
    pet_rows = [p for k in ("like", "dislike", "constraint") for p in after[k] if p.get("scope") == "pet"]
    return [
        _check("S21 1단계 remember_preference 2건 + 저장 알림", len(remembers) == 2 and any(k in res["answer"] for k in ("기억", "저장")),  # 저장 사실 알림 (ARCHITECTURE.md 3.3)
               {"args": [r.get("args") for r in remembers], "answer": res["answer"][:200]}),
        _check("S21 수영은 act_dog_swimming_01로, 연어는 자유 텍스트로 저장", "act_dog_swimming_01" in dislikes and "연어" in likes,
               {"dislike": dislikes, "like": likes}),
        _check("S21 2단계 추천에 act_dog_swimming_01 없음",
               "act_dog_swimming_01" not in rec and "act_dog_swimming_01" not in res2["answer"], {"item_ids": rec}),
        _check("S21 연어 레시피 등 카탈로그 밖 추천 없음", all(i.startswith("act_") for i in catalog_ids_in(res2["answer"])),
               catalog_ids_in(res2["answer"])),
        _check("S21 4단계 전체 초기화 후 보리 취향 빈 목록 (공통 제약 제외)", not pet_rows and not after["frequent"],
               {"remaining_scopes": [p.get("scope") for k in ("like", "dislike", "constraint") for p in after[k]]}),
    ]


def s16a() -> list[dict[str, Any]]:
    seed_reset(None, DEFAULT_TODAY)
    c = login(USERS["P3"])
    res = chat(c, "pet_bori", "보리 간식 추천해줘")
    tid = res["thread_id"]
    bori = [t.get("thread_id") or t.get("id") for t in _threads(c, "pet_bori")]
    nabi = [t.get("thread_id") or t.get("id") for t in _threads(c, "pet_nabi")]
    return [
        _check("S16 1단계 보리 대화 목록에 S06 대화", tid in bori, {"thread": tid[-8:]}),
        _check("S16 나비 대화 목록에 보리 대화 없음", tid not in nabi, {"nabi_count": len(nabi)}),
        {"check": "_thread", "passed": True, "evidence": tid},
    ]


def _threads(c: httpx.Client, pet_id: str) -> list[dict[str, Any]]:
    data = c.get(f"/api/pets/{pet_id}/threads").json()
    return data.get("threads", data) if isinstance(data, dict) else data


def s16b(thread_id: str) -> list[dict[str, Any]]:
    c = login(USERS["P3"])
    res = chat(c, "pet_bori", "그럼 호박은 얼마나 줘?", thread_id)
    ans = res["answer"]
    d = c.delete(f"/api/threads/{thread_id}")
    from evaluation.run_eval import agent_url

    r = httpx.post(f"{agent_url()}/query/resume", json={"user_id": USERS["P3"], "thread_id": thread_id,
                                                         "decisions": [{"type": "approve"}]},
                   headers={"X-Agent-Api-Key": env("AGENT_API_KEY")}, timeout=30)
    rb = c.post("/api/chat/resume", json={"threadId": thread_id, "decisions": [{"type": "approve"}]})  # 화면 경로
    listed = [t.get("thread_id") or t.get("id") for t in _threads(c, "pet_bori")]
    return [
        _check("S16 3단계 Agent 재시작 후 같은 thread로 호박·간식 맥락 유지",
               res.get("thread_id") == thread_id and "호박" in ans and any(k in ans for k in ("간식", "토핑", "10%", "감량")),
               ans[:250]),
        _check("S16 4단계 삭제 후 목록에서 사라짐", d.status_code in (200, 204) and thread_id not in listed,
               {"delete": d.status_code, "listed": len(listed)}),
        _check("S16 4단계 삭제 후 /query/resume 409 (대기 작업 없음)", r.status_code == 409 and rb.status_code == 409,
               {"agent": r.status_code, "backend": rb.status_code}),
    ]


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="python -m evaluation.scenario_check")
    ap.add_argument("--run", required=True)
    ap.add_argument("--phase", choices=("main", "s16b"), default="main")
    args = ap.parse_args(argv)
    store = RunStore(args.run, secret_values())
    path = RESULTS_DIR / args.run / "scenario_check.json"
    data: dict[str, Any] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    if args.phase == "main":
        for name, fn in (("S01", s01), ("S05", s05), ("S09", s09), ("S10", s10), ("S13", s13), ("S21", s21), ("S16a", s16a)):
            print(name, flush=True)
            try:
                data[name] = fn()
            except Exception as exc:  # 한 시나리오 실패가 나머지를 막지 않게
                data[name] = [_check(f"{name} 실행", False, f"{type(exc).__name__}: {str(exc)[:200]}")]
    else:
        tid = next(c["evidence"] for c in data["S16a"] if c["check"] == "_thread")
        print("S16b", flush=True)
        data["S16b"] = s16b(tid)
    store.write_json("scenario_check.json", data)
    checks = [c for v in data.values() for c in v if not c["check"].startswith("_")]
    print(f"{sum(c['passed'] for c in checks)}/{len(checks)} 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
