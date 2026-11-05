"""공통 pytest 픽스처.

- today: 평가 기준일 2026-11-10 (KST) 고정, TODAY_OVERRIDE 환경변수도 같은 값
- chroma_client: 메모리 Chroma + 기본 시드 적재
- fake_embeddings: 네트워크 없는 결정적 임베딩
- catalog_loaded: 시드 + 카탈로그(가짜 임베딩) 적재
- real_embeddings / real_catalog_loaded: llm 테스트용 실제 Bedrock 임베딩(캐시) + 적재
"""

from __future__ import annotations

import re
import uuid
from collections.abc import Iterator
from datetime import date
from pathlib import Path

import chromadb
import pytest
from chromadb.api import ClientAPI
from langchain_core.embeddings import Embeddings

from src.tests.fake_embeddings import FakeEmbeddings
from src.tests.seed_loader import load_seed

BASE_DATE = date(2026, 11, 10)


@pytest.fixture
def today(monkeypatch: pytest.MonkeyPatch) -> date:
    monkeypatch.setenv("TODAY_OVERRIDE", BASE_DATE.isoformat())
    return BASE_DATE


@pytest.fixture
def fake_embeddings() -> FakeEmbeddings:
    return FakeEmbeddings()


@pytest.fixture
def empty_chroma() -> Iterator[ClientAPI]:
    """테스트마다 격리된 메모리 Chroma (테넌트 대신 고유 DB 이름을 쓴다).

    알려진 문제: chromadb 1.5.9에서 벡터 컬렉션 적재 뒤 다른 컬렉션에 쓰면 그 벡터 컬렉션 검색이
    간헐적으로 'Error finding id'(InternalError)로 실패한다 (phase1_task.md 13장). 전체 실행 몇 번에 한 번
    검색 테스트 1개가 이 오류로 떨어질 수 있다. DB 삭제·재사용 방식과는 무관하고,
    서버 모드(HttpClient, 운영 경로)에서는 재현되지 않음을 확인했다.
    """
    admin = chromadb.AdminClient()
    db = f"test_{uuid.uuid4().hex}"
    admin.create_database(db)
    yield chromadb.EphemeralClient(database=db)
    try:
        admin.delete_database(db)
    except Exception:
        pass


@pytest.fixture
def chroma_client(empty_chroma: ClientAPI) -> ClientAPI:
    load_seed(empty_chroma)
    return empty_chroma


@pytest.fixture
def catalog_loaded(chroma_client: ClientAPI, fake_embeddings: FakeEmbeddings) -> ClientAPI:
    """시드 + 카탈로그(가짜 임베딩) 적재된 메모리 Chroma."""
    from src.retriever import ingest_catalog

    ingest_catalog(chroma_client, fake_embeddings)
    return chroma_client


EMBED_CACHE_DIR = Path(__file__).resolve().parents[2] / ".pytest_cache" / "embeddings"


@pytest.fixture(scope="session")
def real_embeddings() -> Embeddings:
    """실제 Bedrock 임베딩 (llm 테스트용). 호출할 수 없으면 skip.

    가짜 임베딩은 의미 검색 순위가 무의미해서 실제 모델 테스트를 흔든다 (예: '광견병' 검색에 FeLV가 1위).
    LangChain CacheBackedEmbeddings로 .pytest_cache에 캐시해 같은 문장은 다시 호출하지 않는다.
    """
    from langchain_classic.embeddings import CacheBackedEmbeddings
    from langchain_classic.storage import LocalFileStore

    from src.config import get_settings
    from src.retriever import get_embeddings

    try:
        base = get_embeddings()
        base.embed_query("ping")
    except Exception as exc:  # 자격증명 없음·한도 초과 등
        pytest.skip(f"Bedrock 임베딩 호출 불가: {type(exc).__name__}")
    store = LocalFileStore(EMBED_CACHE_DIR)
    return CacheBackedEmbeddings.from_bytes_store(
        # LocalFileStore 키는 [A-Za-z0-9_.-/]만 허용 (모델 ID의 ':' 치환)
        base, store, namespace=re.sub(r"[^A-Za-z0-9_.-]", "_", get_settings().aws_embed_model),
        query_embedding_cache=True, key_encoder="sha256",
    )


@pytest.fixture
def real_catalog_loaded(chroma_client: ClientAPI, real_embeddings: Embeddings) -> ClientAPI:
    """시드 + 카탈로그·지식(실제 임베딩) 적재된 메모리 Chroma."""
    from src.retriever import ingest_catalog, ingest_knowledge

    ingest_catalog(chroma_client, real_embeddings)
    ingest_knowledge(chroma_client, real_embeddings)
    return chroma_client
