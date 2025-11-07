// app/components/lib/generatePPT.js

import PptxGenJS from "pptxgenjs";

/**
 * Best-effort: fetch a remote image and return a Data URL for embedding.
 * If CORS blocks it, we throw so caller can fall back to `path`.
 */
async function fetchAsDataUrl(url) {
  const resp = await fetch(url, { mode: "cors" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();

  // Read as base64
  const toDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  return await toDataURL(blob); // e.g., "data:image/jpeg;base64,...."
}

export default async function generatePPT(slideJson) {
  if (!slideJson || !Array.isArray(slideJson.slides)) {
    alert("No slide JSON provided");
    return;
  }

  const pres = new PptxGenJS();
  pres.author = slideJson?.meta?.author || "AI";
  pres.title = slideJson?.title || "AI Presentation";

  for (const s of slideJson.slides) {
    const slide = pres.addSlide();

    if (s.title) {
      slide.addText(s.title, { x: 0.5, y: 0.3, fontSize: 24, bold: true });
    }

    if (s.bullets && s.bullets.length) {
      slide.addText(s.bullets.map((b) => "• " + b).join("\n"), {
        x: 0.5,
        y: 1.2,
        fontSize: 18,
        bullet: false,
      });
    }

    // ---- IMAGE FIX ----
    if (s.image?.url) {
      const imgOpts = { x: 5.5, y: 1.2, w: 3.5, h: 3 };

      // First, try embedding as base64 (most reliable if CORS allows fetch)
      let added = false;
      try {
        const dataUrl = await fetchAsDataUrl(s.image.url);
        slide.addImage({ ...imgOpts, data: dataUrl }); // <-- CORRECT KEY
        added = true;
      } catch (e) {
        console.warn("Base64 embed failed (CORS or fetch issue). Falling back to path:", e?.message || e);
      }

      // Fallback: let pptxgen load from URL directly (may still fail due to CORS)
      if (!added) {
        try {
          slide.addImage({ ...imgOpts, path: s.image.url }); // <-- CORRECT KEY
        } catch (err) {
          console.warn("Failed to add image via path:", err);
        }
      }
    }
    // ---- END IMAGE FIX ----

    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  const fileName = `${(slideJson.title || "presentation").replace(/\s+/g, "_").slice(0, 80)}.pptx`;
  try {
    await pres.writeFile({ fileName });
  } catch (err) {
    console.error("Failed to save PPTX:", err);
    alert("Failed to generate PPTX: " + err.message);
  }
}
