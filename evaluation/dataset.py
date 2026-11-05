"""평가셋(`test_queries.csv`) 파서와 정합성 검사 (phase4_task.md E-0).

실행: `python -m evaluation.dataset` — 문제가 있으면 목록을 출력하고 종료 코드 1.
"""

from __future__ import annotations

import csv
import json
import re
import sys
from collections import Counter
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
EVAL_DIR = ROOT / "evaluation"
CSV_PATH = EVAL_DIR / "test_queries.csv"
CATALOG_DIR = ROOT / "data" / "catalog"
SEED_DIR = ROOT / "data" / "seed"
WEB_FIXTURE_DIR = EVAL_DIR / "fixtures" / "web_search"

DEFAULT_TODAY = "2026-11-10"
AGENT_NAMES = ("diet_agent", "exercise_agent", "health_agent", "general_agent")
EXPECTED_AGENT_VALUES = (*AGENT_NAMES, "supervisor", "-")

# ARCHITECTURE.md 8장 문항 배분
CATEGORY_COUNTS: dict[str, int] = {
    "diet": 4, "exercise": 4, "health": 4, "general": 4, "multi": 3, "out_of_scope": 2, "species": 2,
    "safety": 4, "injection": 5, "pii": 5, "isolation": 5, "hitl": 3, "catalog": 2, "personalization": 3,
}
WEB_MOCK_IDS = ("general-01", "general-02", "general-03", "general-04", "pii-01", "pii-03", "pii-04",
                "injection-04")


@dataclass(frozen=True)
class Query:
    """평가 문항 한 행 (evaluation/README.md 표기를 파싱한 값)."""

    id: str
    scenario_id: str
    category: str
    question: str
    user_id: str | None
    pet_id: str | None
    seed_variant: str | None
    today: str
    expected_agents: tuple[str, ...]          # `|` = AND. ("supervisor",) / ("-",) 가능
    keywords: tuple[tuple[str, ...], ...]     # 일반 키워드: 항목(AND) 안 대안(OR)
    interrupt_tools: tuple[str, ...] = ()
    called_tools: tuple[str, ...] = ()
    top3: tuple[str, ...] = ()
    expected_status: int | None = None        # API 케이스 상태 코드
    must_not_recommend: tuple[str, ...] = ()
    must_not_include: tuple[str, ...] = ()
    raw: dict[str, str] = field(default_factory=dict, compare=False, repr=False)

    @property
    def is_api(self) -> bool:
        return self.question.startswith("API:")


def _split(value: str, sep: str = "|") -> tuple[str, ...]:
    return tuple(p.strip() for p in (value or "").split(sep) if p.strip())


def parse_row(row: dict[str, str]) -> Query:
    """CSV 한 행을 Query로. 특수 표기(interrupt:/tool:/top3:/숫자)는 키워드에서 분리한다."""
    keywords: list[tuple[str, ...]] = []
    interrupts: list[str] = []
    called: list[str] = []
    top3: list[str] = []
    status: int | None = None
    for item in _split(row.get("expected_keywords", "")):
        if item.startswith("interrupt:"):
            interrupts.append(item.removeprefix("interrupt:"))
        elif item.startswith("tool:"):
            called.append(item.removeprefix("tool:"))
        elif item.startswith("top3:"):
            top3.append(item.removeprefix("top3:"))
        elif re.fullmatch(r"\d{3}", item):
            status = int(item)
        else:
            keywords.append(_split(item, "/"))
    return Query(
        id=row["id"].strip(),
        scenario_id=row.get("scenario_id", "").strip(),
        category=row["category"].strip(),
        question=row["question"],
        user_id=row.get("user_id", "").strip() or None,
        pet_id=row.get("pet_id", "").strip() or None,
        seed_variant=row.get("seed_variant", "").strip() or None,
        today=row.get("today", "").strip() or DEFAULT_TODAY,
        expected_agents=_split(row.get("expected_agent", "")),
        keywords=tuple(keywords),
        interrupt_tools=tuple(interrupts),
        called_tools=tuple(called),
        top3=tuple(top3),
        expected_status=status,
        must_not_recommend=_split(row.get("must_not_recommend", "")),
        must_not_include=_split(row.get("must_not_include", "")),
        raw=dict(row),
    )


def load_queries(path: Path = CSV_PATH) -> list[Query]:
    with path.open(encoding="utf-8", newline="") as f:
        return [parse_row(r) for r in csv.DictReader(f)]


@lru_cache(maxsize=1)
def load_catalog() -> dict[str, dict[str, Any]]:
    """item_id → 카탈로그 항목 (3종 합침)."""
    items: dict[str, dict[str, Any]] = {}
    for name in ("activities", "diets", "health_checks"):
        for it in json.loads((CATALOG_DIR / f"{name}.json").read_text(encoding="utf-8")):
            items[it["item_id"]] = it
    return items


def load_seed(name: str) -> list[dict[str, Any]]:
    path = SEED_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else []


def check_dataset(queries: list[Query]) -> list[str]:
    """평가셋 정합성 문제 목록 (phase4_task.md 3장). 빈 목록이면 통과."""
    problems: list[str] = []
    if len(queries) != 50:
        problems.append(f"문항 수 {len(queries)} (기대 50)")
    ids = Counter(q.id for q in queries)
    problems += [f"중복 id {i}" for i, n in ids.items() if n > 1]
    counts = Counter(q.category for q in queries)
    for cat, n in CATEGORY_COUNTS.items():
        if counts.get(cat, 0) != n:
            problems.append(f"카테고리 {cat}: {counts.get(cat, 0)}문항 (기대 {n})")
    problems += [f"알 수 없는 카테고리 {c}" for c in counts if c not in CATEGORY_COUNTS]
    catalog = load_catalog()
    variants = {p.stem for p in (SEED_DIR / "variants").glob("*.json")}
    pets = {p["id"]: p["user_id"] for p in load_seed("pets")}
    users = {u["id"] for u in load_seed("users")}
    for q in queries:
        for item in (*q.must_not_recommend, *q.top3):
            if item not in catalog:
                problems.append(f"{q.id}: 카탈로그에 없는 ID {item}")
        if q.seed_variant and q.seed_variant not in variants:
            problems.append(f"{q.id}: 변형 시드 없음 {q.seed_variant}")
        for a in q.expected_agents:
            if a not in EXPECTED_AGENT_VALUES:
                problems.append(f"{q.id}: expected_agent 값 오류 {a}")
        if not q.expected_agents:
            problems.append(f"{q.id}: expected_agent 비어 있음")
        if q.user_id and q.user_id not in users:
            problems.append(f"{q.id}: 시드에 없는 user_id {q.user_id}")
        if q.pet_id and pets.get(q.pet_id) != (q.user_id or pets.get(q.pet_id)):
            problems.append(f"{q.id}: pet_id {q.pet_id}가 user_id 소유가 아님")
        if q.is_api and q.expected_status is None:
            problems.append(f"{q.id}: API 케이스에 기대 상태 코드 없음")
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", q.today):
            problems.append(f"{q.id}: today 형식 오류 {q.today}")
    for qid in WEB_MOCK_IDS:
        if not (WEB_FIXTURE_DIR / f"{qid}.json").exists():
            problems.append(f"웹 검색 fixture 없음 {qid}.json")
    return problems


def main() -> int:
    queries = load_queries()
    problems = check_dataset(queries)
    if problems:
        print("평가셋 정합성 검사 실패:")
        for p in problems:
            print(f"  - {p}")
        return 1
    print(f"평가셋 정합성 검사 통과: {len(queries)}문항, 카테고리 {len(CATEGORY_COUNTS)}종, "
          f"카탈로그 {len(load_catalog())}항목, 웹 검색 fixture {len(WEB_MOCK_IDS)}개")
    return 0


if __name__ == "__main__":
    sys.exit(main())
