// pages/api/generateImage.js

export default function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { prompt } = req.body || {};
  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Missing prompt" });
  }

  // Demo: return a simple SVG data URL with the prompt text rendered.
  // Replace this with your real image generation integration (DALL·E, Stable Diffusion, etc.)
  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' width='1200' height='900'>
      <rect width='100%' height='100%' fill='#e6e6e6'/>
      <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' font-size='36' fill='#333'>
        ${escapeHtml(prompt).slice(0, 120)}
      </text>
    </svg>
  `;
  const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return res.status(200).json({ url: dataUrl });
}

function escapeHtml(s = "") {
  return s.replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c]));
}
