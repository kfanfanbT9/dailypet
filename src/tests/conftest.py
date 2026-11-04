"""공통 pytest 픽스처.

- today: 평가 기준일 2026-11-10 (KST) 고정, TODAY_OVERRIDE 환경변수도 같은 값
- chroma_client: 메모리 Chroma + 기본 시드 적재
- fake_embeddings: 네트워크 없는 결정적 임베딩
- catalog_loaded: 시드 + 카탈로그(가짜 임베딩) 적재
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import date

import chromadb
import pytest
from chromadb.api import ClientAPI

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
    """테스트마다 격리된 메모리 Chroma (테넌트 대신 고유 DB 이름을 쓴다)."""
    admin = chromadb.AdminClient()
    db = f"test_{uuid.uuid4().hex}"
    admin.create_database(db)
    client = chromadb.EphemeralClient(database=db)
    yield client
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
