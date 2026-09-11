# Tasks: Flashcards Button Filter

**Input**: Design documents from `specs/005-flashcards-button-filter/`

**File modified**: `flashcards.html` (sole modified file — all tasks target this file)

## Phase 1: Setup

**Purpose**: Identify exact DOM insertion point before writing any code.

- [x] T001 Read `flashcards.html` lines 955–985 to confirm the exact position of `#pasteToOutlineBtn` and the surrounding HTML structure, and note the line number where the filter widget and `#btnFilterNoResults` div will be inserted.

---

## Phase 2: Foundational — CSS (blocks all user stories)

**Purpose**: All CSS needed by the filter widget, keyboard highlight, and no-results message must
exist before any HTML or JS is added.

- [x] T002 Add the following CSS rules to the `<style>` block in `flashcards.html` (insert after the existing `.paste-btn:hover` rule):

  ```css
  /* ── Button filter widget ── */
  #btnFilterSection {
    display: flex;
    align-items: center;
    gap: 6px;
    margin: 12px 0 6px;
    width: 100%;
    max-width: 600px;
  }
  #btnFilterInput {
    flex: 1;
    padding: 10px 12px;
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    color: #fff;
    font-size: 0.95rem;
    font-family: inherit;
    min-height: 44px;
    box-sizing: border-box;
  }
  #btnFilterInput::placeholder { color: rgba(255,255,255,0.4); }
  #btnFilterInput:focus { outline: 2px solid #60a5fa; border-color: transparent; }
  #btnFilterClear {
    min-width: 44px;
    min-height: 44px;
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 8px;
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.7);
    font-size: 1.2rem;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  #btnFilterClear:hover { background: rgba(255,255,255,0.2); color: #fff; }
  #btnFilterNoResults {
    display: none;
    color: rgba(255,255,255,0.5);
    font-size: 0.85rem;
    margin: 4px 0 8px;
    font-style: italic;
  }
  .filter-focus {
    outline: 2px solid #60a5fa !important;
    outline-offset: 2px;
  }
  ```

---

## Phase 3: User Story 1 — Live filter by name (Priority: P1) 🎯 MVP

**Goal**: Typing in the filter input hides non-matching buttons and shows a "no results" message
when nothing matches.

**Independent Test**: Quickstart Scenarios 1, 2, 3, 4, 5.

- [x] T003 [US1] Add the filter widget HTML to `flashcards.html` immediately before the `<button class="paste-btn" id="pasteToOutlineBtn"` line:

  ```html
  <div id="btnFilterSection">
    <input id="btnFilterInput" type="text" placeholder="Filter tools…" autocomplete="off">
    <button id="btnFilterClear" title="Clear filter" aria-label="Clear filter">&#10005;</button>
  </div>
  <div id="btnFilterNoResults">No matching tools</div>
  ```

- [x] T004 [US1] Add `filterButtons()` and `clearFilter()` functions to the `<script>` block in `flashcards.html` (add near the bottom of the script, before the closing `</script>` tag):

  ```javascript
  /* ── Button filter ── */
  function filterButtons() {
    var query = document.getElementById('btnFilterInput').value.trim().toLowerCase();
    var buttons = document.querySelectorAll('.paste-btn');
    var anyVisible = false;
    buttons.forEach(function(btn) {
      var label = btn.textContent.trim().toLowerCase();
      var match = !query || label.includes(query);
      btn.style.display = match ? '' : 'none';
      if (match) anyVisible = true;
    });
    document.getElementById('btnFilterNoResults').style.display =
      (query && !anyVisible) ? '' : 'none';
    _btnFilterFocusedIndex = -1;
    _clearBtnFilterHighlight();
  }
  function clearFilter() {
    document.getElementById('btnFilterInput').value = '';
    filterButtons();
    document.getElementById('btnFilterInput').focus();
  }
  ```

- [x] T005 [US1] Wire `#btnFilterInput` and `#btnFilterClear` event listeners in `flashcards.html`. Add the following block at the bottom of the script (after `filterButtons`/`clearFilter` definitions):

  ```javascript
  (function() {
    var inp = document.getElementById('btnFilterInput');
    var clr = document.getElementById('btnFilterClear');
    if (inp) inp.addEventListener('input', filterButtons);
    if (clr) clr.addEventListener('click', clearFilter);
  })();
  ```

---

## Phase 4: User Story 2 — Keyboard navigation (Priority: P2)

**Goal**: Enter/ArrowDown from the search box highlights the first visible button; ArrowUp/Down
cycles; Enter activates; Escape clears.

**Independent Test**: Quickstart Scenarios 6, 7, 8, 9, 10.

- [x] T006 [US2] Add keyboard-navigation state and helpers to the `<script>` block in `flashcards.html` (add immediately after `clearFilter()`):

  ```javascript
  var _btnFilterFocusedIndex = -1;
  function _getBtnFilterVisible() {
    return Array.from(document.querySelectorAll('.paste-btn'))
      .filter(function(b) { return b.style.display !== 'none'; });
  }
  function _clearBtnFilterHighlight() {
    document.querySelectorAll('.paste-btn.filter-focus').forEach(function(b) {
      b.classList.remove('filter-focus');
    });
  }
  function _setBtnFilterFocus(index) {
    var items = _getBtnFilterVisible();
    if (!items.length) return;
    _clearBtnFilterHighlight();
    _btnFilterFocusedIndex = Math.max(0, Math.min(index, items.length - 1));
    var target = items[_btnFilterFocusedIndex];
    target.classList.add('filter-focus');
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function _activateBtnFilterItem() {
    var items = _getBtnFilterVisible();
    if (_btnFilterFocusedIndex < 0 || _btnFilterFocusedIndex >= items.length) return;
    items[_btnFilterFocusedIndex].click();
  }
  ```

- [x] T007 [US2] Add keydown listeners for the filter input and document in `flashcards.html`. Append inside the existing IIFE from T005 (or add a new IIFE directly after it):

  ```javascript
  (function() {
    var inp = document.getElementById('btnFilterInput');
    if (!inp) return;

    // Enter / ArrowDown from input → jump into list
    inp.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        e.preventDefault();
        e.stopPropagation();
        var items = _getBtnFilterVisible();
        if (items.length) {
          _setBtnFilterFocus(0);
          inp.blur();
        }
      }
    });

    // Global keydown for list navigation and Escape
    document.addEventListener('keydown', function(e) {
      // Escape: only intercept when filter has content or a button is highlighted
      if (e.key === 'Escape') {
        var hasQuery = inp.value.trim().length > 0;
        var hasHighlight = _btnFilterFocusedIndex >= 0;
        if (hasQuery || hasHighlight) {
          e.preventDefault();
          clearFilter();
          _btnFilterFocusedIndex = -1;
        }
        return;
      }
      // Arrow/Enter navigation: only when not typing in the filter input
      if (document.activeElement === inp) return;
      if (_btnFilterFocusedIndex < 0) return;
      var items = _getBtnFilterVisible();
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        _setBtnFilterFocus(
          _btnFilterFocusedIndex + 1 >= items.length ? 0 : _btnFilterFocusedIndex + 1
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        _setBtnFilterFocus(
          _btnFilterFocusedIndex - 1 < 0 ? items.length - 1 : _btnFilterFocusedIndex - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        _activateBtnFilterItem();
      }
    });
  })();
  ```

---

## Phase 5: Polish

- [x] T008 Verify in `flashcards.html` that `#btnFilterClear` has `min-width: 44px` and
  `min-height: 44px` in the CSS from T002, and that `.filter-focus` provides a clearly visible
  ring on the dark background (`outline: 2px solid #60a5fa`). Confirm `#btnFilterSection` has
  `max-width: 600px` so it aligns with the card area on wider screens.

---

## Phase 6: Validation

- [ ] T009 Open `flashcards.html` in a browser, scroll to the filter widget, and complete all
  10 scenarios in `specs/005-flashcards-button-filter/quickstart.md`. Record pass/fail next to
  each Scenario heading. Confirm: (a) filter hides/shows buttons in real time; (b) no-results
  message appears when nothing matches; (c) Enter/ArrowDown from input highlights first result;
  (d) Escape clears filter without affecting card navigation keyboard shortcuts.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: Start immediately — read only
- **Phase 2 (Foundational CSS)**: After Phase 1 — CSS must exist before HTML/JS are added
- **Phase 3 (US1)**: After Phase 2 — HTML references CSS classes; JS references DOM elements
- **Phase 4 (US2)**: After Phase 3 — keyboard nav calls `filterButtons()`, `clearFilter()`, and
  uses `_btnFilterFocusedIndex` set by those functions
- **Phase 5 (Polish)**: After all user story phases
- **Phase 6 (Validation)**: After Polish

### Critical Task Order Notes

- T002 (CSS) MUST precede T003 (HTML) — `.filter-focus` class referenced by JS
- T004 (`filterButtons`/`clearFilter`) MUST precede T006 (keyboard nav calls them)
- T005 (basic input wiring) and T006/T007 (keyboard nav) can be written in a single editor pass
  since they all live at the bottom of the same `<script>` block

### Parallel Opportunities

- This feature modifies only one file (`flashcards.html`), so true parallelism is limited.
- T002 (CSS) and T001 (read) can be done together.
- T005, T006, T007 (all JS wiring) can be written in a single pass after T004 adds the functions.

---

## Implementation Strategy

### MVP (US1 only — Scenarios 1–5)

1. T001 — Identify insertion point
2. T002 — CSS block
3. T003 — HTML widget
4. T004 — `filterButtons()` + `clearFilter()`
5. T005 — Wire input + clear button
6. Smoke test: type "tts" → three TTS buttons visible; clear → all back

### Full Feature (add US2 keyboard nav)

7. T006 — Keyboard state helpers
8. T007 — Keydown listeners
9. T008 — Polish verification
10. T009 — Full quickstart validation

---

## Notes

- All tasks modify only `flashcards.html`
- No new files are created
- The Escape handler guards against hijacking the key when the filter is empty and no button
  is highlighted, preventing conflict with existing card-navigation shortcuts
- T009 is a manual browser step — not automatable in a static HTML project
