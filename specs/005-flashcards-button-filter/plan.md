# Implementation Plan: Flashcards Button Filter

**Branch**: `005-flashcards-button-filter` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Add a live-filter search box above the `paste-btn` buttons in `flashcards.html` so
the user can type a name to show only matching buttons, with keyboard navigation and a clear
button.

## Summary

Two additions to `flashcards.html`:

1. **HTML**: A `<div id="btnFilterSection">` containing a text `<input id="btnFilterInput">`
   and a clear `<button id="btnFilterClear">×</button>`, inserted immediately before
   `#pasteToOutlineBtn`.

2. **JS + CSS**: Filter logic (hide/show `paste-btn` elements by label), keyboard navigation
   (focusedIndex state, ArrowDown/Enter/Escape), and a `.filter-focus` highlight class.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2020+

**New dependencies**: None

**Target Platform**: Mobile browser, Samsung Galaxy Z Fold cover screen (≥ 320 px)

**Constraints**:
- All changes in `flashcards.html` only
- No build pipeline
- Touch-first, ≥ 44 px tap targets
- Must NOT autofocus (breaks card navigation keyboard shortcuts)

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single-File, Universal Design | ✅ PASS | `flashcards.html` is not the canonical flashcard engine; Principle I applies only to `learn-chinese-tts.html` |
| II. Mobile-First, Touch-Optimized | ✅ PASS | Filter input + clear button ≥ 44 px; no scroll/pinch interference |
| III. Vanilla HTML/JS Stack | ✅ PASS | No new CDN deps; pure JS |
| IV. Content Pipeline | ✅ PASS | Not applicable (no data generation) |
| V. Progressive Enhancement | ✅ PASS | Without JS the buttons are still visible; filter is enhancement only |

## File Structure Changes

```text
flashcards.html   ← sole modified file
  │
  ├── CSS additions (~30 lines)
  │     #btnFilterSection styles (flex row, gap, margin)
  │     #btnFilterInput styles (flex:1, dark background to match page theme)
  │     #btnFilterClear styles (≥ 44 × 44 px, transparent bg)
  │     .filter-focus styles (outline/ring for keyboard-highlighted button)
  │     #btnFilterNoResults styles (hidden message)
  │
  ├── HTML additions (~8 lines)
  │     <div id="btnFilterSection"> before #pasteToOutlineBtn
  │       <input id="btnFilterInput" type="text" placeholder="Filter tools…">
  │       <button id="btnFilterClear" title="Clear filter">×</button>
  │     <div id="btnFilterNoResults" style="display:none">No matching tools</div>
  │
  └── JS additions (~70 lines, inside existing <script> block)
        filterButtons()            — hide/show paste-btn by label match
        clearFilter()              — reset input + restore all + refocus
        btnFilterFocusedIndex      — keyboard state
        getBtnFilterVisible()      — returns visible paste-btn NodeList
        clearBtnFilterHighlight()  — remove .filter-focus from all
        setBtnFilterFocus(i)       — set .filter-focus on item[i], scrollIntoView
        activateBtnFilterItem()    — trigger click on focused button
        Event listeners:
          #btnFilterInput  → input: filterButtons + reset focusedIndex
          #btnFilterInput  → keydown: Enter/ArrowDown → setBtnFilterFocus(0)
          #btnFilterClear  → click: clearFilter()
          document         → keydown: Escape → clearFilter(),
                                       ArrowDown/Up/Enter → navigate list
```

## Implementation Strategy

### MVP order

1. CSS: `#btnFilterSection`, `#btnFilterInput`, `#btnFilterClear`, `.filter-focus`,
   `#btnFilterNoResults`
2. HTML: `<div id="btnFilterSection">` + `#btnFilterNoResults` before `#pasteToOutlineBtn`
3. JS: `filterButtons()` + `clearFilter()` + `#btnFilterInput input` listener +
   `#btnFilterClear click` listener
4. JS: keyboard navigation state + `getBtnFilterVisible()` + `clearBtnFilterHighlight()` +
   `setBtnFilterFocus(i)` + `activateBtnFilterItem()` + keydown listeners

### Risky areas

- **Escape key conflict**: The main card UI may use Escape. The keydown listener must only
  clear/refocus the filter when the filter has an active query or the focused index is set,
  not unconditionally, to avoid hijacking Escape from other uses.
- **Button activation**: `paste-btn` buttons use a mix of `onclick` attributes and JS event
  listeners. `button.click()` dispatches a native click event that triggers both — safe.
- **"No results" state**: Must hide the message when query is empty (all buttons visible).
