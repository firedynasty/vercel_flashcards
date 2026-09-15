# Feature Specification: Randomize Toggle Replaces Deck Mode

**Feature Branch**: `007-deck-view-randomize`

**Created**: 2026-09-14

**Status**: Draft

**Input**: User description: "so <Deck toggle-chip> I want to remove this modal / mode and replace it with randomize so depending on the table toggle whether they become cards or a table mode that the rows get randomized downwards in learn-google and learn-chinese-tts"

## User Scenarios & Testing *(mandatory)*

<!--
  Context established during clarification: both `learn-google.html` and
  `learn-chinese-tts.html` already have three view modes today — a plain
  card list (Cards, on by default), a Table view, and a separate "Deck"
  session mode (one card at a time, flip-to-reveal, progress bar,
  missed-card tracking, and a done-screen with CSV export of missed/
  remaining cards). Loading a new set of cards currently auto-activates
  Deck mode in both files. This feature removes Deck mode entirely
  (chip, container, session logic, done-screen, CSV export of missed/
  remaining) and replaces the "Deck" chip with a "Randomize" chip that
  shuffles the row/card order of whichever mode (Cards or Table) is
  currently active.
-->

### User Story 1 - Shuffle order in Cards mode (Priority: P1)

A user studying a loaded deck in the default Cards view wants to review terms in a random order instead of the fixed source order, without leaving the plain card list or entering any separate session/modal.

**Why this priority**: This is the direct replacement for the removed Deck mode's core value (studying in non-sequential order) and is the most common way users currently reach Deck mode (it's the default view a new set of cards ends up in today).

**Independent Test**: Load a set of cards, confirm Cards mode is showing in its normal source order, click the "Randomize" chip, and confirm the same cards re-render in a different order in the same Cards view (no modal, no separate screen).

**Acceptance Scenarios**:

1. **Given** a loaded deck displayed in Cards mode with Randomize off, **When** the user turns Randomize on, **Then** the cards re-render in-place in a shuffled order (not the original source order, assuming more than 1 card).
2. **Given** Cards mode with Randomize on, **When** the user turns Randomize off, **Then** the cards re-render in-place back in the original source order.
3. **Given** Randomize is on in Cards mode, **When** the user searches/filters the card list, **Then** the filtered subset is also shown in shuffled order.

---

### User Story 2 - Shuffle rows in Table mode (Priority: P1)

A user viewing their vocabulary as a table wants the rows presented in random order for quiz-style review, while keeping the table's other functionality (search, keyboard row navigation, play button) intact.

**Why this priority**: Equal in value to User Story 1 — the user's request explicitly ties randomization to "whichever mode" (table or cards) is active, and Table is one of only two remaining view modes once Deck is removed.

**Independent Test**: Switch to Table mode, click "Randomize", and confirm the table rebuilds with rows in a different order while search/filter and row navigation continue to work.

**Acceptance Scenarios**:

1. **Given** Table mode is active with Randomize off, **When** the user turns Randomize on, **Then** the table rebuilds with rows in a shuffled order.
2. **Given** Table mode with Randomize on, **When** the user turns Randomize off, **Then** the table rebuilds with rows back in the original order.
3. **Given** Randomize is on, **When** the user switches from Table to Cards mode (or back), **Then** the Randomize chip's on/off state is preserved across the switch and the newly-shown mode also reflects a shuffled order.

---

### User Story 3 - Deck mode and its screens are fully removed (Priority: P1)

A user (or developer) inspecting either app no longer encounters the "Deck" chip, the swipe/flip card session, its progress bar, missed-card tracking, or the done-screen with CSV export of missed/remaining cards — those are gone, not just hidden or renamed.

**Why this priority**: The user explicitly asked to remove the mode, not to keep it and add a new option alongside it. Leaving dead UI or dead code behind would contradict the request and add confusion (e.g., two competing "shuffle" affordances).

**Independent Test**: Search the running page and its source for the removed Deck-specific controls/screens; confirm none render or remain reachable, and confirm loading a new set of cards no longer auto-launches any session-style mode — it lands directly in whichever plain view (Cards or Table) was already selected.

**Acceptance Scenarios**:

1. **Given** either app freshly loaded, **When** the user loads a new set of cards (paste CSV, file upload, Google Sheet, or Supabase deck), **Then** the app shows the Cards or Table view (whichever was last selected) directly, with no intermediate swipe/session screen.
2. **Given** the control bar, **When** the user looks for view controls, **Then** they see exactly "Table" and "Randomize" chips (no "Deck" chip).
3. **Given** the app in any state, **When** the user presses the keyboard shortcuts previously reserved for Deck-mode grading/flipping, **Then** those shortcuts no longer have Deck-specific behavior (they either do nothing or fall through to other existing shortcuts).

---

### Edge Cases

- What happens when Randomize is turned on with 0 or 1 cards loaded? The view should render normally with no error (a shuffle of 0 or 1 items is a no-op).
- What happens when Randomize is on and the user loads a brand-new set of cards (replacing the current one)? The Randomize toggle state carries over, and the new set is shown pre-shuffled if Randomize is still on.
- What happens when Randomize is on and the user changes the search/filter text? The filtered subset re-renders in shuffled order (order is recomputed for the current filtered set, not merely re-using stale index positions from the previous, larger set).
- What happens to the "current row/card" keyboard-navigation highlight (used to move up/down and play audio) when order is shuffled? It continues to work against display order, not original source order.
- The existing "▼ Randomize" button that opens the practice quiz modal (a distinct, pre-existing feature unrelated to this chip) is unaffected and keeps its current label and behavior; it is visually and functionally distinct from the new "Randomize" toggle-chip in the control bar.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST remove the "Deck" toggle-chip and all Deck-mode UI (the swipe/flip single-card session, its progress bar, missed-card tracking, and its done-screen with CSV export of missed/remaining cards) from both `learn-google.html` and `learn-chinese-tts.html`.
- **FR-002**: System MUST add a "Randomize" toggle-chip in the control bar of both files, in the same position previously occupied by the "Deck" chip, styled consistently with the existing "Table" toggle-chip (on/off visual state).
- **FR-003**: System MUST NOT alter the existing "▼ Randomize" practice-modal button in `learn-google.html` (or its equivalent) — it remains a separate, unrelated control.
- **FR-004**: When the Randomize toggle is off, both view modes (Cards and Table) MUST display entries in their original, unshuffled source order (current default behavior).
- **FR-005**: When the Randomize toggle is on, whichever view mode (Cards or Table) is currently active MUST display entries in a shuffled order.
- **FR-006**: Toggling Randomize on/off MUST re-render the currently active view immediately, without requiring the user to also toggle Table/Cards.
- **FR-007**: Switching between Cards and Table mode MUST preserve the current Randomize on/off state; if Randomize is on, the newly-shown mode MUST also present entries in shuffled order.
- **FR-008**: The shuffle order MUST be recomputed whenever the underlying set of visible entries changes (new data loaded, or the search/filter narrows or widens the set) while Randomize is on. Simply switching between Cards and Table mode with the same filtered set MUST NOT by itself force a new shuffle.
- **FR-009**: System MUST NOT auto-activate any session-style mode when new data is loaded (paste CSV, file upload, Google Sheets, Supabase deck, or embedded/baked data); after load, the app MUST show whichever of Cards or Table was already selected, honoring the current Randomize state per FR-008.
- **FR-010**: System MUST remove Deck-specific keyboard shortcuts (flip/grade-left/grade-right) from both files; remaining shortcuts (e.g., Table row navigation, play/stop) MUST continue to function unchanged.
- **FR-011**: Existing per-entry functionality that is independent of view mode or ordering (search/filter, hard-marking, TTS playback, Export Hard, Export All, Download CSV, Table row keyboard navigation) MUST continue to work unchanged whether Randomize is on or off.
- **FR-012**: The Randomize toggle MUST behave identically (same control placement, same shuffle/restore semantics) in both `learn-google.html` and `learn-chinese-tts.html`.
- **FR-013**: Randomize state MUST NOT persist across a page reload (it resets to off on load), consistent with the current non-persisted behavior of the Table toggle.

### Key Entities

- **View Mode**: Which of the two remaining display modes (Cards, Table) is currently shown. Mutually exclusive; selected via the existing "Table" toggle-chip (Cards is the mode shown when Table is off).
- **Randomize State**: A single on/off flag, independent of View Mode, controlling whether the currently visible entries are displayed in shuffled or original order. Not persisted across reloads.
- **Vocabulary Entry (Card/Row)**: A single term/definition pair currently visible under the active search/filter; the unit that gets reordered when Randomize is on.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In both files, turning Randomize on changes the visible order of a multi-entry set in a single click, with no intermediate screen, modal, or session appearing.
- **SC-002**: No Deck-specific control, container, or screen (chip, swipe card, progress bar, missed-card tracker, done-screen, CSV-export-of-missed button) is present or reachable in either file after the change.
- **SC-003**: Loading a new set of cards in either file lands the user directly in the Cards or Table view (whichever was already active) 100% of the time, with zero forced transitions into any removed session mode.
- **SC-004**: All non-ordering functionality present before this change (search/filter, hard-marking, TTS playback, exports, Table keyboard navigation) is verified to still work, unchanged, in both Randomize-on and Randomize-off states.
- **SC-005**: The Randomize control and its behavior are identical between `learn-google.html` and `learn-chinese-tts.html` when compared side by side.

## Assumptions

- "Cards" mode in each file refers to its existing plain, non-session card list — `cardsArea`/card-grid in `learn-google.html` and the `linesContainer`/`.vocab-card` list (currently rendered by the lyrics/lines renderer) in `learn-chinese-tts.html` — confirmed by the user as the correct target, not a new UI to be built.
- Deck mode's session-only features (progress/cleared count, missed-card set, done-screen, "Copy missed CSV" / "Copy missed + remaining" export) are intentionally dropped, not relocated elsewhere; the user's request to "remove this modal/mode" is treated as a full removal, not a preservation-plus-toggle request.
- The existing "▼ Randomize" practice-modal button (`openPracticeModal(true)`) is a separate, pre-existing feature (a quiz-style practice flow) and is out of scope for this change; its shared label with the new toggle-chip is a naming coincidence the user did not ask to resolve, so both are left to coexist under their current/new names.
- Re-clicking Randomize while it is already on does not force an additional re-shuffle by itself (toggle semantics only); a user who wants a fresh shuffle can toggle it off and back on, or change the search/filter (which does force a re-shuffle per FR-008).
- No new persistence (e.g., localStorage) is introduced for Randomize state, matching the current non-persisted Table/Deck toggle behavior.
- This change is scoped to `learn-google.html` and `learn-chinese-tts.html` only; other experiment/prototype files (e.g., `learn-chinese-tts_sentences.html`) are not in scope.
