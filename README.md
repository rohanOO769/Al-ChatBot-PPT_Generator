# AI Slide Builder (Next.js + Gemini + PPTX)

Generate, edit, and export slide decks from chat prompts. The app talks to Google’s Gemini API to create a **strict JSON slide model**, lets you edit text/images in a clean UI, and exports to **.pptx** via `pptxgenjs`.

> Tech: Next.js 16 (App + Pages mixed), React, Tailwind-style utility classes, `pptxgenjs`, Lucide icons, Gemini `generateContent` API.

---

## Quick Start

### Deployed link: [ai-ppt-chatbot](https://ai-ppt-chatbot-latest.onrender.com)

### The app is build and containerized using Docker and pushed to the docker hub. 
- Pull and Run:
    ```bash 
    docker pull rohanoo769/ai-ppt-chatbot:latest
    ```
    ```bash 
    docker run -p 3000:3000 rohanoo769/ai-ppt-chatbot:latest
    ```

### Running Locally

- First, run the development server:

    ```bash
    npm run dev
    # or
    yarn dev
    # or
    bun run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## API routes

### `POST /api/generate`
- **Body:**
  ```json
  { "prompt": "string", "existing": { /* current deck JSON */ } }
  ```
- Talks to Gemini `models/{MODEL}:generateContent` with a **strong system instruction** to output only valid JSON. Handles typical Google responses and tries to salvage the first JSON block if the model adds prose.
- **Env:** `GENERATIVE_API_KEY`, `GEN_MODEL`, `GEN_MAX_OUTPUT_TOKENS`

### `POST /api/generateImage`
- Demo-only. Returns an SVG **data URL** with your prompt stamped on it.
- Replace with your real image generator call (e.g., Imagen, SDXL, DALL·E).

---

## UI / Features

- **Chat-first flow** – type a topic, get a deck.
- **Smart merging** – when you iterate, we send your existing deck to Gemini and apply returned full JSON or `patch`.
- **Inline editing** – titles, bullets, notes are `contentEditable` fields.
- **Image editing** – hover an image to:
  - **Upload** from local (stored as a Data URL in memory)
  - **Generate via AI** (calls `/api/generateImage` demo; swap in your own)
- **Export** – click **Download PPTX** (or **Download Edited PPT** in the modal). Uses `pptxgenjs`.
- **Revert** – one-click revert to original state inside the editor modal.

---

## PPT export details

`app/lib/generatePPT.js`:
- Uses `pptxgenjs`.
- Adds slide title, bullets, notes.
- Attempts to embed images:
  - If `image.url` is a **data URL** → embed directly.
  - If it’s an HTTP(S) URL → tries to fetch (CORS) and convert to Data URL; if that fails, falls back to `path:` (may still fail depending on source/CORS).

**Gotchas:** some hosts block cross-origin fetches. In that case, prefer uploading images (data URLs) or proxy through your server/CDN.

---
## Application Screenshots
### Prompt a topic to generate a deck.
<img width="1883" height="910" alt="ss1" src="https://github.com/user-attachments/assets/79373356-656e-483a-ac44-4f5af7ac3bf5" />

### Send a follow-up prompt to modify the existing deck.
<img width="1889" height="926" alt="ss2" src="https://github.com/user-attachments/assets/e8ff9046-0585-44f8-b62b-8cc095ffc040" />

### Edit slides in the editor modal.
<img width="1900" height="934" alt="ss3" src="https://github.com/user-attachments/assets/294208da-9ce8-42dd-8d7f-477e938abc06" />

### Download as .pptx after final edits.
<img width="1873" height="889" alt="ss4" src="https://github.com/user-attachments/assets/3f751bca-9071-4393-8f04-af27ff9c49d1" />
<img width="1916" height="1025" alt="ss5" src="https://github.com/user-attachments/assets/751deb55-8b66-444d-905b-13c937d30d4c" />

---

## Troubleshooting (read this before opening issues)

- **401/403/429 from `/api/generate`**: your Google key is wrong, missing quota, or the model isn’t accessible for your account.
- **“Model did not return valid JSON”**: the model broke format. The handler already tries to recover by finding the first JSON block—tighten the system prompt or reduce creativity (`temperature: 0.2` is already low).
- **CORS/image fetch fails in PPT**: the remote server blocks cross-origin or hotlinking. Upload images locally (data URLs) or proxy through your backend.
- **Generated deck is nonsense**: garbage in, garbage out. Use concrete prompts (“Make a 10‑slide deck on X with 3 bullets per slide and include 1 chart placeholder”).
- **Large images make PPT huge**: your uploaded Data URLs are huge. Use compressed images.
- **Windows download issues**: some browsers silently block file saves from unknown origins—try a different browser or ensure HTTPS on prod.
- **Sometimes the model is busy**
  <img width="1166" height="836" alt="ss6" src="https://github.com/user-attachments/assets/7a474d67-23dc-46e4-9138-da340dd18e4b" />
  
- **Try again in such scenarios.**
  <img width="1201" height="550" alt="ss7" src="https://github.com/user-attachments/assets/86061afc-a8c6-4940-b3e1-fb0fb94cf540" />

---

## Security notes

- Your **API key lives server-side** in `/api/generate`. Don’t expose it in the browser. Don’t move generation into the client.
- Logs may contain prompts and partial outputs. Scrub if you care about privacy.
- If you add an external image generator, validate/sanitize inputs and file types.

---

## Future Improvements
- Themeable templates and chart primitives in the slide schema.
- Auth + DB to persist decks and learn user design patterns.
- Unit/functional tests and CI via GitHub Actions for automated testing and building.
- Multi-stage Docker builds, for optimized build and better security.

---




