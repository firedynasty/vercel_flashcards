# Tasks: Google Doc Voice Notes

**Input**: Design documents from `specs/006-gdoc-voice-notes/`

**Files touched**: `googlenotes.html` (new), `api/transcribe.js` (new), `vercel.json` (edited)

**Context**: Transcription proxy (`api/transcribe.js`) reuses the `OPENAI_API_KEY` environment
variable already configured on this Vercel project for `api/tts.js`/`api/ocr.js` — no new secret
needs to be provisioned.

## Phase 1: Setup

**Purpose**: Get an empty, routable page in place before any real content is added.

- [X] T001 Create `googlenotes.html` at the repo root with a minimal HTML5 skeleton: `<!DOCTYPE html>`, `<html>`, `<head>` (charset UTF-8, `<meta name="viewport" content="width=device-width, initial-scale=1">`, `<title>Google Doc Voice Notes</title>`, empty `<style></style>`), and `<body>` with an empty `<script></script>` before `</body>`.
- [X] T002 [P] Add two entries to the `rewrites` array in `vercel.json`, placed immediately before the trailing `{ "source": "/(.*)", "destination": "/flashcards.html" }` catch-all rule (per research.md Decision 6 — without this the new page is silently served as `flashcards.html`):

  ```json
  { "source": "/googlenotes.html", "destination": "/googlenotes.html" },
  { "source": "/googlenotes", "destination": "/googlenotes.html" }
  ```

---

## Phase 2: Foundational (blocks all user stories)

**Purpose**: Shared CDN script, CSS, page structure, and JS state that every user story's code
attaches to.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T003 Add the Google Identity Services CDN script tag to `googlenotes.html`'s `<head>`: `<script src="https://accounts.google.com/gsi/client" async defer></script>` (research.md Decision 5/US1 dependency).
- [X] T004 Add shared CSS to `googlenotes.html`'s `<style>` block: the `.setup-section`/`.setup-row` (sign-in + recent picker container, ported verbatim from `learn-google.html`) and `.recent-dropdown-wrapper`/`.recent-dropdown`/`.recent-dropdown-item` classes (copy exactly from `learn-google.html` lines 247–264 — already validated on mobile per Constitution Principle II), plus new `.note-view` (read-only content display) and `.note-edit` (textarea, `width:100%; min-height:200px; box-sizing:border-box`) classes, and a `.mic-btn` class with `min-width:44px; min-height:44px` and three visual-state modifier classes `.mic-btn.recording` (e.g. red pulse/background), `.mic-btn.transcribing` (e.g. dimmed + disabled cursor), `.mic-btn.failed` (e.g. amber border) — per data-model.md's `VoiceNote.status` enum `"idle" | "recording" | "transcribing" | "failed"`, each of the three non-idle states needs a distinct visual treatment so FR-009's "always know whether the system is listening, working, idle, or has failed" is satisfiable by CSS class alone.
- [X] T005 Add the base HTML structure to `googlenotes.html`'s `<body>`:

  ```html
  <h1>Google Doc Voice Notes</h1>
  <div class="setup-section">
    <button id="gnSignInBtn">Sign In</button>
    <div class="recent-dropdown-wrapper">
      <button id="gnRecentBtn" disabled>Recent &#9662;</button>
      <div id="gnRecentDropdown" class="recent-dropdown" hidden></div>
    </div>
  </div>
  <p id="gnStatus"></p>
  <div id="gnNoteArea" hidden>
    <h2 id="gnFileName"></h2>
    <div id="gnViewContent" class="note-view"></div>
    <textarea id="gnEditContent" class="note-edit" hidden></textarea>
    <div class="setup-row">
      <button id="gnEditBtn">Edit</button>
      <button id="gnSaveBtn">Save</button>
      <button id="gnMicBtn" class="mic-btn">&#127908;</button>
    </div>
  </div>
  ```

- [X] T006 Add shared JS state to `googlenotes.html`'s `<script>` block:

  ```javascript
  var gnAccessToken = null;
  var gnTokenClient = null;
  // NoteSession (data-model.md): mode starts at "view" on load; dirty is derived, not stored.
  var gnSession = { fileId: null, fileName: '', mimeType: '', originalContent: '', content: '', mode: 'view', saving: false };
  // VoiceNote (data-model.md): status enum "idle" | "recording" | "transcribing" | "failed".
  var gnVoice = { status: 'idle', startedAt: null, blob: null, errorMessage: null };
  var gnMediaRecorder = null;
  var gnRecordedChunks = [];

  function gnSetStatus(msg) { document.getElementById('gnStatus').textContent = msg || ''; }
  function gnIsDirty() { return gnSession.content !== gnSession.originalContent; }
  ```

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 — Sign in and pick a recent Google Doc (Priority: P1) 🎯 MVP

**Goal**: User signs in with Google and loads the content of a recently viewed Doc/Sheet from a
dropdown, read-only.

**Independent Test**: quickstart.md Scenarios 1, 2, 12.

- [X] T007 [US1] Implement `gnInitClient()` and `gnSignIn()` in `googlenotes.html`'s `<script>`, porting the GIS token-client pattern from `learn-google.html`'s `gdriveInitClient()`/`gdriveSignIn()`:

  ```javascript
  function gnInitClient() {
    if (window.google && window.google.accounts) {
      gnTokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GDRIVE_CLIENT_ID, // reuse the same OAuth client ID as learn-google.html
        scope: 'https://www.googleapis.com/auth/drive', // research.md Decision 5 — single scope covers list/export/read/write
        callback: function(resp) {
          if (resp.access_token) {
            gnAccessToken = resp.access_token;
            document.getElementById('gnSignInBtn').textContent = 'Sign Out';
            document.getElementById('gnRecentBtn').disabled = false;
            gnSetStatus('Signed in');
          }
        }
      });
    } else {
      setTimeout(gnInitClient, 100);
    }
  }
  function gnSignIn() {
    if (gnAccessToken) {
      window.google.accounts.oauth2.revoke(gnAccessToken);
      gnAccessToken = null;
      document.getElementById('gnSignInBtn').textContent = 'Sign In';
      document.getElementById('gnRecentBtn').disabled = true;
      gnSetStatus('Signed out');
    } else if (gnTokenClient) {
      gnTokenClient.requestAccessToken();
    }
  }
  document.getElementById('gnSignInBtn').addEventListener('click', gnSignIn);
  gnInitClient();
  ```

- [X] T008 [US1] Implement `fetchRecentFiles()`, `openRecentDropdown(files)`, and `closeRecentDropdown()` in `googlenotes.html`, porting the dropdown logic verbatim from `learn-google.html`'s `fetchRecentFiles()`/`openRecentDropdown()`/`closeRecentDropdown()`, with the Drive query from research.md Decision 3 (`q=(mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet') and trashed=false`, `orderBy=viewedByMeTime desc`, `pageSize=10`, `fields=files(id,name,mimeType,viewedByMeTime)` — matching data-model.md's `RecentFile.mimeType` field, which is one of `application/vnd.google-apps.document` or `application/vnd.google-apps.spreadsheet`), targeting `#gnRecentBtn`/`#gnRecentDropdown` from T005. Each dropdown item's click handler calls `loadFile(file.id, file.name, file.mimeType)` (implemented in T009).
- [X] T009 [US1] Implement `loadFile(fileId, fileName, mimeType)` in `googlenotes.html`:
  - If `gnIsDirty()` is true, confirm discard via `window.confirm()` before proceeding (ties into FR-012 / T014).
  - If `mimeType === 'application/vnd.google-apps.document'`: `fetch` `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain` with the `Authorization: Bearer` header, read the text, normalize line endings with `.replace(/\r\n/g, '\n').replace(/\r/g, '\n')` (matches research.md Decision 4's Docs-API-write requirement), and set `gnSession = { fileId: fileId, fileName: fileName, mimeType: mimeType, originalContent: text, content: text, mode: 'view', saving: false }`.
  - Else (a Sheet, per data-model.md's `RecentFile.mimeType` second value): set `gnSession` the same way but with a placeholder `content` string such as `"(This is a Google Sheet — editing and voice notes are only supported for Google Docs.)"`, and disable `#gnEditBtn`, `#gnSaveBtn`, and `#gnMicBtn` (spec Edge Cases: selecting a Sheet "should not crash the page").
  - Reveal `#gnNoteArea` (remove `hidden`), set `#gnFileName` textContent to `fileName`, call `gnRenderView()` (T011), and call `closeRecentDropdown()`.
- [X] T010 [US1] In `openRecentDropdown(files)` (T008), handle the empty case: if `files` is an empty array, render a single non-interactive row reading `"No recent files found"` inside `#gnRecentDropdown` instead of an empty dropdown (US1 Acceptance Scenario 4).
- [X] T011 [US1] Implement `gnRenderView()` in `googlenotes.html`: sets `#gnViewContent`'s `textContent` to `gnSession.content` (use `textContent`, not `innerHTML`, so note text is never interpreted as markup) and ensures `#gnViewContent` is visible / `#gnEditContent` is `hidden` (i.e. forces `gnSession.mode = 'view'` rendering, matching data-model.md's `NoteSession.mode` starting value `"view"` on load).

**Checkpoint**: Signing in, browsing Recent, and loading a Doc/Sheet read-only all work end-to-end.

---

## Phase 4: User Story 2 — Edit a note and save it back to the same Google Doc (Priority: P1)

**Goal**: Toggle into an editable textarea, then save the edited text back to the same Google Doc.

**Independent Test**: quickstart.md Scenarios 3, 4, 11.

- [X] T012 [US2] Implement `toggleEditMode()` in `googlenotes.html`, wired to `#gnEditBtn`'s click:

  ```javascript
  function toggleEditMode() {
    if (gnSession.mode === 'view') {
      document.getElementById('gnEditContent').value = gnSession.content;
      document.getElementById('gnViewContent').hidden = true;
      document.getElementById('gnEditContent').hidden = false;
      gnSession.mode = 'edit'; // data-model.md NoteSession.mode enum: "view" | "edit"
      document.getElementById('gnEditBtn').textContent = 'Done';
    } else {
      gnSession.content = document.getElementById('gnEditContent').value;
      gnSession.mode = 'view';
      document.getElementById('gnEditBtn').textContent = 'Edit';
      gnRenderView();
    }
  }
  document.getElementById('gnEditBtn').addEventListener('click', toggleEditMode);
  ```

- [X] T013 [US2] Implement `saveToGoogleDoc()` in `googlenotes.html`, wired to `#gnSaveBtn`'s click, porting the Docs-API branch of `writeContentToGoogleDrive()` from `vercel_google_drive/src/DriveSearch.js` (research.md Decision 4):
  - If `gnSession.mode === 'edit'`, first apply `gnSession.content = document.getElementById('gnEditContent').value` (save-while-editing must not lose in-progress typing).
  - Set `gnSession.saving = true`, disable `#gnSaveBtn`, `gnSetStatus('Saving "' + gnSession.fileName + '"...')`.
  - `GET https://docs.googleapis.com/v1/documents/${gnSession.fileId}`, read `doc.body.content[doc.body.content.length - 1].endIndex`.
  - Build `requests`: if `endIndex > 2`, push `{ deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } }`; then if content is non-empty, push `{ insertText: { location: { index: 1 }, text: gnSession.content.replace(/\r\n/g, '\n').replace(/\r/g, '\n') } }`.
  - `POST https://docs.googleapis.com/v1/documents/${gnSession.fileId}:batchUpdate` with `{ requests: requests }`.
  - On success: `gnSession.originalContent = gnSession.content`, `gnSetStatus('Saved "' + gnSession.fileName + '" successfully!')` (FR-006 confirmation).
  - On failure (non-2xx or thrown error): `gnSetStatus('Error saving: ' + error.message)` and leave `gnSession.content`/`originalContent` unchanged so the edit is not lost (FR-006, quickstart.md Scenario 4).
  - `finally`: `gnSession.saving = false`, re-enable `#gnSaveBtn`.
- [X] T014 [US2] Add the unsaved-changes guard in `googlenotes.html` (FR-012): a `window.addEventListener('beforeunload', function(e) { if (gnIsDirty()) { e.preventDefault(); e.returnValue = ''; } })` handler, using the `gnIsDirty()` helper from T006 (data-model.md: `dirty` is derived as `content !== originalContent`). Confirm `loadFile()` (T009) already calls `window.confirm()` when `gnIsDirty()` is true before switching files.

**Checkpoint**: A user can sign in, load a Doc, edit it, save, and re-open the Doc in Google Docs
to confirm the edit persisted — independent of the voice-note feature.

---

## Phase 5: User Story 3 — Take a voice note that gets transcribed into the doc (Priority: P2)

**Goal**: Tap mic → record → transcribe via OpenAI → append the transcript to the note content.

**Independent Test**: quickstart.md Scenarios 5, 6, 7, 8, 9, 10.

- [X] T015 [P] [US3] Create `api/transcribe.js` per `contracts/transcribe-api.md`, matching the existing `api/tts.js`/`api/ocr.js` shape:

  ```javascript
  export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'OPENAI_API_KEY not configured on server' });

    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) return res.status(400).json({ error: 'Missing audioBase64' });

    try {
      const buffer = Buffer.from(audioBase64, 'base64');
      const ext = (mimeType || 'audio/webm').split('/')[1].split(';')[0];
      const form = new FormData();
      form.append('file', new Blob([buffer], { type: mimeType || 'audio/webm' }), 'recording.' + ext);
      form.append('model', 'gpt-4o-mini-transcribe');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + apiKey },
        body: form,
      });

      if (!response.ok) {
        const errText = await response.text();
        return res.status(response.status).json({ error: errText });
      }

      const data = await response.json();
      return res.status(200).json({ text: data.text });
    } catch (err) {
      return res.status(500).json({ error: 'Transcription failed: ' + err.message });
    }
  }
  ```

- [X] T016 [US3] Implement `onMicTap()` in `googlenotes.html`, wired to `#gnMicBtn`'s click, encoding FR-007a and FR-007b:

  ```javascript
  function onMicTap() {
    if (gnVoice.status === 'transcribing') return; // FR-007b: no second recording while transcribing
    if (gnVoice.status === 'recording') { stopRecording(); return; }
    // FR-007a: applying edits + forcing View mode happens before recording starts
    if (gnSession.mode === 'edit') {
      gnSession.content = document.getElementById('gnEditContent').value;
      gnSession.mode = 'view';
      document.getElementById('gnEditBtn').textContent = 'Edit';
      gnRenderView();
    }
    startRecording();
  }
  document.getElementById('gnMicBtn').addEventListener('click', onMicTap);
  ```

- [X] T017 [US3] Implement `startRecording()` and `stopRecording()` in `googlenotes.html` using the native `MediaRecorder` API (research.md Decision 1 — no `Recorder.js`/WAV conversion needed):

  ```javascript
  function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream) {
      gnRecordedChunks = [];
      gnMediaRecorder = new MediaRecorder(stream);
      gnMediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) gnRecordedChunks.push(e.data); };
      gnMediaRecorder.onstop = function() {
        stream.getTracks().forEach(function(t) { t.stop(); });
        var blob = new Blob(gnRecordedChunks, { type: gnMediaRecorder.mimeType });
        transcribeRecording(blob);
      };
      gnMediaRecorder.start();
      gnVoice = { status: 'recording', startedAt: Date.now(), blob: null, errorMessage: null }; // data-model.md VoiceNote.status
      document.getElementById('gnMicBtn').className = 'mic-btn recording';
      gnSetStatus('Recording…');
    }).catch(function(err) {
      gnVoice = { status: 'failed', startedAt: null, blob: null, errorMessage: 'Microphone access is required to record a voice note.' };
      document.getElementById('gnMicBtn').className = 'mic-btn failed';
      gnSetStatus(gnVoice.errorMessage);
    });
  }
  function stopRecording() {
    if (gnMediaRecorder && gnMediaRecorder.state !== 'inactive') gnMediaRecorder.stop();
    gnVoice.status = 'transcribing';
    document.getElementById('gnMicBtn').className = 'mic-btn transcribing';
    gnSetStatus('Transcribing…');
  }
  ```

- [X] T018 [US3] Implement `transcribeRecording(blob)` in `googlenotes.html`:

  ```javascript
  function transcribeRecording(blob) {
    var reader = new FileReader();
    reader.onload = function() {
      var base64 = reader.result.split(',')[1]; // strip the data: URL prefix
      fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, mimeType: blob.type }),
      })
        .then(function(r) { return r.json().then(function(data) { return { ok: r.ok, data: data }; }); })
        .then(function(result) {
          if (!result.ok) throw new Error(result.data.error || 'Transcription failed');
          // FR-008/FR-011: append to the (view-mode) note content, separated by a blank line
          gnSession.content = gnSession.content.replace(/\n+$/, '') + (gnSession.content ? '\n\n' : '') + result.data.text;
          gnRenderView();
          gnVoice = { status: 'idle', startedAt: null, blob: null, errorMessage: null };
          document.getElementById('gnMicBtn').className = 'mic-btn';
          gnSetStatus('Voice note added');
        })
        .catch(function(err) {
          // FR-010: no partial/garbled text inserted; content is left untouched
          gnVoice = { status: 'failed', startedAt: null, blob: null, errorMessage: err.message };
          document.getElementById('gnMicBtn').className = 'mic-btn failed';
          gnSetStatus('Error: ' + err.message);
        });
    };
    reader.readAsDataURL(blob);
  }
  ```

- [X] T019 [US3] Confirm the mic-permission-denied path from `startRecording()`'s `.catch()` (T017) never sets `gnVoice.status` to `'recording'` or `'transcribing'` (spec Edge Cases / quickstart.md Scenario 10) and that a subsequent tap on `#gnMicBtn` after a `'failed'` status correctly re-enters `startRecording()` (quickstart.md Scenario 9's retry step) — `onMicTap()`'s guard clause (T016) only special-cases `'transcribing'` and `'recording'`, so `'failed'` and `'idle'` both fall through to a fresh `startRecording()` call by design; add a one-line comment in `onMicTap()` noting this.

**Checkpoint**: All three user stories work together — voice notes can be recorded from View mode
or immediately after typing in Edit mode, transcripts append in order, and saving persists
everything (typed + transcribed) to the Google Doc.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [X] T020 [P] Verify in `googlenotes.html` that `#gnSignInBtn`, `#gnRecentBtn`, `#gnEditBtn`, `#gnSaveBtn`, and `#gnMicBtn` all render at ≥44×44px (Constitution Principle II) and that `#gnRecentDropdown` and `.note-edit` do not cause horizontal overflow at a 320px viewport width.
- [X] T021 [P] Add a short comment block at the top of `api/transcribe.js` documenting the `OPENAI_API_KEY` env var dependency (already set for `api/tts.js`/`api/ocr.js`) and linking to `specs/006-gdoc-voice-notes/contracts/transcribe-api.md`, matching the header-comment style already used in `api/supabase.js`.

---

## Phase 7: Validation

- [ ] T022 Open `googlenotes.html` (via `vercel dev` or a deployed preview — not `file://`, since `MediaRecorder` requires a secure context) and complete all 13 scenarios in `specs/006-gdoc-voice-notes/quickstart.md`. Record pass/fail next to each Scenario heading. Pay particular attention to Scenario 6 (mic tap from Edit mode must apply typed text and switch to View mode *before* the microphone prompt appears) and Scenario 8 (mic control must stay inert while a transcription is in flight).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational and on a file being loadable (US1's `loadFile()`/`gnRenderView()`) to have something to edit — build after US1.
- **User Story 3 (Phase 5)**: Depends on Foundational, on US1 (a loaded `gnSession`), and on US2's `toggleEditMode()`/`#gnEditContent` existing (T016's `onMicTap()` reads `gnSession.mode` and `#gnEditContent`'s value, both introduced in US2) — build after US2.
- **Polish (Phase 6)**: After all three user stories.
- **Validation (Phase 7)**: After Polish.

### Critical Task Order Notes

- T004 (CSS) MUST precede T005 (HTML references `.setup-section`, `.recent-dropdown`, `.note-view`/`.note-edit`, `.mic-btn` classes).
- T006 (JS state) MUST precede every US1/US2/US3 task — all of them read or write `gnSession`/`gnVoice`.
- T009 (`loadFile`) MUST precede T011 (`gnRenderView`) — T009 calls it.
- T012 (`toggleEditMode`) MUST precede T016 (`onMicTap` reads `gnSession.mode` and toggles the Edit button the same way T012 does).
- T015 (`api/transcribe.js`) has no dependency on any `googlenotes.html` task and can be built in parallel with Phases 2–4.

### Parallel Opportunities

- T002 (`vercel.json`) and T015 (`api/transcribe.js`) touch different files from `googlenotes.html` and from each other — both can be done in parallel with any other phase.
- Within Phase 6, T020 and T021 touch different files and can be done in parallel.
- Because nearly every other task edits the same single file (`googlenotes.html`), true parallelism beyond the above is limited — same constraint noted in `specs/005-flashcards-button-filter/tasks.md`.

---

## Parallel Example

```bash
# Can be done at any point, independent of googlenotes.html's progress:
Task: "Add vercel.json rewrite entries for /googlenotes.html and /googlenotes"
Task: "Create api/transcribe.js per contracts/transcribe-api.md"
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1: Setup (T001–T002)
2. Phase 2: Foundational (T003–T006)
3. Phase 3: User Story 1 (T007–T011)
4. **STOP and VALIDATE**: quickstart.md Scenarios 1, 2, 12 — sign in, browse Recent, load a Doc read-only.

### Incremental Delivery

1. Setup + Foundational → routable, empty page.
2. Add User Story 1 → sign-in + load-and-view works → demo-able as a "recent Docs viewer."
3. Add User Story 2 → edit + save works → demo-able as a full notes editor.
4. Add User Story 3 → voice notes work → full feature complete.
5. Polish (T020–T021) → Validation (T022).

---

## Notes

- Only `googlenotes.html`, `api/transcribe.js`, and `vercel.json` are touched — no existing page is
  modified, per plan.md's Constraints.
- `[P]` tasks touch files other than `googlenotes.html` (or, within Phase 6, different concerns
  entirely) and have no ordering dependency on the task immediately before or after them.
- Every reference to `GDRIVE_CLIENT_ID` in T007 assumes the same Google Cloud OAuth client ID
  already used by `learn-google.html` is reused (per spec.md's Assumptions — provisioning
  credentials is out of scope for this feature's UX, but a working client ID is a prerequisite).
- T022 is a manual browser step — not automatable in this build-pipeline-free, vanilla-JS project.
