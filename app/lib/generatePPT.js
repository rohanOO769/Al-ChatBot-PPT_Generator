  // app/lib/generatePPT.js

async function getPptxGen() {
  const mod = await import("pptxgenjs");
  return mod.default || mod;
}

async function fetchAsDataUrl(url) {
  const resp = await fetch(url, { mode: "cors" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const blob = await resp.blob();
  const toDataURL = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  return await toDataURL(blob);
}

export default async function generatePPT(slideJson) {
  if (!slideJson || !Array.isArray(slideJson.slides)) {
    alert("No slide JSON provided");
    return;
  }

  const PptxGenJS = await getPptxGen();
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
        x: 0.5, y: 1.2, fontSize: 18, bullet: false,
      });
    }

    if (s.image?.url) {
      const imgOpts = { x: 5.5, y: 1.2, w: 3.5, h: 3 };
      let added = false;
      try {
        // If it's a data URL or accessible URL, embedding will work
        if (s.image.url.startsWith("data:")) {
          slide.addImage({ ...imgOpts, data: s.image.url });
          added = true;
        } else {
          // try fetching as data URL
          const dataUrl = await fetchAsDataUrl(s.image.url);
          slide.addImage({ ...imgOpts, data: dataUrl });
          added = true;
        }
      } catch (e) {
        console.warn("Base64 embed failed, falling back to path:", e.message || e);
      }
      if (!added) {
        try {
          slide.addImage({ ...imgOpts, path: s.image.url });
        } catch (err) {
          console.warn("Failed to add image via path:", err);
        }
      }
    }

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