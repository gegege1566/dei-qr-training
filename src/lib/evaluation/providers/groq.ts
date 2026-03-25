export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GroqResponse = {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
};

export const callGroq = async (messages: ChatMessage[]): Promise<{ text: string; model: string }> => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GROQ_API_KEY env");
  }

  const model = process.env.GROQ_MODEL ?? "mixtral-8x7b-32768";
  const payload = {
    model,
    temperature: 0,
    max_tokens: 512,
    messages,
  };

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Groq API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as GroqResponse;
  const content = json.choices[0]?.message.content ?? "";

  return { text: content, model };
};
