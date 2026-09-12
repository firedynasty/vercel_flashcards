# Research: Google Doc Voice Notes

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-11

---

## Decision 1: Audio capture method — native `MediaRecorder` vs. the existing `Recorder.js`/WAV pipeline

**Decision**: Use the browser's native `MediaRecorder` API, recording directly to `webm`/`opus`
(falling back to whatever `MediaRecorder.isTypeSupported()` reports on Safari — typically
`audio/mp4`), and upload that blob as-is.

**Rationale**: OpenAI's `/v1/audio/transcriptions` endpoint accepts `webm`, `mp4`, `wav`, `mp3`,
`m4a`, `mpeg`, and `mpga` directly — no conversion needed. A `Recorder.js`-based
record→WAV→MP3 pipeline (the pattern originally described for an unrelated `recordBtn` feature)
was investigated as precedent but **that button/pipeline does not exist anywhere in this repo**
(confirmed via `grep -rl "recordBtn"` across all `.html` files — no match, and there is no
`public/index.html` in this project at all). It appears to reference a different project. Since
there's no such code to port, and the native API already satisfies every requirement (start/stop
control, a usable audio blob) with zero added library weight, `MediaRecorder` is the simpler and
now-precedent-free choice.

**Alternatives considered**:
- Port a `Recorder.js`-style WAV encoder: adds a CDN dependency and an encode step purely to
  produce a format OpenAI doesn't require. Rejected — no benefit for this feature's scope.
- Continuous streaming to a realtime transcription API: OpenAI's Realtime API (WebSocket) would
  give live, in-progress transcription, but is materially more complex to wire up (persistent
  socket, streaming reassembly) than record→stop→upload→transcribe. Rejected as over-scoped for
  the "one voice note at a time" UX in the spec (FR-007b already serializes recordings).

---

## Decision 2: Where the OpenAI API call happens

**Decision**: Add `api/transcribe.js`, a new Vercel serverless function matching the existing
`api/tts.js`/`api/ocr.js` shape exactly: reads `OPENAI_API_KEY` from `process.env` (already
configured in this Vercel project — both `api/tts.js` and `api/ocr.js` depend on the same var
today), accepts a JSON body with base64 audio, and forwards it to OpenAI.

**Rationale**: `OPENAI_API_KEY` must never reach the browser (FR-013). This repo already has the
exact precedent twice over — `api/ocr.js` accepts `{ imageBase64 }` JSON and forwards to
`api/chat/completions`; `api/tts.js` accepts `{ input, voice, ... }` JSON and forwards to
`api/audio/speech`, returning a binary response. `api/transcribe.js` follows the same JSON-in
shape (`{ audioBase64, mimeType }`), reusing the same env var, so no new secret needs to be
provisioned. See `contracts/transcribe-api.md` for the exact request/response shape.

**Alternatives considered**:
- Client sends `multipart/form-data` directly to the proxy, which streams it through unmodified:
  marginally more bandwidth-efficient (no base64 ~33% overhead) but requires disabling Vercel's
  default JSON body parser (`export const config = { api: { bodyParser: false } }`) and manually
  reassembling the multipart stream — meaningfully more code for a feature whose recordings are
  expected to be short (SC-002 targets under 30 seconds). Rejected in favor of matching the
  simpler, already-proven `imageBase64` JSON pattern from `api/ocr.js`.
- Call OpenAI directly from the browser with a restricted/short-lived key: OpenAI does not offer
  scoped, short-lived client keys for this endpoint the way some services do; any key usable from
  the browser is fully usable by anyone who reads it from page source. Rejected — violates FR-013.

---

## Decision 3: Recent-files query

**Decision**: Reuse the exact Drive Files API v3 query pattern from `learn-google.html`'s
"Recent ▾" picker and from `vercel_google_drive/src/DriveSearch.js`'s `fetchRecentFiles()`:

```text
q = (mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet') and trashed=false
orderBy = viewedByMeTime desc
pageSize = 10
fields = files(id,name,mimeType,viewedByMeTime)
```

**Rationale**: Identical, already-validated pattern used in two places in this project family.
Docs and Sheets both appear (per spec Assumptions — Sheets show for picker parity, but only Docs
get full edit/voice-note support in this feature).

**Alternatives considered**: Filtering to `application/vnd.google-apps.document` only — rejected
because the spec explicitly calls for both types to appear in the picker (matching the existing
picker's precedent), even though only Docs are editable in v1.

---

## Decision 4: Saving edits back to the Google Doc

**Decision**: Port `writeContentToGoogleDrive()`'s Docs branch from
`vercel_google_drive/src/DriveSearch.js` verbatim in approach:

1. `GET https://docs.googleapis.com/v1/documents/{fileId}` to read the current `body.content`
   and find `endIndex` of the last element.
2. `POST .../{fileId}:batchUpdate` with a `deleteContentRange` covering `[1, endIndex-1]` (skipped
   if the doc is already empty), followed by an `insertText` at index `1` with the new content
   (with `\r\n`/`\r` normalized to `\n` first — the Docs API treats stray `\r` as extra paragraph
   breaks).

**Rationale**: This exact delete-then-insert approach is already implemented and working in a
sibling project against the same Docs API. Re-deriving a different save strategy (e.g., diffing
and issuing targeted range edits) would add complexity with no user-facing benefit for a
single-user notes tool where "last save wins" is an accepted assumption.

**Alternatives considered**: Issuing granular insert/delete requests based on a text diff between
old and new content — more "correct" in a multi-editor scenario but unnecessary complexity given
the spec's Assumptions explicitly accept last-save-wins with no concurrent-edit detection.

---

## Decision 5: OAuth scope

**Decision**: Request a single scope: `https://www.googleapis.com/auth/drive`.

**Rationale**: `vercel_google_drive`'s `DriveSearch.js` already uses this scope successfully for
the same list → export → **write back via `docs.googleapis.com`** flow this feature needs — full
`drive` scope covers `files.list`, `files.export`, and (per that working precedent) is accepted by
the Docs API for `batchUpdate` on docs the user owns/has edit access to. One scope keeps the
consent screen simple for a single-user tool.

**Alternatives considered**:
- `drive.readonly` + `documents` (two scopes): more granular, but `drive.readonly` would block the
  save-back requirement (US2) entirely — rejected, wrong capability.
- `drive.file` (app-created/opened files only): would prevent listing the user's *existing* recent
  Docs/Sheets in the picker (US1) unless the user manually opens a picker UI first — rejected,
  breaks the core "jump back into my last doc" flow.

---

## Decision 6: Vercel routing for the new page

**Decision**: Add two entries to `vercel.json`'s `rewrites` array, placed before the trailing
catch-all, matching the convention every other page in this file already follows:

```json
{ "source": "/googlenotes.html", "destination": "/googlenotes.html" },
{ "source": "/googlenotes", "destination": "/googlenotes.html" }
```

**Rationale**: `vercel.json`'s last rule is `{ "source": "/(.*)", "destination": "/flashcards.html" }`
— a catch-all that rewrites *any* path not explicitly listed earlier to `flashcards.html`. Every
existing page (`learn-google.html`, `read-literature.html`'s equivalent, etc.) has its own explicit
entry specifically to opt out of that catch-all. Without adding `googlenotes.html` to this list,
navigating to `/googlenotes.html` would silently serve `flashcards.html` instead — this was
confirmed by inspecting the current `vercel.json`, not assumed.

**Alternatives considered**: None — this is a required step, not a choice, given the existing
routing configuration.

---

## Decision 7: No shared/lib file for the ported sign-in + recent-picker code

**Decision**: Duplicate the GIS sign-in and "Recent ▾" picker code directly into
`googlenotes.html`, adapted with page-specific function/element names (e.g. `gnSignIn()`,
`gnRecentBtn`), rather than extracting a shared `<script src="gdrive-common.js">` used by
`googlenotes.html`, `learn-google.html`, and `learn-chinese-tts.html`.

**Rationale**: This mirrors the project's existing, deliberate pattern — `learn-google.html` and
`learn-chinese-tts.html` already each carry their own independent copy of this exact code (per
the porting table in `specs/003-read-literature-gdoc/plan.md`, which did the same thing for
`read-literature.html`). Constitution Principle III favors single self-contained HTML files over
introducing a build/shared-module story; a shared script would be the first cross-page JS
dependency in the repo and is out of scope for this feature.

**Alternatives considered**: Extracting `gdrive-common.js` — would reduce duplication across four
files, but changes the shared architecture as a side effect of this feature rather than as its own
deliberate, separately-reviewed change. Rejected for this feature; worth proposing as a standalone
refactor later if drift between the copies becomes a maintenance problem.
