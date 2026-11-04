"""테스트용 시드 적재 (운영 경로는 Backend `npm run seed:reset`, plan.md B-3).

`data/seed/*.json`과 변형(`data/seed/variants/<name>.json`)을 ARCHITECTURE.md 5.1 저장 형식으로
Chroma 클라이언트에 넣는다. 변형의 `setup_queries`는 Agent 서버가 필요하므로 여기서는 건너뛴다.
"""

from __future__ import annotations

import copy
import json
import warnings
from pathlib import Path
from typing import Any

from chromadb.api import ClientAPI

from src.retriever import APP_COLLECTIONS, DUMMY_EMBEDDING, encode_app_record

ROOT = Path(__file__).resolve().parents[2]
SEED_DIR = ROOT / "data" / "seed"


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def read_seed(variant: str | None = None) -> dict[str, list[dict[str, Any]]]:
    """기본 시드에 변형을 적용한 컬렉션별 행 목록을 돌려준다 (Chroma 없이 쓸 수 있다)."""
    rows = {name: _read_json(SEED_DIR / f"{name}.json") for name in APP_COLLECTIONS}
    if variant is None:
        return rows
    spec = _read_json(SEED_DIR / "variants" / f"{variant}.json")
    rows = copy.deepcopy(rows)
    for name, patches in spec.get("update", {}).items():
        by_id = {r["id"]: r for r in rows[name]}
        for patch in patches:
            if patch["id"] not in by_id:
                raise KeyError(f"변형 {variant}: {name}에 {patch['id']}가 없다")
            by_id[patch["id"]].update(patch)
    for name, extra in spec.get("add", {}).items():
        existing = {r["id"] for r in rows[name]}
        dup = existing & {r["id"] for r in extra}
        if dup:
            raise ValueError(f"변형 {variant}: {name} id 중복 {sorted(dup)}")
        rows[name].extend(copy.deepcopy(extra))
    for name, ids in spec.get("remove", {}).items():
        rows[name] = [r for r in rows[name] if r["id"] not in set(ids)]
    if spec.get("setup_queries"):
        warnings.warn(
            f"변형 {variant}의 setup_queries {len(spec['setup_queries'])}건은 Agent 서버가 필요해 건너뛴다",
            stacklevel=2,
        )
    return rows


def load_seed(client: ClientAPI, variant: str | None = None) -> dict[str, int]:
    """앱 데이터 컬렉션을 비우고 시드를 적재한다. 컬렉션별 적재 건수를 돌려준다."""
    rows = read_seed(variant)
    counts: dict[str, int] = {}
    for name in APP_COLLECTIONS:
        try:
            client.delete_collection(name)
        except Exception:  # 없으면 그냥 만든다 (Chroma 버전별 예외 타입이 다름)
            pass
        col = client.create_collection(name, embedding_function=None)
        data = rows[name]
        if data:
            ids, docs, metas = zip(*(encode_app_record(r) for r in data))
            col.add(
                ids=list(ids),
                documents=list(docs),
                metadatas=list(metas),
                embeddings=[DUMMY_EMBEDDING] * len(data),
            )
        counts[name] = col.count()
    return counts
