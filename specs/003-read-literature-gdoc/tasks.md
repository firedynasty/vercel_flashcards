# Tasks: Google Doc Import & Recent Docs for read-literature

**Input**: Design documents from `specs/003-read-literature-gdoc/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: Not requested. Manual validation via quickstart.md (Scenarios 1–10).

**Organization**: All changes are confined to a single file (`read-literature.html`).
Tasks are grouped by user story; within a story, they run sequentially in the order listed.

**Key porting notes from 002-learn-google-recent-picker** (implementer reference):
- Status helper: `setGdocStatus()` (not `setGStatus()` or `setStatus()`)
- Load function: `gdocImport(fileId)` (not `gdriveLoadSpreadsheet()`)
- Drive query mime type: `application/vnd.google-apps.document` (not `spreadsheet`)
- Element IDs: `gdocSignInBtn`, `gdocRecentBtn`, `gdocRecentDropdown` (all prefixed `gdoc`)
- Auth callback: `gdocInitClient()` (new, not reused from learn-google.html)
- Sign-out branch: `gdocSignIn()` toggle function
- Access token variable: `gdriveAccessToken` (same name is fine; isolated in this file)

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase
- **[Story]**: Which user story this task belongs to
- All file paths refer to `read-literature.html` at the repository root

---

## Phase 1: Setup (Understand Insertion Points)

**Purpose**: Read key sections of the existing file before writing any code, to confirm
exact line numbers and patterns for CSS, HTML, and JS additions.

- [x] T001 Read `read-literature.html` lines 1–220 (full `<style>` block, `<head>`, and
  HTML structure including `.toolbar` div at line ~226) and lines 277–600 (all JS from
  `let people` through the end of the `#importFile` event listener) to identify:
  (a) where new CSS goes (before `</style>`), (b) where the `.gdoc-setup` HTML div goes
  (immediately before `<div class="toolbar">`), and (c) where new JS variables and
  functions go (before or after existing button wiring)

---

## Phase 2: Foundational (CDN + Shared CSS + Auth Infrastructure)

**Purpose**: Add the GIS CDN, all shared CSS (setup section + dropdown), and the
module-level auth variables that every user story depends on.

- [x] T002 Add `<script src="https://accounts.google.com/gsi/client" async defer></script>`
  to the `<head>` of `read-literature.html`, immediately before the closing `</head>` tag

- [x] T003 Add CSS block to the `<style>` section of `read-literature.html`, immediately
  before `</style>`, containing:
  ```css
  /* ── GOOGLE DOCS SETUP ── */
  .gdoc-setup {
    border: 1px solid var(--line);
    border-radius: 4px;
    margin-bottom: 20px;
    background: var(--paper-raised);
  }
  .gdoc-setup-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    cursor: pointer;
    user-select: none;
    font-size: 13px;
    font-weight: 500;
    color: var(--ink-soft);
  }
  .gdoc-setup-header .toggle-arrow {
    font-size: 10px;
    transition: transform .15s ease;
  }
  .gdoc-setup-body {
    padding: 10px 14px 14px;
    border-top: 1px solid var(--line);
  }
  .gdoc-setup.collapsed .gdoc-setup-body { display: none; }
  .gdoc-setup.collapsed .toggle-arrow { transform: rotate(-90deg); }
  .gdoc-row {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
    margin-bottom: 6px;
  }
  .gdoc-status {
    font-size: 12px;
    color: var(--ink-soft);
    margin: 4px 0 0;
    min-height: 16px;
  }
  /* ── RECENT DOCS DROPDOWN ── */
  .recent-dropdown-wrapper { position: relative; display: block; width: 100%; }
  .recent-dropdown {
    position: absolute; top: 100%; left: 0;
    width: 100%;
    max-height: 220px; overflow-y: auto;
    background: white; border: 1px solid var(--line); border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,.1); z-index: 100;
  }
  .recent-dropdown-item {
    display: block; width: 100%; padding: 12px 14px; min-height: 44px;
    text-align: left; background: none; border: none;
    border-bottom: 1px solid #f0f0f0; font-size: 13px; cursor: pointer;
    white-space: normal; overflow: visible; word-break: break-word;
    font-family: inherit; color: var(--ink);
  }
  .recent-dropdown-item:last-child { border-bottom: none; }
  .recent-dropdown-item:active { background: #f5f5f5; }
  ```

- [x] T004 Add module-level JS variables at the top of the `<script>` block in
  `read-literature.html`, immediately after the opening `<script>` tag (before `let people`):
  ```javascript
  var gdriveAccessToken = '';
  var gdocTokenClient = null;
  ```

---

## Phase 3: User Story 1 — Sign-In Setup Section (Priority: P1) 🎯 MVP

**Goal**: A collapsible "Google Docs" section with Sign In / Sign Out button is visible
on page load, enabling authentication before any Google-dependent features are used.

**Independent Test**: Quickstart Scenario 1 (page load → setup section expanded) +
Scenario 2 (sign in → button label changes, Recent ▾ enabled) +
Scenario 9 (sign out → Recent ▾ disabled).

- [x] T005 [US1] Insert HTML immediately before `<div class="toolbar">` in
  `read-literature.html`:
  ```html
  <!-- GOOGLE DOCS SETUP -->
  <div class="gdoc-setup" id="gdocSetup">
    <div class="gdoc-setup-header" id="gdocSetupToggle">
      <span class="toggle-arrow">▼</span>
      <span>Google Docs</span>
    </div>
    <div class="gdoc-setup-body">
      <div class="gdoc-row">
        <button class="linklike" id="gdocSignInBtn">Sign In</button>
        <div class="recent-dropdown-wrapper">
          <button class="linklike" id="gdocRecentBtn" disabled>Recent ▾</button>
          <div id="gdocRecentDropdown" class="recent-dropdown" hidden></div>
        </div>
      </div>
      <p class="gdoc-status" id="gdocStatus"></p>
    </div>
  </div>
  ```

- [x] T006 [US1] Add `setGdocStatus(msg)` helper and `gdocInitClient()` function in
  `read-literature.html`, in the `<script>` block before the `loadData()` call at the bottom.
  `setGdocStatus(msg)` sets `document.getElementById('gdocStatus').textContent = msg`.
  `gdocInitClient()` calls `google.accounts.oauth2.initTokenClient({ client_id: GDOC_CLIENT_ID,
  scope: 'https://www.googleapis.com/auth/drive.readonly', callback: function(response) {
    if (response.error) { setGdocStatus('Sign-in error: ' + response.error); return; }
    gdriveAccessToken = response.access_token;
    document.getElementById('gdocSignInBtn').textContent = 'Sign Out';
    document.getElementById('gdocRecentBtn').disabled = false;
    setGdocStatus('');
  } })` and stores the result in `gdocTokenClient`. Use a placeholder constant
  `var GDOC_CLIENT_ID = 'YOUR_CLIENT_ID';` at the top of the new JS block — it will be replaced
  with the actual client ID from `learn-google.html` during implementation.

- [x] T007 [US1] Add `gdocSignIn()` function in `read-literature.html` (after `gdocInitClient()`).
  If `gdriveAccessToken` is truthy (signed in): call `google.accounts.oauth2.revoke(gdriveAccessToken, function(){})`,
  set `gdriveAccessToken = ''`, set sign-in button text to `'Sign In'`, disable `#gdocRecentBtn`,
  call `closeGdocDropdown()`, call `setGdocStatus('')`. Else (not signed in): call
  `gdocTokenClient.requestAccessToken({ prompt: '' })`.

- [x] T008 [US1] Add DOMContentLoaded wiring in `read-literature.html` (in a new
  `document.addEventListener('DOMContentLoaded', function() { ... })` block at the bottom of
  `<script>`, after existing event wiring):
  - `gdocInitClient()` — initialise GIS token client on load
  - `document.getElementById('gdocSignInBtn').addEventListener('click', gdocSignIn)`
  - `document.getElementById('gdocSetupToggle').addEventListener('click', function() {
      document.getElementById('gdocSetup').classList.toggle('collapsed');
    })`

---

## Phase 4: User Story 2 — Paste Import from Google Doc URL (Priority: P2)

**Goal**: Clicking "paste import" with a Google Doc URL in the clipboard (and while signed in)
fetches the document's plain-text content via Drive export API and imports it using the
existing `importTxt()` parser. Falls back to existing behaviour otherwise.

**Independent Test**: Quickstart Scenario 3 (signed in + Google Doc URL → import success) +
Scenario 4 (plain text in clipboard → existing import) +
Scenario 5 (not signed in + Google Doc URL → plain-text fallback).

- [x] T009 [US2] Add `extractGDocId(text)` function in `read-literature.html` (after `gdocSignIn()`):
  ```javascript
  function extractGDocId(text) {
    var m = String(text).match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    return m ? m[1] : null;
  }
  ```

- [x] T010 [US2] Add `async function gdocImport(fileId)` in `read-literature.html` (after
  `extractGDocId()`):
  ```javascript
  async function gdocImport(fileId) {
    setGdocStatus('Loading…');
    try {
      var url = 'https://www.googleapis.com/drive/v3/files/' +
                encodeURIComponent(fileId) +
                '/export?mimeType=' + encodeURIComponent('text/plain');
      var resp = await fetch(url, {
        headers: { Authorization: 'Bearer ' + gdriveAccessToken }
      });
      if (!resp.ok) throw new Error('Drive API error ' + resp.status);
      var text = await resp.text();
      importTxt(text);
      setGdocStatus('Imported from Google Doc');
    } catch (err) {
      setGdocStatus('Error importing doc: ' + err.message);
    }
  }
  ```

- [x] T011 [US2] Rewire the `#pasteImportBtn` click handler in `read-literature.html`.
  Replace the existing handler (which reads clipboard and calls `importTxt(text)` directly)
  with:
  ```javascript
  document.getElementById('pasteImportBtn').addEventListener('click', async function() {
    var text;
    try {
      text = await navigator.clipboard.readText();
    } catch(e) {
      alert('Clipboard access denied — try import .txt instead.');
      return;
    }
    if (!text.trim()) return alert('Clipboard is empty.');
    var docId = extractGDocId(text);
    if (docId && gdriveAccessToken) {
      await gdocImport(docId);
    } else {
      importTxt(text);
    }
  });
  ```
  Note: the original handler is at the bottom of the `<script>` block; replace it in place.

---

## Phase 5: User Story 3 — Recent Docs Dropdown (Priority: P3)

**Goal**: A "Recent ▾" dropdown lists the 10 most recently viewed Google Docs and imports
the selected one with a single tap.

**Independent Test**: Quickstart Scenario 6 (tap Recent ▾ → dropdown appears with full names) +
Scenario 7 (select doc → imports) + Scenario 8 (tap outside → dropdown closes) +
Scenario 10 (no recent docs → empty state message).

- [x] T012 [US3] Add `var _gdocDismissListener = null;` (after `var gdocTokenClient = null;`
  in the foundational variable block) and `async function fetchRecentDocs()` in `read-literature.html`
  (after `gdocImport()`). `fetchRecentDocs()` should:
  1. Disable `#gdocRecentBtn`, set its text to `'Loading…'`
  2. In a try/catch/finally: fetch
     `https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.document'+and+trashed%3Dfalse&orderBy=viewedByMeTime+desc&pageSize=10&fields=files(id%2Cname%2CviewedByMeTime)`
     with `Authorization: 'Bearer ' + gdriveAccessToken` header
  3. On success: call `openGdocDropdown(data.files)`
  4. On error: call `setGdocStatus('Error fetching recent docs: ' + err.message)`
  5. In finally: re-enable button, restore text to `'Recent ▾'`

- [x] T013 [US3] Add `function openGdocDropdown(docs)` in `read-literature.html` (after
  `fetchRecentDocs()`). It clears `#gdocRecentDropdown`, then:
  - If `!docs || docs.length === 0`: appends a single disabled button with class
    `recent-dropdown-item`, text `'No recent documents found'`, `color:#999`, `cursor:default`,
    removes `hidden` from the dropdown, and calls `_registerGdocDismissListener()`, then returns.
  - Otherwise: for each doc in `docs`, creates a `<button class="recent-dropdown-item">` with
    `doc.name` as text content; on click: calls `closeGdocDropdown()` then `gdocImport(doc.id)`.
    Appends all buttons, removes `hidden`, calls `_registerGdocDismissListener()`.

- [x] T014 [US3] Add `function closeGdocDropdown()` in `read-literature.html` (after
  `openGdocDropdown()`). It adds `hidden` attribute to `#gdocRecentDropdown`, and if
  `_gdocDismissListener` is set, removes the listener from `document` for both `'touchstart'`
  and `'click'` events, then sets `_gdocDismissListener = null`.

- [x] T015 [US3] Add `function _registerGdocDismissListener()` in `read-literature.html`
  (after `closeGdocDropdown()`):
  ```javascript
  function _registerGdocDismissListener() {
    if (_gdocDismissListener) return;
    _gdocDismissListener = function(e) {
      var wrapper = document.querySelector('.recent-dropdown-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        closeGdocDropdown();
      }
    };
    setTimeout(function() {
      document.addEventListener('touchstart', _gdocDismissListener);
      document.addEventListener('click', _gdocDismissListener);
    }, 0);
  }
  ```

- [x] T016 [US3] Add `#gdocRecentBtn` click handler to the `DOMContentLoaded` block in
  `read-literature.html` (inside the block created for T008):
  ```javascript
  document.getElementById('gdocRecentBtn').addEventListener('click', function() {
    var dropdown = document.getElementById('gdocRecentDropdown');
    if (!dropdown.hasAttribute('hidden')) {
      closeGdocDropdown();
    } else {
      fetchRecentDocs();
    }
  });
  ```

---

## Phase 6: Polish

- [x] T017 Read the `learn-google.html` `GDRIVE_CLIENT_ID` or equivalent constant at the top of
  its `<script>` block and copy the actual client ID value into the `GDOC_CLIENT_ID` constant
  in `read-literature.html` (replacing the `'YOUR_CLIENT_ID'` placeholder inserted in T006).
  File to read: `learn-google.html`. File to update: `read-literature.html`.

- [x] T018 Verify in `read-literature.html`: `.recent-dropdown-wrapper` has `display: block; width: 100%`,
  `.recent-dropdown` has `width: 100%`, and `.recent-dropdown-item` has `min-height: 44px` and
  `white-space: normal; word-break: break-word` — confirm no constraint causes horizontal overflow
  at 320px or name truncation.

---

## Phase 7: Validation

- [ ] T019 Open `read-literature.html` in a browser (HTTPS or localhost, since Clipboard API
  requires secure context), set viewport to ≤390px, complete all 10 scenarios in
  `specs/003-read-literature-gdoc/quickstart.md`, and record pass/fail next to each Scenario
  heading. Confirm: (a) setup section starts expanded; (b) sign-in changes button label; (c) Recent ▾
  appears on its own row after sign-in; (d) all doc names display in full without ellipsis;
  (e) paste import with a Google Doc URL imports content; (f) paste import without a URL falls
  back to plain-text import.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately
- **Phase 2 (Foundational)**: After Phase 1 — CDN + CSS + variables block all user stories
- **Phase 3 (US1)**: After Phase 2 — HTML, auth functions, DOMContentLoaded wiring
- **Phase 4 (US2)**: After T006 (needs `gdriveAccessToken`) + after T008 (paste handler rewire uses `extractGDocId` + `gdocImport`)
- **Phase 5 (US3)**: After Phase 3 (needs `#gdocRecentBtn` in DOM) + after T010 (`gdocImport` called by dropdown item)
- **Phase 6 (Polish)**: After all user story phases
- **Phase 7 (Validation)**: After all prior phases

### Task Order Notes

- T004 (`var gdriveAccessToken`) MUST precede T006/T007/T009/T010/T012 (all use the variable).
- T005 (HTML) MUST precede T008 (DOMContentLoaded wiring queries those IDs).
- T006 (`gdocInitClient`) MUST precede T007 (`gdocSignIn` calls `gdocTokenClient`).
- T009 (`extractGDocId`) MUST precede T011 (rewired paste handler calls it).
- T010 (`gdocImport`) MUST precede T011 (paste handler) and T013 (`openGdocDropdown` item click).
- T013 (`openGdocDropdown`) MUST precede T012 completion (calls `openGdocDropdown`).
- T014 (`closeGdocDropdown`) MUST precede T013 (item click calls `closeGdocDropdown`).
  Write T014 before T013.
- T015 (`_registerGdocDismissListener`) MUST precede T013 (called from `openGdocDropdown`).
  Write T015 before T013.
- T016 (recentBtn click handler) depends on T014 and T012 existing.

### Recommended Write Order for Phases 5

1. T014 → T015 → T013 → T012 → T016 (bottom-up: close before open, listener before open, fetch last)

---

## Parallel Opportunities

- T002, T003, T004 in Phase 2 touch different parts of the file and can be written together
  (CDN in `<head>`, CSS in `<style>`, variables in `<script>` top). If using a single-writer LLM,
  execute sequentially; for a human developer, all three can be edited in parallel passes.
- T017 (client ID copy) and T018 (CSS verification) in Phase 6 are independent and can run in parallel.

---

## Implementation Strategy

### MVP (US1 + US2 first)

1. T001 — Read insertion points
2. T002 → T003 → T004 — CDN + CSS + variables
3. T005 — HTML setup section
4. T006 → T007 → T008 — Auth functions + DOMContentLoaded
5. T009 → T010 → T011 — extractGDocId + gdocImport + rewire pasteImportBtn
6. T014 → T015 → T013 → T012 → T016 — Dropdown (US3)
7. T017 → T018 — Polish (client ID, CSS verification)
8. T019 — Browser validation

### What This Ports From 002-learn-google-recent-picker

The dropdown JS/CSS is a direct copy from `learn-google.html` with four targeted substitutions:
- `setGStatus(` → `setGdocStatus(`
- `gdriveLoadSpreadsheet(f.id, f.name)` → `gdocImport(f.id)`
- `recentBtn` / `recentDropdown` → `gdocRecentBtn` / `gdocRecentDropdown`
- `_recentDismissListener` / `_registerDismissListener` → `_gdocDismissListener` / `_registerGdocDismissListener`
- Drive query: `spreadsheet` → `document`

---

## Notes

- All tasks modify only `read-literature.html`
- No new files are created
- The existing `.txt` export, file-based import, and `#importBtn` flows are untouched
- The `GDOC_CLIENT_ID` placeholder (T006) MUST be replaced with the real value (T017) before
  browser validation — sign-in will not work with the placeholder
- T019 is a manual step performed in a real browser; no automation is possible in a static HTML project
