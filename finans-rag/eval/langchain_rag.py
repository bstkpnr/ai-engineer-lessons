"""Aynı parçaları LangChain'in hazır bileşenleriyle arar.

Karşılaştırmanın adil olması için parçalar (chunk'lar) ve embedding modeli aynı.
Değişen tek şey arama tarafı: vektör araması, kelime araması ve ikisini birleştirme.
"""

from langchain_classic.retrievers import EnsembleRetriever
from langchain_community.embeddings import FastEmbedEmbeddings
from langchain_community.retrievers import BM25Retriever
from langchain_core.documents import Document
from langchain_qdrant import QdrantVectorStore

from finans_rag.config import settings
from finans_rag.ingest import build_chunks
from finans_rag.models import Chunk
from finans_rag.keyword import terms

CANDIDATES = 20  # Elle yazılmış versiyonla aynı: her yöntemden 20 aday


def build_retriever(turkish: bool = False) -> EnsembleRetriever:
    # 1. Aynı parçaları LangChain'in Document formatına çevir
    chunks = build_chunks()
    docs = [Document(page_content=c.text, metadata=c.model_dump()) for c in chunks]

    # 2. Vektör araması: aynı embedding modeli, Qdrant bellekte
    embeddings = FastEmbedEmbeddings(model_name=settings.embedding_model)
    vector_store = QdrantVectorStore.from_documents(
        docs, embeddings, location=":memory:", collection_name="langchain"
    )
    dense = vector_store.as_retriever(search_kwargs={"k": CANDIDATES})

    # 3. Kelime araması: LangChain'in varsayılan BM25'i
    
    if turkish:
        keyword = BM25Retriever.from_documents(docs, k=CANDIDATES, preprocess_func=terms)
    else:
        keyword = BM25Retriever.from_documents(docs, k=CANDIDATES)

    # 4. İkisini sıralarına göre birleştir (RRF)
    return EnsembleRetriever(retrievers=[dense, keyword], weights=[0.5, 0.5])

def to_chunk(doc: Document) -> Chunk:
    # Qdrant metadata'ya kendi alanlarını da ekliyor (_id gibi), sadece bizimkileri al
    fields = {k: v for k, v in doc.metadata.items() if k in Chunk.model_fields}
    return Chunk(**fields)