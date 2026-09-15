# Quickstart: Validate Randomize Toggle Replaces Deck Mode

No build step or test framework is used in this project (Constitution Principle III) — validation is a manual smoke test run against each file directly in a browser, per the project's existing "Development Workflow" convention. Run the full sequence below **twice**: once for `learn-google.html`, once for `learn-chinese-tts.html` (spec FR-012 requires identical behavior).

## Prerequisites

- A local static file server (any will do, since these are plain HTML files with no backend requirement for this feature), e.g.:
  ```bash
  cd /Users/stanleytan/Documents/technical/github/vercel_flashcards
  python3 -m http.server 8000
  ```
- Open `http://localhost:8000/learn-google.html` and `http://localhost:8000/learn-chinese-tts.html` in a browser.
- Load a small vocabulary set into each page via whatever load path is fastest for you (paste-CSV box, drag-and-drop a file, or an already-configured Google Sheet / Supabase deck) — at least 5 entries so shuffling is visibly detectable.
- Also test once at a narrow viewport (≤390px, e.g. browser dev-tools device toolbar set to a Fold-cover-screen-sized width) per Constitution Principle II.

## Scenario 1 — Deck mode is fully gone (User Story 3 / SC-002)

1. After loading data, confirm the page lands directly in Cards or Table view — **no swipe/flip card session, progress bar, or done-screen ever appears.**
2. Look at the control bar: confirm you see exactly **"Table"** and **"Randomize"** chips — no **"Deck"** chip.
3. Open browser dev tools → Elements/Inspector: search the DOM for `deckViewContainer`, `deckCard`, `deckDoneScreen` — none should exist.
4. Search the page source (`Ctrl+U` / view-source) for `deckQueue`, `deckMissedSet`, `activateDeckView`, `startDeckSession` — none should remain in the shipped JS.

**Expected**: All of the above pass — Deck mode leaves no trace.

## Scenario 2 — Randomize in Cards mode (User Story 1)

1. Ensure Table is **off** (Cards showing) and Randomize is **off**. Note the order of the first 3 visible cards.
2. Click **Randomize** (chip turns "on"). Confirm the cards re-render in-place, in a different order (with ≥5 entries, order should visibly change; re-run once more if you get an unlucky identical shuffle).
3. Click **Randomize** again (off). Confirm the cards return to the original order noted in step 1.
4. With Randomize on, type into the search box to narrow the visible set. Confirm the narrowed set is also shown shuffled.

**Expected**: Order changes only when Randomize is on; toggling off restores the exact original order; filtering while on still shows a shuffled (not fixed) order.

## Scenario 3 — Randomize in Table mode (User Story 2)

1. Click **Table** (Table view showing). With Randomize off, note the first 3 rows.
2. Click **Randomize** on. Confirm the table rebuilds with rows in a different order.
3. Confirm Table-mode features still work while Randomize is on: type in search, use the documented up/down row-navigation keys, click a row's play button (if applicable).
4. Click **Randomize** off. Confirm rows return to original order.
5. With Randomize on in Table mode, click **Table** off (back to Cards). Confirm Cards mode also shows a shuffled order (state carried across the mode switch — spec FR-007), and that it's the *same* shuffle order you just saw in the table (no extra reshuffle from the mode switch alone — spec FR-008).

**Expected**: Table shuffles/restores correctly; all pre-existing Table features keep working; Randomize state and current order both survive a Cards↔Table switch.

## Scenario 4 — Load-time behavior (FR-009) and unrelated features (FR-011, FR-003)

1. With any view/Randomize combination active, load a *new* set of data (different CSV/deck). Confirm it lands directly in the same Cards/Table mode you had selected — no Deck/session screen appears — and, if Randomize was on, the new set appears pre-shuffled.
2. Confirm the separate, pre-existing **"▼ Randomize"** button (opens the practice/quiz modal) still exists, is still labeled the same, and still works exactly as before — unaffected by this change.
3. Spot-check unrelated features still work regardless of Randomize state: mark a card/row "hard," run Export Hard / Export All / Download CSV, and play TTS on an entry.

**Expected**: No auto-launched session mode on load; the old "▼ Randomize" practice button is untouched; all non-ordering features are unaffected.

## Sign-off

Feature is validated when all four scenarios pass identically in both `learn-google.html` and `learn-chinese-tts.html`, including at a ≤390px viewport width. Record any deviation against the relevant FR/SC in `spec.md` before marking the feature complete.
