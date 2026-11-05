"""Bedrock 한도·스로틀 재시도 (phase4_task.md E-1b: 지수 백오프 최대 3회)."""

from __future__ import annotations

import time
from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")
THROTTLE_MARKERS = ("ThrottlingException", "TooManyRequests", "ServiceUnavailable", "throttl")


def is_throttle(exc: BaseException) -> bool:
    text = f"{type(exc).__name__} {exc}"
    return any(m.lower() in text.lower() for m in THROTTLE_MARKERS)


def with_backoff(fn: Callable[[], T], *, retries: int = 3, base: float = 2.0,
                 retry_if: Callable[[BaseException], bool] = is_throttle,
                 sleep: Callable[[float], None] = time.sleep) -> T:
    """retry_if에 해당하는 예외면 base·2^n 초 기다렸다 다시 한다. 그 밖의 예외는 바로 올린다."""
    for attempt in range(retries + 1):
        try:
            return fn()
        except Exception as exc:
            if attempt >= retries or not retry_if(exc):
                raise
            sleep(base * 2 ** attempt)
    raise AssertionError("unreachable")
