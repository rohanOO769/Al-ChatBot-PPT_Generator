// app/components/SlideEditorModal.js

import { useEffect, useState } from "react";
import { X, RotateCw, DownloadCloud, ImagePlus } from "lucide-react";
import generatePPT from "../lib/generatePPT";

/**
 * SlideEditorModal
 * Props:
 *  - initialJson: the slide JSON object to edit
 *  - onClose(): close
 *  - onApply(updatedJson): save changes to parent
 */
export default function SlideEditorModal({ initialJson, onClose, onApply }) {
  const [edited, setEdited] = useState(() => deepClone(initialJson));
  const [original, setOriginal] = useState(() => deepClone(initialJson));
  const [saving, setSaving] = useState(false);
  const [activeImgEdit, setActiveImgEdit] = useState(null); // slide index being edited for image
  const [aiPromptForImage, setAiPromptForImage] = useState("");

  useEffect(() => {
    setEdited(deepClone(initialJson));
    setOriginal(deepClone(initialJson));
  }, [initialJson]);

  function deepClone(o) {
    try {
      return JSON.parse(JSON.stringify(o));
    } catch {
      return structuredClone ? structuredClone(o) : o;
    }
  }

  function updateSlide(idx, patch) {
    setEdited((s) => {
      const cp = deepClone(s);
      cp.slides[idx] = { ...cp.slides[idx], ...patch };
      return cp;
    });
  }

  function setBullet(idx, bulletIndex, text) {
    setEdited((s) => {
      const cp = deepClone(s);
      cp.slides[idx].bullets = cp.slides[idx].bullets || [];
      cp.slides[idx].bullets[bulletIndex] = text;
      return cp;
    });
  }

  function setTitle(idx, text) {
    // text should be plain text; we read textContent from contentEditable
    updateSlide(idx, { title: text });
  }

  function setNotes(idx, text) {
    updateSlide(idx, { notes: text });
  }

  // IMAGE: upload local file
  function handleImageUpload(idx, file) {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      setEdited((s) => {
        const cp = deepClone(s);
        cp.slides[idx].image = cp.slides[idx].image || { url: null, alt: null };
        cp.slides[idx].image.url = dataUrl;
        return cp;
      });
      setActiveImgEdit(null);
    };
    reader.readAsDataURL(file);
  }

  // IMAGE: call demo AI-image endpoint
  async function handleGenerateImageAI(idx) {
    if (!aiPromptForImage.trim()) return;
    try {
      // demo endpoint - replace with your real image-generation API
      const resp = await fetch("/api/generateImage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPromptForImage }),
      });
      const body = await resp.json();
      if (resp.ok && body?.url) {
        setEdited((s) => {
          const cp = deepClone(s);
          cp.slides[idx].image = cp.slides[idx].image || { url: null, alt: null };
          cp.slides[idx].image.url = body.url;
          return cp;
        });
        setActiveImgEdit(null);
        setAiPromptForImage("");
      } else {
        alert("Image generation failed: " + (body?.error || "unknown"));
      }
    } catch (err) {
      alert("Image generation error: " + err.message);
    }
  }

  function revertAll() {
    setEdited(deepClone(original));
  }

  async function downloadEdited() {
    setSaving(true);
    try {
      await generatePPT(edited);
    } catch (err) {
      console.error(err);
      alert("Download failed: " + (err.message || err));
    } finally {
      setSaving(false);
    }
  }

  function applyAndClose() {
    onApply && onApply(deepClone(edited));
  }

  if (!edited) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-xl overflow-auto max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">Edit Presentation</h3>
            <div className="text-sm text-neutral-500">{edited.title}</div>
          </div>

          <div className="flex items-center gap-2">
            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg" onClick={revertAll} title="Revert to original">
              <RotateCw size={16} /> Revert
            </button>
            <button className="inline-flex items-center gap-2 px-3 py-2 text-sm bg-neutral-900 text-white rounded-lg" onClick={downloadEdited}>
              <DownloadCloud size={16} /> {saving ? "Downloading…" : "Download Edited PPT"}
            </button>
            <button className="p-2 rounded-full hover:bg-neutral-100" onClick={onClose} title="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {/* Presentation meta edits */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-neutral-500">Title</label>
              <div
                contentEditable
                suppressContentEditableWarning
                className="mt-1 p-2 border rounded min-h-[42px]"
                onInput={(e) => {
                  const text = e.currentTarget.textContent || "";
                  setEdited((s) => ({ ...s, title: text }));
                }}
              >
                {edited.title}
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Author</label>
              <div
                contentEditable
                suppressContentEditableWarning
                className="mt-1 p-2 border rounded min-h-[42px]"
                onInput={(e) => {
                  const text = e.currentTarget.textContent || "";
                  setEdited((s) => ({ ...s, meta: { ...(s.meta || {}), author: text } }));
                }}
              >
                {edited.meta?.author || ""}
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-500">Created</label>
              <div className="mt-1 p-2 border rounded min-h-[42px]">
                {edited.meta?.createdAt || new Date().toLocaleString()}
              </div>
            </div>
          </div>

          {/* Slides editor */}
          <div className="space-y-4">
            {Array.isArray(edited.slides) && edited.slides.length ? (
              edited.slides.map((s, idx) => (
                <div key={s.id || idx} className="border rounded-lg p-4 bg-neutral-50">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <div className="text-xs text-neutral-500 mb-1">Slide {String(idx + 1).padStart(2, "0")}</div>

                      <div>
                        <label className="text-xs text-neutral-500">Title</label>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="mt-1 p-2 border rounded bg-white"
                          onInput={(e) => setTitle(idx, e.currentTarget.textContent || "")}
                        >
                          {s.title}
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="text-xs text-neutral-500">Bullets</label>
                        <ul className="mt-1 pl-5 space-y-1">
                          {(s.bullets || [""]).map((b, bi) => (
                            <li key={bi}>
                              <div
                                contentEditable
                                suppressContentEditableWarning
                                className="p-1 border-b"
                                onInput={(e) => setBullet(idx, bi, e.currentTarget.textContent || "")}
                              >
                                {b}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mt-3">
                        <label className="text-xs text-neutral-500">Notes</label>
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="mt-1 p-2 border rounded bg-white"
                          onInput={(e) => setNotes(idx, e.currentTarget.textContent || "")}
                        >
                          {s.notes}
                        </div>
                      </div>
                    </div>

                    {/* Image editor */}
                    <div className="w-48">
                      <div className="relative rounded-lg overflow-hidden border bg-white h-[160px] grid place-items-center">
                        {s.image?.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.image.url} alt={s.image.alt || "slide image"} className="object-cover w-full h-full" />
                        ) : (
                          <div className="text-neutral-400 text-sm">No image</div>
                        )}

                        {/* Hover overlay */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/25">
                          <div className="bg-white/90 p-2 rounded flex flex-col gap-2">
                            <button
                              className="inline-flex items-center gap-2 px-3 py-1 text-sm border rounded"
                              onClick={() => setActiveImgEdit(idx)}
                            >
                              <ImagePlus size={16} /> Edit image
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Active image edit UI */}
                      {activeImgEdit === idx && (
                        <div className="mt-2 p-2 border rounded bg-white space-y-2">
                          <div className="text-xs text-neutral-600">Replace image</div>

                          <div className="flex gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              id={`img-upload-${idx}`}
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleImageUpload(idx, f);
                              }}
                            />
                            <label htmlFor={`img-upload-${idx}`} className="px-3 py-1 border rounded text-sm cursor-pointer">Upload</label>

                            <div className="flex-1">
                              <input
                                value={aiPromptForImage}
                                onChange={(e) => setAiPromptForImage(e.target.value)}
                                className="w-full p-1 border rounded text-sm"
                                placeholder="Generate from AI: describe the image"
                              />
                              <div className="flex gap-2 mt-2">
                                <button
                                  className="px-3 py-1 border rounded text-sm"
                                  onClick={() => handleGenerateImageAI(idx)}
                                >
                                  Generate
                                </button>
                                <button
                                  className="px-3 py-1 border rounded text-sm"
                                  onClick={() => { setActiveImgEdit(null); setAiPromptForImage(""); }}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div>No slides found</div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <button className="px-4 py-2 border rounded" onClick={applyAndClose}>Save changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
