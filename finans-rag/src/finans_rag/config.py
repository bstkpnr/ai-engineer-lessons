"""Ayarlar ortam değişkenlerinden okunur; hepsinin makul bir varsayılanı var."""

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    # Dokümanların listesi ve PDF'lerin durduğu klasör
    data_dir: Path = Path(os.getenv("RAG_DATA_DIR", "data"))
    # Qdrant: QDRANT_URL verilirse sunucuya (Docker), verilmezse yerel bir klasöre yazar
    qdrant_url: str | None = os.getenv("QDRANT_URL")
    qdrant_path: str = os.getenv("QDRANT_PATH", "qdrant_data")
    collection: str = os.getenv("QDRANT_COLLECTION", "finans_dokumanlari")
    # Harcama Koçu'nun Gün 8'de kullandığı çok dilli model: aynı model, aynı vektör boyutu (384)
    embedding_model: str = os.getenv(
        "EMBEDDING_MODEL", "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
    )
    # Bu benzerliğin altındaki parçalar "ilgili" sayılmaz. Gerçek dokümanlarla ayarlanmalı.
    min_score: float = float(os.getenv("RAG_MIN_SCORE", "0.4"))
    llm_model: str = os.getenv("MODEL", "claude-sonnet-5-5")


settings = Settings()
