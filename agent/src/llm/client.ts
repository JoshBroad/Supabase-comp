class OpenRouterLLM {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async invoke(prompt: string): Promise<{ content: string }> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        "HTTP-Referer": "https://trae.ai",
        "X-Title": "Vibe Architect Agent",
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
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
  }
}

let llm: OpenRouterLLM | null = null;

export function getLLM(): OpenRouterLLM {
  if (llm) return llm;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  llm = new OpenRouterLLM(apiKey);

  return llm;
}
