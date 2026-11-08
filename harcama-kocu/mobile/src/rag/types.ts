// finans-rag servisinin cevap şekilleri (finans-rag/src/finans_rag/models.py ile aynı)

export type Chunk = {
  id: string;
  text: string;
  source: string;
  doc_type: "mevzuat" | "sozlesme" | "tarife" | "genel";
  page: number;
  section: string | null;
  url: string | null;
  valid_from: string | null;
};

export type Hit = {
  chunk: Chunk;
  score: number; // RRF: sıralama skoru
  dense_score: number | null; // anlam benzerliği
  keyword_score: number | null; // kelime eşleşmesi (BM25)
};

export type SearchResponse = { query: string; found: boolean; hits: Hit[] };

export type Citation = {
  n: number;
  source: string;
  page: number;
  section: string | null;
  url: string | null;
  text: string;
};

export type AskResponse = { question: string; found: boolean; answer: string; citations: Citation[] };

export type RagHealth = { status: string; chunks: number; min_score: number };
