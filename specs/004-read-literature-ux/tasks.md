# Tasks: Mobile UX, Navbar & Outline Mode for read-literature

**Input**: Design documents from `specs/004-read-literature-ux/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: Not requested. Manual validation via quickstart.md (Scenarios 1–12).

**Organization**: All changes are confined to a single file (`read-literature.html`).
Tasks are grouped by user story; within a story, they run sequentially.

**Builds on**: `003-read-literature-gdoc` — assumes Google sign-in, `gdocImport()`,
`_loadedDocId`, `gdriveAccessToken`, `openGdocDropdown()`, and the `.gdoc-setup` section
already exist in `read-literature.html`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase
- **[Story]**: Which user story this task belongs to
- All file paths refer to `read-literature.html` at the repository root

---

## Phase 1: Setup (Understand Existing File)

**Purpose**: Confirm current structure before any changes — CSS variable names, exact body tag
location, existing JS function signatures that will be modified.

- [x] T001 Read `read-literature.html` `:root` block (CSS variables `--paper`, `--ink`, etc.),
  `<body>` opening tag, `buildPersonNode()` and `buildChapterNode()` function bodies
  (specifically the `head.addEventListener('click', ...)` line and the `body` variable),
  and `gdocImport(fileId)` function body — to confirm all modification targets before editing

---

## Phase 2: Foundational (CSS + HTML + Module Variables)

**Purpose**: Add all new CSS (navbar, dark mode, outline, confirm panel), the `<nav>` HTML,
and the new module-level JS variables that every user story needs.

- [x] T002 Add CSS to `read-literature.html` `<style>` block (before `</style>`):
  1. On `:root`: add `--app-font-size: 15px;`
  2. On `body`: add `font-size: var(--app-font-size); padding-top: 56px;`
  3. Dark theme overrides block:
     ```css
     [data-theme="dark"] {
       --paper: #1a1a1a;
       --paper-raised: #242424;
       --ink: #e8e0d0;
       --ink-soft: #9e9688;
       --oxblood: #c96b6b;
       --teal: #5a9e9c;
       --gold: #c8a050;
       --line: #3a3530;
     }
     ```
  4. Navbar styles:
     ```css
     .app-nav {
       position: sticky; top: 0; z-index: 200;
       background: var(--paper-raised);
       border-bottom: 1px solid var(--line);
       display: flex; align-items: center; gap: 6px;
       padding: 6px 12px;
       overflow-x: auto; -webkit-overflow-scrolling: touch;
       white-space: nowrap;
     }
     .app-nav button {
       background: none; border: 1px solid var(--line);
       border-radius: 4px; cursor: pointer;
       font-family: inherit; font-size: 13px;
       color: var(--ink-soft); padding: 8px 12px;
       min-height: 44px; min-width: 44px;
       white-space: nowrap; flex: none;
     }
     .app-nav button:active { background: var(--paper); }
     .app-nav button.active { background: var(--gold); color: #fff; border-color: var(--gold); }
     .app-nav-sep { width: 1px; height: 28px; background: var(--line); flex: none; }
     ```
  5. Outline list styles:
     ```css
     .outline-list {
       list-style: disc; margin: 0; padding: 0 0 0 18px;
       font-size: var(--app-font-size);
     }
     .outline-list li { margin-bottom: 4px; line-height: 1.5; }
     .outline-list .indent-1 { margin-left: 20px; list-style: circle; }
     .outline-list .indent-2 { margin-left: 40px; list-style: square; }
     ```
  6. Save confirmation panel styles:
     ```css
     .gdoc-confirm-panel {
       display: none; margin-top: 8px; padding: 10px 12px;
       background: var(--paper); border: 1px solid var(--line);
       border-radius: 4px; font-size: 13px;
     }
     .gdoc-confirm-panel .confirm-btns {
       display: flex; gap: 8px; margin-top: 8px;
     }
     .gdoc-confirm-panel .confirm-btns button {
       padding: 7px 14px; border-radius: 3px; font-family: inherit;
       font-size: 12.5px; cursor: pointer; border: 1px solid var(--line);
     }
     .gdoc-confirm-panel .confirm-btns .btn-overwrite {
       background: var(--oxblood); color: #fff; border-color: var(--oxblood);
     }
     ```

- [x] T003 Add `<nav class="app-nav" id="appNav">` as the very first child of `<body>` in
  `read-literature.html` (before `<div class="wrap">`):
  ```html
  <nav class="app-nav" id="appNav">
    <button id="navFontDec" title="Decrease font size" aria-label="A−">A−</button>
    <button id="navFontInc" title="Increase font size" aria-label="A+">A+</button>
    <div class="app-nav-sep"></div>
    <button id="navExpandAll" title="Expand all nodes">Expand All</button>
    <div class="app-nav-sep"></div>
    <button id="navOutline" title="Toggle outline mode">Outline</button>
    <div class="app-nav-sep"></div>
    <button id="navTheme" title="Toggle dark/light mode">☀</button>
  </nav>
  ```

- [x] T004 Add module-level JS variables at the top of the `<script>` block in
  `read-literature.html`, immediately after the existing `var _gdocDismissListener = null;`
  line:
  ```javascript
  var _outlineMode  = false;
  var _allExpanded  = false;
  var _loadedDocId  = null;
  var _loadedDocName = null;
  ```

---

## Phase 3: User Story 1 — Sticky Navbar with Font & Expand/Collapse (Priority: P1) 🎯 MVP

**Goal**: Sticky navbar is visible on scroll; A−/A+ adjust and persist font size; Expand/Collapse
button toggles all nodes in both trees simultaneously.

**Independent Test**: Quickstart Scenarios 1, 2, 3 (navbar visible, font ± works and persists,
expand/collapse all).

- [x] T005 [US1] Add `initFontSize()` and `setFontSize(n)` functions in `read-literature.html`
  (in the new Google Docs JS section, before `loadData()`):
  ```javascript
  function setFontSize(n) {
    n = Math.max(12, Math.min(24, n));
    document.documentElement.style.setProperty('--app-font-size', n + 'px');
    localStorage.setItem('litFontSize', n);
    document.getElementById('navFontDec').disabled = n <= 12;
    document.getElementById('navFontInc').disabled = n >= 24;
    document.getElementById('navFontDec').style.opacity = n <= 12 ? '0.4' : '';
    document.getElementById('navFontInc').style.opacity = n >= 24 ? '0.4' : '';
  }
  function initFontSize() {
    var saved = parseInt(localStorage.getItem('litFontSize'), 10);
    setFontSize(isNaN(saved) ? 15 : saved);
  }
  ```

- [x] T006 [US1] Add `toggleAllNodes(expand)` function in `read-literature.html`:
  ```javascript
  function toggleAllNodes(expand) {
    document.querySelectorAll('.node').forEach(function(n) {
      if (expand) {
        n.classList.add('open');
        if (_outlineMode) {
          var body = n.querySelector('.node-body');
          if (body) applyOutlineMode(body, true);
        }
      } else {
        n.classList.remove('open');
      }
    });
    _allExpanded = expand;
    document.getElementById('navExpandAll').textContent = expand ? 'Collapse All' : 'Expand All';
  }
  ```

- [x] T007 [US1] Add DOMContentLoaded wiring for navbar font and expand/collapse controls in
  `read-literature.html` (add inside the existing `document.addEventListener('DOMContentLoaded', ...)`
  block that already wires `gdocSignInBtn`):
  ```javascript
  initFontSize();
  document.getElementById('navFontDec').addEventListener('click', function() {
    var cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size'));
    setFontSize(cur - 2);
  });
  document.getElementById('navFontInc').addEventListener('click', function() {
    var cur = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-font-size'));
    setFontSize(cur + 2);
  });
  document.getElementById('navExpandAll').addEventListener('click', function() {
    toggleAllNodes(!_allExpanded);
  });
  ```

---

## Phase 4: User Story 2 — Dark / Light Mode (Priority: P2)

**Goal**: Dark mode toggled by navbar button, persists in localStorage, and respects
`prefers-color-scheme` on first load.

**Independent Test**: Quickstart Scenarios 4, 5 (dark mode toggle + persist, prefers-color-scheme).

- [x] T008 [US2] Add `initTheme()` and `toggleTheme()` functions in `read-literature.html`
  (after `initFontSize`):
  ```javascript
  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.getElementById('navTheme').textContent = theme === 'dark' ? '☀' : '🌙';
  }
  function toggleTheme() {
    var next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('litTheme', next);
  }
  function initTheme() {
    var saved = localStorage.getItem('litTheme');
    if (saved) {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      applyTheme('dark');
    } else {
      applyTheme('light');
    }
  }
  ```

- [x] T009 [US2] Wire dark/light toggle in the existing DOMContentLoaded block in
  `read-literature.html`:
  ```javascript
  initTheme();
  document.getElementById('navTheme').addEventListener('click', toggleTheme);
  ```

---

## Phase 5: User Story 3 — Outline Mode (Priority: P3)

**Goal**: Navbar "Outline" button toggles a global read-only bullet-list view of each open node's
notes, parsing the textarea text line-by-line into a hierarchical list.

**Independent Test**: Quickstart Scenarios 6, 7, 8, 9 (outline renders, read-only, toggle off
restores textarea, outline + expand all together).

- [x] T010 [US3] Add `buildOutlineView(nodeBodyEl)` function in `read-literature.html`
  (after `toggleAllNodes()`):
  ```javascript
  function buildOutlineView(nodeBodyEl) {
    var ta   = nodeBodyEl.querySelector('textarea');
    var text = ta ? ta.value : '';
    var lines = text.split('\n');
    var ul = document.createElement('ul');
    ul.className = 'outline-list';
    lines.forEach(function(line) {
      if (!line.trim()) return;
      var li = document.createElement('li');
      // Detect indent level by leading spaces or tab
      var leadSpaces = line.match(/^(\s+)/);
      var indent = 0;
      if (leadSpaces) {
        var spaces = leadSpaces[1].replace(/\t/g, '  ').length;
        indent = spaces >= 4 ? 2 : spaces >= 2 ? 1 : 0;
      }
      if (indent === 1) li.className = 'indent-1';
      if (indent === 2) li.className = 'indent-2';
      li.textContent = line.trim();
      ul.appendChild(li);
    });
    return ul;
  }
  ```

- [x] T011 [US3] Add `applyOutlineMode(nodeBodyEl, enable)` function in `read-literature.html`
  (after `buildOutlineView()`):
  ```javascript
  function applyOutlineMode(nodeBodyEl, enable) {
    var ta       = nodeBodyEl.querySelector('textarea');
    var pasteBtn = nodeBodyEl.querySelector('.paste-btn');
    var existing = nodeBodyEl.querySelector('[data-outline-view]');
    if (enable) {
      if (!existing) {
        var view = buildOutlineView(nodeBodyEl);
        view.setAttribute('data-outline-view', '');
        if (ta) ta.insertAdjacentElement('afterend', view);
        else nodeBodyEl.appendChild(view);
      } else {
        // Rebuild in case textarea content changed since last time
        var fresh = buildOutlineView(nodeBodyEl);
        fresh.setAttribute('data-outline-view', '');
        existing.replaceWith(fresh);
      }
      if (ta)       ta.style.display      = 'none';
      if (pasteBtn) pasteBtn.style.display = 'none';
    } else {
      if (existing) existing.style.display = 'none';
      if (ta)       ta.style.display      = '';
      if (pasteBtn) pasteBtn.style.display = '';
    }
  }
  ```

- [x] T012 [US3] Add `toggleOutlineMode()` function in `read-literature.html`
  (after `applyOutlineMode()`):
  ```javascript
  function toggleOutlineMode() {
    _outlineMode = !_outlineMode;
    var btn = document.getElementById('navOutline');
    btn.classList.toggle('active', _outlineMode);
    btn.textContent = _outlineMode ? 'Outline ●' : 'Outline';
    document.querySelectorAll('.node.open .node-body').forEach(function(body) {
      applyOutlineMode(body, _outlineMode);
    });
  }
  ```

- [x] T013 [US3] Modify `buildPersonNode(p)` in `read-literature.html`: replace the existing
  line `head.addEventListener('click', ()=> node.classList.toggle('open'));` with:
  ```javascript
  head.addEventListener('click', function() {
    node.classList.toggle('open');
    if (_outlineMode && node.classList.contains('open')) {
      applyOutlineMode(body, true);
    }
  });
  ```
  (The `body` variable already exists in scope as `const body = document.createElement('div')` a
  few lines later — confirm the exact variable name by reading the function first.)

- [x] T014 [US3] Apply the identical click-handler modification from T013 to `buildChapterNode(ch)`
  in `read-literature.html` — same pattern, same `body` variable in scope.

- [x] T015 [US3] Wire the Outline toggle button in the existing DOMContentLoaded block in
  `read-literature.html`:
  ```javascript
  document.getElementById('navOutline').addEventListener('click', toggleOutlineMode);
  ```

---

## Phase 6: User Story 4 — Save to Google Doc (Overwrite) (Priority: P4)

**Goal**: After loading a Google Doc, a "Save → name" button appears. Clicking it shows an
in-page confirmation; confirming overwrites the Google Doc via Docs API batchUpdate.

**Independent Test**: Quickstart Scenarios 10, 11, 12 (save button appears, confirmation,
overwrite round-trip, error handling).

- [x] T016 [US4] Add HTML for `#gdocSaveBtn` and `#gdocConfirmPanel` in `read-literature.html`
  inside `.gdoc-setup-body`. Place `#gdocSaveBtn` in the existing `.gdoc-row` div, after the
  `.recent-dropdown-wrapper`. Place `#gdocConfirmPanel` directly after `.gdoc-row`:
  ```html
  <!-- inside .gdoc-row, after .recent-dropdown-wrapper -->
  <button class="linklike" id="gdocSaveBtn" style="display:none">Save →</button>

  <!-- after .gdoc-row -->
  <div class="gdoc-confirm-panel" id="gdocConfirmPanel">
    <span>Overwrite <strong id="gdocConfirmName"></strong>?</span>
    <div class="confirm-btns">
      <button id="gdocConfirmCancel">Cancel</button>
      <button class="btn-overwrite" id="gdocConfirmOverwrite">Overwrite</button>
    </div>
  </div>
  ```

- [x] T017 [US4] Add `showGdocConfirm()`, `hideGdocConfirm()`, and `gdocSave()` functions in
  `read-literature.html` (after `gdocImport()`):
  ```javascript
  function showGdocConfirm() {
    document.getElementById('gdocConfirmName').textContent = _loadedDocName || 'this document';
    document.getElementById('gdocConfirmPanel').style.display = '';
  }
  function hideGdocConfirm() {
    document.getElementById('gdocConfirmPanel').style.display = 'none';
    document.getElementById('gdocConfirmOverwrite').disabled = false;
    document.getElementById('gdocConfirmOverwrite').textContent = 'Overwrite';
  }
  async function gdocSave() {
    if (!_loadedDocId || !gdriveAccessToken) return;
    var overwriteBtn = document.getElementById('gdocConfirmOverwrite');
    overwriteBtn.disabled = true;
    overwriteBtn.textContent = 'Saving\u2026';
    try {
      // 1. Get current document to find body end index
      var docResp = await fetch(
        'https://docs.googleapis.com/v1/documents/' + encodeURIComponent(_loadedDocId) +
        '?fields=body.content',
        { headers: { Authorization: 'Bearer ' + gdriveAccessToken } }
      );
      if (!docResp.ok) throw new Error('Could not read document (' + docResp.status + ')');
      var doc = await docResp.json();
      var content = doc.body.content;
      var endIndex = content[content.length - 1].endIndex;
      // 2. Export current reading map as plain text
      var exportText = exportTxtString();
      // 3. batchUpdate: delete existing body content, insert new content
      var batchResp = await fetch(
        'https://docs.googleapis.com/v1/documents/' + encodeURIComponent(_loadedDocId) +
        ':batchUpdate',
        {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + gdriveAccessToken,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            requests: [
              { deleteContentRange: { range: { startIndex: 1, endIndex: endIndex - 1 } } },
              { insertText: { location: { index: 1 }, text: exportText } }
            ]
          })
        }
      );
      if (!batchResp.ok) {
        var errData = await batchResp.json().catch(function() { return {}; });
        throw new Error((errData.error && errData.error.message) || 'Save failed (' + batchResp.status + ')');
      }
      hideGdocConfirm();
      setGdocStatus('Saved to Google Doc');
    } catch (err) {
      overwriteBtn.disabled = false;
      overwriteBtn.textContent = 'Overwrite';
      setGdocStatus('Save error: ' + err.message);
    }
  }
  ```

- [x] T018 [US4] Add `exportTxtString()` helper function in `read-literature.html` (before or after
  `exportTxt()`). This is the same logic as `exportTxt()` but returns the string instead of
  downloading it:
  ```javascript
  function exportTxtString() {
    var lines = [];
    var title = document.getElementById('bookTitle').value.trim();
    if (title) lines.push('BOOK: ' + title, '');
    lines.push('=== PEOPLE ===', '');
    people.forEach(function(p) {
      lines.push('#' + p.name + (p.role ? ' [' + p.role + ']' : ''));
      if (p.notes.trim()) lines.push(p.notes.trim());
      lines.push('');
    });
    lines.push('=== CHAPTERS ===', '');
    chapters.forEach(function(ch) {
      lines.push('#' + ch.name);
      if (ch.notes.trim()) lines.push(ch.notes.trim());
      lines.push('');
    });
    return lines.join('\n');
  }
  ```

- [x] T019 [US4] Modify `gdocImport(fileId)` in `read-literature.html` to:
  (a) Accept an optional second parameter `docName`:
      `async function gdocImport(fileId, docName)` — update the function signature.
  (b) If `docName` is falsy, fetch the file name via:
      ```javascript
      if (!docName) {
        var metaResp = await fetch(
          'https://www.googleapis.com/drive/v3/files/' + encodeURIComponent(fileId) + '?fields=name',
          { headers: { Authorization: 'Bearer ' + gdriveAccessToken } }
        );
        if (metaResp.ok) {
          var meta = await metaResp.json();
          docName = meta.name || '';
        }
      }
      ```
  (c) On successful import (after `importTxt(text)` succeeds), add:
      ```javascript
      _loadedDocId   = fileId;
      _loadedDocName = docName || '';
      var saveBtn = document.getElementById('gdocSaveBtn');
      saveBtn.textContent = 'Save \u2192 ' + (_loadedDocName || 'doc');
      saveBtn.style.display = '';
      ```
  (d) Update the caller in `openGdocDropdown()`: change `gdocImport(doc.id)` to
      `gdocImport(doc.id, doc.name)`.

- [x] T020 [US4] Modify `gdocSignIn()` sign-out branch in `read-literature.html`: after
  `setGdocStatus('')`, add:
  ```javascript
  _loadedDocId = null;
  _loadedDocName = null;
  document.getElementById('gdocSaveBtn').style.display = 'none';
  hideGdocConfirm();
  ```

- [x] T021 [US4] Update `gdocInitClient()` in `read-literature.html` to request the additional
  `documents` scope. Change:
  ```javascript
  scope: 'https://www.googleapis.com/auth/drive.readonly',
  ```
  to:
  ```javascript
  scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/documents',
  ```

- [x] T022 [US4] Wire `#gdocSaveBtn`, `#gdocConfirmCancel`, and `#gdocConfirmOverwrite` in the
  existing DOMContentLoaded block in `read-literature.html`:
  ```javascript
  document.getElementById('gdocSaveBtn').addEventListener('click', showGdocConfirm);
  document.getElementById('gdocConfirmCancel').addEventListener('click', hideGdocConfirm);
  document.getElementById('gdocConfirmOverwrite').addEventListener('click', gdocSave);
  ```

---

## Phase 7: Polish

- [x] T023 Verify in `read-literature.html` that `.app-nav button` CSS has `min-height: 44px`
  and `min-width: 44px`. Confirm navbar does not cause horizontal scrollbar on the page itself
  (only the nav bar scrolls internally via `overflow-x: auto`).

- [x] T024 Verify in `read-literature.html` that dark mode covers the navbar background
  (`.app-nav` uses `var(--paper-raised)` which is overridden in `[data-theme="dark"]`), the
  confirmation panel (uses `var(--paper)`), and `#gdocStatus` text colour (uses `var(--ink-soft)`).
  No element should remain with a hardcoded `#fff` or `#26221B` colour that bypasses theming.

---

## Phase 8: Validation

- [ ] T025 Open `read-literature.html` in a browser (HTTPS/localhost), set viewport ≤ 390px,
  complete all 12 scenarios in `specs/004-read-literature-ux/quickstart.md` and record pass/fail
  next to each Scenario heading. Confirm: (a) navbar is sticky; (b) font ± works and persists;
  (c) dark mode toggles and persists; (d) outline mode shows bullet list from notes; (e) save to
  Google Doc overwrites and returns correct content on next import.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately — read only
- **Phase 2 (Foundational)**: After Phase 1 — CSS/HTML/variables block all user stories
- **Phase 3 (US1)**: After Phase 2 — needs `<nav>` in DOM (T003) and `--app-font-size` (T002)
- **Phase 4 (US2)**: After Phase 2 — needs `[data-theme]` CSS (T002); independent of US1
- **Phase 5 (US3)**: After Phase 2 + After Phase 3 T006 (`toggleAllNodes` calls `applyOutlineMode`);
  `toggleOutlineMode` must exist before T013/T014 extend the click handlers
- **Phase 6 (US4)**: After Phase 2 + requires `gdocImport` (003 feature) + `exportTxtString` (T018
  must exist before T017 references it — write T018 before T017 or inline it)
- **Phase 7 (Polish)**: After all user story phases
- **Phase 8 (Validation)**: After all prior phases

### Critical Task Order Notes

- T010 (`buildOutlineView`) MUST precede T011 (`applyOutlineMode` calls it)
- T011 (`applyOutlineMode`) MUST precede T012 (`toggleOutlineMode` calls it) and T013/T014 (click handlers call it)
- T006 (`toggleAllNodes`) MUST precede T013/T014 (calls `applyOutlineMode`; so `applyOutlineMode` must exist first)
- T018 (`exportTxtString`) MUST precede T017 (`gdocSave` calls it) — write T018 first
- T019 (modify `gdocImport`) MUST update `openGdocDropdown` caller to pass `doc.name` — do both in one edit
- T021 (scope change) may force a re-auth prompt for users who already have `drive.readonly` cached

### Recommended Write Order for Phase 5 (US3)

T010 → T011 → T012 → T013 → T014 → T015

### Recommended Write Order for Phase 6 (US4)

T018 → T016 → T017 → T019 → T020 → T021 → T022

---

## Parallel Opportunities

- T002 and T003 touch different areas of the file (CSS in `<style>`, HTML in `<body>`) — can be
  written in a single editor pass
- T004 is a one-liner append to the variable block — trivial alongside T002/T003
- US1, US2 functions (T005–T007, T008–T009) are independent JS additions that can be written in
  parallel if editing different sections of the script block
- T023 and T024 (polish verification) are independent and can run in parallel

---

## Implementation Strategy

### MVP (US1 + US2 first)

1. T001 — Read insertion points
2. T002 → T003 → T004 — CSS + HTML nav + variables
3. T005 → T006 → T007 — Font size + Expand/Collapse + wiring (US1)
4. T008 → T009 — Dark mode (US2)
5. T010 → T011 → T012 → T013 → T014 → T015 — Outline mode (US3)
6. T018 → T016 → T017 → T019 → T020 → T021 → T022 — Save to Doc (US4)
7. T023 → T024 — Polish
8. T025 — Browser validation

### What Modifies Existing Functions

| Function | Task | Change |
|----------|------|--------|
| `buildPersonNode()` | T013 | Replace click handler to call `applyOutlineMode` when in outline mode |
| `buildChapterNode()` | T014 | Same as T013 |
| `gdocImport()` | T019 | Add `docName` param, fetch name if absent, set `_loadedDocId`/`_loadedDocName`, show save btn |
| `gdocSignIn()` | T020 | Add doc ID/name reset + hide save btn in sign-out branch |
| `gdocInitClient()` | T021 | Add `documents` scope |
| `openGdocDropdown()` | T019 | Update `gdocImport(doc.id)` → `gdocImport(doc.id, doc.name)` |
| DOMContentLoaded block | T007, T009, T015, T022 | Add event wiring for new nav buttons and save/confirm buttons |

---

## Notes

- All tasks modify only `read-literature.html`
- No new files are created
- The `exportTxt()` function is left unchanged; `exportTxtString()` (T018) shares the same logic
  but returns a string instead of triggering a download
- T025 is a manual browser step — not automatable in a static HTML project
- The scope upgrade (T021) requires users to re-authorise; GIS will prompt automatically
