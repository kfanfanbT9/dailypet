"""A-2: Chroma 적재·검색 (src/retriever.py)."""

from __future__ import annotations

import json
import shutil

import pytest

from src import retriever
from src.config import ROOT
from src.retriever import (
    CATALOG_COLLECTIONS,
    KNOWLEDGE_COLLECTION,
    CatalogNotReviewedError,
    catalog_metadata,
    ingest_catalog,
    ingest_knowledge,
    load_catalog_items,
    search_catalog,
    search_knowledge,
    where_all,
)

POISONED = ROOT / "evaluation" / "fixtures" / "poisoned" / "knowledge_injection.md"


# ---------------------------------------------------------------- 카탈로그


def test_catalog_ingest_counts_and_idempotent(empty_chroma, fake_embeddings):
    rep = ingest_catalog(empty_chroma, fake_embeddings)
    assert rep.counts == {"catalog_activity": 28, "catalog_diet": 50, "catalog_health": 29}
    rep2 = ingest_catalog(empty_chroma, fake_embeddings)
    assert rep2.counts == rep.counts
    assert sum(rep2.counts.values()) == 107


def test_catalog_stale_ids_removed(empty_chroma, fake_embeddings):
    ingest_catalog(empty_chroma, fake_embeddings)
    col = empty_chroma.get_collection(CATALOG_COLLECTIONS["activity"])
    col.add(ids=["act_dog_removed_99"], documents=["x"], embeddings=[[0.0] * 64])
    rep = ingest_catalog(empty_chroma, fake_embeddings)
    assert rep.removed["catalog_activity"] == 1
    assert col.count() == 28


def test_unreviewed_catalog_rejected(tmp_path, empty_chroma, fake_embeddings):
    for f in (ROOT / "data" / "catalog").glob("*.json"):
        shutil.copy(f, tmp_path / f.name)
    path = tmp_path / "activities.json"
    items = json.loads(path.read_text("utf-8"))
    items[0]["reviewed"] = False
    path.write_text(json.dumps(items, ensure_ascii=False), "utf-8")
    with pytest.raises(CatalogNotReviewedError, match="검증 실패"):
        ingest_catalog(empty_chroma, fake_embeddings, catalog_dir=tmp_path)
    assert all(c.name not in CATALOG_COLLECTIONS.values() or c.count() == 0
               for c in empty_chroma.list_collections())


def test_catalog_metadata_lists_kept():
    item = load_catalog_items()["act_dog_nosework_find_it_01"]
    meta = catalog_metadata(item)
    assert "senior" in meta["age_groups"] and meta["species"] == ["dog"]
    assert meta["intensity"] == "low" and meta["recommendable"] is True
    assert meta["source_url"].startswith("http")
    assert "contraindications" not in meta or meta["contraindications"]  # 빈 리스트는 키 제외


def test_catalog_list_filters(empty_chroma, fake_embeddings):
    ingest_catalog(empty_chroma, fake_embeddings)
    col = empty_chroma.get_collection("catalog_activity")
    indoor_dog = col.get(where=where_all({"tags": {"$contains": "indoor"}},
                                         {"species": {"$contains": "dog"}}))["ids"]
    assert "act_dog_nosework_find_it_01" in indoor_dog
    diet = empty_chroma.get_collection("catalog_diet")
    no_chicken = diet.get(where={"allergens": {"$not_contains": "chicken"}})["ids"]
    with_chicken = diet.get(where={"allergens": {"$contains": "chicken"}})["ids"]
    assert with_chicken and not set(with_chicken) & set(no_chicken)
    assert len(no_chicken) + len(with_chicken) == 50


def test_search_catalog_returns_similar_first(empty_chroma, fake_embeddings):
    ingest_catalog(empty_chroma, fake_embeddings)
    item = load_catalog_items()["act_dog_nosework_find_it_01"]
    hits = search_catalog(empty_chroma, fake_embeddings, "activity", item["name"],
                          where={"species": {"$contains": "dog"}}, k=5)
    assert hits[0].item_id == "act_dog_nosework_find_it_01"
    assert all("dog" in h.metadata["species"] for h in hits)
    assert hits == sorted(hits, key=lambda h: -h.similarity)


# ---------------------------------------------------------------- 지식


def test_knowledge_ingest_all_docs(empty_chroma, fake_embeddings):
    rep = ingest_knowledge(empty_chroma, fake_embeddings)
    assert rep.rejected == []
    col = empty_chroma.get_collection(KNOWLEDGE_COLLECTION)
    files = {m["file"] for m in col.get()["metadatas"]}
    assert len(files) == 8
    n = rep.counts[KNOWLEDGE_COLLECTION]
    assert n >= 8 * 5  # 문서당 3~10KB → 청크 여러 개
    assert ingest_knowledge(empty_chroma, fake_embeddings).counts[KNOWLEDGE_COLLECTION] == n


def test_poisoned_doc_rejected(empty_chroma, fake_embeddings):
    rep = ingest_knowledge(empty_chroma, fake_embeddings, paths=[POISONED])
    assert len(rep.rejected) == 1 and "주입 패턴" in rep.rejected[0]
    assert empty_chroma.get_collection(KNOWLEDGE_COLLECTION).count() == 0


def test_pii_doc_rejected(tmp_path, empty_chroma, fake_embeddings):
    doc = tmp_path / "pii.md"
    doc.write_text("---\nsource: t/pii\nspecies: dog\ncategory: general\n---\n문의 010-1234-5678\n",
                   "utf-8")
    rep = ingest_knowledge(empty_chroma, fake_embeddings, paths=[doc])
    assert rep.rejected and "PII(phone)" in rep.rejected[0]
    assert "010-1234-5678" not in " ".join(rep.rejected)  # 값은 남기지 않는다


def test_missing_front_matter_rejected(tmp_path, empty_chroma, fake_embeddings):
    doc = tmp_path / "bad.md"
    doc.write_text("# 제목만\n본문", "utf-8")
    rep = ingest_knowledge(empty_chroma, fake_embeddings, paths=[doc])
    assert rep.rejected and "front matter" in rep.rejected[0]


def test_search_knowledge_species_filter(empty_chroma, fake_embeddings):
    ingest_knowledge(empty_chroma, fake_embeddings)
    hits = search_knowledge(empty_chroma, fake_embeddings, "고양이 사료 급여량", "cat", k=10)
    assert hits and all(h.species in {"cat", "all"} for h in hits)
    dog_diet = search_knowledge(empty_chroma, fake_embeddings, "사료", "dog", category="diet", k=10)
    assert dog_diet and all(h.category == "diet" and h.species in {"dog", "all"} for h in dog_diet)


def test_where_all():
    assert where_all() is None
    assert where_all({"a": 1}, None) == {"a": 1}
    assert where_all({"a": 1}, {"b": 2}) == {"$and": [{"a": 1}, {"b": 2}]}


# ---------------------------------------------------------------- 실제 서버 + Titan


@pytest.mark.chroma
@pytest.mark.llm
def test_real_ingest_and_search():
    """실제 Chroma(:8001)와 Titan 임베딩으로 적재·검색 (python -m src.retriever --ingest와 같은 경로)."""
    try:
        client = retriever.get_client()
        client.heartbeat()
    except Exception:
        pytest.skip("Chroma 서버(:8001)가 없다")
    emb = retriever.get_embeddings()
    rep = ingest_catalog(client, emb)
    assert sum(rep.counts.values()) == 107
    ingest_knowledge(client, emb)
    hits = search_catalog(client, emb, "activity", "강아지 노즈워크 냄새 찾기 놀이",
                          where={"species": {"$contains": "dog"}}, k=5)
    assert "act_dog_nosework_find_it_01" in [h.item_id for h in hits[:3]]
    know = search_knowledge(client, emb, "강아지에게 초콜릿을 줘도 되나요", "dog", k=4)
    assert any("초콜릿" in h.text for h in know)
