// app/components/ChatSlideBuilder.js

import { useState } from 'react';
import generatePPT from '../lib/generatePPT';

export default function ChatSlideBuilder() {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [slideJson, setSlideJson] = useState(null);
  const [loading, setLoading] = useState(false);

  async function sendPrompt() {
    if (!prompt.trim()) return;
    setMessages((m) => [...m, { role: "user", text: prompt }]);
    setLoading(true);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const body = await res.json();

      if (res.ok && body?.data) {
        setSlideJson(body.data);
        setMessages((m) => [
          ...m,
          { role: "assistant", text: "Generated slides JSON", json: body.data },
        ]);
      } else {
        const err = body?.error || body?.outputText || "Unknown error";
        setMessages((m) => [...m, { role: "assistant", text: "Error: " + err }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", text: "Network error: " + err.message }]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  }

  return (
    <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
      <div style={{ flex: 1 }}>
        <div
          style={{
            height: 360,
            overflow: "auto",
            border: "1px solid #eee",
            padding: 12,
            background: "#fff",
          }}
        >
          {messages.length === 0 && <div><em>No messages yet. Send a prompt.</em></div>}
          {messages.map((m, i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <b>{m.role}</b>: {m.text}
              {m.json && <pre style={{ background: "#fafafa", padding: 8 }}>{JSON.stringify(m.json, null, 2)}</pre>}
            </div>
          ))}
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          style={{ width: "100%", marginTop: 12 }}
          placeholder="E.g., Create a 5-slide product pitch about 'Acme Air Purifier' for investors, tone: concise"
        />

        <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
          <button onClick={sendPrompt} disabled={loading}>
            {loading ? "Generating…" : "Send"}
          </button>
          <button
            onClick={() => {
              if (slideJson) generatePPT(slideJson);
            }}
            disabled={!slideJson}
          >
            Download PPTX
          </button>
        </div>
      </div>

      <div style={{ width: 420 }}>
        <h3>Slide preview</h3>
        <div style={{ border: "1px solid #ddd", padding: 10, minHeight: 300, background: "#fff" }}>
          {slideJson ? (
            <>
              <h4 style={{ marginTop: 0 }}>{slideJson.title || "Untitled"}</h4>
              {Array.isArray(slideJson.slides) && slideJson.slides.length ? (
                slideJson.slides.map((s) => (
                  <div key={s.id || s.title} style={{ border: "1px solid #ccc", margin: 8, padding: 8 }}>
                    <h4 style={{ margin: "4px 0" }}>{s.title}</h4>
                    {s.bullets && (
                      <ul>
                        {s.bullets.map((b, idx) => (
                          <li key={idx}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {s.notes && <small>Notes: {s.notes}</small>}
                  </div>
                ))
              ) : (
                <em>No slides in JSON</em>
              )}
            </>
          ) : (
            <em>No slides yet</em>
          )}
        </div>
      </div>
    </div>
  );
}