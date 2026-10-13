import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const response = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 300,
  messages: [
    {
      role: "user",
      content: "Bir mobil geliştiriciye AI Engineer olma yolunda tek cümlelik bir tavsiye ver.",
    },
  ],
});

console.log(response.content[0].text);
