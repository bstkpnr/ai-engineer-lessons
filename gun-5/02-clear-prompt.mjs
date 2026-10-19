import Anthropic from "@anthropic-ai/sdk";
import { reviews } from "./reviews.mjs";

const client = new Anthropic();

// Net, spesifik ve amacı belli bir prompt
function buildPrompt(review) {
  return `Mobil uygulamamız için App Store ve Google Play'den gelen kullanıcı yorumlarını analiz ediyoruz.
Sonuçları geliştirici ekibimiz hataları önceliklendirmek için kullanacak.

Aşağıdaki yorumu analiz et ve şu üç bilgiyi ver:
- duygu: olumlu, olumsuz, karisik veya notr
- kategori: performans, hata, tasarim, odeme, ozellik_istegi veya diger
- ozet: Yorumun ana fikri, en fazla 10 kelime

Sadece bu üç bilgiyi ver, başka açıklama ekleme.

Yorum: ${review}`;
}

for (const review of [reviews[0], reviews[2]]) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(review) }],
  });
  console.log(`\n=== ${review}\n`);
  console.log(response.content.find((block) => block.type === "text")?.text);
}
