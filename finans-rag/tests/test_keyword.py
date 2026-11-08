from finans_rag.keyword import encode_query, terms
from finans_rag.models import Chunk
from finans_rag.store import VectorStore, rrf


def test_turkish_suffixes_reduce_to_same_stem():
    assert terms("Kartım çalınırsa ne yapmalıyım?") == ["kart", "kartı", "çalı", "çalın", "yapm", "yapma"]
    assert set(terms("Kartınızın çalınması halinde")) >= {"kartı", "çalın"}
    assert set(terms("faiz")) & set(terms("faizinin"))  # kısa kök de eşleşir
    assert terms("KIRMIZI İŞLEM") == ["kırm", "kırmı", "işle", "işlem"]  # Türkçe büyük-küçük harf


def test_rrf_prefers_item_ranked_high_in_both_lists():
    scores = rrf([["a", "b", "c"], ["c", "a", "d"]])
    assert sorted(scores, key=scores.get, reverse=True)[:2] == ["a", "c"]


class RankedEmbedder:
    """Gerçek denemedeki durumu taklit eder: anlam araması doğru parçayı ancak 5. sıraya koyuyor."""

    dim = 2
    order = ("Uçuş", "Sözleşme", "Sona", "Güvenlik", "Kartınızın", "Limit")

    def embed(self, texts):
        out = []
        for t in texts:
            i = next((k for k, w in enumerate(self.order) if t.startswith(w)), None)
            out.append(
                [1.0, 0.0] if i is None else [1.0, 0.1 * (i + 1)]
            )  # sorgu [1,0]; sıra büyüdükçe uzaklaşır
        return out


def test_hybrid_search_promotes_correct_chunk_even_if_semantic_ranks_it_fifth():
    from qdrant_client import QdrantClient

    store = VectorStore(RankedEmbedder(), QdrantClient(":memory:"), collection="kw")
    texts = [
        ("Uçuş millerinin iptali ve borç kaydı.", "9.4 Uçak Bileti"),
        ("Sözleşmenin kapsamı ve geçerlilik süresi.", "1 Kapsam"),
        ("Sona erme halleri.", "14 Sona Erme"),
        ("Güvenlik önlemleri ve şifre.", "4 Güvenlik"),
        ("Kartınızın çalınması veya kaybolması halinde hemen bize bildirin.", "4.2 Çalınma ve Kaybetme"),
        ("Limitinizin düşürülmesi.", "5.3 Limit"),
    ]
    store.add(
        [
            Chunk(
                id=f"00000000-0000-0000-0000-00000000001{i}",
                text=t,
                source="S",
                doc_type="sozlesme",
                page=i,
                section=s,
            )
            for i, (t, s) in enumerate(texts)
        ]
    )
    dense_only = store.client.query_points("kw", query=[1.0, 0.0], using="dense", limit=6).points
    assert [p.payload["section"] for p in dense_only].index("4.2 Çalınma ve Kaybetme") == 4  # 5. sıra

    hits = store.search("Kartım çalınırsa ne yapmalıyım?", top_k=3)
    assert hits[0].chunk.section == "4.2 Çalınma ve Kaybetme"
    assert hits[0].keyword_score and not hits[1].keyword_score


def test_query_vector_has_no_duplicates():
    v = encode_query("kart kart Kart")
    assert len(v.indices) == len(set(v.indices)) == 1
