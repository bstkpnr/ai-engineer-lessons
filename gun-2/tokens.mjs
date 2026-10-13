import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();
const model = "claude-sonnet-5-5";

const texts = {
  turkce: "Mobil uygulama geliştiricileri yapay zekâ ile neler yapabileceklerini keşfediyorlar.",
  ingilizce: "Mobile app developers are discovering what they can do with artificial intelligence.",
};

for (const [dil, text] of Object.entries(texts)) {
  const result = await client.messages.countTokens({
    model,
    messages: [{ role: "user", content: text }],
  });
  console.log(`${dil}: ${text.length} karakter → ${result.input_tokens} token`);
}
