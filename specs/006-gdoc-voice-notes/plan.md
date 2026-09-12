# Implementation Plan: Google Doc Voice Notes

**Branch**: `006-gdoc-voice-notes` | **Date**: 2026-09-11 | **Spec**: [spec.md](spec.md)

**Input**: New standalone page `googlenotes.html` — sign in with Google, pick a recently viewed
Google Doc/Sheet from a dropdown, view/edit its text, save back to the same Doc, and record voice
notes that get transcribed (via OpenAI `gpt-4o-mini-transcribe`, through a new server-side proxy)
and appended to the note content.

## Summary

One new page and one new serverless endpoint:

1. **`googlenotes.html`** (new file, repo root): Google sign-in (GIS token client, ported from
   `learn-google.html`/`vercel_google_drive`) → "Recent ▾" dropdown of Docs+Sheets (ported from the
   `002-learn-google-recent-picker` pattern) → load selected file's text → View/Edit toggle → Save
   writes back to the same Doc via the Docs API `batchUpdate` (ported from
   `vercel_google_drive/src/DriveSearch.js`) → a mic button that records via the native
   `MediaRecorder` API, uploads the recording to a new proxy endpoint, and appends the returned
   transcript to the (always-view-mode-at-that-point) note content.

2. **`api/transcribe.js`** (new file): A Vercel serverless function, matching the existing
   `api/tts.js`/`api/ocr.js` pattern, that holds `OPENAI_API_KEY` server-side and forwards a
   base64-encoded audio clip to OpenAI's `/v1/audio/transcriptions` endpoint
   (`model: gpt-4o-mini-transcribe`), returning `{ text }`.

3. **`vercel.json`**: add explicit rewrite entries for `/googlenotes.html` (and a `/googlenotes`
   alias), matching every other page in this file — required because the trailing catch-all rule
   `"/(.*)" → "/flashcards.html"` would otherwise swallow requests to the new page (see
   research.md Decision 6).

## Technical Context

**Language/Version**: Vanilla JavaScript ES2020+ on the client (no transpile step); Node.js
(Vercel serverless function, ES module `export default`, matching `api/tts.js`/`api/ocr.js`) on
the server.

**Primary Dependencies**:
- Google Identity Services (`accounts.google.com/gsi/client`) — OAuth token client, same pattern as
  `learn-google.html` / `vercel_google_drive`.
- Google Drive API v3 — `files.list` (recent files) + `files.export` (Doc → plain text).
- Google Docs API v1 — `documents.get` + `documents.batchUpdate` (save edits back).
- Browser `MediaRecorder` API (native — no recording library needed; OpenAI's transcription
  endpoint accepts the `webm`/`ogg` output directly, so `Recorder.js`/WAV conversion is
  unnecessary here — see research.md Decision 1).
- OpenAI Audio Transcriptions API (`gpt-4o-mini-transcribe`), called only from the new
  `api/transcribe.js` proxy — never directly from the browser.

**Storage**: In-memory only on the client (loaded file content + pending-edit state). No
localStorage, no database. The Google Doc itself is the only persisted store.

**Testing**: Manual browser validation per `quickstart.md`.

**Target Platform**: Mobile browser (Samsung Galaxy Z Fold, ≥320px viewport) and desktop browser.
`MediaRecorder` and microphone access require a secure context (HTTPS or `localhost`).

**Constraints**:
- New files only: `googlenotes.html`, `api/transcribe.js`; one edit to `vercel.json`. No existing
  page is modified.
- No build pipeline; CDN-loaded libraries only (GIS script tag); no `node_modules` dependency for
  the client page.
- Touch-first, ≥44px tap targets, no horizontal overflow at 320px width.
- `OPENAI_API_KEY` must never reach the browser — all transcription calls go through
  `api/transcribe.js`, reusing the env var already configured for `api/tts.js`/`api/ocr.js`.
- Recording → stop → transcribe → append is serialized (FR-007b): the mic control is disabled
  while a transcription is in flight.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design — see bottom.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single-File, Universal Design | ✅ PASS | `googlenotes.html` is a new standalone tool, not a language variant of `learn-chinese-tts.html`. Principle I scopes to the flashcard engine only. |
| II. Mobile-First, Touch-Optimized | ✅ PASS | Recent-dropdown and mic/edit/save controls sized ≥44px; no pinch-zoom/scroll capture; responsive ≥320px (design carries over the already-validated `.recent-dropdown` CSS). |
| III. Vanilla HTML/JS Stack | ✅ PASS | No framework, no bundler. Only new CDN dependency is GIS (already used elsewhere in the repo). The `MediaRecorder` API is native — no new client library. The server proxy is a plain Node handler identical in shape to existing `api/*.js` files, not a new pipeline. |
| IV. Content Pipeline | N/A | No CSV/XLSX data involved in this feature. |
| V. Progressive Enhancement | ✅ PASS | Google sign-in and the mic feature are both opt-in; a failed Drive/Docs/transcription call surfaces an inline status message and never blocks the rest of the page (FR-006, FR-010). |

## Project Structure

### Documentation (this feature)

```text
specs/006-gdoc-voice-notes/
├── plan.md              ← this file
├── spec.md              ← feature specification
├── research.md          ← decisions and rationale
├── data-model.md        ← entity definitions
├── quickstart.md        ← manual validation scenarios
├── contracts/
│   └── transcribe-api.md ← request/response contract for api/transcribe.js
├── checklists/
│   └── requirements.md
└── tasks.md             ← to be generated by /speckit-tasks
```

### Source Code (repository root)

```text
googlenotes.html          ← NEW FILE — the notes page
  │
  ├── CDN addition
  │     <script src="https://accounts.google.com/gsi/client"></script>
  │
  ├── CSS
  │     .recent-dropdown-wrapper / .recent-dropdown / .recent-dropdown-item
  │                          (ported from learn-google.html, identical)
  │     .setup-section / .setup-row  (sign-in + recent picker, ported)
  │     .mic-btn (idle / recording / transcribing visual states)
  │     .note-view / .note-edit    (view-mode text display vs. edit-mode textarea)
  │
  ├── HTML
  │     Setup section: Sign In button, "Recent ▾" dropdown (Docs + Sheets)
  │     Note area: view-mode <div> (read-only rendered text) OR edit-mode <textarea>
  │     Toolbar: Edit / Save buttons, mic button, status line
  │
  └── JS
        gnAccessToken, gnInitClient(), gnSignIn()        — GIS auth (ported)
        fetchRecentFiles(), openRecentDropdown(), closeRecentDropdown()  — ported picker
        loadFile(fileId, mimeType)                       — Drive export → plain text
        toggleEditMode()                                 — view ⇄ edit, per US2
        saveToGoogleDoc()                                — Docs API batchUpdate (ported from
                                                             vercel_google_drive/src/DriveSearch.js
                                                             writeContentToGoogleDrive, Docs branch)
        startRecording() / stopRecording()                — MediaRecorder lifecycle
        onMicTap()                                        — FR-007a: apply edits + force View
                                                             mode before recording starts
        transcribeRecording(blob)                         — POST to /api/transcribe, append
                                                             result to note content (FR-007b:
                                                             guards against overlapping calls)
        beforeunload guard                                 — unsaved-changes warning (FR-012)

api/transcribe.js          ← NEW FILE — OpenAI transcription proxy (mirrors api/tts.js/api/ocr.js)

vercel.json                ← EDIT — add rewrite entries for /googlenotes.html and /googlenotes
```

**Structure Decision**: Single new static page + single new serverless function, following the
exact per-page/per-endpoint convention already used throughout this repo (e.g.
`learn-google.html` + no dedicated endpoint; `api/tts.js`/`api/ocr.js` as the serverless-proxy
precedent). No shared/lib file is introduced — consistent with how `learn-google.html` and
`learn-chinese-tts.html` currently duplicate their sign-in/recent-picker code rather than sharing
a module (see research.md Decision 7 for why this feature follows the same duplication pattern
rather than introducing a shared script).

## Complexity Tracking

*No constitution violations — table intentionally omitted.*

---

## Post-Design Constitution Re-Check

*(Phase 1 complete — see data-model.md, contracts/transcribe-api.md, quickstart.md)*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single-File, Universal Design | ✅ PASS | Unchanged — new standalone page, not a fork of the canonical flashcard file. |
| II. Mobile-First, Touch-Optimized | ✅ PASS | Data model and contract introduce no new UI elements beyond what was already sized for touch in the Project Structure section. |
| III. Vanilla HTML/JS Stack | ✅ PASS | `contracts/transcribe-api.md` confirms the client/server boundary stays a plain JSON-over-`fetch` call — no new client dependency. |
| IV. Content Pipeline | N/A | Unchanged. |
| V. Progressive Enhancement | ✅ PASS | `data-model.md`'s Voice Note state machine (recording → transcribing → done/failed) always leaves the note content in its last-good state on failure, per FR-010. |
