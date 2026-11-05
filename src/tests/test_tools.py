"""A-4: 도구 (src/tools.py @tool 12종) — ARCHITECTURE.md 3.4, 3.7."""

from __future__ import annotations

import json
from datetime import date

import pytest
from langchain.tools import ToolRuntime

from src import config, tools
from src.config import AgentContext
from src.retriever import catalog_index, ingest_knowledge

P3 = "usr_69d308a849e0"  # 이지우: 보리·나비
P2 = "usr_a80678fb2f7a"  # 박서준: 모카
P1 = "usr_1c3544ae18bc"  # 김하늘: 콩이


@pytest.fixture
def env(catalog_loaded, fake_embeddings, today, monkeypatch):
    """시드 + 카탈로그 + 지식(가짜 임베딩) + 기준일 11/10."""
    ingest_knowledge(catalog_loaded, fake_embeddings)
    for key in ("WEB_SEARCH_MOCK", "EVAL_MODE", "WEB_SEARCH_BLOCKED_DOMAINS"):
        monkeypatch.setenv(key, "")  # 빈 값: .env가 되살리지 못하게 (override=False)
    config.get_settings.cache_clear()
    tools.configure_resources(client=catalog_loaded, embeddings=fake_embeddings, catalog=catalog_index())
    yield catalog_loaded
    config.get_settings.cache_clear()


def call(tool, ctx_user: str, ctx_pet: str, /, eval_query_id: str | None = None, **args):
    """도구를 실제 Agent처럼 tool_call로 실행한다. (content dict, artifact). args는 LLM이 넘기는 인자."""
    ctx = AgentContext(user_id=ctx_user, pet_id=ctx_pet, thread_id=f"thr_{ctx_user}_{ctx_pet}_t",
                       eval_query_id=eval_query_id)
    rt = ToolRuntime(state={}, context=ctx, config={}, stream_writer=None, tool_call_id="c1", store=None)
    msg = tool.invoke({"type": "tool_call", "id": "c1", "name": tool.name, "args": {**args, "runtime": rt}})
    return json.loads(msg.content), msg.artifact


# ---------------------------------------------------------------- 스키마


def test_twelve_tools_and_no_identity_args():
    assert len(tools.ALL_TOOLS) == 12
    for t in tools.ALL_TOOLS:
        props = t.tool_call_schema.model_json_schema().get("properties", {})
        assert "user_id" not in props and "runtime" not in props, t.name
        assert t.description and len(t.description) > 30, t.name


def test_agent_tool_sets():
    names = lambda ts: {t.name for t in ts}  # noqa: E731
    for group in (tools.DIET_TOOLS, tools.EXERCISE_TOOLS, tools.HEALTH_TOOLS):
        assert "web_search" not in names(group)
    assert names(tools.GENERAL_TOOLS) == {"get_pet_profile", "list_my_pets", "search_pet_knowledge", "web_search"}
    assert not names(tools.GENERAL_TOOLS) & (tools.WRITE_TOOLS | {"recommend_from_catalog", "remember_preference"})
    assert names(tools.HEALTH_TOOLS) >= tools.WRITE_TOOLS


# ---------------------------------------------------------------- 격리


def test_other_users_pet_rejected(env):
    for tool in (tools.get_pet_profile, tools.get_health_schedule, tools.get_upcoming_events):
        out, _ = call(tool, P3, "pet_bori", pet_id="pet_mocha")
        assert "error" in out, tool.name


def test_context_pet_not_owned_rejected(env):
    out, _ = call(tools.get_pet_profile, P3, "pet_mocha")
    assert "error" in out
    out, art = call(tools.recommend_from_catalog, P3, "pet_mocha", category="activity", query="놀이")
    assert "error" in out and art["item_ids"] == []


def test_list_my_pets_only_own(env):
    out, _ = call(tools.list_my_pets, P3, "pet_bori")
    assert {p["id"] for p in out} == {"pet_bori", "pet_nabi"}
    assert next(p for p in out if p["id"] == "pet_bori")["current"] is True


def test_profile_same_user_other_pet(env):
    out, _ = call(tools.get_pet_profile, P3, "pet_bori", pet_id="pet_nabi")
    assert out["name"] == "나비" and out["species"] == "cat"
    bori, _ = call(tools.get_pet_profile, P3, "pet_bori")
    assert bori["allergies"] == ["chicken"] and bori["age_group"] == "adult" and "user_id" not in bori


# ---------------------------------------------------------------- 칼로리


def test_calories_bori_weight_loss():
    out = json.loads(tools.calc_daily_calories.invoke(
        {"species": "dog", "weight_kg": 33.2, "age_months": 67, "neutered": True, "goal": "weight_loss"}))
    assert out["rer_kcal"] == 968 and out["der_kcal"] == 968 and out["meals_per_day"] == 2
    maintain = json.loads(tools.calc_daily_calories.invoke(
        {"species": "dog", "weight_kg": 33.2, "age_months": 67, "neutered": True}))
    assert maintain["der_kcal"] == round(70 * 33.2 ** 0.75 * 1.6)


@pytest.mark.parametrize(("args", "factor"), [
    ({"species": "cat", "weight_kg": 4.0, "age_months": 30, "neutered": True}, 1.2),
    ({"species": "cat", "weight_kg": 4.0, "age_months": 30, "neutered": False}, 1.4),
    ({"species": "cat", "weight_kg": 2.0, "age_months": 5, "neutered": False}, 2.5),
    ({"species": "dog", "weight_kg": 3.1, "age_months": 3, "neutered": False}, 3.0),
    ({"species": "dog", "weight_kg": 3.1, "age_months": 6, "neutered": False}, 2.0),
    ({"species": "dog", "weight_kg": 10, "age_months": 40, "neutered": True, "activity_level": "low"}, 1.4),
])
def test_calorie_factors(args, factor):
    out = json.loads(tools.calc_daily_calories.invoke(args))
    assert out["factor"] == factor
    if args["species"] == "cat" and args["age_months"] == 30 and args["neutered"]:
        assert (out["rer_kcal"], out["der_kcal"]) == (198, 238)  # diet_cat.md 예시


def test_calorie_schema_rejects_bad_weight():
    with pytest.raises(Exception):
        tools.calc_daily_calories.invoke({"species": "dog", "weight_kg": 0, "age_months": 10, "neutered": True})


# ---------------------------------------------------------------- 추천·지식


def test_recommend_tool_bori_diet(env):
    out, art = call(tools.recommend_from_catalog, P3, "pet_bori", category="diet", query="살 빼는 간식", k=5)
    item_ids = [i["item_id"] for i in out["items"]]
    assert item_ids and "diet_dog_chicken_topping_01" not in item_ids
    assert art["item_ids"] == item_ids and len(art["contexts"]) == len(item_ids)
    assert all(c.startswith(f"[{i}]") for c, i in zip(art["contexts"], item_ids, strict=True))
    assert all(i["source_url"].startswith("http") for i in out["items"])


def test_search_knowledge_tool_uses_pet_species(env):
    out, art = call(tools.search_pet_knowledge, P3, "pet_nabi", query="사료 급여")
    assert out["results"] and art["contexts"] == [r["text"] for r in out["results"]]
    assert all("dog" not in r["source"] for r in out["results"])


# ---------------------------------------------------------------- 취향


def test_remember_dislike_excludes_for_7_days(env):
    out, _ = call(tools.remember_preference, P3, "pet_bori", kind="dislike", target="act_dog_swimming_01",
                  note="물을 싫어함")
    assert out["saved"] and out["excluded_until"] == "2026-11-16"
    prefs, _ = call(tools.get_preferences, P3, "pet_bori")
    assert prefs["dislike"][0]["target"] == "act_dog_swimming_01"
    rec, _ = call(tools.recommend_from_catalog, P3, "pet_bori", category="activity", query="수영", k=5)
    assert "act_dog_swimming_01" not in [i["item_id"] for i in rec["items"]]


def test_remember_free_text_and_common_constraint(env):
    like, _ = call(tools.remember_preference, P3, "pet_bori", kind="like", target="연어")
    assert like["saved"] and like["applies_to_recommendation"] is False
    c, _ = call(tools.remember_preference, P3, "pet_bori", kind="constraint",
                target="activity_time_after:19:00", scope="all_pets")
    assert c["applies_to_recommendation"] is True
    nabi_prefs, _ = call(tools.get_preferences, P3, "pet_nabi")
    assert nabi_prefs["constraint"][0]["scope"] == "all_pets"


def test_remember_unknown_catalog_id_rejected(env):
    out, _ = call(tools.remember_preference, P3, "pet_bori", kind="like", target="act_dog_fake_99")
    assert "error" in out


def test_get_preferences_mocha(env):
    out, _ = call(tools.get_preferences, P2, "pet_mocha")
    assert out["dislike"][0]["excluded_until"] == "2026-11-14"
    assert out["constraint"][0]["target"] == "activity_time_after:19:00"


# ---------------------------------------------------------------- 건강 일정


def test_upcoming_events_kongi(env):
    out, _ = call(tools.get_upcoming_events, P1, "pet_kongi")
    assert [(e["event_id"], e["d_day"]) for e in out["events"]] == [("evt_kongi_dhpp3", 3), ("evt_kongi_rabies", 7)]
    full, _ = call(tools.get_health_schedule, P1, "pet_kongi")
    assert any(e["status"] == "needs_history" for e in full["events"])


def test_create_health_event_validations(env):
    nabi = lambda **a: call(tools.create_health_event, P3, "pet_nabi", **a)[0]  # noqa: E731
    assert "error" in nabi(catalog_item_id="hc_dog_rabies", due_date="2026-11-20")  # 종 불일치
    assert "error" in nabi(catalog_item_id="hc_cat_rabies", due_date="2026-11-01")  # 지난 날짜
    assert "error" in nabi(catalog_item_id="hc_cat_fake", due_date="2026-11-20")  # 없는 항목
    ok = nabi(catalog_item_id="hc_cat_rabies", due_date="2026-11-20")
    assert ok["created"] and ok["event"]["type"] == "vaccine" and ok["event"]["d_day"] == 10
    assert "error" in nabi(catalog_item_id="hc_cat_rabies", due_date="2026-11-21")  # 중복
    rows = env.get_collection("health_events").get(where={"pet_id": "pet_nabi"})["metadatas"]
    assert any(m.get("catalog_item_id") == "hc_cat_rabies" and m["user_id"] == P3 for m in rows)


def test_update_health_event(env):
    other, _ = call(tools.update_health_event, P3, "pet_bori", event_id="evt_kongi_dhpp3", due_date="2026-11-20")
    assert "error" in other  # 다른 사용자·반려동물 일정
    done, _ = call(tools.update_health_event, P1, "pet_kongi", event_id="evt_kongi_dhpp1", due_date="2026-11-20")
    assert "error" in done  # 완료한 일정
    ok, _ = call(tools.update_health_event, P1, "pet_kongi", event_id="evt_kongi_dhpp3", due_date="2026-11-14")
    assert ok["updated"] and ok["event"]["due_date"] == "2026-11-14"


# ---------------------------------------------------------------- 웹 검색


def test_filter_and_rank_results():
    raw = [
        {"title": "blog", "link": "https://someblog.example.com/a", "snippet": "s"},
        {"title": "casino", "link": "https://best-casino.com/pets", "snippet": "s"},
        {"title": "AAHA", "link": "https://www.aaha.org/x", "snippet": "s"},
        {"title": "gov", "link": "https://www.mafra.go.kr/y", "snippet": "s"},
        {"title": "ftp", "link": "ftp://files.example.com/z", "snippet": "s"},
        {"title": "custom", "link": "https://bad.example.org/q", "snippet": "s"},
    ]
    got, blocked = tools.filter_and_rank_results(raw, extra_blocked=["bad.example.org"])
    assert [r["title"] for r in got] == ["gov", "AAHA", "blog"]
    assert blocked == 3


def test_web_search_mock_uses_fixture(env, monkeypatch):
    monkeypatch.setenv("WEB_SEARCH_MOCK", "true")
    monkeypatch.setenv("EVAL_MODE", "true")
    config.get_settings.cache_clear()
    out, art = call(tools.web_search, P3, "pet_bori", eval_query_id="general-01", query="강아지 여행")
    assert out["results"] and art["sources"] == [r["url"] for r in out["results"]]
    tiers = [tools.trust_tier(u) for u in art["sources"]]
    assert tiers == sorted(tiers)
    none, _ = call(tools.web_search, P3, "pet_bori", eval_query_id="no-such-id", query="강아지 여행")
    assert none["results"] == []


def test_web_search_failure_returns_error(env, monkeypatch):
    def boom(*a, **k):
        raise TimeoutError("down")
    monkeypatch.setattr(tools, "_search_backend", boom)
    out, art = call(tools.web_search, P3, "pet_bori", query="고양이 이사")
    assert out["results"] == [] and "error" in out and art["sources"] == []


def test_web_search_query_length_validated(env):
    with pytest.raises(Exception):
        call(tools.web_search, P3, "pet_bori", query="x")


@pytest.mark.llm
def test_real_duckduckgo(env):
    """실제 DuckDuckGo (키 없음). 네트워크·일시 차단이면 빈 결과 + error라도 통과 형식을 지킨다."""
    out, art = call(tools.web_search, P3, "pet_bori", query="dog vaccination schedule AAHA")
    assert "results" in out
    if out["results"]:
        assert all(u.startswith("http") for u in art["sources"])
    else:
        assert "error" in out or out["results"] == []


def test_today_override_used(env):
    assert config.today_kst() == date(2026, 11, 10)


def test_app_store_upsert_replaces_metadata(chroma_client):
    """Chroma upsert는 metadata를 합치므로, 갱신 때 빠진 키(예: excluded_until)가 남으면 안 된다."""
    store = tools.AppStore(chroma_client)
    row = {"id": "pref_t_1", "user_id": "usr_69d308a849e0", "pet_id": "pet_bori", "kind": "dislike",
           "target": "act_dog_nosework_find_it_01", "note": "", "score": -3, "excluded_until": "2099-01-01",
           "updated_at": "2026-11-08T21:00:00+09:00"}
    store._upsert("preferences", row)
    store._upsert("preferences", {**row, "kind": "like", "score": 3, "excluded_until": None})
    col = chroma_client.get_collection("preferences")
    assert "excluded_until" not in col.get(ids=["pref_t_1"])["metadatas"][0]
    assert col.get(where={"excluded_until": "2099-01-01"})["ids"] == []
