import { client, MODEL } from "./client.mjs";
import { COACH_SYSTEM } from "./prompts.mjs";

// Koç cevabını parça parça (streaming) üretir; her metin parçasında onText çağrılır
export async function streamCoach({ summary, messages }, onText) {
  const started = Date.now();
  let firstTokenMs = null;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 2048,
    system: [
      { type: "text", text: COACH_SYSTEM },
      // Özet aynı sohbet boyunca değişmediği için önbelleğe alınmaya uygun
      { type: "text", text: `<ozet>\n${JSON.stringify(summary, null, 2)}\n</ozet>`, cache_control: { type: "ephemeral" } },
    ],
    messages,
  });

  stream.on("text", (delta) => {
    if (firstTokenMs === null) firstTokenMs = Date.now() - started;
    onText(delta);
  });

  const final = await stream.finalMessage();
  return {
    model: MODEL,
    stop_reason: final.stop_reason,
    sure_ms: Date.now() - started,
    ilk_token_ms: firstTokenMs,
    usage: final.usage,
    gecmis_mesaj_sayisi: messages.length,
  };
}
