"""A-1: 설정·날짜 공통 모듈 (src/config.py)."""

from __future__ import annotations

import json
from datetime import date
from pathlib import Path

import pytest

from src import config
from src.config import (
    AgentContext,
    ConfigError,
    age_group,
    age_months,
    d_day,
    load_settings,
    today_kst,
    within_days,
)

CASES = json.loads((Path(__file__).parent / "fixtures" / "date_cases.json").read_text("utf-8"))
_ENV_KEYS = (
    "AWS_DEFAULT_REGION", "AWS_MODEL", "AWS_EMBED_MODEL", "AGENT_API_KEY", "EVAL_MODE",
    "DEMO_USER_ID", "TODAY_OVERRIDE", "CHROMA_HOST", "CHROMA_PORT", "CHECKPOINT_PATH",
    "WEB_SEARCH_MOCK", "WEB_SEARCH_BLOCKED_DOMAINS",
)


@pytest.fixture
def clean_env(monkeypatch):
    """실제 .env·환경변수 영향을 없앤다."""
    for key in _ENV_KEYS:
        monkeypatch.delenv(key, raising=False)
    return monkeypatch


# ---------------------------------------------------------------- 연령·D-day (공유 사례)


@pytest.mark.parametrize("c", CASES["age_group"], ids=lambda c: c["note"])
def test_age_group_cases(c):
    birth, on = date.fromisoformat(c["birth"]), date.fromisoformat(c["on"])
    assert age_months(birth, on) == c["months"]
    assert age_group(c["species"], c["size"], birth, on) == c["group"]


@pytest.mark.parametrize("c", CASES["d_day"], ids=lambda c: c["note"])
def test_d_day_cases(c):
    due, today = date.fromisoformat(c["due"]), date.fromisoformat(c["today"])
    assert d_day(due, today) == c["d_day"]
    assert within_days(due, today, 7) is c["within_7"]


def test_age_before_birth_rejected():
    with pytest.raises(ValueError):
        age_months(date(2026, 11, 11), date(2026, 11, 10))


def test_seed_pets_age_groups():
    """USER_SCENARIO.md 2장 페르소나의 연령 구간 (기준일 2026-11-10)."""
    pets = {p["id"]: p for p in json.loads(
        (config.ROOT / "data" / "seed" / "pets.json").read_text("utf-8"))}
    on = date(2026, 11, 10)

    def group(pid: str) -> str:
        p = pets[pid]
        return age_group(p["species"], p["size"], date.fromisoformat(p["birth_date"]), on)

    assert group("pet_kongi") == "junior"
    assert group("pet_hodu") == "senior"
    assert group("pet_bori") in {"adult", "senior"}


# ---------------------------------------------------------------- 오늘


def test_today_override(clean_env):
    clean_env.setenv("TODAY_OVERRIDE", "2026-11-10")
    assert today_kst() == date(2026, 11, 10)
    assert today_kst().weekday() == 1  # 화요일


def test_today_override_bad_format(clean_env):
    clean_env.setenv("TODAY_OVERRIDE", "2026/11/10")
    with pytest.raises(ConfigError):
        today_kst()
    clean_env.setenv("TODAY_OVERRIDE", "2026-11-1")
    with pytest.raises(ConfigError):
        today_kst()


def test_today_without_override_is_kst(clean_env):
    assert today_kst() == config.now_kst().date()


# ---------------------------------------------------------------- 설정


def test_settings_from_env(clean_env):
    clean_env.setenv("AWS_DEFAULT_REGION", "us-east-1")
    clean_env.setenv("AWS_MODEL", "model-x")
    clean_env.setenv("AWS_EMBED_MODEL", "embed-x")
    clean_env.setenv("CHROMA_PORT", "9001")
    clean_env.setenv("EVAL_MODE", "true")
    clean_env.setenv("DEMO_USER_ID", "usr_69d308a849e0")
    clean_env.setenv("WEB_SEARCH_BLOCKED_DOMAINS", " Bad.com , evil.net ,")
    s = load_settings(env_file=None).require_agent()
    assert s.chroma_port == 9001 and s.eval_mode and s.demo_user_id == "usr_69d308a849e0"
    assert s.web_search_blocked_domains == ("bad.com", "evil.net")
    assert s.checkpoint_path.name == "checkpoints.sqlite"


def test_settings_defaults(clean_env):
    s = load_settings(env_file=None)
    assert s.chroma_host == "localhost" and s.chroma_port == 8001
    assert s.eval_mode is False and s.web_search_mock is False and s.today_override is None


def test_require_agent_lists_missing_keys_only(clean_env):
    clean_env.setenv("AWS_MODEL", "secret-model-value")
    with pytest.raises(ConfigError) as exc:
        load_settings(env_file=None).require_agent()
    msg = str(exc.value)
    assert "AWS_DEFAULT_REGION" in msg and "AWS_EMBED_MODEL" in msg
    assert "secret-model-value" not in msg


def test_eval_mode_requires_demo_user(clean_env):
    for k, v in (("AWS_DEFAULT_REGION", "r"), ("AWS_MODEL", "m"), ("AWS_EMBED_MODEL", "e"),
                 ("EVAL_MODE", "1")):
        clean_env.setenv(k, v)
    with pytest.raises(ConfigError, match="DEMO_USER_ID"):
        load_settings(env_file=None).require_agent()


def test_secret_not_in_repr(clean_env):
    clean_env.setenv("AGENT_API_KEY", "super-secret-123")
    s = load_settings(env_file=None)
    assert s.agent_api_key == "super-secret-123"
    assert "super-secret-123" not in repr(s)


def test_bad_port(clean_env):
    clean_env.setenv("CHROMA_PORT", "abc")
    with pytest.raises(ConfigError):
        load_settings(env_file=None)


def test_real_env_file_loads():
    """실제 .env가 있으면 Agent 필수 키가 채워져 있다 (값은 출력하지 않는다)."""
    if not (config.ROOT / ".env").exists():
        pytest.skip(".env 없음")
    config.get_settings.cache_clear()
    config.get_settings().require_agent()


# ---------------------------------------------------------------- 컨텍스트


def test_agent_context_requires_ids():
    ctx = AgentContext(user_id="usr_1", pet_id="pet_1", thread_id="thr_usr_1_pet_1_x")
    assert ctx.eval_query_id is None
    with pytest.raises(ValueError):
        AgentContext(user_id="", pet_id="pet_1", thread_id="t")
