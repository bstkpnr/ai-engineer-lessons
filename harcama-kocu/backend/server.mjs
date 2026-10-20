import express from "express";
import cors from "cors";
import { maskSensitive } from "./src/mask.mjs";
import { costOf, getStats, recordError, recordUsage } from "./src/stats.mjs";

const DEMO_MODE = process.env.DEMO_MODE === "true" || !process.env.ANTHROPIC_API_KEY;

const { extractTransactions, streamCoach, Anthropic } = DEMO_MODE
  ? await (async () => {
      const demo = await import("./src/demo.mjs");
      return { extractTransactions: demo.extractDemo, streamCoach: demo.streamCoachDemo, Anthropic: null };
    })()
  : {
      ...(await import("./src/extractor.mjs")),
      ...(await import("./src/coach.mjs")),
      ...(await import("./src/client.mjs")),
    };

const MAX_TEXT = 10_000;
const MAX_MESSAGES = 20;

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

// Model hatalarını kullanıcının anlayacağı mesajlara çevir
function friendlyError(error) {
  if (Anthropic && error instanceof Anthropic.APIConnectionTimeoutError) return [504, "Model zamanında cevap vermedi. Biraz sonra tekrar dene."];
  if (Anthropic && error instanceof Anthropic.RateLimitError) return [503, "Şu an çok fazla istek var. Birkaç saniye sonra tekrar dene."];
  if (Anthropic && error instanceof Anthropic.AuthenticationError) return [500, "Sunucunun API anahtarı geçersiz."];
  return [502, "İşlem tamamlanamadı. Tekrar dene."];
}

app.get("/health", (req, res) => res.json({ ok: true, mode: DEMO_MODE ? "demo" : "model" }));
app.get("/stats", (req, res) => res.json(getStats()));

app.post("/extract", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
  if (!text) return res.status(400).json({ error: "Harcama çıkarılacak bir metin gönder." });
  if (text.length > MAX_TEXT) return res.status(400).json({ error: `Metin en fazla ${MAX_TEXT} karakter olabilir.` });

  // Hassas verileri modele göndermeden önce maskele (Gün 5)
  const { masked, found } = maskSensitive(text);

  try {
    const result = await extractTransactions(masked);
    recordUsage(result.debug.usage);
    res.json({ ...result, maskelenen: found, debug: { ...result.debug, maliyet_usd: costOf(result.debug.usage) } });
  } catch (error) {
    recordError();
    console.error("Çıkarma hatası:", error.message);
    const [status, message] = friendlyError(error);
    res.status(status).json({ error: message });
  }
});

app.post("/chat", async (req, res) => {
  const { summary, messages } = req.body ?? {};
  const valid =
    summary &&
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.length <= MAX_MESSAGES &&
    messages.every((m) => ["user", "assistant"].includes(m?.role) && typeof m.content === "string" && m.content.trim()) &&
    messages.at(-1).role === "user";
  if (!valid) return res.status(400).json({ error: "Geçersiz sohbet isteği." });

  // Cevabı parça parça gönderiyoruz: her satır bir JSON olayı (NDJSON)
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.flushHeaders();
  const send = (event) => res.write(JSON.stringify(event) + "\n");

  try {
    // Kullanıcı mesajlarındaki hassas verileri de maskele
    const safeMessages = messages.map((m) => ({ role: m.role, content: maskSensitive(m.content).masked }));
    const debug = await streamCoach({ summary, messages: safeMessages }, (text) => send({ type: "text", text }));
    recordUsage(debug.usage);
    send({ type: "done", debug: { ...debug, maliyet_usd: costOf(debug.usage) } });
  } catch (error) {
    recordError();
    console.error("Sohbet hatası:", error.message);
    send({ type: "error", error: friendlyError(error)[1] });
  } finally {
    res.end();
  }
});

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Harcama Koçu API http://localhost:${PORT} adresinde çalışıyor`);
  console.log(DEMO_MODE ? "⚠️  DEMO MODU: API anahtarı yok, kural tabanlı taklit kullanılıyor." : `Model: ${process.env.MODEL ?? "claude-sonnet-5-5"}`);
});
