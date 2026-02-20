import "dotenv/config";

class OpenRouterLLM {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string = "google/gemini-2.0-flash-001") {
    this.apiKey = apiKey;
    this.model = model;
  }

  async invoke(prompt: string): Promise<{ content: string; usage?: { cost?: number } }> {
    console.log("\n🤖 [AI Thinking] ----------------------------------------");
    console.log(prompt);
    console.log("--------------------------------------------------------\n");

    const maxRetries = 5;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
            "HTTP-Referer": "https://trae.ai",
            "X-Title": "Data Lake Agent",
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
          if (response.status === 429 || response.status >= 500) {
            const text = await response.text().catch(() => "");
            console.warn(`LLM request failed (attempt ${attempt + 1}/${maxRetries}): ${response.status} ${text}`);
            attempt++;
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 2s, 4s, 8s, 16s, 32s
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          const text = await response.text().catch(() => "");
          throw new Error(`OpenRouter error: ${response.status} ${text}`);
        }

        const data: any = await response.json();
        const choice = data.choices?.[0];
        const content =
          typeof choice?.message?.content === "string"
            ? choice.message.content
            : "";

        console.log("\n💡 [AI Response] ---------------------------------------");
        console.log(content);
        console.log("--------------------------------------------------------\n");

        const usage = data.usage
          ? { cost: data.usage.total_tokens ? data.usage.total_tokens * 0.000001 : 0 }
          : undefined;

        return { content, usage };
      } catch (error) {
        console.error("LLM invoke error:", error);
        if (attempt === maxRetries - 1) throw error;
        attempt++;
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error("Max retries exceeded");
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
  // User requested Gemini 3 Pro Preview
  llm = new OpenRouterLLM(apiKey, "google/gemini-3-pro-preview");

  return llm;
}
