import { fetch as expoFetch } from "expo/fetch";
import type { Summary } from "./summary";
import type { ChatMessage, Debug, ExtractResponse } from "./types";

// .env dosyasındaki EXPO_PUBLIC_API_URL değeri derleme sırasında koda gömülür
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {}

const unreachable = () => new ApiError(`Sunucuya ulaşılamadı. Backend çalışıyor mu? (${API_URL})`);

async function postJson<T>(path: string, body: unknown, timeoutMs = 90_000): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.error ?? "Beklenmeyen bir hata oluştu.");
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === "AbortError") throw new ApiError("İstek zaman aşımına uğradı. Tekrar dene.");
    throw unreachable();
  } finally {
    clearTimeout(timer);
  }
}

export function extract(text: string) {
  return postJson<ExtractResponse>("/extract", { text });
}

export async function getHealth() {
  const res = await fetch(`${API_URL}/health`);
  return (await res.json()) as { ok: boolean; mode: "demo" | "model" };
}

// Byte dizisini UTF-8 metne çevir (TextDecoder olmayan ortamlar için de çalışır)
function decodeUtf8(bytes: Uint8Array) {
  if (typeof TextDecoder !== "undefined") return new TextDecoder("utf-8").decode(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; ) {
    const b = bytes[i];
    let code: number;
    if (b < 0x80) { code = b; i += 1; }
    else if (b < 0xe0) { code = ((b & 0x1f) << 6) | (bytes[i + 1] & 0x3f); i += 2; }
    else if (b < 0xf0) { code = ((b & 0x0f) << 12) | ((bytes[i + 1] & 0x3f) << 6) | (bytes[i + 2] & 0x3f); i += 3; }
    else { code = ((b & 0x07) << 18) | ((bytes[i + 1] & 0x3f) << 12) | ((bytes[i + 2] & 0x3f) << 6) | (bytes[i + 3] & 0x3f); i += 4; }
    out += String.fromCodePoint(code);
  }
  return out;
}

type StreamEvent = { type: "text"; text: string } | { type: "done"; debug: Debug } | { type: "error"; error: string };

// Koçun cevabını parça parça okur (streaming). Her satır bir JSON olayı.
export async function streamChat(
  summary: Summary,
  messages: Pick<ChatMessage, "role" | "content">[],
  onText: (text: string) => void,
): Promise<Debug | undefined> {
  let res;
  try {
    res = await expoFetch(`${API_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary, messages }),
    });
  } catch {
    throw unreachable();
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.error ?? "Koç şu an cevap veremiyor.");
  }

  const reader = res.body.getReader();
  let pending = new Uint8Array(0);
  let debug: Debug | undefined;

  const handleLine = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent;
    if (event.type === "text") onText(event.text);
    else if (event.type === "done") debug = event.debug;
    else if (event.type === "error") throw new ApiError(event.error);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (value) {
      const merged = new Uint8Array(pending.length + value.length);
      merged.set(pending);
      merged.set(value, pending.length);
      // Satır sonu (\n) UTF-8'de hiçbir çok baytlı karakterin içinde geçmez; güvenle bölebiliriz
      let start = 0;
      for (let i = 0; i < merged.length; i++) {
        if (merged[i] === 10) {
          handleLine(decodeUtf8(merged.subarray(start, i)));
          start = i + 1;
        }
      }
      pending = merged.slice(start);
    }
    if (done) break;
  }
  if (pending.length) handleLine(decodeUtf8(pending));
  return debug;
}
