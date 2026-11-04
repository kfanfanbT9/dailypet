"""DailyPet 초기 카탈로그 검증 스크립트 (ARCHITECTURE.md 7.5, plan.md P0-3).

실행 (저장소 루트에서):
    python -m src.catalog_check                     # 검수 전: 구조·출처·규모·구성 검사
    python -m src.catalog_check --require-reviewed  # 적재 전: 모든 항목이 reviewed: true 여야 통과

검사 항목
1. 스키마: 필수 필드, 타입, enum 값 (database/schema.md 의 CHECK 제약과 같은 값)
2. ID: 영역별 접두사(act_/diet_/hc_), 전체 파일에 걸친 item_id 중복
3. 출처: sources 1개 이상, 각 출처에 url(http…)·publisher·accessed(YYYY-MM-DD)
4. 규모: 종×영역마다 추천 가능 항목(recommendable: true) 10~15개
5. 최소 구성: 종×영역마다 추천 가능 항목 기준
   - 연령대별(age_groups 에 junior / adult / senior 포함) 각 2개 이상 — 세 영역 모두
   - 저강도(intensity == "low") 2개 이상 — 활동 영역만
   - 실내(tags 에 "indoor") 2개 이상 — 활동 영역만
   식단·정기점검에는 강도·실내 속성이 없고 의미도 없으므로 저강도·실내 검사는 하지 않는다.
6. 유해 식품: subtype == "harmful_food" 는 모두 recommendable: false
7. 검수: --require-reviewed 이면 reviewed: false 항목이 하나라도 있으면 실패

종료 코드: 오류가 없으면 0, 있으면 1. 경고는 종료 코드에 영향을 주지 않는다.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CATALOG_DIR = Path("data/catalog")

# 파일 → (영역, ID 접두사)
FILES: dict[str, tuple[str, str]] = {
    "activities.json": ("activity", "act_"),
    "diets.json": ("diet", "diet_"),
    "health_checks.json": ("health", "hc_"),
}

SPECIES = {"dog", "cat"}
AGE_GROUPS = ("junior", "adult", "senior")
INTENSITY = {"low", "medium", "high"}
DIET_SUBTYPES = {"feeding_guide", "treat", "topping", "hydration", "weight_management", "harmful_food"}
HEALTH_TYPES = {"vaccine", "checkup", "deworming", "heartworm", "external_parasite", "dental", "other"}

SCALE_MIN, SCALE_MAX = 10, 15
MIN_PER_GROUP = 2

COMMON_FIELDS: dict[str, type | tuple[type, ...]] = {
    "item_id": str,
    "name": str,
    "category": str,
    "species": list,
    "age_groups": list,
    "description": str,
    "cautions": list,
    "tags": list,
    "recommendable": bool,
    "sources": list,
    "reviewed": bool,
    "review_notes": str,
}
AREA_FIELDS: dict[str, dict[str, type | tuple[type, ...]]] = {
    "activity": {
        "intensity": str,
        "duration_min": dict,
        "frequency": str,
        "contraindications": list,
    },
    "diet": {
        "subtype": str,
        "serving_guide": str,
        "kcal_note": str,
        "allergens": list,
        "contraindications": list,
    },
    "health": {
        "type": str,
        "core": bool,
        "legal_required_kr": bool,
        "dose_schedule": (list, type(None)),
        "booster_interval_days": (int, type(None)),
        "interval_days": (int, type(None)),
        "start_age_weeks": (int, type(None)),
    },
}

DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Report:
    """검사 결과(오류·경고)를 모은다."""

    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"[오류] {where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"[경고] {where}: {msg}")


def _is_pos_int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and v > 0


def check_item(item: dict[str, Any], area: str, prefix: str, rep: Report) -> None:
    """항목 1개의 스키마·enum·출처를 검사한다."""
    iid = item.get("item_id", "<item_id 없음>")
    fields = {**COMMON_FIELDS, **AREA_FIELDS[area]}
    for name, typ in fields.items():
        if name not in item:
            rep.error(iid, f"필수 필드 '{name}' 없음")
        elif not isinstance(item[name], typ) or (typ is int and isinstance(item[name], bool)):
            rep.error(iid, f"'{name}' 타입이 맞지 않음 ({type(item[name]).__name__})")

    if not isinstance(iid, str) or not iid.startswith(prefix):
        rep.error(str(iid), f"ID 접두사가 '{prefix}'가 아님")
    if item.get("category") != area:
        rep.error(iid, f"category 가 '{area}'가 아님: {item.get('category')!r}")

    species = item.get("species") or []
    if not species or not set(species) <= SPECIES:
        rep.error(iid, f"species 값이 잘못됨: {species}")
    elif isinstance(iid, str):
        for sp in SPECIES:
            if f"_{sp}_" in iid and sp not in species:
                rep.warn(iid, f"ID에 '{sp}'가 있지만 species 에 없음")

    ages = item.get("age_groups") or []
    if not ages or not set(ages) <= set(AGE_GROUPS):
        rep.error(iid, f"age_groups 값이 잘못됨: {ages}")

    for name in ("cautions", "tags", "contraindications", "allergens"):
        v = item.get(name)
        if isinstance(v, list) and not all(isinstance(x, str) and x for x in v):
            rep.error(iid, f"'{name}' 에 빈 값이나 문자열이 아닌 값이 있음")

    if area == "activity":
        if item.get("intensity") not in INTENSITY:
            rep.error(iid, f"intensity 값이 잘못됨: {item.get('intensity')!r}")
        dur = item.get("duration_min")
        if isinstance(dur, dict):
            lo, hi = dur.get("min"), dur.get("max")
            if not (_is_pos_int(lo) and _is_pos_int(hi) and lo <= hi):
                rep.error(iid, f"duration_min 은 0보다 큰 min <= max 여야 함: {dur}")
    elif area == "diet":
        subtype = item.get("subtype")
        if subtype not in DIET_SUBTYPES:
            rep.error(iid, f"subtype 값이 잘못됨: {subtype!r}")
        if subtype == "harmful_food" and item.get("recommendable") is not False:
            rep.error(iid, "harmful_food 는 recommendable: false 여야 함")
        if subtype != "harmful_food" and item.get("recommendable") is False:
            rep.warn(iid, "유해 식품이 아닌데 recommendable: false")
    elif area == "health":
        if item.get("type") not in HEALTH_TYPES:
            rep.error(iid, f"type 값이 잘못됨: {item.get('type')!r}")
        for name in ("booster_interval_days", "interval_days"):
            v = item.get(name)
            if v is not None and not _is_pos_int(v):
                rep.error(iid, f"'{name}' 는 0보다 큰 정수 또는 null 이어야 함: {v!r}")
        start = item.get("start_age_weeks")
        if start is not None and not (isinstance(start, int) and start >= 0):
            rep.error(iid, f"start_age_weeks 는 0 이상 정수 또는 null 이어야 함: {start!r}")
        doses = item.get("dose_schedule")
        if isinstance(doses, list):
            for i, d in enumerate(doses, start=1):
                ok = (isinstance(d, dict) and d.get("dose_no") == i
                      and (("at_age_weeks" in d) != ("after_prev_weeks" in d)))
                if not ok:
                    rep.error(iid, f"dose_schedule {i}번째 항목 형식이 잘못됨: {d}")

    sources = item.get("sources")
    if not isinstance(sources, list) or not sources:
        rep.error(iid, "출처(sources)가 1개 이상 있어야 함")
    else:
        for i, src in enumerate(sources, start=1):
            if not isinstance(src, dict):
                rep.error(iid, f"출처 {i}가 객체가 아님")
                continue
            if not str(src.get("url", "")).startswith("http"):
                rep.error(iid, f"출처 {i}의 url 이 없거나 http 로 시작하지 않음")
            if not str(src.get("publisher", "")).strip():
                rep.error(iid, f"출처 {i}의 publisher 가 없음")
            if not DATE_RE.match(str(src.get("accessed", ""))):
                rep.error(iid, f"출처 {i}의 accessed 가 YYYY-MM-DD 가 아님")


def check_composition(items_by_area: dict[str, list[dict[str, Any]]], rep: Report) -> list[str]:
    """종×영역별 규모(10~15)와 최소 구성(연령대·저강도·실내)을 검사하고 요약 표를 돌려준다."""
    lines = [f"{'영역':<9}{'종':<5}{'추천가능':>8}{'어린':>6}{'성체':>6}{'시니어':>7}{'저강도':>7}{'실내':>6}{'정보용':>7}"]
    for area, items in items_by_area.items():
        for sp in ("dog", "cat"):
            mine = [it for it in items if sp in (it.get("species") or [])]
            rec = [it for it in mine if it.get("recommendable") is True]
            info = len(mine) - len(rec)
            where = f"{area}/{sp}"
            n = len(rec)
            if not SCALE_MIN <= n <= SCALE_MAX:
                rep.error(where, f"추천 가능 항목 수 {n}개 (기준 {SCALE_MIN}~{SCALE_MAX}개)")
            counts: dict[str, int] = {}
            for age in AGE_GROUPS:
                counts[age] = sum(age in (it.get("age_groups") or []) for it in rec)
                if counts[age] < MIN_PER_GROUP:
                    rep.error(where, f"연령대 '{age}' 항목 {counts[age]}개 (최소 {MIN_PER_GROUP}개)")
            low = indoor = "-"
            if area == "activity":
                low_n = sum(it.get("intensity") == "low" for it in rec)
                indoor_n = sum("indoor" in (it.get("tags") or []) for it in rec)
                if low_n < MIN_PER_GROUP:
                    rep.error(where, f"저강도 항목 {low_n}개 (최소 {MIN_PER_GROUP}개)")
                if indoor_n < MIN_PER_GROUP:
                    rep.error(where, f"실내 항목 {indoor_n}개 (최소 {MIN_PER_GROUP}개)")
                low, indoor = str(low_n), str(indoor_n)
            lines.append(f"{area:<11}{sp:<6}{n:>8}{counts['junior']:>7}{counts['adult']:>7}"
                         f"{counts['senior']:>8}{low:>8}{indoor:>7}{info:>8}")
    return lines


@dataclass
class ValidationResult:
    """검사 결과. 적재 코드(src/retriever.py)가 출력 없이 재사용한다."""

    report: Report
    items_by_area: dict[str, list[dict[str, Any]]]
    table: list[str]
    unreviewed: list[str]

    @property
    def ok(self) -> bool:
        return not self.report.errors


def validate(catalog_dir: Path, require_reviewed: bool) -> ValidationResult:
    """검사를 모두 실행하고 결과를 돌려준다 (출력하지 않는다)."""
    rep = Report()
    items_by_area: dict[str, list[dict[str, Any]]] = {}
    seen: dict[str, str] = {}
    unreviewed: list[str] = []

    for fname, (area, prefix) in FILES.items():
        path = catalog_dir / fname
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            rep.error(str(path), f"파일을 읽을 수 없음: {exc}")
            items_by_area[area] = []
            continue
        if not isinstance(data, list):
            rep.error(str(path), "최상위 값이 배열이 아님")
            data = []
        items = [it for it in data if isinstance(it, dict)]
        if len(items) != len(data):
            rep.error(str(path), "객체가 아닌 항목이 있음")
        for it in items:
            check_item(it, area, prefix, rep)
            iid = it.get("item_id")
            if isinstance(iid, str):
                if iid in seen:
                    rep.error(iid, f"item_id 중복 ({seen[iid]}, {fname})")
                seen[iid] = fname
            if it.get("reviewed") is not True:
                unreviewed.append(str(iid))
        items_by_area[area] = items

    table = check_composition(items_by_area, rep)

    if require_reviewed and unreviewed:
        rep.error("검수", f"reviewed: false 항목 {len(unreviewed)}개 — 적재할 수 없음 "
                          f"(예: {', '.join(unreviewed[:5])})")

    return ValidationResult(rep, items_by_area, table, unreviewed)


def run(catalog_dir: Path, require_reviewed: bool) -> int:
    """검사를 모두 실행하고 결과를 출력한다. 오류가 있으면 1을 돌려준다."""
    result = validate(catalog_dir, require_reviewed)
    rep, items_by_area, table, unreviewed = (
        result.report, result.items_by_area, result.table, result.unreviewed)
    total = sum(len(v) for v in items_by_area.values())
    print(f"카탈로그 검증: {catalog_dir} — 항목 {total}개 "
          + ", ".join(f"{a} {len(v)}" for a, v in items_by_area.items()))
    print()
    print("\n".join(table))
    print()
    print(f"검수 완료 {total - len(unreviewed)}개 / 미검수 {len(unreviewed)}개"
          + ("" if require_reviewed else " (--require-reviewed 없이 실행: 검수 여부는 검사하지 않음)"))
    for w in rep.warnings:
        print(w)
    for e in rep.errors:
        print(e)
    if rep.errors:
        print(f"\n실패: 오류 {len(rep.errors)}건, 경고 {len(rep.warnings)}건")
        return 1
    print(f"\n통과: 오류 0건, 경고 {len(rep.warnings)}건")
    return 0


def main(argv: list[str] | None = None) -> int:
    """명령행 진입점."""
    parser = argparse.ArgumentParser(description="DailyPet 카탈로그 검증 (ARCHITECTURE.md 7.5)")
    parser.add_argument("--require-reviewed", action="store_true",
                        help="reviewed: false 항목이 있으면 실패 (적재 전 사용)")
    parser.add_argument("--dir", type=Path, default=CATALOG_DIR, help="카탈로그 폴더 (기본 data/catalog)")
    args = parser.parse_args(argv)
    return run(args.dir, args.require_reviewed)


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
