# imageNotes.html

A mobile-first drawing canvas with a reference image loader, Dropbox sync, and OpenAI OCR. Built as a single HTML file — no build step, no framework.

---

## Toolbar Buttons

| Button | What it does |
|--------|-------------|
| **Img** | Opens a file picker to load a reference image (e.g. a YouTube screenshot). Displayed above the canvas; tap to expand/collapse. |
| **Clear** | Wipes all strokes from the canvas and resets the undo history. |
| **Dark** | Toggles the canvas background between white and dark grey. Also flips the pen color to white/black to match. |
| **Grid** | Toggles a graph-paper grid overlay (drawn on a separate `gridCanvas` layered on top, `pointer-events: none`). Off by default. |
| **Undo** | Removes the last stroke and replays all remaining strokes from scratch. Enabled only when there are strokes. Keyboard shortcut: `Ctrl+Z` / `Cmd+Z`. |
| **↑ ↓** | Scroll the page up or down 600px (smooth). Useful on mobile since the canvas is 150vh tall. |
| **Stroke slider** | Range input (`min=2, max=20`). Sets `ctx.lineWidth` for the next stroke. |
| **Notes** | Opens the Dropbox sync modal (amber). Save or load the drawing as JSON. |
| **OCR** | Crops the canvas to the bounding box of drawn strokes, sends to OpenAI as a PNG, returns extracted English text. |
| **中文** | Same as OCR but uses a Chinese-specific prompt. |

---

## Canvas Architecture

Two `<canvas>` elements stacked in a wrapper div:

```
.canvas-wrapper (position: relative, height: 150svh)
  ├── #drawCanvas   — user strokes (pointer-events active)
  └── #gridCanvas   — grid lines (pointer-events: none, opacity: 0.35)
```

Both canvases are sized to the wrapper in CSS pixels, then scaled up by `devicePixelRatio` (capped at 2) for crisp lines on high-DPI phones. The transform `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` means all drawing coordinates are in CSS pixels — no manual scaling needed.

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
canvas.width  = Math.round(cssW * dpr);
canvas.height = Math.round(cssH * dpr);
canvas.style.width  = cssW + 'px';
canvas.style.height = cssH + 'px';
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

---

## Stroke Data Model

Every stroke is stored as an object:

```js
{
  color: '#000000',   // ctx.strokeStyle at draw time
  width: 4,          // ctx.lineWidth at draw time
  points: [
    { x: 120.5, y: 44.2 },
    { x: 121.3, y: 45.8 },
    // ...
  ]
}
```

Strokes are pushed into a `strokes[]` array as the user draws. Single-tap dots are stored as a one-point stroke and rendered as a filled circle (`ctx.arc`).

---

## Save / Load — How Canvas Serialization Works

The key insight: **the canvas pixel buffer is thrown away on save. Only the stroke vectors are persisted.**

### Saving

```js
const data = JSON.stringify({
  width: cssW,      // canvas CSS width at save time
  height: cssH,
  strokes: strokes  // the array of {color, width, points[]} objects
});
// → uploaded to Dropbox as /flashcards/vercel/imagenotes.json
```

This is the same format as `drawing.json` from the companion `draw-canvas.html` tool.

### Loading

```js
const data = JSON.parse(text);          // from Dropbox
strokes = data.strokes || [];
redrawAll();                            // replay every stroke onto a cleared canvas
```

`redrawAll()` clears the canvas and iterates `strokes[]`, calling `ctx.beginPath() / ctx.moveTo / ctx.lineTo / ctx.stroke()` for each one. Because vectors are replayed rather than rasterizing a PNG, the drawing stays sharp at any resolution and remains fully undoable.

### Why not save as PNG?

- PNG captures the pixel buffer — you can display it but can't undo individual strokes.
- The JSON format is ~5–20 KB for typical notes vs ~200 KB+ for a PNG of the same canvas.
- Vectors can be re-rendered at any DPR after a screen rotation or resize.

---

## Dropbox Wiring (Notes modal)

Auth uses PKCE (no client secret needed in the browser):

```
1. Generate random verifier → SHA-256 → base64url challenge
2. Open Dropbox OAuth popup with challenge + redirect_uri = current page
3. Popup redirects back with ?code=...
4. Exchange code + verifier for access_token via /oauth2/token
5. Popup postMessages the token back to the opener and closes
```

The token lives in `DBX_TOKEN` (memory only — not persisted). If the token expires (401), the button clears it and prompts re-auth.

File path: `/flashcards/vercel/imagenotes.json`

---

## OCR Wiring

### Client side (`imageNotes.html`)

1. Compute bounding box of all stroke `points[]` (min/max x,y + 12px padding).
2. Create a temp canvas cropped to that region, replay strokes offset by `(minX, minY)`.
3. Export as `canvas.toDataURL('image/png')`, strip the `data:image/png;base64,` prefix.
4. POST to `/api/ocr` with `{ accessCode, imageBase64, chinese: true/false }`.

Cropping to the bounding box keeps the image small — only the actual drawn content is sent, not 150vh of blank white canvas.

### Server side (`api/ocr.js`)

```
POST /api/ocr
Body: { accessCode, imageBase64, chinese }
```

- Validates `accessCode` against `process.env.ACCESS_CODE`
- Uses `process.env.OPENAI_API_KEY` (never exposed to client)
- Calls `gpt-4o-mini` with a vision message: the base64 PNG + a prompt
- English prompt: infer ambiguous words, correct non-words to nearest real word
- Chinese prompt: transcribe characters, infer ambiguous ones from context
- Collapses all whitespace/newlines to single spaces before returning (same as the companion Python script)

The access code is cached in `localStorage` as `ocr-access-code`. A 401 clears it so the user is prompted again.

---

## Vercel Environment Variables Required

| Variable | Used by |
|----------|---------|
| `REACT_APP_DROPBOX_APP_KEY` | `/api/dropbox-key.js` → Dropbox PKCE auth |
| `ACCESS_CODE` | `/api/ocr.js` → gates OCR usage |
| `OPENAI_API_KEY` | `/api/ocr.js` → gpt-4o-mini vision calls |
