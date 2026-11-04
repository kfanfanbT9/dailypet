"""A-0: 설치된 라이브러리가 ARCHITECTURE.md 3.2 골격의 API를 제공하는지 확인 (위험 1 대응).

모델을 호출하지 않고 import·시그니처만 본다. 실패하면 3.2 골격을 먼저 고친다 (phase1_task.md D8).
"""

from __future__ import annotations

import inspect


def test_create_agent_accepts_middleware_and_name():
    from langchain.agents import create_agent

    params = inspect.signature(create_agent).parameters
    for name in ("model", "tools", "system_prompt", "middleware", "name", "context_schema"):
        assert name in params, name


def test_builtin_middlewares_exist():
    from langchain.agents import middleware as mw

    for name in (
        "HumanInTheLoopMiddleware",
        "PIIMiddleware",
        "SummarizationMiddleware",
        "ModelCallLimitMiddleware",
        "ToolCallLimitMiddleware",
        "ModelRetryMiddleware",
        "ToolRetryMiddleware",
        "before_model",
        "after_model",
        "wrap_tool_call",
    ):
        assert hasattr(mw, name), name


def test_middleware_params_used_in_doc():
    from langchain.agents.middleware import (
        HumanInTheLoopMiddleware,
        ModelCallLimitMiddleware,
        ModelRetryMiddleware,
        ToolCallLimitMiddleware,
    )

    assert "interrupt_on" in inspect.signature(HumanInTheLoopMiddleware).parameters
    assert "run_limit" in inspect.signature(ModelCallLimitMiddleware).parameters
    tcl = inspect.signature(ToolCallLimitMiddleware).parameters
    assert "run_limit" in tcl and "tool_name" in tcl
    assert "max_retries" in inspect.signature(ModelRetryMiddleware).parameters


def test_create_supervisor_hooks():
    from langgraph_supervisor import create_supervisor

    params = inspect.signature(create_supervisor).parameters
    for name in ("agents", "model", "prompt", "output_mode", "pre_model_hook", "post_model_hook"):
        assert name in params, name


def test_tool_runtime_and_checkpointer():
    from langchain.tools import ToolRuntime  # noqa: F401
    from langgraph.checkpoint.sqlite import SqliteSaver  # noqa: F401
    from langgraph.types import Command, interrupt  # noqa: F401
