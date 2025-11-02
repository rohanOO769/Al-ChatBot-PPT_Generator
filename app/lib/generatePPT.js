// app/components/lib/generatePPT.js

import PptxGenJS from "pptxgenjs";

export default function generatePPT(slideJson) {
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
      // join bullets into a single text block
      slide.addText(s.bullets.map((b) => "• " + b).join("\n"), {
        x: 0.5,
        y: 1.2,
        fontSize: 18,
        bullet: false,
      });
    }
    if (s.image?.url) {
      try {
        slide.addImage({ x: 5.5, y: 1.2, w: 3.5, h: 3, src: s.image.url });
      } catch (err) {
        // image could be blocked by CORS — ignore and continue
        console.warn("Failed to add image:", err);
      }
    }
    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  // browser download
  pres.writeFile({
    fileName: `${(slideJson.title || "presentation").replace(/\s+/g, "_")}.pptx`,
  });
}
