import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 20,
  messages: [
    { role: "user", content: "Yapay zekânın tarihini detaylıca anlat." },
  ],
});

console.log(response.content[0].text);
console.log("\nNeden durdu?", response.stop_reason);
console.log("Kullanım:", response.usage);
