# Specification: Flashcards Button Filter

**Feature**: Searchable filter for the tool-launcher buttons in `flashcards.html`
**Created**: 2026-09-10
**Priority**: P1

---

## Problem Statement

`flashcards.html` has a growing list of tool-launcher buttons at the bottom of the page. Users
must scroll to find the right button. There is currently no way to quickly jump to a tool by name.

---

## User Stories

### US1 — Filter buttons by name (P1)

As a user on a mobile device with many tool buttons,
I want to type part of a button's name into a search box
so that only matching buttons are shown and I can tap one without scrolling.

**Acceptance Criteria**:
- A text input appears above the tool-launcher buttons.
- Typing filters the visible buttons in real time (case-insensitive substring match on button label).
- Buttons that do not match the current query are hidden; matching buttons remain visible.
- Clearing the input restores all buttons.
- A "no results" message is shown when the query matches nothing.

### US2 — Keyboard navigation through filtered results (P2)

As a user on a physical keyboard,
I want to press Enter or ArrowDown from the search box to move focus to the first matching button,
and use ArrowUp/ArrowDown/Enter to navigate and activate it,
so that I never need to reach for the mouse.

**Acceptance Criteria**:
- Enter or ArrowDown while the search box is focused moves highlight to the first visible button.
- ArrowUp / ArrowDown cycle through visible buttons, wrapping at the ends.
- Enter on a highlighted button activates it (same as tapping/clicking).
- Escape clears the search box and returns focus to it.

### US3 — Clear button (P2)

As a user,
I want a visible clear (×) control next to the search box
so that I can erase the filter with a single tap on mobile without selecting all text manually.

**Acceptance Criteria**:
- A clear button appears next to the search input.
- Tapping it empties the input and restores all buttons.
- The clear button is ≥ 44 × 44 px tap target.

---

## Functional Requirements

1. The filter widget is placed immediately above the first `paste-btn` button in `flashcards.html`.
2. The widget contains: a text input (autofocused? no — autofocus breaks the main flashcard UX)
   and a clear button.
3. Matching is case-insensitive and substring-based against the button's visible label text.
4. Hidden buttons retain their DOM position; they are not removed or reordered.
5. Keyboard navigation tracks a "focused index" over currently-visible buttons. Activating a button
   triggers its existing `onclick` handler or click event.
6. On Escape: clear query, remove keyboard highlight, return focus to input.
7. The widget is visible at all times, not behind a toggle.

---

## Out of Scope

- Fuzzy matching or ranked results.
- Reordering buttons based on search relevance.
- Persistence of last search query.
- Adding or removing buttons from the list (that's a separate concern).

---

## Success Criteria

1. User can locate any button in ≤ 3 keystrokes on average (measured by the number of characters
   needed to produce a unique match for each button label).
2. Filter response is immediate — no perceptible lag on mobile after each keystroke.
3. The widget does not disrupt the existing flashcard UX above it (no layout shift, no autofocus
   stealing keyboard from card navigation).
4. All tap targets ≥ 44 × 44 px on a 390 px viewport.

---

## Assumptions

- The list of buttons is static (defined in HTML); no dynamic button injection is expected during
  a session.
- The physical keyboard shortcut path (US2) is secondary to touch on mobile; it is a
  progressive enhancement, not a blocking requirement.

---

## Dependencies

- `flashcards.html` — sole modified file.
- No external libraries required; the filter is implemented in vanilla JS.
