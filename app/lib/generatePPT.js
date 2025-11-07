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
        console.warn("Failed to add image:", err);
      }
    }
    if (s.notes) {
      slide.addNotes(s.notes);
    }
  }

  const fileName = `${(slideJson.title || "presentation")
    .replace(/\s+/g, "_")
    .slice(0, 80)}.pptx`;
  pres.writeFile({ fileName }).catch((err) => {
    console.error("Failed to save PPTX:", err);
    alert("Failed to generate PPTX: " + err.message);
  });
}
