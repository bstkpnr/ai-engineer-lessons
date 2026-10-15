import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Her istekte tekrar eden uzun bir system prompt (örneğin bir mağazanın tüm kuralları).
// Önbelleğe alınabilmesi için prompt'un belirli bir uzunluğun üzerinde olması gerekiyor.
const storePolicy = Array.from(
  { length: 150 },
  (_, i) =>
    `Kural ${i + 1}: Müşteriye her zaman nazik davran, siparişle ilgili soruları ` +
    `mağaza politikasına göre cevapla ve emin olmadığın konularda müşteriyi ` +
    `destek ekibine yönlendir. Bu kural ${i + 1}. bölümdeki ürün grubu için geçerlidir.`
).join("\n");

async function ask(question) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 100,
    system: [
      {
        type: "text",
        text: `Sen bir e-ticaret uygulamasının destek asistanısın.\n\n${storePolicy}`,
        cache_control: { type: "ephemeral" }, // Bu bloğu önbelleğe al
      },
    ],
    messages: [{ role: "user", content: question }],
  });
  return response.usage;
}

console.log("1. istek:", await ask("Siparişimi nasıl iade ederim?"));
console.log("\n2. istek:", await ask("Kargom ne zaman gelir?"));
