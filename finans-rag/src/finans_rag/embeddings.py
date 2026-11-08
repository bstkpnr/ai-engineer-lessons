"""Metni anlamını taşıyan vektörlere çevirmek (embedding).

Harcama Koçu'nun Gün 8'deki anlamsal aramasıyla aynı model. Model bilgisayarda çalışır,
ilk kullanımda bir kez indirilir (~220 MB) ve önbelleğe alınır.
"""

from typing import Protocol

from .config import settings


class Embedder(Protocol):
    dim: int

    def embed(self, texts: list[str]) -> list[list[float]]: ...


class FastEmbedEmbedder:
    """Qdrant'ın fastembed kütüphanesi: PyTorch gerektirmez, ONNX ile çalışır."""

    def __init__(self, model_name: str = settings.embedding_model, dim: int = 384):
        self.model_name = model_name
        self.dim = dim
        self._model = None

    def _load(self):
        if self._model is None:
            from fastembed import TextEmbedding  # İlk kullanımda yükle: sunucu hızlı açılsın

            self._model = TextEmbedding(model_name=self.model_name)
        return self._model

    def embed(self, texts: list[str]) -> list[list[float]]:
        return [vector.tolist() for vector in self._load().embed(texts)]
