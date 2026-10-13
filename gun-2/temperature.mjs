import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function ask(temperature) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 50,
    temperature,
    messages: [
      { role: "user", content: "Bir kahve dükkânı için tek satırlık bir slogan yaz." },
    ],
  });
  return response.content[0].text;
}

for (const temperature of [0, 1]) {
  console.log(`\n--- temperature: ${temperature} ---`);
  for (let i = 1; i <= 3; i++) {
    console.log(`${i}. ${await ask(temperature)}`);
  }
}
