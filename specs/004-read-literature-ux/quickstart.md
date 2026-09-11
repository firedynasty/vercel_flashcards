# Quickstart Validation Guide: Mobile UX, Navbar & Outline Mode for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## Prerequisites

- `read-literature.html` open in a mobile browser or DevTools emulator at ≤ 390px viewport.
- At least 2 people added and 2 chapters added with multi-line notes (to test outline mode and expand/collapse).
- For US4 scenarios: signed into Google with a previously imported Google Doc in the session.

---

## Scenarios

### Scenario 1 — Sticky navbar always visible

1. Open `read-literature.html` and add enough content to require scrolling.
2. Scroll down past the toolbar and branches.
3. **Expected**: The navbar remains fixed at the top of the viewport at all times.
4. **Expected**: The first character of the page content is not hidden behind the navbar (correct top padding).

---

### Scenario 2 — Font size increase / decrease

1. Tap "A+" twice.
2. **Expected**: Text in node names, notes, and branch titles is visibly larger.
3. Tap "A−" twice.
4. **Expected**: Font returns to default size.
5. Reload the page.
6. **Expected**: The font size from before the reload is restored.
7. Tap "A−" repeatedly until minimum is reached.
8. **Expected**: "A−" becomes visually disabled; no further decrease occurs.

---

### Scenario 3 — Expand All / Collapse All

1. Ensure all nodes are collapsed.
2. Tap "Expand All" in the navbar.
3. **Expected**: All nodes in both Family and Chapters trees open.
4. **Expected**: The button label changes to "Collapse All".
5. Tap "Collapse All".
6. **Expected**: All nodes close. Button returns to "Expand All".

---

### Scenario 4 — Dark mode toggle

1. Tap the dark/light toggle in the navbar.
2. **Expected**: The page switches to a dark palette (dark background, light text) within one render frame.
3. **Expected**: All elements — nodes, toolbar, Google setup section, navbar — correctly adopt dark colours.
4. Reload the page.
5. **Expected**: Dark mode is still active.
6. Tap the toggle again.
7. **Expected**: Page returns to light parchment theme.

---

### Scenario 5 — Dark mode respects prefers-color-scheme

1. Clear localStorage for the page (DevTools → Application → Storage → Clear).
2. Set the OS / DevTools emulated colour scheme to "dark".
3. Reload the page.
4. **Expected**: Dark mode is active by default, without the user having tapped the toggle.

---

### Scenario 6 — Outline mode: basic rendering

1. Add a chapter with notes containing three lines, the second starting with two spaces:
   ```
   First idea
     Supporting detail
   Third idea
   ```
2. Expand that chapter's node.
3. Tap "Outline" in the navbar.
4. **Expected**: The textarea is hidden. A bullet list appears showing:
   - "First idea"
   - "Supporting detail" (indented)
   - "Third idea"
5. **Expected**: The per-node "paste" button is hidden.

---

### Scenario 7 — Outline mode: read-only

1. With outline mode active and a node expanded, try to tap on the rendered list and type.
2. **Expected**: No text input is possible; the list is purely a display element.

---

### Scenario 8 — Outline mode: toggle off restores textarea

1. With outline mode active, tap "Outline" again to deactivate it.
2. **Expected**: The textarea reappears with the same text content as before outline mode was enabled.
3. **Expected**: Text can be edited again.

---

### Scenario 9 — Outline mode + expand all interaction

1. Collapse all nodes. Enable outline mode.
2. Tap "Expand All".
3. **Expected**: All nodes open and show the outline view (not the textarea).
4. Disable outline mode.
5. **Expected**: All open nodes switch back to showing the textarea.

---

### Scenario 10 — Save to Google Doc: button appears after import

1. Sign in to Google.
2. Import a Google Doc (via paste URL or Recent ▾).
3. **Expected**: A "Save → {doc name}" button appears in the Google Docs setup section.
4. Sign out.
5. **Expected**: The Save button is no longer visible.

---

### Scenario 11 — Save to Google Doc: confirmation and overwrite

1. Sign in and import a Google Doc.
2. Add or edit a chapter note.
3. Click "Save → {doc name}".
4. **Expected**: An in-page confirmation panel appears: "Overwrite «{doc name}»?" with Cancel and Overwrite buttons.
5. Click "Cancel".
6. **Expected**: Panel closes; no API call was made.
7. Click "Save → {doc name}" again, then "Overwrite".
8. **Expected**: Status message says "Saved to Google Doc".
9. Open the Google Doc directly in Google Drive.
10. **Expected**: The document's content matches the exported plain-text format with the edited note.

---

### Scenario 12 — Save to Google Doc: error handling

1. Sign in and import a Google Doc.
2. Disconnect from the internet (or revoke API access in DevTools).
3. Click Save → Overwrite.
4. **Expected**: An error message appears; the document on Drive is unchanged.
