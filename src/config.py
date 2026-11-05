"""공통 설정과 날짜 규칙 (CLAUDE.md 4.5.3, ARCHITECTURE.md 3.8·7장).

- 설정은 `.env`에서 읽는다. 모델 ID·키를 코드에 쓰지 않는다.
- 모든 날짜 계산의 기준은 Asia/Seoul(KST)이다. 평가·테스트는 `TODAY_OVERRIDE`로 "오늘"을 고정한다.
- 날짜 규칙의 기준 사례는 `src/tests/fixtures/date_cases.json`에 있다. Node Backend(B-1)도 같은 파일로 검증한다.
"""

from __future__ import annotations

import calendar
import os
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from functools import lru_cache
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

from dotenv import load_dotenv

KST = ZoneInfo("Asia/Seoul")
ROOT = Path(__file__).resolve().parents[1]

AgeGroup = Literal["junior", "adult", "senior"]

JUNIOR_MAX_MONTHS = 12  # 12개월 미만이면 어린 동물
SENIOR_YEARS = 7  # 7세 이상이면 시니어
LARGE_DOG_SENIOR_YEARS = 6  # 대형견은 6세 이상

_REQUIRED_FOR_AGENT = ("AWS_DEFAULT_REGION", "AWS_MODEL", "AWS_EMBED_MODEL")
_TRUE = {"1", "true", "yes", "on"}


class ConfigError(RuntimeError):
    """설정 누락·형식 오류. 메시지에는 키 이름만 넣고 값은 넣지 않는다."""


def _env(name: str, default: str | None = None) -> str | None:
    value = os.environ.get(name)
    return value.strip() if value and value.strip() else default


def _env_bool(name: str) -> bool:
    return (_env(name) or "").lower() in _TRUE


def parse_iso_date(value: str, *, key: str = "날짜") -> date:
    """`YYYY-MM-DD` 문자열만 받는다 (저장 형식 규칙)."""
    try:
        parsed = date.fromisoformat(value)
    except ValueError as exc:
        raise ConfigError(f"{key}는 YYYY-MM-DD 형식이어야 한다") from exc
    if parsed.isoformat() != value:
        raise ConfigError(f"{key}는 YYYY-MM-DD 형식이어야 한다")
    return parsed


@dataclass(frozen=True)
class Settings:
    """`.env`에서 읽은 설정. 비밀값은 repr에 나오지 않는다."""

    aws_region: str | None
    aws_model: str | None
    aws_embed_model: str | None
    aws_fallback_model: str | None = None  # 예비 모델 (ARCHITECTURE.md 3.6 5.9, 9장)
    chroma_host: str = "localhost"
    chroma_port: int = 8001
    agent_api_key: str | None = field(default=None, repr=False)
    eval_mode: bool = False
    demo_user_id: str | None = None
    today_override: date | None = None
    checkpoint_path: Path = ROOT / "data" / "checkpoints" / "checkpoints.sqlite"
    web_search_mock: bool = False
    web_search_blocked_domains: tuple[str, ...] = ()
    eval_results_dir: Path | None = None  # 평가 모드에서 실제 웹 검색 질의를 남길 폴더 (ARCHITECTURE.md 3.7)

    def require_agent(self) -> Settings:
        """Agent 서버 실행에 필요한 키가 모두 있는지 확인한다. 없으면 키 이름만 알려 준다."""
        missing = [k for k in _REQUIRED_FOR_AGENT if not _env(k)]
        if missing:
            raise ConfigError(f".env에 필요한 키가 없다: {', '.join(missing)}")
        if self.eval_mode and not self.demo_user_id:
            raise ConfigError("EVAL_MODE=true이면 DEMO_USER_ID가 필요하다")
        return self


def load_settings(env_file: Path | None = ROOT / ".env") -> Settings:
    """환경변수(+ `.env`)에서 설정을 새로 읽는다. 이미 있는 환경변수가 우선한다."""
    if env_file is not None and env_file.exists():
        load_dotenv(env_file, override=False)
    override = _env("TODAY_OVERRIDE")
    port = _env("CHROMA_PORT", "8001") or "8001"
    if not port.isdigit():
        raise ConfigError("CHROMA_PORT는 숫자여야 한다")
    checkpoint = _env("CHECKPOINT_PATH")
    blocked = _env("WEB_SEARCH_BLOCKED_DOMAINS") or ""
    return Settings(
        aws_region=_env("AWS_DEFAULT_REGION"),
        aws_model=_env("AWS_MODEL"),
        aws_embed_model=_env("AWS_EMBED_MODEL"),
        aws_fallback_model=_env("AWS_FALLBACK_MODEL"),
        chroma_host=_env("CHROMA_HOST", "localhost") or "localhost",
        chroma_port=int(port),
        agent_api_key=_env("AGENT_API_KEY"),
        eval_mode=_env_bool("EVAL_MODE"),
        demo_user_id=_env("DEMO_USER_ID"),
        today_override=parse_iso_date(override, key="TODAY_OVERRIDE") if override else None,
        checkpoint_path=(ROOT / checkpoint) if checkpoint else Settings.checkpoint_path,
        web_search_mock=_env_bool("WEB_SEARCH_MOCK"),
        web_search_blocked_domains=tuple(
            d.strip().lower() for d in blocked.split(",") if d.strip()
        ),
        eval_results_dir=_resolve_dir(_env("EVAL_RESULTS_DIR")),
    )


def _resolve_dir(value: str | None) -> Path | None:
    if not value:
        return None
    path = Path(value)
    return path if path.is_absolute() else ROOT / path


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """프로세스에서 한 번 읽은 설정 (테스트는 `get_settings.cache_clear()`)."""
    return load_settings()


# ---------------------------------------------------------------- 날짜


def now_kst() -> datetime:
    return datetime.now(KST)


def today_kst() -> date:
    """KST 기준 오늘. `TODAY_OVERRIDE`가 있으면 그 날짜 (매번 환경변수를 다시 읽는다)."""
    override = _env("TODAY_OVERRIDE")
    if override:
        return parse_iso_date(override, key="TODAY_OVERRIDE")
    return now_kst().date()


def _anniversary(birth: date, year: int, month: int) -> date:
    """해당 연·월의 생일 기념일. 그 달에 같은 날이 없으면 말일(예: 2/29 → 평년 2/28)."""
    last = calendar.monthrange(year, month)[1]
    return date(year, month, min(birth.day, last))


def age_months(birth: date, on: date) -> int:
    """만 나이(개월). 기념일 당일에 한 달이 찬다."""
    if on < birth:
        raise ValueError("기준일이 생일보다 앞선다")
    months = (on.year - birth.year) * 12 + (on.month - birth.month)
    if on < _anniversary(birth, on.year, on.month):
        months -= 1
    return months


def age_years(birth: date, on: date) -> int:
    """만 나이(년). 2/29 생일은 평년에 2/28에 한 살을 먹는다."""
    return age_months(birth, on) // 12


def age_group(species: str, size: str | None, birth: date, on: date) -> AgeGroup:
    """연령 구간: 어린 < 12개월 / 시니어 ≥ 7세 (대형견 ≥ 6세) / 그 밖은 성체.

    대형견 기준은 `species == "dog"`이고 `size == "large"`일 때만 쓴다. 고양이는 크기와 관계없다.
    """
    months = age_months(birth, on)
    if months < JUNIOR_MAX_MONTHS:
        return "junior"
    senior_years = (
        LARGE_DOG_SENIOR_YEARS if species == "dog" and size == "large" else SENIOR_YEARS
    )
    return "senior" if months >= senior_years * 12 else "adult"


def d_day(due: date, today: date) -> int:
    """남은 일수 (오늘 0, 내일 1, 지난 날짜는 음수). 화면 표기 D-3 = 3."""
    return (due - today).days


def within_days(due: date, today: date, days: int) -> bool:
    """오늘부터 `days`일 이내인지 (경계 포함: D-0 ~ D-days). 지난 날짜는 포함하지 않는다."""
    return 0 <= d_day(due, today) <= days


# ---------------------------------------------------------------- 요청 컨텍스트


@dataclass(frozen=True)
class AgentContext:
    """도구가 `ToolRuntime.context`로 받는 요청 컨텍스트.

    `user_id`·`pet_id`는 Backend가 인증 후 넘긴 값만 쓴다. LLM이 만든 값으로 바꾸지 않는다.
    """

    user_id: str
    pet_id: str
    thread_id: str
    eval_query_id: str | None = None  # 평가용 WEB_SEARCH_MOCK 문항 id (EVAL_MODE에서만)

    def __post_init__(self) -> None:
        for name in ("user_id", "pet_id", "thread_id"):
            if not getattr(self, name):
                raise ValueError(f"AgentContext.{name}가 비어 있다")


# ---------------------------------------------------------------- 공통 보안 패턴
# 지식 문서 적재 검사(src/retriever.py)와 입력·출력 가드레일(src/agent.py, A-5)이 같은 목록을 쓴다.
# 가드레일은 여기에 규칙을 더할 수 있지만, 이 목록을 줄이지 않는다.

INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = tuple(
    re.compile(p, re.IGNORECASE)
    for p in (
        r"ignore\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)",
        r"disregard\s+(all\s+|any\s+)?(the\s+)?(previous|prior|above|earlier|your)\s+(instructions?|prompts?|rules?)",
        r"system\s*prompt",
        r"you\s+are\s+now\b",
        r"developer\s+mode|jailbreak|\bDAN\b",
        r"(이전|위의?|앞의?|기존)\s*(의\s*)?(모든\s*)?(지시|지침|명령|규칙|프롬프트)\S*\s*(은|는|을|를)?\s*(모두\s*)?(무시|잊)",
        r"시스템\s*프롬프트",
        r"(너는|넌|당신은)\s*(이제|지금부터)",
        r"(이제|지금부터)\s*(너는|넌|당신은)",
        r"관리자\s*모드|개발자\s*모드|탈옥",
        r"(도구|툴|tool)\s*(목록|리스트|list)\S*\s*(을|를)?\s*(모두\s*)?(출력|보여|알려|print|show)",
    )
)

PII_PATTERNS: dict[str, re.Pattern[str]] = {
    "email": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    "phone": re.compile(r"01[016-9]-?\d{3,4}-?\d{4}"),
    "rrn": re.compile(r"\b\d{6}-?[1-4]\d{6}\b"),
    "card": re.compile(r"\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b"),
}


def find_injection(text: str) -> list[str]:
    """주입 패턴에 걸린 부분 문자열 목록 (없으면 빈 목록)."""
    return [m.group(0) for p in INJECTION_PATTERNS if (m := p.search(text))]


def find_pii(text: str) -> list[str]:
    """PII 유형 이름 목록 (값은 돌려주지 않는다)."""
    return [name for name, p in PII_PATTERNS.items() if p.search(text)]
