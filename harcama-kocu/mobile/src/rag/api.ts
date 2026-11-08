import type { AskResponse, RagHealth, SearchResponse } from "./types";

// finans-rag servisinin adresi. Telefonda denerken bilgisayarın yerel IP'sini yaz (ör. http://192.168.1.42:8000)
export const RAG_URL = process.env.EXPO_PUBLIC_RAG_URL ?? "http://localhost:8000";

export class RagError extends Error {}

async function request<T>(path: string, body?: unknown, timeoutMs = 60_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${RAG_URL}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // FastAPI doğrulama hatası: { detail: [...] } ya da { detail: "..." }
      const detail = typeof data.detail === "string" ? data.detail : null;
      throw new RagError(detail ?? `Doküman servisi hata döndürdü (${res.status}).`);
    }
    return data as T;
  } catch (error) {
    if (error instanceof RagError) throw error;
    if ((error as Error).name === "AbortError") throw new RagError("Doküman servisi zamanında cevap vermedi.");
    throw new RagError(`Doküman servisine ulaşılamadı. finans-rag çalışıyor mu? (${RAG_URL})`);
  } finally {
    clearTimeout(timer);
  }
}

export const ask = (question: string, topK = 4) => request<AskResponse>("/ask", { question, top_k: topK });
export const search = (query: string, topK = 4) => request<SearchResponse>("/search", { query, top_k: topK });
export const getRagHealth = () => request<RagHealth>("/health", undefined, 15_000);
