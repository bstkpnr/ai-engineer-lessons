import json
from pathlib import Path

from finans_rag.embeddings import FastEmbedEmbedder
from finans_rag.store import VectorStore, make_client

QUESTIONS = Path(__file__).parent / "questions.json"
TOP_K = 5


def matches(chunk, expected: dict) -> bool:
    """Bu parça beklenen kaynaklardan biri mi?"""
    if chunk.doc_type != expected["doc_type"]:
        return False
    if chunk.section is None:
        return False
    section = expected["section"]
    return chunk.section == section or chunk.section.startswith(section + " ")


def evaluate(name, search):
    """search(soru) → parça listesi döndüren herhangi bir arama fonksiyonunu ölçer."""
    questions = json.loads(QUESTIONS.read_text(encoding="utf-8"))
    answerable = [q for q in questions if q["answerable"]]
    hits_ok = 0

    print(f"\n=== {name} ===")
    for q in answerable:
        chunks = search(q["question"])
        found = any(matches(c, e) for c in chunks for e in q["expected"])
        if found:
            hits_ok += 1
        mark = "✅" if found else "❌"
        sections = ", ".join((c.section or "-")[:25] for c in chunks)
        print(f"{mark}  {q['question'][:50]:<50} → {sections}")

    print(f"\n{name} Hit@{TOP_K}: {hits_ok}/{len(answerable)}")

def main():
    store = VectorStore(FastEmbedEmbedder(), make_client())
    evaluate("Elle yazılmış", lambda q: [h.chunk for h in store.search(q, top_k=TOP_K)])

    from langchain_rag import build_retriever, to_chunk
    retriever = build_retriever()
    evaluate("LangChain", lambda q: [to_chunk(d) for d in retriever.invoke(q)[:TOP_K]])

    retriever_tr = build_retriever(turkish=True)
    evaluate("LangChain + Türkçe", lambda q: [to_chunk(d) for d in retriever_tr.invoke(q)[:TOP_K]])


if __name__ == "__main__":
    main()