# Phase 0 Research: Randomize Toggle Replaces Deck Mode

No items in Technical Context were marked `NEEDS CLARIFICATION` — this is a small, self-contained UI change to two existing static files, and the codebase itself is the primary source of "best practice" (match existing patterns exactly rather than introduce new ones). The research below documents the decisions made by reading the current implementation, so `/speckit-tasks` and implementation can proceed without re-deriving them.

## Decision: Reuse the existing shuffle algorithm, don't write a new one

- **Decision**: Keep the existing Fisher–Yates `shuffleArray()` (learn-google.html) / `shuffleDeckArray()` (learn-chinese-tts.html) implementation, repurposed to shuffle the array of *display indices* for the active render, rather than deck-queue indices.
- **Rationale**: Both files already ship a correct, unbiased in-place shuffle used by Deck mode. Reusing it avoids introducing a second shuffle implementation or a dependency, and keeps the two files behaviorally identical (spec FR-012).
- **Alternatives considered**: Sorting by `Math.random()` comparator — rejected, it's a well-known biased/non-uniform shuffle anti-pattern. A new shared utility file — rejected, violates Constitution Principle III (no build step / no cross-file JS module system in play; each HTML file is self-contained).

## Decision: Where to hook the shuffle into the render pipeline

- **Decision**: Introduce a single `randomizeOn` boolean (parallel to `tableViewOn`) and a small helper (e.g., `getDisplayOrder(list)`) that returns either the identity order or a shuffled order of indices into the already-filtered array (`filteredVocab` in learn-google.html, `filteredRows` in learn-chinese-tts.html). Both render functions for the two remaining views — `renderCards()` / `renderTableView()` in learn-google.html, and the lyrics/lines renderer / `renderTableView()` in learn-chinese-tts.html — consume this helper instead of iterating the filtered array directly.
- **Rationale**: `filterAndRender()` (learn-google.html) and `refreshRows()` (learn-chinese-tts.html) are the single choke points already called on load, search/filter change, and view-toggle; hooking the shuffle here automatically satisfies spec FR-008 (reshuffle when the visible set changes) and FR-006/FR-007 (immediate re-render on toggle, state preserved across Cards/Table switch) without duplicating logic per view.
- **Alternatives considered**: Mutating `filteredVocab`/`filteredRows` in place — rejected, several other functions (hard-marking, exports, keyboard nav-by-index, missed-CSV logic that is itself being removed) index into these arrays by original position; shuffling a *display order* array instead of the source array keeps all of that addressing intact.
- **Cache/recompute rule**: Recompute the shuffled order whenever `filterAndRender()`/`refreshRows()` runs while `randomizeOn` is true (covers new data load and filter/search changes — FR-008/FR-009). Do **not** recompute merely on a Cards↔Table toggle click (FR-007); the toggle handlers should reuse the last-computed order.

## Decision: Full removal of Deck mode, not a feature-flagged hide

- **Decision**: Delete the Deck chip markup, `#deckViewContainer` and its children, associated CSS, state variables (`deckViewOn`, `deckQueue`, `deckTotal`, `deckCleared`, `deckCurrent`, `deckFlipped`, `deckMissedSet`), and functions (`activateDeckView`, `toggleDeckView` → replaced by the new randomize toggle handler, `startDeckSession`, `deckNextCard`, `deckFinish`, `deckFlipCard`, `deckGrade`, `deckUpdateProgress`, related event listeners, and the Deck-specific keyboard-shortcut block) rather than hiding them behind a flag.
- **Rationale**: Spec explicitly requires full removal (User Story 3), including the missed-card CSV export screen; leaving dead code/markup behind risks confusing future edits and contradicts "remove this modal/mode."
- **Alternatives considered**: Keep the code but unreachable (e.g., delete only the chip) — rejected per explicit spec requirement (SC-002 requires zero residual Deck controls/containers/screens).

## Decision: Remove auto-activation of Deck after data load, don't replace with auto-Randomize

- **Decision**: Delete the `activateDeckView()` calls (learn-google.html, 2 call sites) and `if (!deckViewOn) toggleDeckView();` fallback calls (learn-chinese-tts.html, 4 call sites) that currently run after every data-load path (paste CSV, drag/drop file, Google Sheets load, Supabase deck load, embedded/baked data). After removal, a fresh load simply leaves whichever of Cards/Table was already the active mode showing (Cards by default, since it's the base state before any toggle).
- **Rationale**: Spec FR-009 requires no session-style mode auto-activates on load. Auto-turning-on Randomize instead was considered but rejected — spec FR-013 keeps Randomize off-by-default and non-persisted, and auto-enabling it on every load would be a surprising, unrequested behavior change beyond "remove Deck."
- **Alternatives considered**: Auto-enable Randomize on load — rejected as out of scope/surprising; leave the auto-activation calls pointing at a no-op — rejected, dead calls are confusing and violate the same "full removal" rationale above.

## Decision: Leave the pre-existing "▼ Randomize" practice-modal button untouched

- **Decision**: `openPracticeModal(true)` (the existing try-btn labeled "▼ Randomize" that opens the quiz-style practice modal) is left exactly as-is — same label, same behavior, same code path.
- **Rationale**: Confirmed as out of scope in spec (FR-003, Assumptions) — it is a separate, pre-existing feature unrelated to view-mode ordering. Renaming or merging it was not requested and would expand scope.
- **Alternatives considered**: Renaming the new toggle-chip to avoid the label collision (e.g., "Shuffle") — rejected; the spec and user request specifically call the new control "Randomize," and the two controls are visually distinct (a `.toggle-chip` vs a `.try-btn`), so the coincidental shared label is accepted as a documented assumption rather than a reason to deviate from the requested name.

## Decision: Keyboard shortcuts

- **Decision**: Remove the Deck-specific keydown block (`if (deckViewOn && deckCurrent !== null) { ... ArrowLeft/ArrowRight/Space/ArrowUp ... }`) in both files. No new keyboard shortcut is added for Randomize (it remains click-only on the chip, consistent with the "Table" chip having no dedicated shortcut either).
- **Rationale**: Spec FR-010 requires removal; no acceptance scenario or success criterion calls for a new shortcut, so adding one would be unrequested scope.
