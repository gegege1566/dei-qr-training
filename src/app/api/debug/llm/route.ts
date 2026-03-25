export async function GET() {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = process.env.GOOGLE_MODEL ?? "models/gemini-2.5-flash";
  const provider = process.env.EVAL_PROVIDER;

  if (!apiKey) {
    return Response.json({ error: "GOOGLE_API_KEY not set", provider, model });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${apiKey}`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: 'Return exactly: {"test": "ok"}' }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 64,
          responseMimeType: "application/json",
        },
      }),
    });

    const status = res.status;
    const body = await res.text();

    return Response.json({ provider, model, apiKeySet: true, apiKeyPrefix: apiKey.slice(0, 8), status, body: body.slice(0, 500) });
  } catch (err) {
    return Response.json({ error: String(err), provider, model, apiKeySet: true });
  }
}
