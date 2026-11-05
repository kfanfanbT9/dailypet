"""PII·키 잔존 검색 (phase4_task.md E-3 최종 점검).

    python -m evaluation.scan_secrets

검색 대상: `evaluation/results/` 전체(평가 서버 로그 `_live/*.log` 포함), Chroma `chat_logs` 컬렉션,
`data/checkpoints/` SQLite. 검사: 서비스 PII 탐지기(`find_pii_types`) + pii 문항 가짜 원문 + 키 값.
값은 출력하지 않고 위치·종류·건수만 출력한다. 1건이라도 있으면 종료 코드 1.
"""

from __future__ import annotations

import json
import re
import sqlite3
import sys
from collections import Counter
from pathlib import Path

from evaluation.dataset import ROOT
from evaluation.judges import FAKE_PII_VALUES
from evaluation.run_eval import RESULTS_DIR, secret_values
from src.agent import find_pii_types

TEXT_SUFFIXES = {".json", ".jsonl", ".csv", ".md", ".log", ".txt"}


LOOPBACK = re.compile(r"(?<![\d.])127\.\d{1,3}\.\d{1,3}\.\d{1,3}(?![\d.])")
# 영문자가 섞인 16진 id 토큰 (thread_id 끝의 uuid hex, checkpoint id의 8-4-4-4-12 uuid)
CHANNEL_VERSION = re.compile(r"\d{32,}\.\d+\.\d+(?!\d)")  # 앞에 직렬화 바이트가 숫자로 붙기도 한다
HEX_ID = re.compile(r"(?<![0-9A-Za-z])(?=[0-9a-f-]*[a-f])[0-9a-f]{8,}(?:-[0-9a-f]{4,})*(?![0-9A-Za-z])")


def scan_text(text: str, secrets: list[str]) -> list[str]:
    """찾은 종류 목록 (값은 돌려주지 않는다).

    PII 탐지 전에 세 가지를 뺀다 (오탐 방지, 2026-11-05 최종 점검에서 확인):
    - 루프백 주소(127.x.x.x): uvicorn 접근 로그의 호출자 주소. Agent는 같은 PC의 Backend만 부르므로 사람을 가리키지 않는다.
    - 영문자가 섞인 16진 id(uuid 등): 그 안의 숫자 연속이 주민번호·전화·계좌 모양으로 잡힌다.
    - LangGraph checkpoint 채널 버전(`0…02.0.2433834892318349` 형식): 뒤의 난수 16자리가 카드 번호 모양으로 잡힌다.
    숫자만으로 된 값과 그 밖의 IP는 그대로 잡고, pii 문항의 가짜 원문·키 값은 원문 그대로 따로 찾는다."""
    pii_text = CHANNEL_VERSION.sub(" ", HEX_ID.sub(" ", LOOPBACK.sub("", text)))
    kinds = list(find_pii_types(pii_text))  # 가짜 원문·키 값은 아래에서 원문(text)으로 찾는다 (16진 키도 놓치지 않게)
    if any(v in text for v in FAKE_PII_VALUES):
        kinds.append("raw_fake_pii")
    if any(s in text for s in secrets):
        kinds.append("secret")
    return kinds


def scan_results(secrets: list[str]) -> dict[str, list[str]]:
    hits: dict[str, list[str]] = {}
    for path in sorted(RESULTS_DIR.rglob("*")):
        if path.is_file() and path.suffix in TEXT_SUFFIXES:
            kinds = scan_text(path.read_text(encoding="utf-8", errors="replace"), secrets)
            if kinds:
                hits[str(path.relative_to(ROOT))] = kinds
    return hits


def scan_chat_logs(secrets: list[str]) -> tuple[int, dict[str, list[str]]]:
    from src.retriever import get_client

    col = get_client().get_collection("chat_logs")
    data = col.get(include=["documents", "metadatas"])
    hits: dict[str, list[str]] = {}
    for i, doc_id in enumerate(data["ids"]):
        text = (data["documents"][i] or "") + json.dumps(data["metadatas"][i] or {}, ensure_ascii=False)
        kinds = scan_text(text, secrets)
        if kinds:
            hits[f"chat_logs/{doc_id}"] = kinds
    return len(data["ids"]), hits


def scan_checkpoints(secrets: list[str]) -> tuple[int, dict[str, list[str]]]:
    hits: dict[str, list[str]] = {}
    rows = 0
    for db in sorted((ROOT / "data" / "checkpoints").glob("*.sqlite")):
        con = sqlite3.connect(f"file:{db}?mode=ro", uri=True)
        try:
            for (table,) in con.execute("SELECT name FROM sqlite_master WHERE type='table'"):
                counter: Counter[str] = Counter()
                for row in con.execute(f'SELECT * FROM "{table}"'):  # noqa: S608 (내부 테이블 이름)
                    rows += 1
                    text = " ".join(v.decode("utf-8", errors="ignore") if isinstance(v, bytes) else str(v)
                                    for v in row if v is not None)
                    counter.update(scan_text(text, secrets))
                if counter:
                    hits[f"{db.name}/{table}"] = [f"{k}×{n}" for k, n in counter.items()]
        finally:
            con.close()
    return rows, hits


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    secrets = secret_values()
    total: dict[str, list[str]] = {}
    total.update(scan_results(secrets))
    try:
        n_logs, h = scan_chat_logs(secrets)
        total.update(h)
        print(f"chat_logs {n_logs}건 검색")
    except Exception as exc:
        print(f"chat_logs 검색 실패 ({type(exc).__name__}) — Chroma 서버 확인")
        return 1
    n_rows, h = scan_checkpoints(secrets)
    total.update(h)
    print(f"checkpoint 행 {n_rows}개 검색, results 파일 {sum(1 for p in RESULTS_DIR.rglob('*') if p.is_file())}개 검색")
    if total:
        print("PII·키 잔존 발견 (값은 출력하지 않음):")
        for where, kinds in total.items():
            print(f"  - {where}: {kinds}")
        return 1
    print("PII·키 잔존 0건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
