// pages/api/generate.js

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "Missing prompt" });

  const API_KEY = process.env.GENERATIVE_API_KEY;
  const MODEL = process.env.GEN_MODEL || "gemini-2.5-pro"; // overrideable

  if (!API_KEY) return res.status(500).json({ error: "No API key configured on server" });

  const systemInstruction = `
You are a slide-generation assistant. ONLY produce well-formed JSON matching this schema:
{ "title": string, "slides": [ { "id": string, "layout": string, "title": string, "bullets": [string], "image": { "url": string|null, "alt": string|null }, "notes": string } ], "meta": { "author": string, "createdAt": string } }
Do not include any commentary or text outside the JSON.
  `;

  const body = {
    model: MODEL,
    prompt: {
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
    },
    temperature: 0.2,
    max_output_tokens: 1200,
  };

  try {
    // Use global fetch available in Node 18+ / Next.js
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateText?key=${API_KEY}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await resp.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      // not pure JSON response (okay — model output may be nested). try to parse as JSON by searching for JSON block(s)
      // Attempt to extract text field if the API uses nested candidates/content format
      try {
        const fallback = JSON.parse(text);
        // if parsed we just use fallback; but above failed — so skip
      } catch (e) {
        // attempt to extract first JSON object block from the raw response text
        const match = text.match(/(\{[\s\S]*\})/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            return res.status(200).json({ data: parsed });
          } catch (err) {
            // fall through
          }
        }
      }
    }

    // If we got a parsed json (API-style), attempt to locate model text output
    let outputText = null;
    if (json) {
      // common patterns:
      // generativelanguage REST => json.candidates[0].content[0].text
      outputText =
        json?.candidates?.[0]?.content?.[0]?.text ||
        json?.candidates?.[0]?.text ||
        json?.text ||
        json?.output?.[0]?.content?.[0]?.text ||
        null;
    } else {
      // If json is null, use raw text
      outputText = text;
    }

    // If we have outputText (string), try parse as JSON
    if (outputText) {
      try {
        const parsed = JSON.parse(outputText);
        return res.status(200).json({ data: parsed });
      } catch (err) {
        // maybe outputText contains extra commentary; extract first JSON block
        const match = outputText.match(/(\{[\s\S]*\})/);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            return res.status(200).json({ data: parsed });
          } catch (err2) {
            // fall through to error
          }
        }
        // return model raw text for debugging
        return res.status(500).json({ error: "Model did not return valid JSON", outputText });
      }
    }

    // Last fallback: return raw API text for debugging
    return res.status(500).json({ error: "Unable to extract model output", raw: text });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
