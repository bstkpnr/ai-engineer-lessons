import Anthropic from "@anthropic-ai/sdk";

export const MODEL = process.env.MODEL ?? "claude-sonnet-5-5";
export const client = new Anthropic({ timeout: 60_000, maxRetries: 2 });
export { Anthropic };
