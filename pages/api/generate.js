// pages/api/generate.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { prompt, existing } = req.body || {}; // <-- accept existing slide JSON
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  const API_KEY = process.env.GENERATIVE_API_KEY;
  const MODEL = process.env.GEN_MODEL || "gemini-2.5-pro";
  const MAX_TOKENS = Number(process.env.GEN_MAX_OUTPUT_TOKENS || 1200);
  if (!API_KEY) {
    return res.status(500).json({ error: "No API key configured on server" });
  }

  // Strong system instruction: always output JSON only. If "existing" provided, edit it.
  const systemInstruction = `
You are a slide-generation assistant. ONLY output a single JSON object (no prose) matching this schema:
{
  "title": string,
  "slides": [
    {
      "id": string,
      "layout": string,
      "title": string,
      "bullets": [string],
      "image": { "url": string|null, "alt": string|null },
      "notes": string|null
    }
  ],
  "meta": { "author": string|null, "createdAt": string|null }
}

IMPORTANT:
- If the user provided an "existing" presentation JSON, you MUST edit that existing JSON and return the full updated JSON. Do not invent a completely unrelated presentation.
- If the user asked for small changes you may either:
  1) Return the entire updated JSON (PREFERRED), or
  2) Return an object with a top-level "patch" key: { "patch": { "slides": [ ... ], "title": "...", "meta": {...} } } where each slide in patch.slides contains an "id". The client will merge the patch into the existing JSON by matching slide.id.
- The response must be valid JSON and conform to the schema. If uncertain, return a minimal valid JSON (title + slides:[]).
- Do NOT output any text outside the JSON. No commentary, no code fences.
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    MODEL
  )}:generateContent?key=${API_KEY}`;

  // include `existing` context for the model (stringified)
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents: [
      { role: "user", parts: [{ text: prompt }] },
      // give the existing JSON as machine-readable context (if present)
      ...(existing ? [{ role: "user", parts: [{ text: `EXISTING_PRESENTATION_JSON:${JSON.stringify(existing)}` }] }] : []),
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: MAX_TOKENS,
    },
  };

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawText = await resp.text();

    // If API returned a JSON error envelope, surface it clearly
    let apiJson = null;
    try {
      apiJson = JSON.parse(rawText);
    } catch {
      apiJson = null;
    }

    if (!resp.ok) {
      const errPayload =
        apiJson?.error?.message ||
        apiJson?.error ||
        rawText.slice(0, 2000) ||
        "Unknown API error";
      return res.status(resp.status).json({ error: errPayload });
    }

    // Gemini success response parsing
    // Typical path: candidates[0].content.parts[x].text
    let outputText = null;

    if (apiJson?.candidates?.length) {
      const parts = apiJson.candidates[0]?.content?.parts || [];
      // Concatenate any text parts (in case model split)
      outputText = parts
        .map((p) => (typeof p?.text === "string" ? p.text : ""))
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    // If nothing parsed yet, try fallback known shapes
    if (!outputText) {
      // Some responses might place text in different fields; add guards if needed
      outputText =
        apiJson?.candidates?.[0]?.content?.parts?.[0]?.text ||
        apiJson?.text ||
        null;
    }

    if (!outputText) {
      // As a long-shot, maybe the entire JSON is already the desired schema
      if (apiJson?.title && Array.isArray(apiJson?.slides)) {
        return res.status(200).json({ data: apiJson });
      }
      return res.status(500).json({
        error: "Unable to extract model output",
        raw: JSON.stringify(apiJson).slice(0, 2000),
      });
    }

    // Try to parse the model output as JSON
    try {
      const obj = JSON.parse(outputText);
      return res.status(200).json({ data: obj });
    } catch {
      // If there was prose, carve out the first JSON block
      const match = outputText.match(/(\{[\s\S]*\})/);
      if (match) {
        try {
          const obj = JSON.parse(match[1]);
          return res.status(200).json({ data: obj });
        } catch (err) {
          // fall through
        }
      }
      return res
        .status(500)
        .json({ error: "Model did not return valid JSON", outputText });
    }
  } catch (err) {
    console.error("Generation error:", err);
    return res.status(500).json({ error: err.message });
  }
}
