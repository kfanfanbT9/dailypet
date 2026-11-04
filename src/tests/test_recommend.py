"""A-3: 추천 엔진 (src/tools.py) — ARCHITECTURE.md 3.8, 4.1.2, USER_SCENARIO S03·S04·S05·S07·S21."""

from __future__ import annotations

from datetime import date

import pytest

from src.retriever import catalog_index
from src.tests.seed_loader import load_seed, read_seed
from src.tools import (
    AppStore,
    PetProfile,
    PreferenceState,
    activity_times,
    build_preference_state,
    generate_daily_plan,
    parse_constraint,
    recommend,
    safety_filter,
)

D10, D11, D14, D15 = date(2026, 11, 10), date(2026, 11, 11), date(2026, 11, 14), date(2026, 11, 15)
CATALOG = catalog_index()
USERS = {
    "pet_bori": "usr_69d308a849e0",
    "pet_nabi": "usr_69d308a849e0",
    "pet_mocha": "usr_a80678fb2f7a",
    "pet_hodu": "usr_d6eff68d8ef0",
    "pet_kongi": "usr_1c3544ae18bc",
    "pet_coco": "usr_3263e0395d81",
}


def setup(pet_id: str, today: date, variant: str | None = None, *, extra_prefs=(),
          extra_interactions=(), drop_prefs=()) -> tuple[PetProfile, PreferenceState]:
    """시드(+변형)에서 반려동물·취향 상태를 만든다 (Chroma 없이 순수 함수 경로)."""
    seed = read_seed(variant) if variant != "bori_pending_hitl" else read_seed()
    uid = USERS[pet_id]
    pet = PetProfile.from_row(next(p for p in seed["pets"] if p["id"] == pet_id), today)
    mine = lambda rows: [r for r in rows if r["user_id"] == uid and r.get("pet_id") == pet_id]  # noqa: E731
    prefs = [r for r in seed["preferences"]
             if r["user_id"] == uid and r.get("pet_id") in (None, pet_id) and r["id"] not in drop_prefs]
    state = build_preference_state(
        mine(seed["interactions"]) + list(extra_interactions),
        prefs + list(extra_prefs),
        mine(seed["tasks"]),
        today,
    )
    return pet, state


def ids(result) -> list[str]:
    return [r.item_id for r in result.items]


# ---------------------------------------------------------------- 결정성


def test_deterministic():
    pet, st = setup("pet_bori", D10)
    runs = {tuple(ids(recommend("activity", CATALOG, pet, st, D10, k=5))) for _ in range(10)}
    assert len(runs) == 1


# ---------------------------------------------------------------- 안전 필터 (S05, S07)


def test_bori_no_chicken():
    pet, st = setup("pet_bori", D10)
    got = recommend("diet", CATALOG, pet, st, D10, k=50)
    assert got.items
    assert all("chicken" not in (CATALOG[i].get("allergens") or []) for i in ids(got))
    assert "diet_dog_chicken_topping_01" not in ids(got)


def test_harmful_never_recommended():
    for pet_id in USERS:
        pet, st = setup(pet_id, D10)
        got = ids(recommend("diet", CATALOG, pet, st, D10, k=50))
        assert all(CATALOG[i]["recommendable"] and CATALOG[i]["subtype"] != "harmful_food" for i in got)


def test_hodu_senior_low_no_joint_risk():
    pet, st = setup("pet_hodu", D10)
    assert pet.age_group == "senior" and pet.max_intensity == "low"
    got = recommend("activity", CATALOG, pet, st, D10, k=3)
    assert len(got.items) == 3
    for iid in ids(got):
        item = CATALOG[iid]
        assert "senior" in item["age_groups"] and item["intensity"] == "low"
        assert "outdoor" not in item["tags"]
        assert "joint_disease" not in item["contraindications"]


def test_intensity_caps():
    kongi, _ = setup("pet_kongi", D10)
    mocha, _ = setup("pet_mocha", D10)
    bori, _ = setup("pet_bori", D10)
    assert (kongi.age_group, kongi.max_intensity) == ("junior", "medium")
    assert mocha.max_intensity == "medium"  # 활동량 낮음 → 고강도만 제외
    assert bori.max_intensity == "high"
    acts = [c for c in CATALOG.values() if c["category"] == "activity"]
    assert all(it["intensity"] != "high" for it in safety_filter(acts, kongi))


def test_large_breed_items_only_for_large_dogs(chroma_client):
    kongi, _ = setup("pet_kongi", D10)  # 소형 강아지
    diets = [c for c in CATALOG.values() if c["category"] == "diet"]
    assert "diet_dog_large_breed_puppy_01" not in [it["item_id"] for it in safety_filter(diets, kongi)]
    p = plan(chroma_client, "pet_kongi", D10)
    assert [t["catalog_item_id"] for t in p.tasks if t["category"] == "diet"] == ["diet_dog_puppy_meal_guide_01"]


def test_daily_diet_prefers_meal_guide_and_is_stable():
    """기본 우선순위: 급여 가이드가 간식보다 앞, 1개만 고르는 영역은 다양성으로 바뀌지 않는다."""
    pet, st = setup("pet_bori", D10)
    first = ids(recommend("diet", CATALOG, pet, st, D10, k=1))
    assert first == ["diet_dog_weight_loss_plan_01"]  # 11/03 완료 신호 + 체중 관리
    pet_n, st_n = setup("pet_nabi", D10)
    assert CATALOG[ids(recommend("diet", CATALOG, pet_n, st_n, D10, k=1))[0]]["subtype"] == "feeding_guide"


def test_mocha_joint_variant_condition_filter_only():
    """S07 예외 A: 기본 시드에서는 후보, 변형에서는 질환 금기로만 빠진다."""
    pet, st = setup("pet_mocha", D10)
    assert "act_cat_cat_tree_climb_01" in ids(recommend("activity", CATALOG, pet, st, D10, k=30, min_count=0))
    pet_j, st_j = setup("pet_mocha", D10, "mocha_joint")
    assert "act_cat_cat_tree_climb_01" not in ids(recommend("activity", CATALOG, pet_j, st_j, D10, k=30, min_count=0))


# ---------------------------------------------------------------- 👎 (S04)


@pytest.mark.parametrize("today", [D10, D14])
def test_mocha_dislike_excluded_until_1114(today):
    pet, st = setup("pet_mocha", today)
    assert "act_cat_wand_hunt_01" not in ids(recommend("activity", CATALOG, pet, st, today, k=30, min_count=0))


def test_mocha_dislike_returns_1115_with_penalty():
    pet, st = setup("pet_mocha", D15)
    assert "act_cat_wand_hunt_01" in ids(recommend("activity", CATALOG, pet, st, D15, k=30))
    assert st.signal_scores["act_cat_wand_hunt_01"] < 0  # 기간 후 −3


def test_dislike_deleted_returns_immediately():
    pet, st = setup("pet_mocha", D10, drop_prefs={"pref_mocha_dislike_wand"})
    assert "act_cat_wand_hunt_01" in ids(recommend("activity", CATALOG, pet, st, D10, k=30))
    assert st.signal_scores.get("act_cat_wand_hunt_01", 0) == 0


def test_like_raises_rank_next_day():
    """S04 3단계: 11/10 사료 던져 쫓기에 👍 → 11/11 활동 상위 3개 안, 순위가 같거나 높다."""
    pet, before = setup("pet_mocha", D11)
    like = {"id": "int_test_like", "user_id": USERS["pet_mocha"], "pet_id": "pet_mocha",
            "catalog_item_id": "act_cat_kibble_chase_01", "signal": "like",
            "created_at": "2026-11-10T19:40:00+09:00"}
    _, after = setup("pet_mocha", D11, extra_interactions=[like])
    r_before = ids(recommend("activity", CATALOG, pet, before, D11, k=30))
    r_after = ids(recommend("activity", CATALOG, pet, after, D11, k=3))
    assert "act_cat_kibble_chase_01" in r_after
    assert r_after.index("act_cat_kibble_chase_01") <= r_before.index("act_cat_kibble_chase_01")


# ---------------------------------------------------------------- 단골·다양성 (S21)


def test_relaxation_only_when_short():
    """k개를 못 채우면 👎를 다시 넣는다 — 후보 존재만 볼 때는 min_count=0."""
    pet, st = setup("pet_mocha", D10)
    full = recommend("activity", CATALOG, pet, st, D10, k=30)
    assert "dislike" in full.relaxation
    wand = next(r for r in full.items if r.item_id == "act_cat_wand_hunt_01")
    assert wand.relaxed == ("dislike",) and wand.rank == len(full.items)


def test_bori_regular_in_top3():
    pet, st = setup("pet_bori", D10)
    assert st.complete_counts["act_dog_nosework_find_it_01"] == 3
    got = recommend("activity", CATALOG, pet, st, D10, k=3)
    top = {r.item_id: r for r in got.items}
    assert "act_dog_nosework_find_it_01" in top and top["act_dog_nosework_find_it_01"].regular


def test_regular_survives_repeat_penalty_and_diversity():
    pet, st = setup("pet_bori", D11)
    st.repeat_counts["act_dog_nosework_find_it_01"] = 10  # 아주 큰 반복 패널티
    for k in (1, 2, 3):
        assert "act_dog_nosework_find_it_01" in ids(recommend("activity", CATALOG, pet, st, D11, k=k))


def test_disliked_regular_not_guaranteed():
    dislike = {"id": "pref_test", "user_id": USERS["pet_bori"], "pet_id": "pet_bori", "kind": "dislike",
               "target": "act_dog_nosework_find_it_01", "excluded_until": "2026-11-16",
               "updated_at": "2026-11-10T09:00:00+09:00", "score": -3, "note": ""}
    pet, st = setup("pet_bori", D11, extra_prefs=[dislike])
    assert "act_dog_nosework_find_it_01" not in ids(recommend("activity", CATALOG, pet, st, D11, k=5, min_count=0))


def test_diversity_slot_fresh_item():
    """S21 3단계: 11/11 활동 할 일 = 단골 노즈워크 + 최근 14일 미추천 1개."""
    pet, st = setup("pet_bori", D11)
    got = recommend("activity", CATALOG, pet, st, D11, k=2)
    assert "act_dog_nosework_find_it_01" in ids(got)
    others = [i for i in ids(got) if i != "act_dog_nosework_find_it_01"]
    assert others and all(i not in st.recent_recommended for i in others)


def test_swimming_dislike_excluded_s21():
    swim = {"id": "pref_bori_swim", "user_id": USERS["pet_bori"], "pet_id": "pet_bori", "kind": "dislike",
            "target": "act_dog_swimming_01", "excluded_until": "2026-11-16",
            "updated_at": "2026-11-10T10:00:00+09:00", "score": -3, "note": ""}
    pet, st = setup("pet_bori", D11, extra_prefs=[swim])
    assert "act_dog_swimming_01" not in ids(recommend("activity", CATALOG, pet, st, D11, k=30, min_count=0))


# ---------------------------------------------------------------- 완화 (S07 예외 B)


def test_hodu_dislikes_relaxes_dislike_but_keeps_safety():
    pet, st = setup("pet_hodu", D10, "hodu_dislikes")
    got = recommend("activity", CATALOG, pet, st, D10, k=3)
    assert len(got.items) == 3
    assert "dislike" in got.relaxation
    assert ids(got)[0] == "act_cat_scratching_stretch_01"  # 👎 아닌 유일한 후보가 먼저
    assert any(r.relaxed == ("dislike",) for r in got.items)
    for iid in ids(got):
        assert CATALOG[iid]["intensity"] == "low" and "senior" in CATALOG[iid]["age_groups"]
    assert "act_cat_wand_hunt_01" not in ids(got)  # 강도 상한은 끝까지 유지


def test_constraint_filter_relaxed_last():
    no_out = {"id": "pref_c", "user_id": USERS["pet_hodu"], "pet_id": "pet_hodu", "kind": "constraint",
              "target": "exclude_tag:indoor", "updated_at": "2026-11-01T10:00:00+09:00",
              "excluded_until": None, "score": 0, "note": ""}
    pet, st = setup("pet_hodu", D10, extra_prefs=[no_out])
    got = recommend("activity", CATALOG, pet, st, D10, k=2)
    assert "constraint" in got.relaxation and all(r.relaxed == ("constraint",) for r in got.items)


def test_daily_plan_does_not_relax_for_target():
    """할 일 생성은 최소 개수(활동 1)만 채우면 완화하지 않는다."""
    pet, st = setup("pet_hodu", D10, "hodu_dislikes")
    got = recommend("activity", CATALOG, pet, st, D10, k=2, min_count=1)
    assert ids(got) == ["act_cat_scratching_stretch_01"] and got.relaxation == []


# ---------------------------------------------------------------- 교체 모드


def test_replace_mode():
    pet, st = setup("pet_mocha", D10)
    current = ids(recommend("activity", CATALOG, pet, st, D10, k=1))[0]
    got = recommend("activity", CATALOG, pet, st, D10, exclude_item_ids=[current], limit=1)
    assert len(got.items) == 1 and got.items[0].item_id not in {current, "act_cat_wand_hunt_01"}
    all_ids = [c["item_id"] for c in CATALOG.values() if c["category"] == "activity"]
    empty = recommend("activity", CATALOG, pet, st, D10, exclude_item_ids=all_ids, limit=1)
    assert empty.items == [] and empty.relaxation == []


def test_similarity_restricts_candidates():
    pet, st = setup("pet_bori", D10)
    sim = {"act_dog_sniff_walk_01": 0.9, "act_dog_fetch_01": 0.5}
    got = recommend("activity", CATALOG, pet, st, D10, similarity=sim, k=3, min_count=0)
    assert set(ids(got)) <= set(sim) | {"act_dog_nosework_find_it_01"}
    assert ids(got)[0] == "act_dog_sniff_walk_01"


# ---------------------------------------------------------------- 점수 규칙 단위


def _sig(item, signal, day, n):
    return {"id": f"i{n}", "user_id": "u", "pet_id": "p", "catalog_item_id": item, "signal": signal,
            "created_at": f"{day}T10:00:00+09:00"}


def test_swap_streak_and_decay():
    rows = [_sig("a", "swap", "2026-11-09", 1), _sig("a", "remove", "2026-11-10", 2),
            _sig("b", "complete", "2026-10-11", 3)]
    st = build_preference_state(rows, [], [], D10)
    assert st.signal_scores["a"] == pytest.approx(-1 * 0.5 ** (1 / 30) - 2)
    assert st.signal_scores["b"] == pytest.approx(0.5)  # 30일 전 → 절반
    future = build_preference_state([_sig("c", "like", "2026-11-12", 4)], [], [], D10)
    assert "c" not in future.signal_scores


def test_like_counted_once():
    rows = [_sig("a", "like", "2026-11-10", 1)]
    pref = {"id": "p1", "kind": "like", "target": "a", "updated_at": "2026-11-10T10:00:00+09:00"}
    st = build_preference_state(rows, [pref], [], D10)
    assert st.signal_scores["a"] == pytest.approx(3.0)


def test_parse_constraint():
    assert parse_constraint("activity_time_after:19:00").kind == "time_after"
    assert parse_constraint("exclude_tag:outdoor").value == "outdoor"
    assert parse_constraint("max_duration_min:15").kind == "max_duration"
    assert parse_constraint("저녁만 가능").kind == "text"
    assert parse_constraint("activity_time_after:25:00").kind == "text"


def test_activity_times_with_constraint():
    pet, st = setup("pet_mocha", D10)
    times = activity_times(pet, st.constraints, 2)
    assert times == ["19:30", "20:30"] and all(t >= "19:00" for t in times)
    bori, bst = setup("pet_bori", D10)
    assert activity_times(bori, bst.constraints, 2) == ["18:00", "19:30"]


# ---------------------------------------------------------------- generate_daily_plan (Chroma 경유)


def plan(client, pet_id, today, **kw):
    return generate_daily_plan(AppStore(client), CATALOG, USERS[pet_id], pet_id, today, **kw)


def test_plan_bori(chroma_client):
    p = plan(chroma_client, "pet_bori", D10)
    by = {c: [t for t in p.tasks if t["category"] == c] for c in ("diet", "activity", "health")}
    assert len(by["diet"]) == 1 and len(by["activity"]) == 2 and by["health"] == []
    assert "act_dog_nosework_find_it_01" in [t["catalog_item_id"] for t in by["activity"]]
    assert by["diet"][0]["catalog_item_id"] != "diet_dog_chicken_topping_01"
    assert all(set(t) >= {"category", "catalog_item_id", "title", "time", "reason", "rank", "relaxed"}
               for t in by["diet"] + by["activity"])


def test_plan_kongi_health_tasks(chroma_client):
    """S03: DHPP 3차(D-3)·광견병(D-7)은 할 일에 있고, 구충(needs_history)은 없다."""
    p = plan(chroma_client, "pet_kongi", D10)
    health = [t for t in p.tasks if t["category"] == "health"]
    assert [t["health_event_id"] for t in health] == ["evt_kongi_dhpp3", "evt_kongi_rabies"]
    assert "3차 D-3" in health[0]["title"] and "D-7" in health[1]["title"]
    assert health[0]["title"].startswith("💉")


def test_plan_mocha_times_and_dislike(chroma_client):
    p = plan(chroma_client, "pet_mocha", D10)
    acts = [t for t in p.tasks if t["category"] == "activity"]
    assert acts and all(t["time"] >= "19:00" for t in acts)
    assert "act_cat_wand_hunt_01" not in [t["catalog_item_id"] for t in acts]
    assert all(t["time"] == "08:00" for t in p.tasks if t["category"] == "diet")


def test_plan_keep_items_reduce_target(chroma_client):
    p = plan(chroma_client, "pet_bori", D10, keep_item_ids=["act_dog_nosework_find_it_01"])
    acts = [t["catalog_item_id"] for t in p.tasks if t["category"] == "activity"]
    assert len(acts) == 1 and "act_dog_nosework_find_it_01" not in acts


def test_plan_replace_mode(chroma_client):
    p = plan(chroma_client, "pet_mocha", D10, category="activity",
             exclude_item_ids=["act_cat_puzzle_feeder_01"], limit=1)
    assert len(p.tasks) == 1 and p.tasks[0]["category"] == "activity"
    assert p.tasks[0]["catalog_item_id"] not in {"act_cat_puzzle_feeder_01", "act_cat_wand_hunt_01"}


def test_plan_hodu_variant_relaxation_not_needed(empty_chroma):
    load_seed(empty_chroma, "hodu_dislikes")
    p = plan(empty_chroma, "pet_hodu", D10)
    acts = [t for t in p.tasks if t["category"] == "activity"]
    assert [t["catalog_item_id"] for t in acts] == ["act_cat_scratching_stretch_01"]


def test_plan_other_users_pet_rejected(chroma_client):
    with pytest.raises(PermissionError):
        generate_daily_plan(AppStore(chroma_client), CATALOG, USERS["pet_bori"], "pet_mocha", D10)


def test_store_scopes_by_user(chroma_client):
    store = AppStore(chroma_client)
    assert {p["id"] for p in store.list_pets(USERS["pet_bori"])} == {"pet_bori", "pet_nabi"}
    prefs = store.list_preferences(USERS["pet_mocha"], "pet_mocha")
    assert {p["id"] for p in prefs} == {"pref_mocha_dislike_wand", "pref_seojun_time_constraint"}
    with pytest.raises(PermissionError):
        store.list_interactions(USERS["pet_mocha"], "pet_bori")
