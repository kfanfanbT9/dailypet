"""테스트 전용 결정적 임베딩. 네트워크 없이 같은 문장에 같은 벡터를 낸다."""

from __future__ import annotations

import hashlib
import math
import re

from langchain_core.embeddings import Embeddings

DIM = 64
_TOKEN = re.compile(r"[0-9a-z가-힣]+")


class FakeEmbeddings(Embeddings):
    """토큰 해시를 차원에 누적한 bag-of-words 벡터 (L2 정규화).

    단어가 겹치는 문장끼리 가까워지므로 검색 순서를 대략 흉내 낸다.
    """

    def __init__(self, dim: int = DIM) -> None:
        self.dim = dim

    def _embed(self, text: str) -> list[float]:
        vec = [0.0] * self.dim
        for token in _TOKEN.findall(text.lower()):
            h = int.from_bytes(hashlib.sha256(token.encode("utf-8")).digest()[:4], "big")
            vec[h % self.dim] += 1.0
        norm = math.sqrt(sum(v * v for v in vec)) or 1.0
        return [v / norm for v in vec]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._embed(t) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._embed(text)
