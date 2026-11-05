"""A-0: 테스트용 시드 적재와 저장 형식(ARCHITECTURE.md 5.1) 확인."""

from __future__ import annotations

import json

import pytest

from src.retriever import decode_app_record, encode_app_record
from src.tests.seed_loader import load_seed, read_seed

EXPECTED_COUNTS = {
    "users": 6,
    "pets": 7,
    "tasks": 14,
    "health_events": 9,  # 활성 5건 + 완료 이력·코코 일정 (USER_SCENARIO.md 2.3)
    "weight_logs": 3,
    "interactions": 9,
    "preferences": 3,
    "chat_logs": 1,
}


def test_seed_counts(chroma_client):
    counts = {c.name: c.count() for c in chroma_client.list_collections()}
    assert counts == EXPECTED_COUNTS


def test_document_roundtrip(chroma_client):
    got = chroma_client.get_collection("pets").get(ids=["pet_bori"])
    pet = decode_app_record(got["documents"][0])
    assert pet["name"] == "보리"
    assert pet["allergies"] == ["chicken"]


def test_metadata_list_filter(chroma_client):
    pets = chroma_client.get_collection("pets")
    allergic = pets.get(where={"allergies": {"$contains": "chicken"}})["ids"]
    assert allergic == ["pet_bori"]
    # 키가 없는(알레르기 없음) 반려동물도 $not_contains에 포함된다
    others = pets.get(where={"allergies": {"$not_contains": "chicken"}})["ids"]
    assert "pet_bori" not in others and len(others) == 6


def test_user_scoped_query(chroma_client):
    pets = chroma_client.get_collection("pets")
    ids = sorted(pets.get(where={"user_id": "usr_69d308a849e0"})["ids"])
    assert "pet_bori" in ids and "pet_mocha" not in ids


def test_encode_rules():
    row = {
        "id": "x_1",
        "user_id": "u",
        "pet_id": None,
        "tags": [],
        "allergies": ["a"],
        "default_times": {"walk": "19:00"},
        "memo": "긴 메모",
        "created_at": "2026-11-03T18:20:00+09:00",
        "done": False,
    }
    rid, doc, meta = encode_app_record(row)
    assert rid == "x_1"
    assert json.loads(doc) == row
    assert meta == {
        "user_id": "u",
        "allergies": ["a"],
        "done": False,
        "created_at": "2026-11-03T18:20:00+09:00",
        "created_ts": 1793697600,
    }


def test_password_hash_not_in_metadata(chroma_client):
    metas = chroma_client.get_collection("users").get()["metadatas"]
    assert all("password_hash" not in m for m in metas)


def test_variant_mocha_joint(empty_chroma):
    load_seed(empty_chroma, "mocha_joint")
    doc = empty_chroma.get_collection("pets").get(ids=["pet_mocha"])["documents"][0]
    assert decode_app_record(doc)["conditions"] == ["joint_disease"]


def test_variant_hodu_dislikes_adds_rows():
    base = read_seed()
    var = read_seed("hodu_dislikes")
    assert len(var["interactions"]) > len(base["interactions"])


def test_variant_setup_queries_warns():
    with pytest.warns(UserWarning, match="setup_queries"):
        read_seed("bori_pending_hitl")


def test_app_records_fixture_is_current():
    """Node가 읽는 공유 기준 사례 파일이 지금 시드·인코딩 규칙과 같다 (다르면 make_fixtures로 갱신)."""
    from src.tests.make_fixtures import FIXTURE_PATH, render

    assert FIXTURE_PATH.read_text(encoding="utf-8") == render(), "python -m src.tests.make_fixtures 로 갱신"
