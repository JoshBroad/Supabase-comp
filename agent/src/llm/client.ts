import "dotenv/config";

class OpenRouterLLM {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "google/gemini-2.0-flash-001") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async invoke(prompt: string): Promise<{ content: string }> {
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
          model: this.model,
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.1, // Low temperature for more deterministic JSON
        }),
      });

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

      return { content };
    } catch (error) {
      console.error("LLM invoke error:", error);
      throw error;
    }
  }
}

let llm: OpenRouterLLM | null = null;

export function getLLM(): OpenRouterLLM {
  if (llm) return llm;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  // Use a capable model for schema inference. 
  // "meta-llama/llama-3.3-70b-instruct:free" is cost-effective and capable.
  llm = new OpenRouterLLM(apiKey, "meta-llama/llama-3.3-70b-instruct:free");

  return llm;
}
