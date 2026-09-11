# Research: Flashcards Button Filter

**Feature**: 005-flashcards-button-filter
**Date**: 2026-09-10

---

## Decision 1: Matching strategy

**Decision**: Case-insensitive substring match against `button.textContent.trim()`.

**Rationale**: The button labels are short (1–3 words). Substring matching means typing "tts"
finds "Chinese TTS", "French TTS", "Korean TTS". Fuzzy matching adds complexity with no benefit
at this scale (~20 buttons).

**Alternatives considered**:
- Prefix-only match — too strict; typing "tts" would miss all TTS buttons since they start with
  a language name.
- Fuzzy (Levenshtein) — overkill; mistyping "gooble" returning "Google" is not a use case here.

---

## Decision 2: Reference implementation

**Decision**: Adapt the pattern from `/Users/stanleytan/Downloads/accordion-music-player/dist/`
for the filter + keyboard navigation, but strip the virtual keyboard and accordion markup.

**Rationale**: The reference already solves:
- Live filter on `input` event
- `focusedIndex` state variable for keyboard highlight
- Enter/ArrowDown from search box → first visible item
- ArrowUp/ArrowDown cycling with wrap-around
- Escape → clear + refocus search

**What is NOT carried over**:
- Virtual on-screen keyboard (not needed; native mobile keyboard is sufficient)
- jQuery or CDN deps (reference uses jQuery; this project uses none)
- Accordion/`<ul>` structure (buttons stay as flat buttons, not list items)

---

## Decision 3: DOM approach — hide/show vs. rebuild

**Decision**: Hide/show with `element.style.display` — do not remove or re-create button elements.

**Rationale**: The buttons have `onclick` attributes and event listeners wired in separate JS
blocks. Removing and re-adding them would require re-wiring all handlers. `display:none` is safe
and reversible.

---

## Decision 4: Keyboard highlight styling

**Decision**: Add a `.filter-focus` CSS class (ring/outline) to the highlighted button; remove it
when focus moves or is cleared.

**Rationale**: Using the native `:focus` pseudo-class would require programmatically calling
`button.focus()`, which on mobile can trigger scroll jumps. A CSS class applied by JS gives the
same visual affordance without the scroll side-effect.

---

## Decision 5: Autofocus

**Decision**: Do NOT autofocus the filter input on page load.

**Rationale**: `flashcards.html` already uses keyboard shortcuts (left/right arrow for card
navigation, number keys for ratings). Autofocusing the filter would capture those keystrokes and
break card navigation for users who don't intend to filter.

---

## Decision 6: Placement

**Decision**: Filter widget inserted immediately before the first `paste-btn` button (the
`#pasteToOutlineBtn`). Wrapped in a `<div id="btnFilterSection">`.

**Rationale**: The `paste-btn` buttons form a natural group at the bottom of `main-content`. The
filter widget acts as a header for that group. Placing it above the first button is the most
discoverable position without moving existing UI.
