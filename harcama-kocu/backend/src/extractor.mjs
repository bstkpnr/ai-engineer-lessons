import { client, MODEL } from "./client.mjs";
import { EXTRACT_SYSTEM } from "./prompts.mjs";
import { validateTransaction } from "./schema.mjs";

function parseJson(text) {
  const match = text?.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Cevapta JSON bulunamadı");
  return JSON.parse(match[0]);
}

export async function extractTransactions(text) {
  const started = Date.now();
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [{ type: "text", text: EXTRACT_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `<hareketler>\n${text}\n</hareketler>` }],
  });

  const output = response.content.find((block) => block.type === "text")?.text;
  const parsed = parseJson(output);

  // Her işlemi tek tek doğrula; bozuk olanları atla ama tüm cevabı çöpe atma
  const islemler = [];
  const atlananlar = Array.isArray(parsed.atlananlar) ? parsed.atlananlar : [];
  for (const t of parsed.islemler ?? []) {
    try {
      islemler.push(validateTransaction(t));
    } catch (error) {
      atlananlar.push({ kaynak: t?.kaynak ?? "", neden: `Doğrulanamadı: ${error.message}` });
    }
  }

  return {
    islemler,
    atlananlar,
    debug: {
      model: MODEL,
      stop_reason: response.stop_reason,
      sure_ms: Date.now() - started,
      usage: response.usage,
      prompt: { system: EXTRACT_SYSTEM, user: `<hareketler>\n${text}\n</hareketler>` },
    },
  };
}
