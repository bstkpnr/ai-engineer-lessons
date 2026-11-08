"""Dokümanları okuyup parçalara bölen ve vektör veritabanına yazan komut.

    uv run finans-rag-ingest            # data/sources.json'daki PDF'leri yükle
    uv run finans-rag-ingest --reset    # koleksiyonu silip baştan yükle
    uv run finans-rag-ingest --dry-run --show 3   # yüklemeden, parçaları incele

Not: Yerel Qdrant klasörünü aynı anda tek bir süreç açabilir. Sunucu çalışırken yükleme
yapacaksan önce sunucuyu durdur ya da Docker'daki Qdrant'ı kullan (QDRANT_URL).
"""

import argparse
from collections import Counter

from .chunking import chunk_document
from .config import settings
from .embeddings import FastEmbedEmbedder
from .loader import load_sources, read_pdf
from .models import Chunk
from .store import VectorStore, make_client


def build_chunks(show: int = 0) -> list[Chunk]:
    chunks: list[Chunk] = []
    for source in load_sources(settings.data_dir):
        path = settings.data_dir / source.file
        if not path.exists():
            print(f"⚠️  {source.file} bulunamadı, atlanıyor ({source.url or 'link yok'})")
            continue
        pages = read_pdf(path)
        doc_chunks = chunk_document(source, pages)
        sections = sum(1 for c in doc_chunks if c.section)
        sizes = [len(c.text) for c in doc_chunks] or [0]
        print(
            f"📄 {source.title}: {len(pages)} sayfa → {len(doc_chunks)} parça "
            f"(maddeli: {sections}, ortalama {sum(sizes) // len(sizes)} karakter, en uzun {max(sizes)})"
        )
        for c in doc_chunks[:show]:
            print(f"   ── s.{c.page} {c.section or ''} ──\n   {c.text[:300]!r}")
        chunks.extend(doc_chunks)
    return chunks


def main() -> None:
    parser = argparse.ArgumentParser(description="Dokümanları vektör veritabanına yükle")
    parser.add_argument("--reset", action="store_true", help="Koleksiyonu silip baştan oluştur")
    parser.add_argument("--dry-run", action="store_true", help="Sadece parçala ve göster, yükleme")
    parser.add_argument("--show", type=int, default=0, help="Her dokümandan kaç parça gösterilsin")
    args = parser.parse_args()

    chunks = build_chunks(args.show)
    print(f"Toplam {len(chunks)} parça · türlere göre: {dict(Counter(c.doc_type for c in chunks))}")
    if args.dry_run or not chunks:
        return

    store = VectorStore(FastEmbedEmbedder(), make_client())
    store.ensure_collection(reset=args.reset)
    store.add(chunks)
    print(f"✅ Qdrant'ta şu an {store.count()} parça var ({settings.collection})")


if __name__ == "__main__":
    main()
