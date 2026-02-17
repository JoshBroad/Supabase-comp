import "dotenv/config";

const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-235b-a22b:free",
  "google/gemma-3-27b-it:free",
];

class OpenRouterLLM {
  private apiKey: string;
  private models: string[];

  constructor(apiKey: string, models: string[]) {
    this.apiKey = apiKey;
    this.models = models;
  }

  async invoke(prompt: string): Promise<{ content: string }> {
    let lastError: Error | null = null;

    for (const model of this.models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.apiKey}`,
              "HTTP-Referer": "https://trae.ai",
              "X-Title": "Vibe Architect Agent",
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: prompt,
                },
              ],
              temperature: 0.1,
            }),
          });

          if (response.status === 429) {
            const text = await response.text().catch(() => "");
            console.warn(`Rate limited on ${model} (attempt ${attempt + 1}), trying next...`);
            lastError = new Error(`OpenRouter 429: ${text}`);
            // Wait before retry/fallback
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }

          if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(`OpenRouter error: ${response.status} ${text}`);
          }

          const data: any = await response.json();
          const choice = data.choices?.[0];
          const content =
            typeof choice?.message?.content === "string"
              ? choice.message.content
              : "";

          if (model !== this.models[0]) {
            console.log(`Using fallback model: ${model}`);
          }
          return { content };
        } catch (error) {
          lastError = error as Error;
          console.error(`LLM error with ${model}:`, (error as Error).message);
        }
      }
    }

    throw lastError || new Error("All models failed");
  }
}

let llm: OpenRouterLLM | null = null;

export function getLLM(): OpenRouterLLM {
  if (llm) return llm;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  llm = new OpenRouterLLM(apiKey, FREE_MODELS);

  return llm;
}
