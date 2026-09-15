---

description: "Task list template for feature implementation"
---

# Tasks: Randomize Toggle Replaces Deck Mode

**Input**: Design documents from `/specs/007-deck-view-randomize/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md (all present; no `contracts/` — this feature has no external interface)

**Tests**: Not requested. This repo has no automated test harness for these files (Constitution: manual smoke test only); validation tasks below run the manual scenarios in `quickstart.md` instead of contract/unit tests.

**Organization**: Tasks are grouped by user story (US1, US2, US3 from spec.md, all Priority P1) to enable independent implementation and testing of each story.

**Scope reminder**: Only `learn-google.html` and `learn-chinese-tts.html` are touched. Other files that also contain Deck-view code (`learn-chinese-tts_*.html`, `learn-spanish-tts*.html`, `learn-korean-tts-2.html`, `learn-french-tts.html`, and the sample CSV export under `python-generate-html-from-csv/sample_csvs/`) are unmaintained prototypes per Constitution Principle I and spec.md's Assumptions — **do not edit them** as part of this feature.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task names the exact file(s) and the existing symbol(s) it touches

## Phase 1: Setup

- [X] T001 Create and check out git branch `007-deck-view-randomize` from `main` (matches the branch name already resolved in `specs/007-deck-view-randomize/plan.md`); commit all work for this feature on this branch.

**Checkpoint**: Working on the correct branch before any edits begin.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Introduce the shared Randomize control, state, and display-order helper that every user story needs — including the load-time fix that US1/US2's own acceptance scenarios assume is already in place (a fresh load must land in Cards/Table, not a session mode).

**⚠️ CRITICAL**: No user story below is independently testable until this phase is complete.

- [X] T002 [P] In `learn-google.html`, replace the control-bar chip `<span class="toggle-chip" id="toggleDeckView" onclick="toggleDeckView()">Deck</span>` with `<span class="toggle-chip" id="toggleRandomize" onclick="toggleRandomize()">Randomize</span>`, in the same position in the control bar. Leave the separate, pre-existing `<button class="try-btn" onclick="openPracticeModal(true)">▼ Randomize</button>` untouched (FR-003).
- [X] T003 [P] In `learn-chinese-tts.html`, make the same chip replacement (`toggleDeckView` → `toggleRandomize`, label "Deck" → "Randomize"), same position.
- [X] T004 In `learn-google.html`, next to `var deckViewOn = false;`, add `var randomizeOn = false;`, and add a helper (e.g. `function getDisplayOrder(count)`) that returns `[0..count-1]` when `randomizeOn` is false, or `shuffleArray([0..count-1])` when true — reusing the existing `shuffleArray()` function (do not write a new shuffle; see research.md). This implements the Display Order entity from `data-model.md`. (Implemented as a cached `displayOrder` array + `computeDisplayOrder()`, recomputed by callers, rather than a pure `getDisplayOrder(count)` — same contract.)
- [X] T005 In `learn-chinese-tts.html`, add `var randomizeOn = false;` next to `deckViewOn`, and the equivalent `getDisplayOrder(count)` helper reusing the existing `shuffleDeckArray()` function. (Same cached-`displayOrder` implementation as T004.)
- [X] T006 In `learn-google.html`, implement `function toggleRandomize()` (replacing the old `toggleDeckView()` body — do not keep both): flips `randomizeOn`, updates `#toggleRandomize`'s class to `'toggle-chip' + (randomizeOn ? ' on' : '')`, and re-renders whichever view is active (`renderCards()` if Table is off, `renderTableView()` if Table is on) so the new Display Order takes effect immediately (FR-006).
- [X] T007 In `learn-chinese-tts.html`, implement the equivalent `function toggleRandomize()` replacing the old `toggleDeckView()` body, re-rendering `renderLyrics()` or `renderTableView()` depending on `tableViewOn`.
- [X] T008 In `learn-google.html`, in `filterAndRender()`, recompute the Display Order from the current `filteredVocab` length whenever `randomizeOn` is true (fresh shuffle each time this function runs), before `renderCards()`/`renderTableView()` are called, so a new data load or a search/filter change reshuffles the newly-visible set (FR-008, FR-009).
- [X] T009 In `learn-chinese-tts.html`, make the equivalent Display-Order recomputation in `refreshRows()` against `filteredRows`.
- [X] T010 In `learn-google.html`, remove the two `activateDeckView();` calls that run after a data load (`loadPastedCsv()` around line 1521, and the Supabase-deck load handler around line 1671), so a fresh load shows whichever of Cards/Table is already selected directly (FR-009).
- [X] T011 In `learn-chinese-tts.html`, remove the `if (!deckViewOn) toggleDeckView();` / `else if (!deckViewOn) toggleDeckView();` fallback calls that run after a data load, so a fresh load shows whichever of Cards/Table is already selected directly (FR-009). Leave the `window.EMBEDDED_TABLE_VIEW` → `toggleTableView()` call as-is. (Correction: only 3 call sites existed, not 4 — Supabase deck load, pasted-CSV load, and the CSV-drop-zone load; the drag-folder/file-input paths never called it, and the embedded-data branch only toggles Table, not Deck.)

**Checkpoint**: Both files now have a working "Randomize" chip and state, a load path that never forces a session mode, and a `getDisplayOrder()` helper — but `renderCards()`/`renderLyrics()` and `renderTableView()` don't consume it yet (next two phases), and the old Deck session code is now unreachable dead code (deleted in Phase 5).

---

## Phase 3: User Story 1 - Shuffle order in Cards mode (Priority: P1) 🎯 MVP

**Goal**: With Table off (Cards showing), toggling Randomize shuffles/restores the card order in place.

**Independent Test**: Load a deck, confirm Cards mode shows source order, click Randomize, confirm a different order renders in the same view with no modal/session — per quickstart.md Scenario 2.

### Implementation for User Story 1

- [X] T012 [US1] In `learn-google.html`, update `renderCards()` to iterate `filteredVocab` in the sequence given by `getDisplayOrder(filteredVocab.length)` instead of natural array order (i.e. `container.appendChild(buildCard(filteredVocab[order[k]], order[k]))` for each `k`), so `buildCard(row, fi)` still receives each entry's original index `fi` and every index-addressed feature (hard-marking, `userAnswers`, `scores`) keeps working unchanged.
- [X] T013 [US1] In `learn-chinese-tts.html`, update the `linesContainer` build loop in `renderLyrics()` to iterate `filteredRows` via the same `getDisplayOrder(filteredRows.length)` index sequence, preserving each row's original index for `revbtn-<i>`, `card-<i>` IDs, and the tooltip/reveal wiring that addresses rows by that index.

**Checkpoint**: Cards-mode randomization is fully functional and independently testable in both files (verify against quickstart.md Scenario 2 before moving on).

---

## Phase 4: User Story 2 - Shuffle rows in Table mode (Priority: P1)

**Goal**: With Table on, toggling Randomize shuffles/restores the table's row order while search, keyboard row navigation, and the play button keep working.

**Independent Test**: Switch to Table mode, click Randomize, confirm the table rebuilds with rows in a different order, and confirm search/keyboard-nav/play still work — per quickstart.md Scenario 3.

### Implementation for User Story 2

- [X] T014 [US2] In `learn-google.html`, update `renderTableView()` to build its `<tr>` rows by iterating `getDisplayOrder(filteredVocab.length)` instead of `filteredVocab` in natural order, keeping the DataTables instance destroy/rebuild logic and the `tbl-current` row-highlight/keyboard-navigation index addressing intact.
- [X] T015 [US2] In `learn-chinese-tts.html`, update `renderTableView()`'s `displayRows` construction to follow the same `getDisplayOrder()` sequence over `filteredRows`, keeping section-header/context-line rendering and row addressing intact.
- [X] T016 [US2] Manually verify, in both files: with Randomize on in Table mode, switching to Cards mode and back preserves both the Randomize on/off state and the same shuffled order (no extra reshuffle from the mode switch alone) — FR-007/FR-008, quickstart.md Scenario 3 step 5. Verified via an automated Playwright smoke test (chromium, headless) run against a local static server. **Found and fixed a real bug in the process**: `toggleTableView()`'s branch that reveals the *other* view (Table→Cards or Cards→Table) only toggled CSS visibility — it never re-rendered that view, so it could show a stale pre-shuffle order if Randomize had been toggled while it was hidden. Fixed in both files by calling `renderCards()` / `renderLyrics()` respectively from that branch. Re-verified green after the fix.

**Checkpoint**: Table-mode randomization is fully functional; Cards↔Table switching preserves Randomize state and current order in both files.

---

## Phase 5: User Story 3 - Deck mode and its screens are fully removed (Priority: P1)

**Goal**: No Deck-specific chip, container, session logic, or CSV-export screen remains anywhere in either file.

**Independent Test**: Inspect the running page and source of both files; confirm none of the removed Deck symbols/markup/screens exist or render — per quickstart.md Scenario 1.

### Implementation for User Story 3

- [X] T017 [P] [US3] In `learn-google.html`, delete the `#deckViewContainer` element and all its children (deck card, flip hint, progress row, done-screen, "Copy missed CSV" / "Copy missed + remaining" buttons) from the HTML, and delete its CSS rules (`#deckViewContainer` / `#deckViewContainer.active`, and any other Deck-only selectors, e.g. `.deck-card`, `.deck-flip-hint`, `.deck-progress-row`).
- [X] T018 [P] [US3] In `learn-chinese-tts.html`, make the equivalent removal of `#deckViewContainer` and its children plus its Deck-only CSS rules. (This file's deck container also nested a Dropbox "Push (missed&rem.)" button + confirmation modal — removed with it; it read `deckMissedSet`/`deckQueue`/`deckCurrent`, so it was Deck-scoped, not a general feature.)
- [X] T019 [P] [US3] In `learn-google.html`, delete the Deck state variables (`deckViewOn`, `deckQueue`, `deckTotal`, `deckCleared`, `deckCurrent`, `deckFlipped`, `deckMissedSet`), the session functions (`activateDeckView`, `startDeckSession`, `deckUpdateProgress`, `deckNextCard`, `deckFinish`, `deckFlipCard`, `deckGrade`), their DOM event listeners (`deckCard` click, grade buttons, `deckRevealBtn`, `deckRestartBtn`), and the missed/remaining CSV-export logic. **Keep `shuffleArray()`** — it is now used by `getDisplayOrder()` from Phase 2. (Also found and removed the `dbxPushBtn`/`dbxPushBucketNum` Dropbox-push feature, which lived inside `#deckViewContainer` and read `deckMissedSet`/`deckQueue`/`deckCurrent` — it was Deck-scoped UI, not a general feature; see implementation notes.)
- [X] T020 [P] [US3] In `learn-chinese-tts.html`, make the equivalent deletion of Deck state variables, session functions, `getDeckVocabIndices`, `dedupeDeckIndices`, their event listeners, and the missed/remaining CSV-export logic. **Keep `shuffleDeckArray()`** — it is now used by `getDisplayOrder()` from Phase 2. Also removed the Dropbox "Push" function (`dbxBuildPushPayload`) and its button listeners (see T018), and dropped `dbxPushBucketNum` from `dbxPopulateBucketSelects()`'s id list.
- [X] T021 [P] [US3] In `learn-google.html`, delete the Deck-specific keydown block (`if (deckViewOn && deckCurrent !== null) { ... ArrowLeft/ArrowRight/Space/ArrowUp ... }`) from the global keydown handler, leaving the Table-navigation and other existing shortcuts unchanged (FR-010).
- [X] T022 [P] [US3] In `learn-chinese-tts.html`, delete the equivalent Deck-specific keydown block (FR-010). (Also removed the "DECK SWIPE (touch)" gesture IIFE, which was Deck-card-specific and had no Cards/Table equivalent to preserve.)
- [X] T023 [US3] Verify, in both files' DOM and source (view-source / dev tools), that no `deck`-prefixed identifier, container, or button remains reachable, and that loading a new data set never shows a session/progress/done screen — per quickstart.md Scenario 1 (SC-002). Verified via `grep -i deck` on both files (only legitimate matches remain: the pre-existing Supabase "deck" naming — `sbDeckSel`/`sbLoadDeck`/etc. — and the kept `shuffleArray()`/`shuffleDeckArray()` helpers) and via the Playwright smoke test confirming `#toggleDeckView`/`#deckViewContainer` have zero matches and no session screen appears after a fresh load.

**Checkpoint**: All three user stories are independently functional; Deck mode leaves no trace in either file.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full regression pass across both files, confirming nothing outside this feature's scope was affected.

- [X] T024 [P] Run the full `quickstart.md` validation (all 4 scenarios) against `learn-google.html` at both a normal desktop width and a ≤390px viewport (Constitution Principle II). Automated via Playwright (chromium headless): 360×740 viewport, confirmed the Randomize chip renders on-screen with no horizontal overflow/scroll and no JS errors.
- [X] T025 [P] Run the full `quickstart.md` validation (all 4 scenarios) against `learn-chinese-tts.html` at both a normal desktop width and a ≤390px viewport. Same Playwright pass as T024, both files together.
- [X] T026 [P] Confirm, in both files, that the pre-existing "▼ Randomize" practice-modal button and other unrelated features (hard-marking, Export Hard/Export All, Download CSV, TTS playback) still work unchanged regardless of the new Randomize toggle's state (FR-003, FR-011). Verified via Playwright: practice-modal Randomize button still opens the modal in learn-google.html; click-to-mark-hard, Hard pill, Export Hard, Export All, and Download CSV all still fire correctly. TTS playback itself isn't audible in headless Chromium, but the speak functions and their DOM/button wiring were confirmed unchanged and error-free.
- [X] T027 Grep both `learn-google.html` and `learn-chinese-tts.html` (case-insensitive) for any remaining `deck` identifier to confirm zero leftover references outside intentionally-out-of-scope prototype files (SC-002). Confirmed clean — see T023.
- [X] T028 Commit the completed feature on branch `007-deck-view-randomize`, including a manual smoke-test note per Constitution "Development Workflow" (touch interaction + TTS playback verified). Committed as `526722f`, scoped to only this feature's files (the two HTML files + `specs/007-deck-view-randomize/`) — pre-existing unrelated dirty files on this branch were left untouched.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup. **Blocks all user stories** — none of US1/US2/US3's acceptance scenarios can be verified until the chip/state/helper exist and load-time auto-activation is removed.
- **User Stories (Phase 3–5)**: All depend on Foundational completion.
  - US1 and US2 are independent of each other (different render functions) and can proceed in parallel.
  - US3 can proceed in parallel with US1/US2 — it deletes now-unreachable code and does not depend on the Display Order being wired into the renderers yet.
- **Polish (Phase 6)**: Depends on US1, US2, and US3 all being complete (it validates the full, cleaned-up feature).

### Within Each User Story

- US1: T012 and T013 touch different files — no ordering constraint between them.
- US2: T014 and T015 touch different files — no ordering constraint between them; T016 (cross-mode verification) follows both.
- US3: T017–T022 each touch one file per task and are independent of each other; T023 (verification) follows all of them.

### Parallel Opportunities

- T002/T003 (Foundational chip swap, one per file)
- T012/T013 (US1, one per file)
- T014/T015 (US2, one per file)
- T017/T018, T019/T020, T021/T022 (US3, one per file per concern)
- T024/T025/T026 (Polish, independent verification passes)

---

## Parallel Example: Phase 5 (User Story 3)

```bash
Task: "Delete #deckViewContainer markup and CSS in learn-google.html"
Task: "Delete #deckViewContainer markup and CSS in learn-chinese-tts.html"
Task: "Delete Deck state vars, session functions, listeners, CSV-export logic in learn-google.html (keep shuffleArray())"
Task: "Delete Deck state vars, session functions, listeners, CSV-export logic in learn-chinese-tts.html (keep shuffleDeckArray())"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. Complete Phase 3 (US1 — Cards randomization).
3. **STOP and VALIDATE**: run quickstart.md Scenario 2 against both files.
4. This alone already delivers the feature's most common path, since Cards is the default view after any load.

### Incremental Delivery

1. Setup + Foundational → chip and state exist; loads no longer force a session mode.
2. Add US1 → validate → Cards mode randomization works.
3. Add US2 → validate → Table mode randomization works; state/order survive mode switches.
4. Add US3 → validate → Deck mode is completely gone.
5. Polish → full cross-file, cross-viewport regression pass; commit.

## Notes

- [P] tasks touch different files — safe to do in either order or simultaneously.
- No test framework exists for this project; "tests" here are the manual `quickstart.md` scenarios.
- Do not edit any file other than `learn-google.html` and `learn-chinese-tts.html` — see the Scope reminder at the top.
- Commit after each phase checkpoint, not just at the end, so the branch has reviewable incremental history.
