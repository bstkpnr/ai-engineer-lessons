"""HTTP servisi. Harcama Koçu /search'ü bir araç olarak çağırır; /ask tek başına denemek içindir.

Çalıştırma:  uv run uvicorn finans_rag.api:app --reload --port 8000
Belgeler:    http://localhost:8000/docs  (FastAPI, Pydantic modellerinden otomatik üretir)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .answer import Generate, answer_question, anthropic_generate, relevant
from .config import settings
from .embeddings import FastEmbedEmbedder
from .models import AskRequest, AskResponse, SearchRequest, SearchResponse
from .store import VectorStore, make_client


def log_hits(label: str, text: str, hits) -> None:
    """Hangi parçanın neden geldiğini görmek için: her aramada skorları terminale yaz."""

    def fmt(x):
        return f"{x:.3f}" if x is not None else "  -  "

    lines = [
        f"   anlam {fmt(h.dense_score)} · kelime {fmt(h.keyword_score)} · s.{h.chunk.page} · "
        f"{(h.chunk.section or '')[:45]}"
        for h in hits
    ]
    print(f"🔎 {label}: {text!r}\n" + "\n".join(lines), flush=True)


def create_app(store: VectorStore | None = None, generate: Generate | None = None) -> FastAPI:
    app = FastAPI(title="finans-rag", version=__version__)
    # Harcama Koçu mobil uygulaması tarayıcıda (Expo web) açıldığında da istek atabilsin
    app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])
    state: dict = {"store": store, "generate": generate}

    # Ağır parçaları (embedding modeli, Anthropic istemcisi) ilk ihtiyaçta kur
    def get_store() -> VectorStore:
        if state["store"] is None:
            state["store"] = VectorStore(FastEmbedEmbedder(), make_client())
        return state["store"]

    def get_generate() -> Generate:
        if state["generate"] is None:
            state["generate"] = anthropic_generate()
        return state["generate"]

    @app.get("/health")
    def health() -> dict:
        return {"status": "ok", "chunks": get_store().count(), "min_score": settings.min_score}

    @app.post("/search", response_model=SearchResponse)
    def search(req: SearchRequest) -> SearchResponse:
        hits = get_store().search(req.query, req.top_k)
        log_hits("search", req.query, hits)
        return SearchResponse(query=req.query, found=bool(relevant(hits)), hits=hits)

    @app.post("/ask", response_model=AskResponse)
    def ask(req: AskRequest) -> AskResponse:
        hits = get_store().search(req.question, req.top_k)
        log_hits("ask", req.question, hits)
        return answer_question(req.question, hits, get_generate())

    return app


app = create_app()
