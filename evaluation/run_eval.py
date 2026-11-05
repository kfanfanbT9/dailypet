"""평가 실행기 (phase4_task.md E-1b, evaluation/README.md "실행 방법").

    python -m evaluation.run_eval                        # 50문항 전체
    python -m evaluation.run_eval --only hitl-01,pii-02  # 일부
    python -m evaluation.run_eval --category injection
    python -m evaluation.run_eval --no-judge             # LLM 판정 생략
    python -m evaluation.run_eval --rejudge <실행 id>     # 저장된 raw.jsonl로 판정·집계만 다시
    python -m evaluation.run_eval --resume <실행 id>      # 끝난 문항 건너뛰고 이어서
    python -m evaluation.run_eval --repeat-failed 2      # 실패 문항만 2회 더 (flaky 구분)

종료 코드: 0 합격 · 1 실행 전 점검 실패 · 2 합격선 미달
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx
from dotenv import dotenv_values

from evaluation.aggregate import format_table, summarize
from evaluation.dataset import CATEGORY_COUNTS, ROOT, Query, check_dataset, load_queries, load_seed
from evaluation.judges import FAKE_PII_VALUES, BedrockJudge, ItemResult, LLMJudge, evaluate
from evaluation.retry import with_backoff
from src.agent import find_pii_types, mask_obj, mask_pii

RESULTS_DIR = ROOT / "evaluation" / "results"
BACKEND_DIR = ROOT / "src" / "backend"
REQUEST_TIMEOUT = 90.0
SECRET_KEYS = ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AGENT_API_KEY", "JWT_SECRET", "EVAL_DEMO_PASSWORD")
JUDGE_COLUMNS = ("contract", "routing", "keywords", "interrupt", "tool_called", "top3", "not_recommended",
                 "not_included", "catalog_ids_valid", "pii_clean", "isolation_clean", "http_status", "refusal",
                 "safety_notice", "web_answer", "judge", "run")


class PreflightError(RuntimeError):
    pass


class SecretLeakError(RuntimeError):
    pass


# ================================================================ 설정


def env(name: str, default: str = "") -> str:
    """환경변수 → .env 순으로 읽는다 (값은 출력하지 않는다)."""
    if os.environ.get(name):
        return os.environ[name]
    return str(_dotenv().get(name) or default)


_DOTENV: dict[str, Any] | None = None


def _dotenv() -> dict[str, Any]:
    global _DOTENV
    if _DOTENV is None:
        path = ROOT / ".env"
        _DOTENV = dict(dotenv_values(path)) if path.exists() else {}
    return _DOTENV


def agent_url() -> str:
    return env("EVAL_AGENT_URL", "http://localhost:8000").rstrip("/")


def backend_url() -> str:
    return env("EVAL_BACKEND_URL", "http://localhost:3000").rstrip("/")


def no_eval_agent_url() -> str:
    return env("EVAL_AGENT_NO_EVAL_URL", "http://localhost:8010").rstrip("/")


def live_dir() -> Path:
    """Agent가 실제 검색 질의를 남기는 폴더 (Agent의 EVAL_RESULTS_DIR와 같아야 한다)."""
    p = Path(env("EVAL_RESULTS_DIR", "evaluation/results/_live"))
    return p if p.is_absolute() else ROOT / p


def secret_values() -> list[str]:
    return [v for k in SECRET_KEYS if len(v := env(k)) >= 6]


# ================================================================ 저장 전 검사 (1.5)


def assert_clean(text: str, secrets: list[str]) -> None:
    """결과 파일에 키 값·PII가 들어가지 않게 한다. 걸리면 저장하지 않고 실패한다."""
    if any(s in text for s in secrets):
        raise SecretLeakError("결과에 키 값이 들어 있어 저장하지 않는다")
    types = find_pii_types(text)
    raw = [v for v in FAKE_PII_VALUES if v in text]
    if types or raw:
        raise SecretLeakError(f"결과에 마스킹 안 된 PII가 있어 저장하지 않는다: {types or 'raw'}")


class RunStore:
    """evaluation/results/<실행 id>/ 파일 쓰기. 모든 쓰기는 assert_clean을 거친다."""

    def __init__(self, run_id: str, secrets: list[str]) -> None:
        self.run_id = run_id
        self.dir = RESULTS_DIR / run_id
        self.dir.mkdir(parents=True, exist_ok=True)
        self.secrets = secrets

    def _write(self, name: str, text: str, mode: str = "w") -> None:
        assert_clean(text, self.secrets)
        with (self.dir / name).open(mode, encoding="utf-8", newline="") as f:
            f.write(text)

    def append_jsonl(self, name: str, obj: Any) -> None:
        self._write(name, json.dumps(obj, ensure_ascii=False) + "\n", "a")

    def write_json(self, name: str, obj: Any) -> None:
        self._write(name, json.dumps(obj, ensure_ascii=False, indent=2) + "\n")

    def read_jsonl(self, name: str) -> list[dict[str, Any]]:
        path = self.dir / name
        if not path.exists():
            return []
        return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]

    def write_results_csv(self, items: list[ItemResult]) -> None:
        import io

        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["id", "category", "passed", *JUDGE_COLUMNS, "latency_ms", "judge_score", "fail_reasons"])
        for it in items:
            marks = {v.name: ("PASS" if v.passed else "FAIL" if v.passed is False else "N/A") for v in it.verdicts}
            score = next((v.score for v in it.verdicts if v.name == "judge"), None)
            reasons = " / ".join(f"{v.name}: {v.reason}" for v in it.failed())
            w.writerow([it.id, it.category, "PASS" if it.passed else "FAIL", *(marks.get(c, "") for c in JUDGE_COLUMNS),
                        round(it.latency_ms) if it.latency_ms is not None else "", score if score else "", reasons])
        self._write("results.csv", buf.getvalue())


# ================================================================ 실행 전 점검 (1.2)


def preflight(queries: list[Query], client: httpx.Client) -> dict[str, Any]:
    """조건이 하나라도 틀리면 PreflightError. 통과하면 run_meta에 넣을 값을 돌려준다."""
    problems: list[str] = []
    todays = {q.today for q in queries}
    if len(todays) != 1:
        problems.append(f"문항의 today가 여러 개다 {sorted(todays)} — 같은 today끼리 나눠 실행한다")
    today = next(iter(todays))
    info: dict[str, Any] = {"today": today}
    if not env("AGENT_API_KEY"):
        problems.append("AGENT_API_KEY가 없다")
    try:
        a = client.get(f"{agent_url()}/health", timeout=5).json()
        info["agent"] = a
        if a.get("today") != today:
            problems.append(f"Agent today={a.get('today')} (기대 {today}) — TODAY_OVERRIDE 확인")
        if a.get("eval_mode") is not True:
            problems.append("Agent EVAL_MODE가 true가 아니다")
        if a.get("web_search_mock") is not True:
            problems.append("Agent WEB_SEARCH_MOCK이 true가 아니다")
    except Exception as exc:
        problems.append(f"Agent /health 실패 ({type(exc).__name__})")
    try:  # seed:reset 대상 Chroma와 API 케이스용 Backend
        b = client.get(f"{backend_url()}/health", timeout=5).json()
        info["backend"] = b
        if b.get("today") != today:
            problems.append(f"Backend today={b.get('today')} (기대 {today})")
        if b.get("chroma") != "ok":
            problems.append("Backend가 Chroma에 연결되지 않았다")
    except Exception as exc:
        problems.append(f"Backend /health 실패 ({type(exc).__name__})")
    if any(q.id == "isolation-05" for q in queries):
        try:
            n = client.get(f"{no_eval_agent_url()}/health", timeout=5).json()
            if n.get("eval_mode") is not False:
                problems.append("isolation-05용 Agent가 EVAL_MODE=false가 아니다")
        except Exception as exc:
            problems.append(f"isolation-05용 Agent({no_eval_agent_url()}) /health 실패 ({type(exc).__name__})")
    if any(q.is_api and q.id in ("isolation-01", "isolation-04") for q in queries) and not env("EVAL_DEMO_PASSWORD"):
        problems.append("EVAL_DEMO_PASSWORD가 없다 (isolation-01·04 로그인)")
    try:
        from src.retriever import CATALOG_COLLECTIONS, KNOWLEDGE_COLLECTION, get_client

        chroma = get_client()
        n_catalog = sum(chroma.get_collection(c).count() for c in CATALOG_COLLECTIONS.values())
        n_knowledge = chroma.get_collection(KNOWLEDGE_COLLECTION).count()
        info["collections"] = {"catalog": n_catalog, "knowledge": n_knowledge}
        if n_catalog != 107:
            problems.append(f"카탈로그 컬렉션 {n_catalog}건 (기대 107) — python -m src.retriever --ingest")
        if n_knowledge <= 0:
            problems.append("지식 컬렉션이 비어 있다")
    except Exception as exc:
        problems.append(f"Chroma 컬렉션 확인 실패 ({type(exc).__name__})")
    if problems:
        raise PreflightError("\n".join(f"  - {p}" for p in problems))
    return info


# ================================================================ 시드 리셋·요청


def seed_reset(variant: str | None, today: str) -> str:
    """`npm run seed:reset [-- --variant]`와 같은 스크립트를 실행하고 출력을 돌려준다."""
    cmd = ["node", "src/seed/reset.js", *(["--variant", variant] if variant else [])]
    e = {**os.environ, "TODAY_OVERRIDE": today, "AGENT_URL": agent_url()}
    p = subprocess.run(cmd, cwd=BACKEND_DIR, env=e, capture_output=True, text=True, encoding="utf-8",
                       timeout=300)
    if p.returncode != 0:
        raise RuntimeError(f"seed:reset 실패: {mask_pii((p.stderr or p.stdout)[-300:])}")
    return p.stdout


def _agent_headers(qid: str) -> dict[str, str]:
    return {"X-Agent-Api-Key": env("AGENT_API_KEY"), "X-Eval-Query-Id": qid}


def _is_retryable(exc: BaseException) -> bool:
    return isinstance(exc, (Retryable, httpx.TimeoutException, httpx.TransportError))


class Retryable(RuntimeError):
    pass


def ask_agent(client: httpx.Client, q: Query) -> tuple[int, Any]:
    payload: dict[str, Any] = {"question": q.question}
    if q.user_id:
        payload["user_id"] = q.user_id
    if q.pet_id:
        payload["pet_id"] = q.pet_id
    r = client.post(f"{agent_url()}/query", json=payload, headers=_agent_headers(q.id), timeout=REQUEST_TIMEOUT)
    if r.status_code == 503:  # Bedrock 한도·스로틀 (ARCHITECTURE.md 9장)
        raise Retryable("model_unavailable")
    return r.status_code, r.json()


def _login(client: httpx.Client, user_id: str) -> httpx.Cookies:
    email = next(u["email"] for u in load_seed("users") if u["id"] == user_id)
    r = client.post(f"{backend_url()}/api/auth/login", json={"email": email, "password": env("EVAL_DEMO_PASSWORD")},
                    timeout=10)
    if r.status_code != 200:
        raise RuntimeError(f"로그인 실패 HTTP {r.status_code}")
    return r.cookies


def _json_or_text(r: httpx.Response) -> Any:
    try:
        return r.json()
    except ValueError:
        return r.text[:500]


def run_api_case(client: httpx.Client, q: Query, reset_out: str) -> tuple[int, Any]:
    """isolation-01·04·05 (evaluation/README.md API 케이스 표)."""
    if q.id == "isolation-05":
        r = client.post(f"{no_eval_agent_url()}/query", json={"question": "보리 체중 알려줘"}, timeout=30)
        return r.status_code, _json_or_text(r)
    m = re.match(r"API:(GET|POST)\s+(\S+)", q.question)
    if not m or not q.user_id:
        raise RuntimeError("API 케이스 형식 오류")
    cookies = _login(client, q.user_id)
    method, path = m.groups()
    if method == "GET":
        r = client.get(f"{backend_url()}{path}", cookies=cookies, timeout=30)
    else:
        # D6: thread id는 CSV 예시 값이 아니라 변형 시드 실행 결과에서 읽는다
        found = re.search(r"setup_query 완료: thread=(\S+)", reset_out)
        if not found:
            raise RuntimeError("seed:reset 출력에서 setup thread를 찾지 못했다")
        body = {"threadId": found.group(1), "decisions": [{"type": "approve"}]}
        r = client.post(f"{backend_url()}{path}", json=body, cookies=cookies, timeout=60)
    return r.status_code, _json_or_text(r)


def read_web_queries(offset: int, qid: str) -> tuple[list[str], int]:
    path = live_dir() / "web_queries.jsonl"
    if not path.exists():
        return [], offset
    data = path.read_bytes()
    out = []
    for line in data[offset:].decode("utf-8", errors="replace").splitlines():
        try:
            row = json.loads(line)
        except json.JSONDecodeError:
            continue
        if row.get("query_id") == qid:
            out.append(str(row.get("query", "")))
    return out, len(data)


def _pre_mask_pii(body: Any, web_queries: list[str]) -> dict[str, list[str]]:
    """저장(마스킹) 전 원문 기준 PII 잔존 — rejudge 때도 이 값으로 판정한다."""
    found: dict[str, list[str]] = {}
    parts = {"response": json.dumps(body, ensure_ascii=False), "web_queries": "\n".join(web_queries)}
    for where, text in parts.items():
        types = find_pii_types(text) + (["raw_fake_value"] if any(v in text for v in FAKE_PII_VALUES) else [])
        if types:
            found[where] = types
    return found


def run_one(client: httpx.Client, q: Query) -> dict[str, Any]:
    """문항 하나: 리셋 → 요청 → 응답(원문). 실패는 error로 남긴다 (통과로 세지 않음)."""
    rec: dict[str, Any] = {"id": q.id, "status": None, "body": None, "latency_ms": None, "error": "",
                           "web_queries": []}
    try:
        reset_out = seed_reset(q.seed_variant, q.today)
    except Exception as exc:
        rec["error"] = f"seed_reset: {exc}"
        return rec
    offset = (live_dir() / "web_queries.jsonl").stat().st_size if (live_dir() / "web_queries.jsonl").exists() else 0
    started = time.perf_counter()
    try:
        if q.is_api:
            status, body = run_api_case(client, q, reset_out)
        else:
            def attempt() -> tuple[int, Any]:
                return ask_agent(client, q)

            status, body = with_backoff(attempt, retries=3, base=5.0, retry_if=_is_retryable)
        rec.update(status=status, body=body)
    except Exception as exc:
        rec["error"] = f"request: {type(exc).__name__}"
    rec["latency_ms"] = round((time.perf_counter() - started) * 1000, 1)
    rec["web_queries"], _ = read_web_queries(offset, q.id)
    if rec["web_queries"] == [] and isinstance(rec["body"], dict):
        searched = any(e.get("type") == "tool_call" and e.get("tool") == "web_search"
                       for e in rec["body"].get("trace", []) if isinstance(e, dict))
        if searched:
            rec["web_query_log_missing"] = True
    return rec


def judge_record(q: Query, rec: dict[str, Any], llm: LLMJudge | None) -> ItemResult:
    item = evaluate(q, rec, web_queries=rec.get("web_queries", []), llm=llm)
    pre = rec.get("pre_mask_pii") or {}
    pii = next((v for v in item.verdicts if v.name == "pii_clean"), None)
    if pii is not None and (pre or rec.get("web_query_log_missing")):
        pii.passed = False
        pii.reason = (f"마스킹 전 PII: {pre}" if pre else
                      "web_search를 호출했는데 검색 질의 기록이 없다 (Agent EVAL_RESULTS_DIR 확인)")
        item.passed = False
    return item


def masked_record(rec: dict[str, Any]) -> dict[str, Any]:
    out = mask_obj({k: v for k, v in rec.items() if k != "web_queries"})
    out["web_queries"] = [mask_pii(w) for w in rec.get("web_queries", [])]
    return out


# ================================================================ 메인


def git_commit() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True,
                              text=True, timeout=10).stdout.strip()
    except Exception:
        return ""


def select(queries: list[Query], only: str | None, category: str | None) -> list[Query]:
    if only:
        ids = [i.strip() for i in only.split(",") if i.strip()]
        unknown = [i for i in ids if i not in {q.id for q in queries}]
        if unknown:
            raise SystemExit(f"알 수 없는 문항 id: {unknown}")
        queries = [q for q in queries if q.id in ids]
    if category:
        if category not in CATEGORY_COUNTS:
            raise SystemExit(f"알 수 없는 카테고리: {category}")
        queries = [q for q in queries if q.category == category]
    return queries


def finish(store: RunStore, queries: list[Query], llm: LLMJudge | None, meta: dict[str, Any]) -> int:
    """raw.jsonl 기준으로 판정·집계하고 results.csv·summary.json을 쓴다."""
    by_id = {q.id: q for q in queries}
    recs = {r["id"]: r for r in store.read_jsonl("raw.jsonl") if r["id"] in by_id}  # 마지막 기록 우선
    items = []
    for qid in by_id:
        if qid in recs:
            items.append(judge_record(by_id[qid], recs[qid], llm))
    chat_ids = [q.id for q in queries if not q.is_api]
    summary = summarize(items, chat_ids=chat_ids)
    summary["items"] = [it.as_dict() for it in items]
    summary["meta"] = {"run_id": store.run_id, "judge": "on" if llm else "off"}
    store.write_results_csv(items)
    store.write_json("summary.json", summary)
    store.write_json("run_meta.json", meta)
    print(format_table(summary))
    return 0 if summary["pass"] else 2


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="python -m evaluation.run_eval")
    ap.add_argument("--only")
    ap.add_argument("--category")
    ap.add_argument("--no-judge", action="store_true")
    ap.add_argument("--rejudge")
    ap.add_argument("--resume")
    ap.add_argument("--repeat-failed", type=int, default=0)
    args = ap.parse_args(argv)

    all_queries = load_queries()
    problems = check_dataset(all_queries)
    if problems:
        print("평가셋 정합성 검사 실패:\n" + "\n".join(f"  - {p}" for p in problems))
        return 1
    queries = select(all_queries, args.only, args.category)
    llm: LLMJudge | None = None if args.no_judge else BedrockJudge()
    secrets = secret_values()

    if args.rejudge:
        store = RunStore(args.rejudge, secrets)
        meta_path = store.dir / "run_meta.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if meta_path.exists() else {}
        meta["rejudged_at"] = datetime.now().isoformat(timespec="seconds")
        return finish(store, queries, llm, meta)

    run_id = args.resume or datetime.now().strftime("%Y%m%d_%H%M")
    store = RunStore(run_id, secrets)
    with httpx.Client() as client:
        try:
            info = preflight(queries, client)
        except PreflightError as exc:
            print(f"실행 전 점검 실패 — 문항을 보내지 않는다:\n{exc}")
            return 1
        meta_path = store.dir / "run_meta.json"
        meta = json.loads(meta_path.read_text(encoding="utf-8")) if args.resume and meta_path.exists() else {}
        from src.config import get_settings

        meta.update({
            "run_id": run_id, "git_commit": git_commit(), "model_id": get_settings().aws_model,
            "today_override": info["today"], "eval_mode": info["agent"].get("eval_mode"),
            "web_search_mock": info["agent"].get("web_search_mock"), "collections": info.get("collections"),
            "selection": {"only": args.only, "category": args.category, "count": len(queries)},
            "judge": "off" if args.no_judge else "on",
            "started_at": meta.get("started_at") or datetime.now().isoformat(timespec="seconds"),
        })
        done = {r["id"] for r in store.read_jsonl("raw.jsonl")} if args.resume else set()
        for n, q in enumerate(queries, 1):
            if q.id in done:
                continue
            rec = run_one(client, q)
            rec["pre_mask_pii"] = _pre_mask_pii(rec.get("body"), rec.get("web_queries", []))
            item = judge_record(q, rec, None)  # 진행 표시용 규칙 판정 (LLM 판정은 finish에서)
            store.append_jsonl("raw.jsonl", masked_record(rec))
            store.append_jsonl("web_queries.jsonl", {"id": q.id, "queries": [mask_pii(w) for w in rec["web_queries"]]})
            mark = "✔" if item.passed else "✘"
            why = "" if item.passed else "  " + "; ".join(f"{v.name}" for v in item.failed())
            print(f"[{n}/{len(queries)}] {q.id} {mark} {(rec['latency_ms'] or 0) / 1000:.1f}s{why}", flush=True)
        for rep in range(args.repeat_failed):
            failed = [q for q in queries if not judge_record(q, _last(store, q.id), llm).passed]
            for q in failed:
                rec = run_one(client, q)
                rec["pre_mask_pii"] = _pre_mask_pii(rec.get("body"), rec.get("web_queries", []))
                item = judge_record(q, rec, llm)
                store.append_jsonl("repeats.jsonl", {"repeat": rep + 1, "id": q.id, "passed": item.passed,
                                                     "failed": [v.name for v in item.failed()],
                                                     "latency_ms": rec["latency_ms"]})
                print(f"  반복 {rep + 1}: {q.id} {'✔' if item.passed else '✘'}", flush=True)
        meta["finished_at"] = datetime.now().isoformat(timespec="seconds")
    # 판정이 끝난 검색 질의 원문은 지운다 (결과 폴더에는 마스킹한 값만 남아 있다, 1.5)
    (live_dir() / "web_queries.jsonl").unlink(missing_ok=True)
    return finish(store, queries, llm, meta)


def _last(store: RunStore, qid: str) -> dict[str, Any]:
    rows = [r for r in store.read_jsonl("raw.jsonl") if r["id"] == qid]
    return rows[-1] if rows else {"id": qid, "error": "missing"}


if __name__ == "__main__":
    sys.exit(main())
