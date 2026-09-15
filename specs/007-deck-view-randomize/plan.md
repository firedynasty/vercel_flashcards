# Implementation Plan: Randomize Toggle Replaces Deck Mode

**Branch**: `007-deck-view-randomize` | **Date**: 2026-09-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-deck-view-randomize/spec.md`

## Summary

Remove the "Deck" toggle-chip and its entire swipe/flip single-card session mode (progress bar, missed-card tracking, done-screen with CSV export) from `learn-google.html` and `learn-chinese-tts.html`. Replace the chip with a "Randomize" toggle-chip that shuffles the display order of whichever of the two remaining view modes (Cards or Table) is currently active, re-shuffling whenever the visible entry set changes and persisting the on/off state (but not the exact order) across mode switches within the session. Both files also currently auto-activate Deck mode after any new data load; that auto-activation is removed so a fresh load simply shows the already-selected Cards/Table view.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), embedded directly in static HTML — no compile step (Constitution Principle III).

**Primary Dependencies**: jQuery + DataTables (CDN, already loaded, powers Table mode's `#vocabDataTable`); no new dependencies introduced.

**Storage**: None for this feature. Randomize state is in-memory only (`var`/`let`), matching the existing non-persisted `tableViewOn`/`deckViewOn` pattern — no `localStorage` key is added.

**Testing**: No automated test harness exists for these files (manual smoke test per Constitution "Development Workflow"). Verification is manual: load a deck, exercise Cards/Table × Randomize on/off, confirm Deck UI is gone, confirm existing features (search, hard-marking, TTS, exports, Table keyboard nav) still work.

**Target Platform**: Static HTML pages served by Vercel; must remain usable at ≤390px width (Samsung Fold cover screen per Constitution Principle II) and on desktop.

**Project Type**: Client-side single-page tools (two independent static HTML files sharing a near-identical structure) — no `src/`/`backend`/`frontend` split; each file is edited in place.

**Performance Goals**: N/A beyond existing behavior — reshuffle is an O(n) array shuffle over already-in-memory arrays (`filteredVocab` / `filteredRows`), imperceptible at the vocabulary-list scale (tens to low hundreds of entries) these tools handle.

**Constraints**: Must preserve all non-ordering functionality listed in spec FR-011 unchanged; must not introduce a build step or external dependency; must keep `learn-google.html` and `learn-chinese-tts.html` behaviorally identical for this feature (spec FR-012); must not touch the unrelated pre-existing "▼ Randomize" practice-modal button (spec FR-003).

**Scale/Scope**: Two files, ~65–80 Deck-related symbol references each (chip, container, CSS, state vars, session functions, keyboard shortcuts, load-time auto-activation call sites) to remove; a small new toggle + shuffle-on-render addition in each.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Check | Result |
|---|---|---|
| I. Single-File, Universal Design | Feature touches `learn-google.html` and `learn-chinese-tts.html` directly (no new fork/copy created); `learn-chinese-tts.html` remains the canonical multi-language engine. | ✅ PASS |
| II. Mobile-First, Touch-Optimized UI | New "Randomize" chip reuses the existing `.toggle-chip` element/class (already touch-sized, already used for "Table"); no new gesture handling, no pinch-zoom/scroll interference introduced. Removing Deck also removes its swipe-gesture handling, which is a simplification, not a regression, for narrow viewports. | ✅ PASS |
| III. Vanilla HTML/JS Stack — No Build Pipeline | Pure in-place edits to existing static HTML/JS; no bundler, no TypeScript, no new CDN library. | ✅ PASS |
| IV. Content Pipeline: Python-Generated Data | Not applicable — this feature only reorders already-loaded in-memory rows for display; it does not touch data generation scripts or generated JS/JSON files. | ✅ N/A |
| V. Progressive Enhancement for External Integrations | No auth/network behavior changes; Randomize is a pure client-side, offline-capable UI toggle gated behind an explicit chip click, consistent with existing toggle pattern. | ✅ PASS |

No violations. Complexity Tracking table is not needed.

**Post-design re-check** (after Phase 1: data-model.md, quickstart.md): The design introduces no persisted storage, no new dependency, and no new file — it stays within the two existing HTML files using the existing `.toggle-chip` pattern and existing shuffle algorithm. All five gates above still hold unchanged.

## Project Structure

### Documentation (this feature)

```text
specs/007-deck-view-randomize/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md         # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit-tasks — not created by this command)
```

`contracts/` is omitted: this feature has no external interface (API, CLI, schema) — it is a purely internal client-side UI/state change within two static HTML pages, per the "skip if purely internal" guidance for Phase 1 contracts.

### Source Code (repository root)

```text
learn-google.html          # Edited in place: remove Deck chip/CSS/container/JS,
                            # add Randomize chip + shuffle-on-render logic
learn-chinese-tts.html     # Edited in place: same change, kept behaviorally
                            # identical to learn-google.html for this feature
```

No other files are touched. There is no `src/`, `backend/`, or `frontend/` split for this project — each HTML file is a self-contained page per Constitution Principle III, so "Option 1/2/3" project-structure templates do not apply.

**Structure Decision**: Single-file-per-page in-place edits to the two existing top-level HTML files listed above. No new files, no new directories, no reorganization.

## Complexity Tracking

*Not applicable — no Constitution Check violations.*
