# Quickstart Validation Guide: Google Doc Import & Recent Docs for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## Prerequisites

- Access to `read-literature.html` served via a local server or Vercel deployment (clipboard API requires HTTPS or localhost).
- A Google account with at least one Google Doc accessible.
- That Google Doc should be formatted with the reading-map export format:
  ```
  BOOK: The Brothers Karamazov

  === PEOPLE ===

  #Fyodor
  The patriarch.

  === CHAPTERS ===

  #Book I, Ch. 1
  Introductory chapter notes.
  ```
- A mobile browser or DevTools device emulator set to ≤ 390 px viewport width.

---

## Scenarios

### Scenario 1 — Page load: setup section visible

1. Open `read-literature.html`.
2. **Expected**: The "Google Docs" setup section is visible (expanded/not collapsed) without any interaction.
3. **Expected**: The section contains a "Sign In" button and a disabled "Recent ▾" button.

---

### Scenario 2 — Sign in

1. Click "Sign In" in the Google Docs section.
2. Complete the Google OAuth popup.
3. **Expected**: The button label changes to "Sign Out".
4. **Expected**: The "Recent ▾" button is now enabled.
5. **Expected**: No page reload or navigation occurs.

---

### Scenario 3 — Paste import (Google Doc URL)

1. Copy the URL of a Google Doc that contains reading-map export format content.
2. Click the "paste import" button in the toolbar.
3. **Expected**: A status message appears: "Imported from Google Doc".
4. **Expected**: The Family and Chapters sections populate with the document's data.
5. **Expected**: The "Imported" flash pill appears.

---

### Scenario 4 — Paste import (plain text fallback)

1. Copy a plain-text reading-map export (not a URL).
2. Click "paste import".
3. **Expected**: Content is imported exactly as before (no Google API call is made).
4. **Expected**: No error or status message appears (or the flash pill shows "Imported").

---

### Scenario 5 — Paste import (not signed in)

1. Sign out (if signed in).
2. Copy a Google Doc URL to clipboard.
3. Click "paste import".
4. **Expected**: The clipboard text is treated as plain text (no Google fetch). The parser fails gracefully with an alert ("Could not parse the file…") or imports nothing — same as the existing behaviour for unrecognised clipboard content.

---

### Scenario 6 — Recent ▾ button (tap flow)

1. Sign in.
2. Tap "Recent ▾".
3. **Expected**: The button shows "Loading…" and is disabled while the API call is in-flight.
4. **Expected**: A dropdown appears listing up to 10 recently viewed Google Docs with full names (no ellipsis).
5. **Expected**: Long names wrap to a second line; the dropdown does not overflow the viewport horizontally.

---

### Scenario 7 — Select a recent doc

1. With the Recent ▾ dropdown open, tap a document name.
2. **Expected**: The dropdown closes.
3. **Expected**: The status message shows "Imported from Google Doc".
4. **Expected**: The Family and Chapters sections populate with that doc's data.

---

### Scenario 8 — Dismiss dropdown by tapping outside

1. Open the Recent ▾ dropdown.
2. Tap anywhere outside the dropdown (e.g., on the page title or a branch heading).
3. **Expected**: The dropdown closes without importing anything.

---

### Scenario 9 — Sign out disables Google controls

1. Sign in, confirm Recent ▾ is enabled.
2. Click "Sign Out".
3. **Expected**: The "Recent ▾" button becomes disabled.
4. **Expected**: The sign-in button shows "Sign In" again.
5. **Expected**: The paste import button still works for plain-text clipboard content.

---

### Scenario 10 — No recent documents

1. Sign in with an account that has no recently viewed Google Docs.
2. Tap "Recent ▾".
3. **Expected**: The dropdown shows "No recent documents found".
4. **Expected**: The button re-enables after the API responds.
