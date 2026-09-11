# Tasks: Google Drive Recent Files Picker

**Input**: Design documents from `specs/001-gdrive-recent-picker/`

**Prerequisites**: plan.md ✅ spec.md ✅ (amended 2026-09-10) research.md ✅ data-model.md ✅ quickstart.md ✅

**Tests**: Not requested. Manual validation via quickstart.md (Scenario 1–7).

**Organization**: All changes are confined to a single file (`learn-chinese-tts.html`).
Tasks are grouped by user story; within a story, they run sequentially in the order listed.

**Amendment note**: Tasks T001–T015 were completed against the original spec. Tasks T016–T020
cover the spec amendment that adds FR-010 (button on own row) and FR-011 (no name truncation).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel with other [P]-marked tasks in the same phase
- **[Story]**: Which user story this task belongs to
- All file paths refer to `learn-chinese-tts.html` at the repository root

---

## Phase 1: Setup (Understand Insertion Points) ✅

**Purpose**: Read the existing Google Sheets setup section and sign-in flow to identify
exactly where HTML, CSS, and JS additions go.

- [x] T001 Read `learn-chinese-tts.html` lines ~550–580 (Google Sheets setup row: `#authBtn`, `#searchInput`, `#searchBtn`) and lines ~1380–1430 (`gdriveSignIn`, `gdriveSearch`, `loadSpreadsheet`) to confirm insertion points match the plan before writing any code

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Add the CSS and HTML skeleton, and wire the "Recent ▾" button to appear
after sign-in completes.

- [x] T002 Add CSS block to the `<style>` section of `learn-chinese-tts.html` for `.recent-dropdown-wrapper`, `.recent-dropdown`, `.recent-dropdown-item`, `.recent-dropdown-item:last-child`, `.recent-dropdown-item:active`
- [x] T003 Insert HTML `<div class="recent-dropdown-wrapper">` containing `#recentBtn` and `#recentDropdown` into the Google Sheets setup row in `learn-chinese-tts.html`
- [x] T004 Wire `#recentBtn` enable/disable to the sign-in success callback and sign-out branch in `learn-chinese-tts.html`

---

## Phase 3: User Story 1 — Pick a Recent File After Sign-In (Priority: P1) ✅ MVP

**Goal**: Fetch up to 10 recently viewed Drive spreadsheets and let the user pick one
to load — no typing required.

**Independent Test**: Quickstart Scenario 1 (sign in → tap Recent ▾ → select file → deck loads).

- [x] T005 [US1] Add `async function fetchRecentFiles()` in `learn-chinese-tts.html`
- [x] T006 [US1] Add `function openRecentDropdown(files)` in `learn-chinese-tts.html`
- [x] T007 [US1] Add `function closeRecentDropdown()` in `learn-chinese-tts.html`
- [x] T008 [US1] Wire `#recentBtn` click handler via `DOMContentLoaded` in `learn-chinese-tts.html`

---

## Phase 4: User Story 2 — Loading Indicator (Priority: P2) ✅

**Goal**: Disable the button and show "Loading…" while the Drive API call is in-flight.

- [x] T009 [US2] Add loading state at start of `fetchRecentFiles()` in `learn-chinese-tts.html`
- [x] T010 [US2] Add `finally` block to restore button after fetch completes in `learn-chinese-tts.html`

---

## Phase 5: User Story 3 — Empty and Error States (Priority: P3) ✅

**Goal**: Show a clear inline message when no files are found or the API call fails.

- [x] T011 [US3] Add empty-list guard in `openRecentDropdown()` in `learn-chinese-tts.html`
- [x] T012 [US3] Verify error path in `catch` block of `fetchRecentFiles()` in `learn-chinese-tts.html`

---

## Phase 6: Polish (Original) ✅

- [x] T013 Implement outside-tap dismiss via `_registerDismissListener()` in `learn-chinese-tts.html`
- [x] T014 Verify narrow-viewport CSS (`max-width: calc(100vw - 32px)`) in `learn-chinese-tts.html`
- [x] T015 Verify tap-target height ≥ 44px for `.recent-dropdown-item` in `learn-chinese-tts.html`

---

## Phase 7: Amendment — Own-Row Layout & Full Filename Display (FR-010, FR-011)

**Purpose**: The spec was amended to require the "Recent ▾" button on its own dedicated
row so the dropdown has full container width and filenames display without truncation
(currently names show as "chine…" and "korean" because the wrapper is inline-block and
the item CSS uses `text-overflow: ellipsis`).

**⚠️ CRITICAL**: T016 (end-to-end validation) MUST be run AFTER T019 is complete.

### Implementation

- [x] T016 [US1] Move the `<div class="recent-dropdown-wrapper">` block in `learn-chinese-tts.html` out of the existing Sign In setup-row and into its own `<div class="setup-row">` placed immediately below it, so the button sits on a separate full-width row. The resulting HTML structure should be:
  ```
  <!-- existing row -->
  <div class="setup-row">
    <button id="authBtn" …>Sign In</button>
    <input id="searchInput" …>
    <button id="searchBtn" …>Load</button>
  </div>
  <!-- new own row for Recent button -->
  <div class="setup-row">
    <div class="recent-dropdown-wrapper">
      <button id="recentBtn" …>Recent ▾</button>
      <div id="recentDropdown" …></div>
    </div>
  </div>
  ```

- [x] T017 Update `.recent-dropdown-wrapper` CSS in `learn-chinese-tts.html`: change `display: inline-block` to `display: block; width: 100%` so the wrapper (and the dropdown it contains) spans the full row width.

- [x] T018 Update `.recent-dropdown-item` CSS in `learn-chinese-tts.html`: remove `white-space: nowrap; overflow: hidden; text-overflow: ellipsis;` and add `white-space: normal;` so long file names wrap to a second line instead of being cut off with an ellipsis.

- [x] T019 Update `.recent-dropdown` CSS in `learn-chinese-tts.html`: remove `max-width: calc(100vw - 32px)` (no longer needed since the wrapper is now full-width) and confirm `width: 100%` remains so the dropdown matches the wrapper width.

### Validation

- [ ] T020 Open `learn-chinese-tts.html` in a browser at ≤390px viewport width, sign in with Google, tap "Recent ▾", and confirm: (a) the button appears on its own row below the Sign In / Load row; (b) all file names display in full without ellipsis; (c) long names wrap to a second line. Record pass/fail next to each Scenario heading in `specs/001-gdrive-recent-picker/quickstart.md` (run all 7 scenarios).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phases 1–6**: Complete ✅
- **Phase 7 (Amendment)**: Depends on Phases 1–6 being complete — all amendment tasks affect the same file
- T016 → T017 → T018 → T019 (sequential: HTML move first, then CSS updates)
- T020: After T016–T019 complete

### User Story Mapping for Amendment

- **T016**: US1 (layout affects the button that triggers the dropdown)
- **T017**: US1 (wrapper width affects dropdown width)
- **T018**: US1 + US3 (item wrapping affects all dropdown content including empty-state)
- **T019**: US1 (dropdown width constraint removed)
- **T020**: All stories (end-to-end validation)

---

## Parallel Example: Phase 7

T017, T018, T019 all modify the CSS section of the same file — run sequentially.
T016 modifies the HTML section — can be done independently from CSS edits if coordinating,
but sequential is safer for a solo developer.

---

## Implementation Strategy

### MVP for Amendment (FR-010 + FR-011)

1. T016 — Move button to own row
2. T017 — Full-width wrapper
3. T018 — Remove truncation, enable wrapping
4. T019 — Clean up dropdown width constraint
5. T020 — Validate in browser

### What Was Already Delivered

- Core dropdown fetch + render + selection (US1) ✅
- Loading indicator (US2) ✅
- Empty / error states (US3) ✅
- Outside-tap dismiss ✅
- Mobile touch targets ✅

---

## Notes

- All tasks modify only `learn-chinese-tts.html`
- No new files are created
- The existing text-search input (`#searchInput`) and "Load" button (`#searchBtn`) are untouched
- T016 is a structural HTML change — verify the sign-in / search row still renders correctly after moving the wrapper
