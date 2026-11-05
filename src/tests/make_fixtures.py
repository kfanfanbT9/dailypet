"""Python ↔ Node 공유 기준 사례 파일 생성 (ARCHITECTURE.md 5.1 "공유 기준 사례").

    python -m src.tests.make_fixtures      # src/tests/fixtures/app_records.json 갱신

Node Backend(`src/backend/test/record.test.js`)가 이 파일을 읽어 `encodeAppRecord` 결과가 같은지 확인한다.
Python 테스트(`test_seed_loader.py`)는 파일이 지금 시드·인코딩 규칙과 같은지(최신인지) 확인한다.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from src.retriever import APP_COLLECTIONS, encode_app_record
from src.tests.seed_loader import SEED_DIR

FIXTURE_PATH = Path(__file__).resolve().parent / "fixtures" / "app_records.json"


def build_app_records() -> dict[str, list[dict[str, Any]]]:
    """컬렉션별 시드 행의 인코딩 결과 `{collection: [{id, document, metadata}]}`."""
    out: dict[str, list[dict[str, Any]]] = {}
    for name in APP_COLLECTIONS:
        path = SEED_DIR / f"{name}.json"
        rows = json.loads(path.read_text(encoding="utf-8")) if path.exists() else []
        records = []
        for row in rows:
            rid, document, metadata = encode_app_record(row)
            records.append({"id": rid, "document": document, "metadata": metadata})
        out[name] = records
    return out


def render() -> str:
    return json.dumps(build_app_records(), ensure_ascii=False, indent=2, sort_keys=True) + "\n"


def main() -> None:
    FIXTURE_PATH.write_text(render(), encoding="utf-8")
    counts = {k: len(v) for k, v in build_app_records().items()}
    print(f"{FIXTURE_PATH.name} 갱신: {counts}")


if __name__ == "__main__":
    main()
