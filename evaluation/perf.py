"""성능 측정 (phase4_task.md E-1 "성능 측정", SERVICE.md 7장, S22).

    python -m evaluation.perf --run <실행 id>

- 일반 API: 시드 리셋 후 P1(김하늘, 콩이)로 로그인해 4개 API를 각 20회 → p95 ≤ 500ms
- `/tasks/generate`: Agent에 직접 20회 → p95 < 1초 (LLM 호출 없음)
- 채팅 p95: 같은 실행의 summary.json(run_eval latency)에서 가져온다 (≤ 30초)
결과는 `evaluation/results/<실행 id>/perf.json`.
"""

from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any

import httpx

from evaluation.aggregate import percentile
from evaluation.dataset import DEFAULT_TODAY, load_seed
from evaluation.run_eval import RESULTS_DIR, RunStore, agent_url, backend_url, env, secret_values, seed_reset

P1_USER, P1_PET = "usr_1c3544ae18bc", "pet_kongi"
N = 20
API_P95_MAX_MS, GENERATE_P95_MAX_MS, CHAT_P95_MAX_MS = 500, 1000, 30_000


def _timed(fn: Any, n: int = N) -> dict[str, Any]:
    times, statuses = [], set()
    for _ in range(n):
        t0 = time.perf_counter()
        r = fn()
        times.append((time.perf_counter() - t0) * 1000)
        statuses.add(r.status_code)
    return {"n": n, "p50_ms": round(percentile(times, 50), 1), "p95_ms": round(percentile(times, 95), 1),
            "max_ms": round(max(times), 1), "statuses": sorted(statuses)}


def measure(today: str = DEFAULT_TODAY) -> dict[str, Any]:
    seed_reset(None, today)
    email = next(u["email"] for u in load_seed("users") if u["id"] == P1_USER)
    with httpx.Client(base_url=backend_url(), timeout=30) as c:
        r = c.post("/api/auth/login", json={"email": email, "password": env("EVAL_DEMO_PASSWORD")})
        r.raise_for_status()
        c.get(f"/api/pets/{P1_PET}/tasks")  # 오늘의 할 일이 생성된 상태로 만든다 (첫 호출은 측정에서 뺀다)
        api = {path: _timed(lambda p=path: c.get(p)) for path in (
            "/api/pets", f"/api/pets/{P1_PET}/tasks", "/api/notifications", f"/api/pets/{P1_PET}/health-events")}
    with httpx.Client(base_url=agent_url(), timeout=30) as a:
        headers = {"X-Agent-Api-Key": env("AGENT_API_KEY")}
        generate = _timed(lambda: a.post("/tasks/generate", json={"user_id": P1_USER, "pet_id": P1_PET},
                                         headers=headers))
    api_p95 = max(v["p95_ms"] for v in api.values())
    return {"today": today, "api": api, "api_p95_max_ms": api_p95, "tasks_generate": generate,
            "checks": {"api_p95": api_p95 <= API_P95_MAX_MS and all(v["statuses"] == [200] for v in api.values()),
                       "tasks_generate_p95": generate["p95_ms"] < GENERATE_P95_MAX_MS
                       and generate["statuses"] == [200]}}


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    ap = argparse.ArgumentParser(prog="python -m evaluation.perf")
    ap.add_argument("--run", required=True, help="결과를 넣을 실행 id (채팅 p95도 여기서 읽는다)")
    args = ap.parse_args(argv)
    store = RunStore(args.run, secret_values())
    result = measure()
    summary_path = RESULTS_DIR / args.run / "summary.json"
    if summary_path.exists():
        o = json.loads(summary_path.read_text(encoding="utf-8"))["overall"]
        result["chat"] = {"p50_ms": o["latency_p50_ms"], "p95_ms": o["latency_p95_ms"], "n": o["latency_count"]}
        result["checks"]["chat_p95"] = o["latency_p95_ms"] is not None and o["latency_p95_ms"] <= CHAT_P95_MAX_MS
    store.write_json("perf.json", result)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if all(result["checks"].values()) else 2


if __name__ == "__main__":
    sys.exit(main())
