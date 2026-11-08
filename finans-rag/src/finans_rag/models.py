"""Servisin veri şekilleri. Pydantic hem doğrulamayı hem API şemasını (OpenAPI) üretir."""

from typing import Literal

from pydantic import BaseModel, Field

DocType = Literal["mevzuat", "sozlesme", "tarife", "genel"]


class Source(BaseModel):
    """data/sources.json içindeki bir doküman."""

    file: str
    title: str
    doc_type: DocType = "genel"
    url: str | None = None
    # Bilgi değişebilir (faiz oranı, ücret). Hangi tarihte geçerli olduğu cevapta görünsün.
    valid_from: str | None = None


class Chunk(BaseModel):
    """Aranabilir bir doküman parçası ve nereden geldiği."""

    id: str
    text: str
    source: str
    doc_type: DocType
    page: int
    section: str | None = None
    url: str | None = None
    valid_from: str | None = None


class Hit(BaseModel):
    chunk: Chunk
    score: float  # Hibrit aramanın birleşik (RRF) skoru: sıralama için
    dense_score: float | None = None  # Anlam benzerliği (cosine, 0-1); bu yöntemde aday değilse None
    keyword_score: float | None = None  # Kelime eşleşmesi (BM25); hiç ortak kelime yoksa None


class SearchRequest(BaseModel):
    query: str = Field(min_length=2, max_length=500)
    top_k: int = Field(default=4, ge=1, le=10)


class SearchResponse(BaseModel):
    query: str
    found: bool
    hits: list[Hit]


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)
    top_k: int = Field(default=4, ge=1, le=10)


class Citation(BaseModel):
    n: int
    source: str
    page: int
    section: str | None = None
    url: str | None = None
    text: str


class AskResponse(BaseModel):
    question: str
    found: bool
    answer: str
    citations: list[Citation]
