export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type GoogleCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GoogleResponse = {
  candidates?: GoogleCandidate[];
};

export const callGoogle = async (messages: ChatMessage[]): Promise<{ text: string; model: string }> => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY env");
  }

  const model = process.env.GOOGLE_MODEL ?? "models/gemini-1.5-flash-latest";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

  // Extract system message and user messages
  const systemMessage = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  const payload: Record<string, unknown> = {
    contents: userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    generationConfig: {
      temperature: 0,
      maxOutputTokens: 1024,
      responseMimeType: "application/json",
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  };

  if (systemMessage) {
    payload.system_instruction = {
      parts: [{ text: systemMessage.content }],
    };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google Generative API error: ${response.status} ${text}`);
  }

  const json = (await response.json()) as GoogleResponse;
  const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return { text: content.trim(), model };
};
