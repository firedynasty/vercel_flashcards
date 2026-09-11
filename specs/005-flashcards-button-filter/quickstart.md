# Quickstart Validation: Flashcards Button Filter

**Feature**: 005-flashcards-button-filter
**Date**: 2026-09-10

## Prerequisites

- `flashcards.html` open in a browser at ≤ 390 px viewport width.
- Scroll to the bottom of the page to see the tool-launcher buttons.

## Scenarios

### Scenario 1 — Filter widget is present

**Steps**: Load the page and scroll to the area above the "Paste → Outline" button.

**Expected**: A text input (`placeholder="Filter tools…"`) and a clear (×) button are visible.

---

### Scenario 2 — Live filter narrows buttons

**Steps**: Type "tts" in the filter input.

**Expected**: Only buttons whose labels contain "tts" (case-insensitive) remain visible
(e.g., "Chinese TTS", "French TTS", "Korean TTS"). All other buttons are hidden.

---

### Scenario 3 — Clear button restores all buttons

**Steps**: With "tts" typed, tap the × button.

**Expected**: Input is cleared; all tool buttons are visible again.

---

### Scenario 4 — No results message

**Steps**: Type "zzz" (matches nothing).

**Expected**: All buttons hidden; a "No matching tools" message appears.

---

### Scenario 5 — Clearing empty query hides no-results message

**Steps**: After Scenario 4, clear the input.

**Expected**: All buttons reappear; the "No matching tools" message disappears.

---

### Scenario 6 — Keyboard: Enter from search moves to first result

**Steps**: Type "tts", then press Enter (physical keyboard).

**Expected**: The first visible matching button gains a visible highlight (ring/outline).
The search input loses focus.

---

### Scenario 7 — Keyboard: ArrowDown cycles results

**Steps**: After Scenario 6, press ArrowDown.

**Expected**: The highlight moves to the next visible button. At the last item, pressing
ArrowDown wraps to the first.

---

### Scenario 8 — Keyboard: Enter activates highlighted button

**Steps**: After Scenario 6, press Enter.

**Expected**: The highlighted button's action fires (tool page opens in new tab, if applicable).

---

### Scenario 9 — Keyboard: Escape clears and refocuses

**Steps**: With text in the filter and/or a highlighted button, press Escape.

**Expected**: Input is cleared, all buttons restored, highlight removed, focus returns to input.

---

### Scenario 10 — Filter does not steal keyboard from card navigation

**Steps**: Reload page, do NOT click the filter input. Use Left/Right arrow keys or number
keys to navigate flashcards.

**Expected**: Card navigation works normally; filter input does not receive the keystrokes.
