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
  error?: { message?: string };
};

export const callGoogle = async (messages: ChatMessage[]): Promise<{ text: string; model: string }> => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GOOGLE_API_KEY env");
  }

  const model = process.env.GOOGLE_MODEL ?? "models/gemini-2.5-flash";
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
      maxOutputTokens: 4096,
      responseMimeType: "application/json",
      responseSchema: {
        type: "OBJECT",
        properties: {
          scorePoint: { type: "INTEGER" },
          scoreAccuracy: { type: "INTEGER" },
          scoreIdea: { type: "INTEGER" },
          summary: { type: "STRING" },
        },
        required: ["scorePoint", "scoreAccuracy", "scoreIdea", "summary"],
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

  if (json.error) {
    throw new Error(`Google API error: ${json.error.message}`);
  }

  const content = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  if (!content) {
    throw new Error("Empty response from Google API");
  }

  return { text: content.trim(), model };
};
