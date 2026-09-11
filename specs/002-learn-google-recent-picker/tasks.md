# Tasks: Recent Files Picker & Expanded Setup for learn-google

**Input**: Design documents from `specs/002-learn-google-recent-picker/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: Not requested. Manual validation via quickstart.md (Scenarios 1–8).

**Organization**: All changes are confined to a single file (`learn-google.html`).
Tasks are grouped by user story; within a story, they run sequentially in the order listed.

**Key adaptations from 001-gdrive-recent-picker** (porting notes for implementer):
- Status helper: `setGStatus()` (not `setStatus()`)
- Load function: `gdriveLoadSpreadsheet(file.id, file.name)` (not `loadSpreadsheet(id)`)
- Auth callback lives in `gdriveInitClient()` (not `gdriveSignIn`)
- Sign-out branch is in `gdriveSignIn()` (same as 001)
- IDs: `recentBtn`, `recentDropdown` (new); existing IDs keep `g` prefix unchanged

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase
- **[Story]**: Which user story this task belongs to
- All file paths refer to `learn-google.html` at the repository root

---

## Phase 1: Setup (Understand Insertion Points)

**Purpose**: Read the existing Google Sheets setup section and auth flow to identify
exactly where HTML, CSS, and JS additions go.

- [x] T001 Read `learn-google.html` lines ~220–245 (`.setup-section`, `.setup-row` CSS), lines ~670–690 (HTML: `#setupSection`, `#authBtn`, `#gSearchInput`, `#gSearchBtn`), and lines ~1660–1710 (`toggleSetup`, `gdriveInitClient`, `gdriveSignIn`, `gdriveSearch`) to confirm insertion points match the plan before writing any code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Add the CSS and HTML skeleton, and wire the "Recent ▾" button to appear
after sign-in completes.

- [x] T002 Add CSS block to the `<style>` section of `learn-google.html` for `.recent-dropdown-wrapper` (`position: relative; display: block; width: 100%`), `.recent-dropdown` (`position: absolute; top: 100%; left: 0; width: 100%; max-height: 220px; overflow-y: auto; background: white; border: 1px solid #ddd; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,.1); z-index: 100`), `.recent-dropdown-item` (`display: block; width: 100%; padding: 12px 14px; min-height: 44px; text-align: left; background: none; border: none; border-bottom: 1px solid #f0f0f0; font-size: 13px; cursor: pointer; white-space: normal; overflow: visible; word-break: break-word`), `.recent-dropdown-item:last-child` (`border-bottom: none`), `.recent-dropdown-item:active` (`background: #f5f5f5`)

- [x] T003 Insert a new `<div class="setup-row">` immediately after the existing Sign In setup-row in `learn-google.html`, containing `<div class="recent-dropdown-wrapper"><button class="btn outline" id="recentBtn" disabled>Recent ▾</button><div id="recentDropdown" class="recent-dropdown" hidden></div></div>`

- [x] T004 Wire `#recentBtn` enable/disable in `learn-google.html`: in the `gdriveInitClient()` auth success callback add `document.getElementById('recentBtn').disabled = false;`; in the `gdriveSignIn()` sign-out branch (before `return`) add `document.getElementById('recentBtn').disabled = true; closeRecentDropdown();`

---

## Phase 3: User Story 1 — Pick a Recent File After Sign-In (Priority: P1) 🎯 MVP

**Goal**: Fetch up to 10 recently viewed Drive spreadsheets and let the user pick one
to load — no typing required.

**Independent Test**: Quickstart Scenario 3 (sign in → "Recent ▾" button appears) +
Scenario 4 (tap Recent ▾ → files list) + Scenario 5 (select file → deck loads).

- [x] T005 [US1] Add `var _recentDismissListener = null;` and `async function fetchRecentFiles()` in `learn-google.html` (after the `gdriveSearch()` function). The function fetches `https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.spreadsheet'+and+trashed%3Dfalse&orderBy=viewedByMeTime+desc&pageSize=10&fields=files(id%2Cname%2CviewedByMeTime)` with `Authorization: 'Bearer ' + gdriveAccessToken` header, then calls `openRecentDropdown(data.files)`. Use `setGStatus()` for error messages (not `setStatus()`).

- [x] T006 [US1] Add `function openRecentDropdown(files)` in `learn-google.html`. It clears `#recentDropdown`, creates a `<button class="recent-dropdown-item">` for each file (calling `gdriveLoadSpreadsheet(f.id, f.name)` on click, then `closeRecentDropdown()`), appends buttons to the dropdown, removes `hidden`, then calls `_registerDismissListener()`.

- [x] T007 [US1] Add `function closeRecentDropdown()` in `learn-google.html`. It adds `hidden` to `#recentDropdown`, and if `_recentDismissListener` is set, removes the listener from `document` (both `touchstart` and `click` events) and nulls the variable.

- [x] T008 [US1] Wire `#recentBtn` click handler via `DOMContentLoaded` in `learn-google.html`: if dropdown is not hidden call `closeRecentDropdown()`, else call `fetchRecentFiles()`.

---

## Phase 4: User Story 2 — Setup Section Starts Expanded (Priority: P2)

**Goal**: The Google Sheets setup section is immediately visible on page load — no toggle
tap required before the user can access Sign In.

**Independent Test**: Quickstart Scenario 1 (open page → setup body visible, arrow shows ▼).

- [x] T009 [US2] In `learn-google.html`, change `<div class="setup-section collapsed" id="setupSection">` to `<div class="setup-section" id="setupSection">` (remove `collapsed`), and change `<span class="toggle-arrow" id="setupArrow">&#9658;</span>` to `<span class="toggle-arrow" id="setupArrow">&#9660;</span>` (▶ → ▼)

---

## Phase 5: User Story 3 — Loading Indicator (Priority: P3)

**Goal**: Disable the button and show "Loading…" while the Drive API call is in-flight.

- [x] T010 [US3] Add loading state at the start of `fetchRecentFiles()` in `learn-google.html`: `var btn = document.getElementById('recentBtn'); btn.disabled = true; btn.textContent = 'Loading…';`

- [x] T011 [US3] Add `finally` block to `fetchRecentFiles()` in `learn-google.html` that restores button: `btn.disabled = false; btn.textContent = 'Recent ▾';`

---

## Phase 6: User Story 4 — Empty and Error States (Priority: P4)

**Goal**: Show a clear inline message when no files are found or the API call fails.

- [x] T012 [US4] Add empty-list guard in `openRecentDropdown()` in `learn-google.html`: if `!files || files.length === 0`, append a single non-interactive item with text "No recent spreadsheets found" and return early (do not register dismiss listener for empty state — or register it so user can tap outside to close).

- [x] T013 [US4] Verify the `catch` block in `fetchRecentFiles()` in `learn-google.html` calls `setGStatus('Error fetching recent files: ' + err.message)` and that the `finally` block re-enables the button regardless of error.

---

## Phase 7: Polish

- [x] T014 Add `function _registerDismissListener()` in `learn-google.html`: creates a handler that calls `closeRecentDropdown()` and stores it in `_recentDismissListener`, then registers it on `document` via `setTimeout(0)` for both `touchstart` and `click` events so the same tap that opened the dropdown does not immediately close it.

- [x] T015 Verify `.recent-dropdown-wrapper` CSS has `display: block; width: 100%` and `.recent-dropdown` has `width: 100%` in `learn-google.html` — confirm no `max-width` constraint that would prevent full-row width on narrow viewport.

- [x] T016 Verify `.recent-dropdown-item` CSS has `min-height: 44px` in `learn-google.html` (touch target requirement).

---

## Phase 8: Validation

- [ ] T017 Open `learn-google.html` in a browser at ≤390px viewport width, complete all 8 scenarios in `specs/002-learn-google-recent-picker/quickstart.md`, and record pass/fail next to each Scenario heading. Confirm: (a) setup section starts expanded; (b) "Recent ▾" button appears on its own row after sign-in; (c) all file names display in full without ellipsis; (d) long names wrap to a second line.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately
- **Phase 2 (Foundational)**: After Phase 1 — CSS + HTML + sign-in wiring
- **Phase 3 (US1)**: After Phase 2 — requires recentBtn and recentDropdown to exist
- **Phase 4 (US2)**: Independent of Phases 3, 5, 6 — pure HTML attribute change; can run any time after Phase 1
- **Phase 5 (US3)**: After T005 (fetchRecentFiles exists) — modifies the same function
- **Phase 6 (US4)**: After T005 and T006 — modifies fetchRecentFiles + openRecentDropdown
- **Phase 7 (Polish)**: After Phases 3–6 — T014 (_registerDismissListener) referenced by T006
- **Phase 8 (Validation)**: After all prior phases

### User Story Mapping

- **T002–T004**: Foundational (no story label; prerequisites for US1)
- **T005–T008**: US1 (core dropdown fetch + render + selection)
- **T009**: US2 (expanded setup — independent one-liner)
- **T010–T011**: US3 (loading indicator inside fetchRecentFiles)
- **T012–T013**: US4 (empty/error states inside fetchRecentFiles + openRecentDropdown)
- **T014–T016**: Polish (dismiss listener, width, tap targets)
- **T017**: Validation

### Note on Task Order for Phases 3, 5, 6

T005 (fetchRecentFiles) MUST be written before T010/T011 (US3 loading) and T012/T013 (US4 empty/error),
because those tasks modify the same function body. T006 (openRecentDropdown) must exist before T012.

T014 (_registerDismissListener) is called by T006 — it must exist when T006 is implemented.
Write T014 before or alongside T006.

---

## Parallel Opportunities

- T009 (US2, expand toggle) can run at any time after T001 — it touches only the HTML section and is independent of all dropdown JS/CSS work.
- T015 and T016 (CSS verification tasks) can run in parallel after T002.
- T010 and T011 (US3) are sequential additions to the same function body.
- T012 and T013 (US4) are sequential modifications to related function bodies.

---

## Implementation Strategy

### MVP (US1 + US2 first)

1. T001 — Read insertion points
2. T002 → T003 → T004 — CSS + HTML + sign-in wiring
3. T014 — _registerDismissListener (needed by T006)
4. T005 → T006 → T007 → T008 — fetchRecentFiles, open/close, click handler
5. T009 — Remove `collapsed`, fix arrow (US2, ~30 seconds)
6. T010 → T011 — Loading state
7. T012 → T013 — Empty/error states
8. T015 → T016 — Polish verification
9. T017 — Browser validation

### What This Ports From 001-gdrive-recent-picker

The JS functions (`fetchRecentFiles`, `openRecentDropdown`, `closeRecentDropdown`,
`_registerDismissListener`) and CSS (`.recent-dropdown-wrapper`, `.recent-dropdown`,
`.recent-dropdown-item`) are direct copies from `learn-chinese-tts.html` with three
targeted substitutions:
- `setStatus(` → `setGStatus(`
- `loadSpreadsheet(f.id)` → `gdriveLoadSpreadsheet(f.id, f.name)`
- recentBtn enable wire: inside `gdriveInitClient()` callback (not the sign-in function)

---

## Notes

- All tasks modify only `learn-google.html`
- No new files are created
- The existing text-search input (`#gSearchInput`) and "Load" button (`#gSearchBtn`) are untouched
- T009 is the only change for US2 — it is a two-attribute HTML edit, not a JS change
- T017 is a manual step performed in a real browser; no automation is possible in a static HTML project
