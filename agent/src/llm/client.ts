import { ChatAnthropic } from "@langchain/anthropic";

let llm: ChatAnthropic | null = null;

export function getLLM(): ChatAnthropic {
  if (llm) return llm;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY");
  }

  llm = new ChatAnthropic({
    model: "claude-sonnet-4-5-20250929",
    apiKey,
    maxTokens: 8192,
    temperature: 0,
  });

  return llm;
}
