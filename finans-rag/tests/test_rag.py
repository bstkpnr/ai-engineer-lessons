from fastapi.testclient import TestClient

from finans_rag.answer import NOT_FOUND, answer_question, cited_numbers
from finans_rag.api import create_app
from finans_rag.models import Chunk


def chunk(i: int, text: str, page: int, section: str | None = None) -> Chunk:
    return Chunk(
        id=f"00000000-0000-0000-0000-00000000000{i}",
        text=text,
        source="Örnek sözleşme",
        doc_type="sozlesme",
        page=page,
        section=section,
    )


CHUNKS = [
    chunk(1, "Gecikme faizi, akdi faiz oranına 0,30 puan eklenerek bulunur.", 4, "Madde 9"),
    chunk(2, "Yıllık aidat ücreti kart hesap özetine yansıtılır.", 6, "Madde 12"),
    chunk(
        3, "Kartın kaybolması veya çalınması halinde sorumluluk bildirimden önceki 24 saatle sınırlıdır.", 8
    ),
]


def test_finds_chunk_closest_to_question(store):
    store.add(CHUNKS)
    hits = store.search("Gecikme faizi nasıl hesaplanır?", top_k=2)
    assert hits[0].chunk.section == "Madde 9"
    assert hits[0].score > hits[1].score


def test_reuploading_same_chunks_does_not_duplicate(store):
    store.add(CHUNKS)
    store.add(CHUNKS)
    assert store.count() == 3


def test_does_not_call_model_when_no_relevant_chunk(store):
    store.add(CHUNKS)
    calls = []
    hits = store.search("Hisse senedi almalı mıyım?")
    result = answer_question("Hisse senedi almalı mıyım?", hits, lambda s, u: calls.append(u) or "x")
    assert result.found is False
    assert result.answer == NOT_FOUND
    assert calls == []


def test_code_parses_cited_sources_and_drops_invented_numbers(store):
    store.add(CHUNKS)
    hits = store.search("kart çalınırsa sorumluluğum ne?", top_k=1)
    result = answer_question(
        "kart çalınırsa sorumluluğum ne?",
        hits,
        lambda s, u: (
            '{"cevaplanabildi": true, "cevap": "Bildirimden önceki 24 saatle sınırlı [1]. Ayrıca bkz. [7]."}'
        ),
    )
    assert result.found is True
    assert [(c.n, c.page) for c in result.citations] == [(1, 8)]


def test_answer_without_citations_is_not_counted_as_found(store):
    store.add(CHUNKS)
    hits = store.search("gecikme faizi", top_k=1)
    result = answer_question(
        "gecikme faizi", hits, lambda s, u: '{"cevaplanabildi": true, "cevap": "Faiz yüksektir."}'
    )
    assert result.found is False


def test_cited_numbers():
    assert cited_numbers("A [2], B [1, 3] ve yine [2]", max_n=3) == [2, 1, 3]


def test_api_search_and_ask(store):
    store.add(CHUNKS)
    prompts = []
    client = TestClient(
        create_app(
            store=store,
            generate=lambda s, u: (
                prompts.append(u) or '{"cevaplanabildi": true, "cevap": "Aidat özete yansır [1]."}'
            ),
        )
    )

    assert client.get("/health").json()["chunks"] == 3

    r = client.post("/search", json={"query": "yıllık aidat", "top_k": 2}).json()
    assert r["found"] is True and r["hits"][0]["chunk"]["page"] == 6

    r = client.post("/ask", json={"question": "Yıllık aidat nereye yansır?"}).json()
    assert r["found"] is True and r["citations"][0]["section"] == "Madde 12"
    assert 'sayfa="6"' in prompts[0] and "<soru>" in prompts[0]

    assert client.post("/search", json={"query": ""}).status_code == 422  # Pydantic doğrulaması


def test_model_saying_cannot_answer_is_not_found_even_with_citations(store):
    # Gerçek denemede yaşandı: "Hisse senedi almalı mıyım?" sorusunda model doğru şekilde reddetti
    # ama "kaynaklar şunları kapsıyor [1][2]" dediği için sonuç bulundu sayılmıştı.
    store.add(CHUNKS)
    hits = store.search("yıllık aidat", top_k=2)
    result = answer_question(
        "Hisse senedi almalı mıyım?",
        hits,
        lambda s, u: '{"cevaplanabildi": false, "cevap": "Kaynaklar yalnızca aidatı kapsıyor [1]."}',
    )
    assert result.found is False and result.citations == []


def test_falls_back_to_raw_text_on_malformed_json():
    from finans_rag.answer import parse_model_answer

    assert parse_model_answer("Aidat özete yansır [1].").cevaplanabildi is False  # JSON yok
    assert parse_model_answer('```json\n{"cevaplanabildi": true, "cevap": "x [1]"}\n```').cevap == "x [1]"
    assert parse_model_answer('{"cevaplanabildi": "belki"').cevaplanabildi is False
