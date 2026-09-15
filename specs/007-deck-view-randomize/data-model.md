# Phase 1 Data Model: Randomize Toggle Replaces Deck Mode

This feature has no persisted data model — no database, no generated JS/JSON data file, no schema change. The "entities" below are in-memory client-side state, kept identical in shape between `learn-google.html` and `learn-chinese-tts.html` per spec FR-012 (the underlying array/variable names already differ slightly between the two files today — `filteredVocab` vs `filteredRows` — and this feature does not need to unify those names, only their behavior).

## Entities

### View Mode
- **Represents**: Which of the two remaining display modes is currently shown.
- **Values**: `Table` | `Cards` (mutually exclusive).
- **Existing field**: `tableViewOn` (boolean; `true` = Table, `false` = Cards). No new field needed — Deck's separate `deckViewOn` boolean is deleted, not replaced by a third state, since Cards/Table remain the only two view modes.
- **Relationships**: Selected via the existing "Table" toggle-chip; independent of Randomize State.

### Randomize State
- **Represents**: Whether the currently visible entries are shown in shuffled or original order.
- **New field**: `randomizeOn` (boolean, default `false`), added alongside `tableViewOn`, replacing `deckViewOn` in the control-bar toggle-chip pair.
- **Lifecycle**:
  - Set by the new toggle-chip's click handler (mirrors `toggleTableView()`'s structure).
  - Not persisted (no `localStorage` key) — resets to `false` on page load, matching current `tableViewOn`/`deckViewOn` behavior (spec FR-013).
  - Read by the render pipeline (`filterAndRender()` / `refreshRows()`) to decide whether to compute a shuffled display order.
- **Relationships**: Independent of View Mode; applies to whichever mode is active (spec FR-005, FR-007).

### Display Order
- **Represents**: The derived sequence in which currently-visible Vocabulary Entries are rendered.
- **Shape**: An array of indices into the current filtered array (`filteredVocab` / `filteredRows`), either the identity sequence `[0, 1, 2, ...]` (Randomize off) or a Fisher–Yates shuffle of that sequence (Randomize on).
- **Lifecycle**: Recomputed whenever `filterAndRender()` / `refreshRows()` runs while `randomizeOn` is `true` (new data load, search/filter change — spec FR-008). Reused as-is across a Cards↔Table toggle click (spec FR-007) so switching views doesn't itself trigger a new shuffle.
- **Relationships**: Derived from Vocabulary Entry + Randomize State; not stored per-entry, recomputed as a whole array.

### Vocabulary Entry (Card/Row)
- **Represents**: A single term/definition pair (learn-google.html) or lyric/vocab line (learn-chinese-tts.html) currently visible under the active search/filter.
- **Existing shape**: Unchanged by this feature — `{ term, definition, section, idx }` (learn-google.html) / row objects with `chinese`/`romanization`/`english`/`sectionHeader`/`contextLine` (learn-chinese-tts.html).
- **Relationships**: Addressed by original array position from other features that must keep working unchanged per spec FR-011 (hard-marking, Export Hard/All, Table row keyboard navigation, TTS). Display Order only changes *render sequence*, never the entry's original index or its other stored state (score, hard-mark, etc.) — this is why Display Order is a separate index array rather than a reordering of the source arrays themselves (see research.md "Where to hook the shuffle").

## Removed State (Deck Mode)

The following existing in-memory state is deleted entirely, not migrated (spec User Story 3 / SC-002):

- `deckViewOn`, `deckQueue`, `deckTotal`, `deckCleared`, `deckCurrent`, `deckFlipped`, `deckMissedSet` (learn-google.html and their learn-chinese-tts.html equivalents).

No replacement field carries these forward — Randomize State and Display Order (above) are the entire footprint of the new behavior.

## State Transitions

```
Page load
  └─ tableViewOn = false (Cards default) [or true, per file's existing default]
  └─ randomizeOn = false
  └─ Display Order = identity

Click "Table" chip
  └─ tableViewOn flips; Randomize State unchanged; Display Order reused (not recomputed)
  └─ active view re-renders using existing Display Order

Click "Randomize" chip
  └─ randomizeOn flips
  └─ if turning ON: Display Order = shuffle(identity order of current filtered entries)
  └─ if turning OFF: Display Order = identity order
  └─ active view (Cards or Table, whichever is on) re-renders immediately with new Display Order

Search/filter changes, or new data loaded
  └─ filtered entry set recomputed
  └─ if randomizeOn: Display Order = fresh shuffle of the new filtered set
  └─ else: Display Order = identity order of the new filtered set
  └─ active view re-renders (no auto-switch to any session mode — Deck removed)
```
