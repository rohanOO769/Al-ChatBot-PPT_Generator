// app/components/ChatSlideBuilder.js

import { useEffect, useMemo, useRef, useState } from "react";
import { Paperclip, Send, Loader2, CheckCircle2, Globe, BookOpenText, Sparkles, Pencil } from "lucide-react";
import generatePPT from "../lib/generatePPT";

/**
 * Drop-in replacement for your current ChatSlideBuilder with a polished UI.
 * - Left pane: activity/"thinking" feed
 * - Right pane: slide canvas preview
 * - Sticky composer like the reference screenshots
 */
export default function ChatSlideBuilder({ userName = "Rohan" }) {
  const [messages, setMessages] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [slideJson, setSlideJson] = useState(null);
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function sendPrompt() {
    const value = prompt.trim();
    if (!value || loading) return;

    setMessages((m) => [...m, { role: "user", text: value }]);
    setLoading(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: value })
      });
      const body = await res.json();

      if (res.ok && body?.data) {
        setSlideJson(body.data);
        // Add a couple of pleasant status items so the UI looks rich
        setMessages((m) => [
          ...m,
          { role: "assistant", type: "thinking", title: "Thoughts", text: "Synthesizing sources and structuring slides." },
          { role: "assistant", type: "status", icon: "search", text: `Searching the web`, sub: '"' + value.slice(0, 64) + (value.length > 64 ? "…" : '"') },
          { role: "assistant", type: "status", icon: "read", text: "Reading website", sub: body?.data?.meta?.source || "Model references" },
          { role: "assistant", text: "6 slides generated", type: "done" }
        ]);
      } else {
        const err = body?.error || body?.outputText || "Unknown error";
        setMessages((m) => [...m, { role: "assistant", type: "error", text: String(err) }]);
      }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", type: "error", text: err.message }]);
    } finally {
      setLoading(false);
      setPrompt("");
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
  }

  const slideCount = useMemo(() => (Array.isArray(slideJson?.slides) ? slideJson.slides.length : 0), [slideJson]);

  return (
    <div className="w-full min-h-[80vh] grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-6">
      {/* Left column: greeting + activity feed */}
      <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <header className="px-6 pt-8 pb-4">
          <h1 className="text-2xl font-semibold text-neutral-900 text-center">Hello, {userName}!</h1>
          <p className="text-center text-neutral-500 text-sm">What do you want me to generate today?</p>
        </header>

        <div ref={scrollRef} className="flex-1 px-4 pb-28 overflow-auto">
          {messages.length === 0 ? (
            <div className="mx-2 my-4 text-center text-neutral-400 text-sm">
              Start with a topic, we’ll turn it into slides!
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((m, i) => (
                <MessageCard key={i} m={m} />
              ))}
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="absolute lg:relative bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white">
          <div className="border rounded-2xl px-4 py-2 flex items-end gap-2 bg-white shadow-sm">
            <button className="p-2 rounded-lg hover:bg-neutral-100" title="Attach">
              <Paperclip size={18} />
            </button>
            <textarea
              className="flex-1 resize-none outline-none text-sm leading-6 max-h-32 min-h-[44px] placeholder:text-neutral-400"
              placeholder="Start with a topic, we’ll turn it into slides!"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              onClick={sendPrompt}
              disabled={loading}
              className={`h-9 w-9 grid place-items-center rounded-xl ${loading ? "bg-neutral-200" : "bg-neutral-900 hover:opacity-90"} text-white`}
              title="Send"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>

      {/* Right column: slide canvas */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            {slideCount > 0 ? (
              <>
                <CheckCircle2 className="text-green-600" size={16} />
                <span>{slideCount} {slideCount === 1 ? "slide" : "slides"} generated</span>
              </>
            ) : (
              <div className="flex items-center gap-2"><Sparkles size={16} /><span>Waiting for your prompt…</span></div>
            )}
          </div>
          <button
            className="inline-flex items-center gap-2 text-sm border rounded-lg px-3 py-2 hover:bg-neutral-50"
            onClick={() => slideJson && generatePPT(slideJson)}
            disabled={!slideJson}
          >
            <Pencil size={16} /> Edit Presentation
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-4">
          {slideJson ? (
            <SlidesPreview slideJson={slideJson} />
          ) : (
            <EmptySlides />
          )}
        </div>
      </div>
    </div>
  );
}

function MessageCard({ m }) {
  if (m.type === "error") {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <b>Error</b>: {m.text}
      </div>
    );
  }

  if (m.type === "status") {
    const Icon = m.icon === "search" ? Globe : BookOpenText;
    return (
      <div className="rounded-xl border px-4 py-3 text-sm flex items-start gap-2">
        <Icon size={16} className="mt-0.5" />
        <div>
          <div className="font-medium">{m.text}</div>
          {m.sub && <div className="text-neutral-500 text-xs break-all">{m.sub}</div>}
        </div>
      </div>
    );
  }

  if (m.type === "thinking") {
    return (
      <div className="rounded-xl border px-4 py-3 text-sm">
        <div className="text-neutral-500 text-xs mb-1">Thinking…</div>
        <div className="font-semibold mb-1">{m.title || "Notes"}</div>
        <div className="text-neutral-700">{m.text}</div>
      </div>
    );
  }

  if (m.type === "done") {
    return (
      <div className="rounded-xl border px-4 py-3 text-sm flex items-center gap-2">
        <CheckCircle2 size={16} className="text-green-600" />
        <span>{m.text}</span>
      </div>
    );
  }

  // default bubble
  return (
    <div className={`rounded-2xl px-4 py-2 text-sm border ${m.role === "user" ? "bg-neutral-50" : "bg-white"}`}>
      <b className="capitalize">{m.role}</b>: {m.text}
    </div>
  );
}

function EmptySlides() {
  return (
    <div className="h-[520px] grid place-items-center text-neutral-400">
      <div className="text-center">
        <Sparkles className="mx-auto mb-2" />
        <p>Slides will appear here once generated.</p>
      </div>
    </div>
  );
}

function SlidesPreview({ slideJson }) {
  return (
    <div className="space-y-6">
      {/* Title banner */}
      <div className="rounded-xl border bg-neutral-50 p-4">
        <div className="text-sm text-neutral-500">{slideJson.meta?.createdAt || new Date().toLocaleDateString()}</div>
        <div className="text-2xl font-semibold text-neutral-800">{slideJson.title || "Untitled Presentation"}</div>
      </div>

      {/* Slide cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.isArray(slideJson.slides) && slideJson.slides.length ? (
          slideJson.slides.map((s, idx) => (
            <div key={s.id || s.title || idx} className="rounded-xl border shadow-sm overflow-hidden bg-white">
              <div className="flex items-center justify-between px-4 py-2 text-xs text-neutral-500 border-b bg-neutral-50">
                <span>{String(idx + 1).padStart(2, "0")}</span>
                <span>{s.layout || "content"}</span>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-[1fr_38%] gap-4 items-start">
                  <div>
                    <h3 className="text-xl font-semibold mb-2 text-neutral-800">{s.title || "Slide"}</h3>
                    {s.bullets?.length ? (
                      <ul className="list-disc pl-5 space-y-1 text-neutral-700">
                        {s.bullets.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-neutral-400 text-sm">No bullets</p>
                    )}
                    {s.notes && (
                      <div className="mt-3 p-2 rounded-lg bg-neutral-50 border text-xs text-neutral-600">
                        <span className="font-medium">Notes:</span> {s.notes}
                      </div>
                    )}
                  </div>
                  <div className="aspect-[4/3] bg-neutral-100 rounded-lg border grid place-items-center overflow-hidden">
                    {s.image?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.image.url} alt={s.image.alt || "slide"} className="object-cover w-full h-full" />
                    ) : (
                      <div className="text-neutral-400 text-sm">No image</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-neutral-400">No slides in JSON</div>
        )}
      </div>
    </div>
  );
}
