"""Chroma 접근과 RAG 파이프라인 (ARCHITECTURE.md 3.5, 5장).

- 앱 데이터 저장 형식(5.1): `encode_app_record` / `decode_app_record`
- 카탈로그 적재: `reviewed: true` 항목만, 검증(`src/catalog_check.py`) 통과 시에만
- 지식 적재: front matter 메타데이터 + 청크 분할, 주입·PII 패턴 문서는 제외
- 검색: `search_catalog`, `search_knowledge`

실행 (저장소 루트, Chroma 서버 :8001 필요):
    python -m src.retriever --ingest              # 카탈로그 + 지식
    python -m src.retriever --ingest --catalog    # 카탈로그만
    python -m src.retriever --ingest --knowledge  # 지식만

LangChain `Chroma` 래퍼 대신 chromadb 클라이언트를 직접 쓴다. 리스트 메타데이터
(`$contains`/`$not_contains`)와 결정적 id·삭제 동기화를 직접 다뤄야 하기 때문이다.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterable, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from langchain_core.embeddings import Embeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

from src.config import ROOT, Settings, find_injection, find_pii, get_settings

# ---------------------------------------------------------------- 앱 데이터 저장 형식 (5.1)

# 앱 데이터 컬렉션 (ARCHITECTURE.md 5장). 의미 검색을 하지 않으므로 더미 벡터를 넣는다.
APP_COLLECTIONS: tuple[str, ...] = (
    "users",
    "pets",
    "tasks",
    "health_events",
    "weight_logs",
    "interactions",
    "preferences",
    "chat_logs",
)
DUMMY_EMBEDDING: list[float] = [0.0]

# 메타데이터에 넣지 않는 필드: 중첩 객체이거나 긴 텍스트·비밀값이라 필터에 쓰지 않는다.
_EXCLUDED_METADATA_FIELDS: frozenset[str] = frozenset(
    {"id", "default_times", "trace", "question", "answer", "memo", "password_hash"}
)
# 시각 문자열 필드 → 비교용 epoch 초 필드
_TIMESTAMP_FIELDS: dict[str, str] = {"created_at": "created_ts", "updated_at": "updated_ts"}


def _to_epoch(value: str) -> int:
    """ISO 8601 시각 문자열(오프셋 포함)을 epoch 초로 바꾼다."""
    return int(datetime.fromisoformat(value).timestamp())


def _scalar_metadata(row: dict[str, Any], excluded: Iterable[str] = ()) -> dict[str, Any]:
    """스칼라와 비어 있지 않은 문자열 리스트만 남긴다. null·빈 리스트·dict는 뺀다."""
    skip = set(excluded)
    metadata: dict[str, Any] = {}
    for key, value in row.items():
        if key in skip or value is None:
            continue
        if isinstance(value, bool | int | float | str):
            metadata[key] = value
        elif isinstance(value, list) and value and all(isinstance(v, str) for v in value):
            metadata[key] = list(value)
    return metadata


def encode_app_record(row: dict[str, Any]) -> tuple[str, str, dict[str, Any]]:
    """엔터티 한 행을 Chroma 저장 형식 `(id, document, metadata)`로 바꾼다.

    규칙 (ARCHITECTURE.md 5.1):
    - document: 행 전체 JSON 문자열 (원본)
    - metadata: 스칼라와 비어 있지 않은 문자열 리스트만. null·빈 리스트는 키를 뺀다.
    - created_at / updated_at이 있으면 created_ts / updated_ts(epoch 초)를 함께 넣는다.
    """
    if not row.get("id"):
        raise ValueError("행에 id가 없다")
    metadata = _scalar_metadata(row, _EXCLUDED_METADATA_FIELDS)
    for src, dst in _TIMESTAMP_FIELDS.items():
        if isinstance(row.get(src), str):
            metadata[dst] = _to_epoch(row[src])
    document = json.dumps(row, ensure_ascii=False, sort_keys=True)
    return row["id"], document, metadata


def decode_app_record(document: str) -> dict[str, Any]:
    """Chroma document(JSON 문자열)를 엔터티 dict로 되돌린다. 원본은 항상 document다."""
    return json.loads(document)


# ---------------------------------------------------------------- 클라이언트·임베딩

CATALOG_DIR = ROOT / "data" / "catalog"
KNOWLEDGE_DIR = ROOT / "data" / "knowledge"
CATALOG_COLLECTIONS: dict[str, str] = {
    "activity": "catalog_activity",
    "diet": "catalog_diet",
    "health": "catalog_health",
}
KNOWLEDGE_COLLECTION = "pet_knowledge"
CHUNK_SIZE, CHUNK_OVERLAP = 800, 100
_COSINE = {"hnsw": {"space": "cosine"}}


def get_client(settings: Settings | None = None) -> ClientAPI:
    """Chroma 서버 클라이언트 (기본 localhost:8001)."""
    import chromadb

    s = settings or get_settings()
    return chromadb.HttpClient(host=s.chroma_host, port=s.chroma_port)


def get_embeddings(settings: Settings | None = None) -> Embeddings:
    """Bedrock 임베딩 (`AWS_EMBED_MODEL`, 기본 Titan Text Embeddings v2)."""
    from langchain_aws import BedrockEmbeddings

    s = (settings or get_settings()).require_agent()
    return BedrockEmbeddings(model_id=s.aws_embed_model, region_name=s.aws_region)


def _vector_collection(client: ClientAPI, name: str) -> Collection:
    """임베딩을 직접 넣는 코사인 컬렉션 (Chroma 기본 임베딩 함수는 쓰지 않는다)."""
    return client.get_or_create_collection(name, embedding_function=None, configuration=_COSINE)


def replace_records(col: Collection, *, ids: list[str], **fields: Any) -> None:
    """id를 통째로 바꿔 넣는다. Chroma `upsert`는 기존 metadata를 합쳐 빠진 키가 남으므로
    이미 있는 id는 지우고 다시 넣는다 (ARCHITECTURE.md 5.1 "행 갱신")."""
    existing = col.get(ids=ids, include=[])["ids"]
    if existing:
        col.delete(ids=existing)
    col.add(ids=ids, **fields)


def _sync_ids(col: Collection, keep: set[str]) -> int:
    """`keep`에 없는 기존 id를 지운다 (다시 적재해도 남는 찌꺼기 없음). 지운 개수."""
    stale = [i for i in col.get(include=[])["ids"] if i not in keep]
    if stale:
        col.delete(ids=stale)
    return len(stale)


@dataclass
class IngestReport:
    """적재 결과. 값(키·본문)은 넣지 않고 건수와 이유만 담는다."""

    counts: dict[str, int] = field(default_factory=dict)
    removed: dict[str, int] = field(default_factory=dict)
    rejected: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def lines(self) -> list[str]:
        out = [f"  {name}: {n}건 (삭제 {self.removed.get(name, 0)})" for name, n in self.counts.items()]
        out += [f"  [거부] {r}" for r in self.rejected]
        out += [f"  [경고] {w}" for w in self.warnings]
        return out


# ---------------------------------------------------------------- 카탈로그


class CatalogNotReviewedError(RuntimeError):
    """검증 실패 또는 미검수 항목 때문에 적재를 거부했다."""


def catalog_document(item: dict[str, Any]) -> str:
    """임베딩할 텍스트: 이름 + 설명 + 영역별 안내 + 주의사항."""
    parts = [item["name"], item.get("description", "")]
    for key in ("frequency", "serving_guide", "kcal_note"):
        if item.get(key):
            parts.append(str(item[key]))
    if item.get("cautions"):
        parts.append("주의: " + " / ".join(item["cautions"]))
    return "\n".join(p for p in parts if p)


def catalog_metadata(item: dict[str, Any]) -> dict[str, Any]:
    """필터용 메타데이터. 리스트는 그대로(`$contains`), 빈 값은 키를 뺀다 (ARCHITECTURE.md 5.1)."""
    keys = (
        "item_id", "name", "category", "species", "age_groups", "intensity", "subtype", "type",
        "allergens", "contraindications", "tags", "recommendable", "core", "legal_required_kr",
    )
    metadata = _scalar_metadata({k: item.get(k) for k in keys})
    sources = item.get("sources") or []
    if sources and sources[0].get("url"):
        metadata["source_url"] = sources[0]["url"]
    return metadata


def load_catalog_items(
    catalog_dir: Path = CATALOG_DIR, *, require_reviewed: bool = True
) -> dict[str, dict[str, Any]]:
    """검증을 통과한 카탈로그 항목 `{item_id: item}`. 하나라도 실패하면 전체를 거부한다."""
    from src.catalog_check import validate

    result = validate(catalog_dir, require_reviewed)
    if not result.ok:
        errors = result.report.errors
        raise CatalogNotReviewedError(
            f"카탈로그 검증 실패 {len(errors)}건 — 적재하지 않는다. 예: {errors[0]}"
        )
    return {
        it["item_id"]: it
        for items in result.items_by_area.values()
        for it in items
        if it.get("reviewed") is True or not require_reviewed
    }


@lru_cache(maxsize=1)
def catalog_index() -> dict[str, dict[str, Any]]:
    """적재 대상과 같은 카탈로그 항목 사전 (도구·추천·출력 검증이 조회용으로 쓴다)."""
    return load_catalog_items()


def ingest_catalog(
    client: ClientAPI, embeddings: Embeddings, catalog_dir: Path = CATALOG_DIR
) -> IngestReport:
    """`reviewed: true` 카탈로그를 영역별 컬렉션에 upsert한다. 미검수가 하나라도 있으면 거부."""
    items = load_catalog_items(catalog_dir, require_reviewed=True)
    report = IngestReport()
    for area, name in CATALOG_COLLECTIONS.items():
        area_items = sorted(
            (it for it in items.values() if it["category"] == area), key=lambda it: it["item_id"]
        )
        col = _vector_collection(client, name)
        if area_items:
            docs = [catalog_document(it) for it in area_items]
            replace_records(
                col,
                ids=[it["item_id"] for it in area_items],
                documents=docs,
                metadatas=[catalog_metadata(it) for it in area_items],
                embeddings=embeddings.embed_documents(docs),
            )
        report.removed[name] = _sync_ids(col, {it["item_id"] for it in area_items})
        report.counts[name] = col.count()
    return report


# ---------------------------------------------------------------- 지식 문서


@dataclass
class KnowledgeDoc:
    path: Path
    meta: dict[str, Any]
    body: str


def parse_knowledge_file(path: Path) -> KnowledgeDoc:
    """`---` front matter(YAML) + 본문. front matter가 없으면 ValueError."""
    text = path.read_text(encoding="utf-8")
    if not text.startswith("---"):
        raise ValueError(f"{path.name}: front matter가 없다")
    _, front, body = text.split("---", 2)
    meta = yaml.safe_load(front) or {}
    for key in ("source", "species", "category"):
        if not meta.get(key):
            raise ValueError(f"{path.name}: front matter에 {key}가 없다")
    if meta["species"] not in {"dog", "cat", "all"}:
        raise ValueError(f"{path.name}: species는 dog/cat/all")
    if meta["category"] not in {"activity", "diet", "health", "general"}:
        raise ValueError(f"{path.name}: category는 activity/diet/health/general")
    return KnowledgeDoc(path=path, meta=meta, body=body.strip())


def knowledge_risks(doc: KnowledgeDoc) -> list[str]:
    """적재를 막을 이유 (주입 패턴·PII). 문서 전체(front matter 포함)를 검사한다."""
    text = doc.path.read_text(encoding="utf-8")
    risks = [f"주입 패턴 '{hit}'" for hit in find_injection(text)]
    risks += [f"PII({kind})" for kind in find_pii(text)]
    return risks


def ingest_knowledge(
    client: ClientAPI,
    embeddings: Embeddings,
    paths: Sequence[Path] | None = None,
) -> IngestReport:
    """지식 문서를 청크로 나눠 `pet_knowledge`에 upsert한다.

    주입 패턴·PII가 있는 문서는 적재하지 않고 `rejected`에 남긴다 (간접 주입 대비, ARCHITECTURE.md 3.5).
    `paths`를 주지 않으면 `data/knowledge/*.md` 전체이고, 그때만 사라진 문서의 청크를 지운다.
    """
    files = sorted(paths) if paths is not None else sorted(KNOWLEDGE_DIR.glob("*.md"))
    splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
    col = _vector_collection(client, KNOWLEDGE_COLLECTION)
    report = IngestReport()
    keep: set[str] = set()
    for path in files:
        try:
            doc = parse_knowledge_file(path)
        except ValueError as exc:
            report.rejected.append(str(exc))
            continue
        risks = knowledge_risks(doc)
        if risks:
            report.rejected.append(f"{path.name}: {', '.join(risks)}")
            continue
        if doc.meta.get("reviewed") is not True:
            report.warnings.append(f"{path.name}: reviewed가 true가 아니다 (적재는 함)")
        chunks = splitter.split_text(doc.body)
        source = str(doc.meta["source"])
        ids = [f"{source}#{n:03d}" for n in range(len(chunks))]
        base = {
            "source": source,
            "species": doc.meta["species"],
            "category": doc.meta["category"],
            "title": str(doc.meta.get("title", path.stem)),
            "file": path.name,
        }
        replace_records(
            col,
            ids=ids,
            documents=chunks,
            metadatas=[{**base, "chunk": n} for n in range(len(chunks))],
            embeddings=embeddings.embed_documents(chunks),
        )
        stale = [i for i in col.get(where={"source": source}, include=[])["ids"] if i not in ids]
        if stale:
            col.delete(ids=stale)
        keep.update(ids)
    if paths is None:
        report.removed[KNOWLEDGE_COLLECTION] = _sync_ids(col, keep)
    report.counts[KNOWLEDGE_COLLECTION] = col.count()
    return report


# ---------------------------------------------------------------- 검색


def where_all(*conditions: dict[str, Any] | None) -> dict[str, Any] | None:
    """조건 여러 개를 `$and`로 묶는다. 비어 있으면 None, 하나면 그대로."""
    conds = [c for c in conditions if c]
    if not conds:
        return None
    return conds[0] if len(conds) == 1 else {"$and": conds}


@dataclass(frozen=True)
class CatalogHit:
    item_id: str
    category: str
    name: str
    similarity: float  # 1 - 코사인 거리 (클수록 비슷함)
    metadata: dict[str, Any]
    text: str


@dataclass(frozen=True)
class KnowledgeHit:
    source: str
    species: str
    category: str
    similarity: float
    text: str


def search_catalog(
    client: ClientAPI,
    embeddings: Embeddings,
    category: str,
    query: str,
    where: dict[str, Any] | None = None,
    k: int = 20,
) -> list[CatalogHit]:
    """카탈로그 의미 검색. `where`는 메타데이터 조건 (예: `{"species": {"$contains": "dog"}}`)."""
    col = _vector_collection(client, CATALOG_COLLECTIONS[category])
    res = col.query(
        query_embeddings=[embeddings.embed_query(query)],
        n_results=k,
        where=where,
        include=["metadatas", "documents", "distances"],
    )
    hits = []
    for iid, meta, doc, dist in zip(
        res["ids"][0], res["metadatas"][0], res["documents"][0], res["distances"][0], strict=True
    ):
        hits.append(
            CatalogHit(iid, category, str(meta.get("name", "")), round(1 - dist, 6), dict(meta), doc)
        )
    return hits


def search_knowledge(
    client: ClientAPI,
    embeddings: Embeddings,
    query: str,
    species: str,
    category: str | None = None,
    k: int = 4,
) -> list[KnowledgeHit]:
    """지식 검색. 종이 같은 문서와 공통(`all`) 문서만 찾는다."""
    col = _vector_collection(client, KNOWLEDGE_COLLECTION)
    where = where_all(
        {"species": {"$in": [species, "all"]}},
        {"category": category} if category else None,
    )
    res = col.query(
        query_embeddings=[embeddings.embed_query(query)],
        n_results=k,
        where=where,
        include=["metadatas", "documents", "distances"],
    )
    return [
        KnowledgeHit(m["source"], m["species"], m["category"], round(1 - d, 6), doc)
        for m, doc, d in zip(res["metadatas"][0], res["documents"][0], res["distances"][0], strict=True)
    ]


# ---------------------------------------------------------------- CLI


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="DailyPet Chroma 적재 (ARCHITECTURE.md 3.5)")
    parser.add_argument("--ingest", action="store_true", help="적재 실행")
    parser.add_argument("--catalog", action="store_true", help="카탈로그만")
    parser.add_argument("--knowledge", action="store_true", help="지식 문서만")
    args = parser.parse_args(argv)
    if not args.ingest:
        parser.print_help()
        return 2
    both = not (args.catalog or args.knowledge)
    client, embeddings = get_client(), get_embeddings()
    status = 0
    if both or args.catalog:
        try:
            rep = ingest_catalog(client, embeddings)
            print("카탈로그 적재 완료")
            print("\n".join(rep.lines()))
        except CatalogNotReviewedError as exc:
            print(f"카탈로그 적재 거부: {exc}")
            status = 1
    if both or args.knowledge:
        rep = ingest_knowledge(client, embeddings)
        print("지식 문서 적재 완료")
        print("\n".join(rep.lines()))
    return status


if __name__ == "__main__":
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main())
