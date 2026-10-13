import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const model = "claude-sonnet-5-5";

// 1. istek: kendimizi tanıtıyoruz
await client.messages.create({
  model,
  max_tokens: 100,
  messages: [{ role: "user", content: "Merhaba, benim adım Deniz." }],
});

// 2. istek: ayrı bir istekte adımızı soruyoruz
const forgot = await client.messages.create({
  model,
  max_tokens: 100,
  messages: [{ role: "user", content: "Benim adım ne?" }],
});
console.log("Geçmiş olmadan:", forgot.content[0].text);

// 3. istek: bu sefer geçmişi kendimiz gönderiyoruz
const remembered = await client.messages.create({
  model,
  max_tokens: 100,
  messages: [
    { role: "user", content: "Merhaba, benim adım Deniz." },
    { role: "assistant", content: "Merhaba Deniz, tanıştığıma memnun oldum!" },
    { role: "user", content: "Benim adım ne?" },
  ],
});
console.log("Geçmişle birlikte:", remembered.content[0].text);
