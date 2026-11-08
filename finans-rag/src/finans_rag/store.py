"""Vektör veritabanı: parçaları Qdrant'ta saklar ve soruya en yakın olanları bulur.

Gün 8'de vektörleri bellekte tutup hepsini tek tek karşılaştırmıştık. Birkaç yüz satıcı için bu
yeterliydi. Binlerce doküman parçasında ise vektörleri saklayan ve yakın olanları hızlı bulan bir
veritabanı gerekiyor.

Her parça için iki vektör saklıyoruz:
- "dense": anlam vektörü (embedding), anlamca yakın olanı bulur
- "keyword": kelime vektörü (BM25), aynı kelimeyi içereni bulur
Arama ikisini ayrı ayrı yapıp sonuçları sıralarına göre birleştirir (hibrit arama).
"""

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, Modifier, PointStruct, SparseVectorParams, VectorParams

from .config import settings
from .embeddings import Embedder
from .keyword import encode_document, encode_query
from .models import Chunk, Hit

DENSE, KEYWORD = "dense", "keyword"
CANDIDATES = 20  # Her yöntemden kaç aday alınıp birleştirileceği
RRF_K = 60  # Reciprocal Rank Fusion'ın standart sabiti


def make_client(url: str | None = settings.qdrant_url, path: str = settings.qdrant_path) -> QdrantClient:
    # URL varsa Docker'daki Qdrant sunucusu, yoksa yerel klasör (kurulum gerektirmez)
    return QdrantClient(url=url) if url else QdrantClient(path=path)


def rrf(rankings: list[list[str]], k: int = RRF_K) -> dict[str, float]:
    """Reciprocal Rank Fusion: her listede ilk sıralarda olan kazanır.

    İki aramanın skorları farklı ölçeklerde (anlam 0-1 arası, BM25 sınırsız), doğrudan toplanamaz.
    RRF skorlara değil sıralara bakar: bir parça hangi listede kaçıncıysa 1 / (k + sıra) puan alır.
    """
    scores: dict[str, float] = {}
    for ranking in rankings:
        for rank, point_id in enumerate(ranking, start=1):
            scores[point_id] = scores.get(point_id, 0.0) + 1 / (k + rank)
    return scores


class VectorStore:
    def __init__(self, embedder: Embedder, client: QdrantClient, collection: str = settings.collection):
        self.embedder = embedder
        self.client = client
        self.collection = collection

    def ensure_collection(self, reset: bool = False) -> None:
        exists = self.client.collection_exists(self.collection)
        if exists and reset:
            self.client.delete_collection(self.collection)
            exists = False
        if not exists:
            self.client.create_collection(
                self.collection,
                # Cosine: iki vektörün yönü ne kadar benziyor (Gün 8'deki benzerlik ölçüsü)
                vectors_config={DENSE: VectorParams(size=self.embedder.dim, distance=Distance.COSINE)},
                # IDF: nadir kelimeye daha çok ağırlık; Qdrant koleksiyonun tamamına bakarak hesaplar
                sparse_vectors_config={KEYWORD: SparseVectorParams(modifier=Modifier.IDF)},
            )
            return
        params = self.client.get_collection(self.collection).config.params
        if not params.sparse_vectors or KEYWORD not in params.sparse_vectors:
            raise RuntimeError(
                "Koleksiyon eski yapıda (kelime vektörü yok). `finans-rag-ingest --reset` çalıştır."
            )

    def add(self, chunks: list[Chunk], batch_size: int = 64) -> int:
        self.ensure_collection()
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i : i + batch_size]
            vectors = self.embedder.embed([c.text for c in batch])
            self.client.upsert(
                self.collection,
                points=[
                    PointStruct(
                        id=c.id,
                        vector={DENSE: v, KEYWORD: encode_document(f"{c.section or ''}\n{c.text}")},
                        payload=c.model_dump(),
                    )
                    for c, v in zip(batch, vectors, strict=True)
                ],
            )
        return len(chunks)

    def count(self) -> int:
        if not self.client.collection_exists(self.collection):
            return 0
        return self.client.count(self.collection).count

    def search(self, query: str, top_k: int = 4) -> list[Hit]:
        if not self.client.collection_exists(self.collection):
            return []
        [vector] = self.embedder.embed([query])
        dense = self.client.query_points(
            self.collection, query=vector, using=DENSE, limit=CANDIDATES, with_payload=True
        ).points
        keyword = self.client.query_points(
            self.collection, query=encode_query(query), using=KEYWORD, limit=CANDIDATES, with_payload=True
        ).points

        fused = rrf([[str(p.id) for p in dense], [str(p.id) for p in keyword]])
        payloads = {str(p.id): p.payload for p in [*dense, *keyword]}
        dense_scores = {str(p.id): p.score for p in dense}
        keyword_scores = {str(p.id): p.score for p in keyword}

        best = sorted(fused, key=fused.get, reverse=True)[:top_k]
        return [
            Hit(
                chunk=Chunk(**payloads[pid]),
                score=round(fused[pid], 5),
                dense_score=round(dense_scores[pid], 4) if pid in dense_scores else None,
                keyword_score=round(keyword_scores[pid], 4) if pid in keyword_scores else None,
            )
            for pid in best
        ]
