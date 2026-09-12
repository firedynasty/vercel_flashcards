# Contract: `POST /api/transcribe`

**Feature**: [../spec.md](../spec.md) | **Decision**: [../research.md#decision-2-where-the-openai-api-call-happens](../research.md)

New Vercel serverless function, `api/transcribe.js`. Same shape and CORS handling as the existing
`api/tts.js` and `api/ocr.js` in this repo — holds `OPENAI_API_KEY` server-side, forwards to
OpenAI, and never exposes the key to the caller.

## Request

```
POST /api/transcribe
Content-Type: application/json
```

```json
{
  "audioBase64": "<base64-encoded audio bytes, no data: prefix>",
  "mimeType": "audio/webm"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `audioBase64` | string | yes | The `MediaRecorder` blob, base64-encoded client-side (`FileReader.readAsDataURL` minus the `data:...;base64,` prefix, or equivalent). |
| `mimeType` | string | yes | The blob's actual MIME type (e.g. `audio/webm`, `audio/mp4` on Safari) — used to pick a filename extension for the multipart upload to OpenAI and must be one OpenAI's endpoint accepts (`webm`, `mp4`, `wav`, `mp3`, `m4a`, `mpeg`, `mpga`). |

`OPTIONS` requests return `200` with no body (CORS preflight), matching `api/tts.js`/`api/ocr.js`.

## Success Response

```
200 OK
Content-Type: application/json
```

```json
{ "text": "the transcribed words the user spoke" }
```

## Error Responses

| Status | Body | When |
|--------|------|------|
| `405` | `{ "error": "Method not allowed" }` | Any method other than `POST`/`OPTIONS`. |
| `400` | `{ "error": "Missing audioBase64" }` | Request body missing the required field. |
| `500` | `{ "error": "OPENAI_API_KEY not configured on server" }` | Env var not set on this Vercel deployment (mirrors `api/tts.js`'s existing check). |
| `<upstream status>` | `{ "error": "<OpenAI error text>" }` | OpenAI's transcription endpoint returned a non-2xx response (e.g. unintelligible/empty audio, rate limit) — passed through so the page can show FR-010's specific error message. |

## Server-side behavior (for the implementation phase, not a client-visible contract)

1. Validate method and required field as above.
2. Decode `audioBase64` to a `Buffer`.
3. Build a `FormData` (Node 18+ global) with:
   - `file`: a `Blob([buffer], { type: mimeType })` given a filename with the matching extension
     (e.g. `recording.webm`).
   - `model`: `"gpt-4o-mini-transcribe"`.
4. `POST https://api.openai.com/v1/audio/transcriptions` with `Authorization: Bearer <OPENAI_API_KEY>`
   and the `FormData` body (do **not** set `Content-Type` manually — let `fetch` set the
   multipart boundary).
5. On success, return `{ text: <response.text> }` only — do not pass through any other fields
   OpenAI's response may include.
6. On failure, forward the upstream status code and an `{ error }` body (truncate very long error
   text, matching `api/tts.js`'s existing `errText` passthrough).

## Client usage sketch (`googlenotes.html`, not part of the contract)

```js
const res = await fetch('/api/transcribe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ audioBase64, mimeType: blob.type }),
});
if (!res.ok) { const { error } = await res.json(); throw new Error(error); }
const { text } = await res.json();
```
