import math

import pytest
from qdrant_client import QdrantClient

from finans_rag.store import VectorStore

# Gerçek model yerine kontrollü, sahte bir embedding: her boyut bir "konu".
# Testler internet ve model indirmeden, saniyeler içinde çalışsın diye.
TOPICS = [
    ("gecikme", "temerrüt", "faiz"),
    ("aidat", "yıllık", "ücret"),
    ("kayıp", "çalın", "sorumluluk"),
    ("asgari", "ödeme"),
    ("nakit", "avans"),
]


class FakeEmbedder:
    dim = len(TOPICS)

    def embed(self, texts: list[str]) -> list[list[float]]:
        out = []
        for text in texts:
            t = text.lower()
            v = [float(sum(t.count(w) for w in words)) for words in TOPICS]
            norm = math.sqrt(sum(x * x for x in v)) or 1.0
            out.append([x / norm for x in v])
        return out


@pytest.fixture
def store() -> VectorStore:
    return VectorStore(FakeEmbedder(), QdrantClient(":memory:"), collection="test")
