import Anthropic from "@anthropic-ai/sdk";
import { reviews } from "./reviews.mjs";

const client = new Anthropic();

// Belirsiz bir prompt: Ne istediğimizi modele bırakıyoruz
for (const review of [reviews[0], reviews[2]]) {
  const response = await client.messages.create({
    model: "claude-sonnet-5-5",
    max_tokens: 400,
    messages: [{ role: "user", content: `Bu yorumu analiz et: ${review}` }],
  });
  console.log(`\n=== ${review}\n`);
  console.log(response.content.find((block) => block.type === "text")?.text);
}
