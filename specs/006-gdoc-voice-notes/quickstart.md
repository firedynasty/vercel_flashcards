# Quickstart Validation Guide: Google Doc Voice Notes

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-11

---

## Prerequisites

- `googlenotes.html` deployed via Vercel (or `vercel dev` locally) — `MediaRecorder`/microphone
  access requires a secure context (HTTPS or `localhost`), so opening the file directly (`file://`)
  will not work for the voice-note scenarios.
- `OPENAI_API_KEY` set in the Vercel project's environment variables (already required for
  `api/tts.js`/`api/ocr.js` — reused here, see `contracts/transcribe-api.md`).
- A Google account with at least one existing Google Doc that has been opened/viewed recently
  (so it appears in the "Recent ▾" list), containing some placeholder text.
- A mobile browser or DevTools device emulator set to ≤ 390px viewport width, for the touch/layout
  scenarios.
- A working microphone, and browser permission to use it, for the voice-note scenarios.

---

## Scenarios

### Scenario 1 — Sign in and see recent files

1. Open `googlenotes.html`.
2. **Expected**: A "Sign In" button is visible; no file content or recent-files list is shown yet
   (FR-001).
3. Click "Sign In" and complete the Google OAuth popup.
4. Tap "Recent ▾".
5. **Expected**: A dropdown lists your most recently viewed Google Docs and Sheets, most-recent
   first (FR-002).

---

### Scenario 2 — Load a Doc and view it

1. From the Recent list, select a Google Doc.
2. **Expected**: The page loads and displays that Doc's current text content within a few seconds
   (FR-003, SC-001), in View mode (read-only display, not a textarea).

---

### Scenario 3 — Edit and save

1. With a Doc loaded, tap "Edit".
2. **Expected**: The content becomes an editable textarea, pre-filled with the current text
   (FR-004).
3. Type an additional line of test text.
4. Tap "Save".
5. **Expected**: A success confirmation appears (FR-006).
6. Open the same Doc directly in Google Docs (separate tab) and refresh.
7. **Expected**: Your typed line is present in the Doc (SC-003).

---

### Scenario 4 — Save failure keeps edits intact

1. With a Doc loaded and edited, disconnect network (or otherwise force a save failure — e.g. via
   DevTools "offline" mode).
2. Tap "Save".
3. **Expected**: A clear, specific error message appears; the typed edits remain visible on the
   page, not discarded (FR-006, SC-004).
4. Reconnect network and tap "Save" again.
5. **Expected**: Save now succeeds.

---

### Scenario 5 — Record a voice note from View mode

1. With a Doc loaded and in View mode, tap the mic button.
2. **Expected**: The browser prompts for microphone permission (if not already granted); once
   granted, the page visibly indicates recording is active (FR-007, FR-009).
3. Speak a short, clear test phrase (under 30 seconds).
4. Tap the mic button again to stop.
5. **Expected**: The page shows a "transcribing…" state (FR-009), then within ~10 seconds the
   spoken phrase appears as text appended to the note content, on a new line after any existing
   text (FR-008, SC-002).
6. **Expected**: The page is still in View mode (did not auto-switch to Edit) — per the
   mic-mode-timing decision, View mode is where transcripts land.

---

### Scenario 6 — Mic tap from Edit mode applies edits and drops to View mode first

1. With a Doc loaded, tap "Edit" and type a partial note (do not save).
2. Tap the mic button (without tapping "Edit" again first).
3. **Expected**: Immediately — before recording visibly starts — the page switches to View mode
   and your typed text is visible in the displayed content (FR-007a). This must happen before any
   microphone prompt appears.
4. Complete a recording as in Scenario 5.
5. **Expected**: The transcript is appended after your previously-typed text, in the same content
   (FR-011) — both your typed note and the transcribed note end up together.

---

### Scenario 7 — Sequential voice notes append in order

1. Repeat Scenario 5's record→stop→transcribe cycle three times in a row, speaking a distinct
   short phrase each time (e.g. "one", "two", "three").
2. **Expected**: All three transcripts appear in the note content in the order they were spoken
   (FR-011), each on its own appended line, with none overwritten or reordered.

---

### Scenario 8 — Cannot start a second recording while transcribing

1. Start a recording, then tap "stop".
2. Immediately (while the "transcribing…" state is still showing) try tapping the mic button
   again.
3. **Expected**: The mic control is disabled/ignored until the in-flight transcript has been
   appended — no second recording starts, and no transcripts arrive out of order (FR-007b).

---

### Scenario 9 — Transcription failure leaves note content intact

1. Start a recording, then force a failure before tapping stop (e.g. disable network, or use
   DevTools to block the `/api/transcribe` request).
2. Tap the mic button to stop.
3. **Expected**: A clear, specific error message appears; no partial or garbled text is inserted
   into the note content; the page remains in View mode (FR-010).
4. Tap the mic button again to retry.
5. **Expected**: A fresh recording can start normally.

---

### Scenario 10 — Microphone permission denied

1. In browser settings, block microphone access for the page's origin (or deny the permission
   prompt when it appears).
2. Tap the mic button.
3. **Expected**: The page explains that microphone access is required — no silent/stuck failure
   state (FR-010, spec Edge Cases).

---

### Scenario 11 — Unsaved-changes warning

1. With a Doc loaded, tap "Edit", type a note, and do **not** save.
2. Attempt to navigate away from the page (close tab / reload) — or, without saving, select a
   different file from the Recent list.
3. **Expected**: A warning appears that unsaved changes will be discarded (FR-012).

---

### Scenario 12 — No recent files found

1. Sign in with a Google account that has no recently viewed Docs/Sheets.
2. Tap "Recent ▾".
3. **Expected**: A clear "no recent files found" message is shown instead of an empty or broken
   dropdown (US1 Acceptance Scenario 4).

---

### Scenario 13 — Mobile layout

1. Load the page at a 360px-wide viewport (or a real Samsung Galaxy Z Fold cover screen).
2. **Expected**: The Sign In button, Recent ▾ dropdown, Edit/Save buttons, and mic button are all
   ≥44×44px tap targets, do not overflow horizontally, and remain usable without pinch-zoom
   interference (Constitution Principle II).
