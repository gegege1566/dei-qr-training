export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

export const callOpenRouter = async (messages: ChatMessage[]): Promise<{ text: string; model: string }> => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY env");
  }

  const model = process.env.OPENROUTER_MODEL ?? "openrouter/auto";
  const payload = {
    model,
    temperature: 0,
    max_tokens: 512,
    messages,
  };

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as OpenRouterResponse;
  const content = json.choices[0]?.message.content ?? "";

  return { text: content, model };
};
