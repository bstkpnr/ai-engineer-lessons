import { client, MODEL } from "./client.mjs";
import { COACH_SYSTEM } from "./prompts.mjs";
import { runTool, TOOL_DEFINITIONS } from "./tools.mjs";

// Bir cevap için en fazla kaç kez araç çağrılabileceği (sonsuz döngüye karşı güvenlik)
const MAX_STEPS = 5;

const addUsage = (total, u) => {
  for (const k of ["input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"]) {
    total[k] = (total[k] ?? 0) + (u?.[k] ?? 0);
  }
};

// Koç cevabını parça parça üretir. Araç gerekirse:
// 1) model aracı ister, 2) kod çalıştırır, 3) sonucu modele geri verir, 4) model cevaba devam eder.
export async function streamCoach({ summary, messages, islemler }, onEvent) {
  const started = Date.now();
  let firstTokenMs = null;
  let wroteText = false;
  const usage = {};
  const araclar = [];
  const conversation = [...messages];
  let final;
  let step = 0;

  for (; step < MAX_STEPS; step++) {
    let stepStarted = false;
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2048,
      tools: TOOL_DEFINITIONS,
      system: [
        { type: "text", text: COACH_SYSTEM },
        // Araç tanımları + system prompt + özet aynı sohbet boyunca değişmiyor: önbelleğe uygun
        { type: "text", text: `<ozet>\n${JSON.stringify(summary, null, 2)}\n</ozet>`, cache_control: { type: "ephemeral" } },
      ],
      messages: conversation,
    });

    stream.on("text", (delta) => {
      if (firstTokenMs === null) firstTokenMs = Date.now() - started;
      // Araç çağrısından önce ve sonra yazılan metinleri paragrafla ayır
      if (!stepStarted && wroteText) onEvent({ type: "text", text: "\n\n" });
      stepStarted = true;
      wroteText = true;
      onEvent({ type: "text", text: delta });
    });

    final = await stream.finalMessage();
    addUsage(usage, final.usage);
    if (final.stop_reason !== "tool_use") break;

    // Modelin isteğini (düşünme blokları dahil) olduğu gibi geçmişe ekle
    conversation.push({ role: "assistant", content: final.content });

    const results = [];
    for (const block of final.content.filter((b) => b.type === "tool_use")) {
      const { sonuc, hata, aciklama } = runTool(block.name, block.input, islemler);
      const call = { name: block.name, input: block.input, aciklama, hata: hata ?? null };
      araclar.push(call);
      onEvent({ type: "tool", ...call });
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(hata ? { hata } : sonuc),
        is_error: Boolean(hata),
      });
    }
    conversation.push({ role: "user", content: results });
  }

  if (final?.stop_reason === "tool_use") {
    onEvent({ type: "text", text: "\n\nBu soruyu cevaplamak için çok fazla adım gerekti. Soruyu biraz daha basitleştirebilir misin?" });
  }

  return {
    model: MODEL,
    stop_reason: final?.stop_reason ?? null,
    sure_ms: Date.now() - started,
    ilk_token_ms: firstTokenMs,
    usage,
    adim: Math.min(step + 1, MAX_STEPS),
    araclar,
    gecmis_mesaj_sayisi: messages.length,
  };
}
