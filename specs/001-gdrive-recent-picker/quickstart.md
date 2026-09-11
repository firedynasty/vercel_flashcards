# Quickstart Validation Guide: Google Drive Recent Files Picker

**Feature**: `001-gdrive-recent-picker`
**Date**: 2026-09-10

---

## Prerequisites

1. A Google account with at least one Google Sheets spreadsheet in Drive that has been
   viewed recently.
2. A browser with Google sign-in capable (Chrome or Safari on mobile/desktop).
3. The app running locally or at its Vercel deployment URL.

---

## Setup

No build step required. Open `learn-chinese-tts.html` directly:

```
# Local (open in browser)
open /Users/stanleytan/Documents/technical/github/vercel_flashcards/learn-chinese-tts.html

# Or via Vercel preview URL after deployment
```

---

## Validation Scenarios

### Scenario 1 — Happy Path: Sign in and pick a recent file

1. Open the app. Confirm the Google Sheets section shows **"Sign In"** button and
   the text search input.
2. Tap **"Sign In"** and complete Google OAuth.
3. **Expected**: A **"Recent ▾"** button appears in the Google Sheets setup row.
4. Tap **"Recent ▾"**.
5. **Expected**: Button label changes to **"Loading…"** and is disabled.
6. **Expected within ~3 seconds**: A dropdown appears listing up to 10 spreadsheet names.
7. Tap any file name in the dropdown.
8. **Expected**: Dropdown closes; status area shows `Loaded "<filename>" — N sheet(s)`;
   sheet selector populates with the file's sheet tabs.
9. Select a sheet tab.
10. **Expected**: Flashcard deck loads normally.

**Pass criteria**: Steps 3–10 complete without errors; deck loads correctly.

---

### Scenario 2 — Loading indicator visible

1. Sign in (see Scenario 1, steps 1–3).
2. Tap **"Recent ▾"** and immediately observe the button.
3. **Expected**: Button shows **"Loading…"** and is non-interactive until the list arrives.

**Pass criteria**: Button is visibly disabled during fetch (even if brief on fast connection;
test on throttled network via browser devtools for reliable observation).

---

### Scenario 3 — Empty list state

1. Sign in with a Google account that has **no** Google Sheets files in Drive (or
   temporarily filter all sheets to trash to simulate).
2. Tap **"Recent ▾"**.
3. **Expected**: Instead of a list, an inline message appears:
   **"No recent spreadsheets found"**.
4. Confirm the button re-enables after the message appears.

**Pass criteria**: No JS errors; message visible; button usable again.

---

### Scenario 4 — Error state (network failure)

1. Sign in.
2. Use browser devtools to set network to **Offline**.
3. Tap **"Recent ▾"**.
4. **Expected**: Status area shows a human-readable error (e.g., `"Error fetching recent
   files: Failed to fetch"`); button re-enables.
5. Re-enable network; tap **"Recent ▾"** again.
6. **Expected**: Normal list appears (retry succeeds).

**Pass criteria**: No crash, no frozen state; retry works.

---

### Scenario 5 — Dropdown dismissal

1. Sign in; tap **"Recent ▾"** to open dropdown.
2. Tap anywhere outside the dropdown (e.g., the page title area).
3. **Expected**: Dropdown closes; no file is loaded.
4. Tap **"Recent ▾"** again to reopen; tap the button a second time.
5. **Expected**: Dropdown closes on the second tap.

**Pass criteria**: Dropdown correctly dismisses in both cases.

---

### Scenario 6 — Fallback search still works

1. Sign in.
2. Type a spreadsheet name into the text input.
3. Tap the **"Load"** button.
4. **Expected**: Existing `gdriveSearch()` flow runs unchanged; sheet loads normally.

**Pass criteria**: Existing search path is unaffected by this change.

---

### Scenario 7 — Narrow viewport (mobile / Samsung Fold)

1. Open the app in a browser window resized to **320px wide** (or on the Fold cover screen).
2. Sign in; tap **"Recent ▾"**.
3. **Expected**: Dropdown appears within horizontal bounds of the screen (no horizontal
   scrollbar). File names wrap or truncate rather than overflow.
4. Tap targets (each list item) are at least 44px tall.

**Pass criteria**: No horizontal overflow; all items tappable without mis-tap.

---

## Expected File Locations (post-implementation)

All changes are confined to a single file:

```
learn-chinese-tts.html   ← HTML button + CSS dropdown styles + JS fetch logic added here
```

No new files are created; no other HTML files are modified.
