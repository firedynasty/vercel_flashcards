# Feature Specification: Mobile UX, Navbar & Outline Mode for read-literature

**Feature directory**: `specs/004-read-literature-ux/`
**Created**: 2026-09-10
**Status**: Draft

---

## Overview

Improve `read-literature.html` with a sticky mobile-friendly navbar, dark/light mode, font-size controls, and an "outline mode" that renders each node's notes as a parsed, read-only bullet list instead of a raw textarea. Also add a "Save to Google Doc" prompt that lets users overwrite the Google Doc they loaded from, with a confirmation step.

---

## User Stories

### US1 (P1): Sticky Navbar with Font-Size and Expand/Collapse Controls

**As a** reader on a mobile device,
**I want** a persistent toolbar at the top of the screen with font-size and expand/collapse buttons,
**so that** I can adjust readability and navigate the tree without scrolling back to the top.

**Acceptance Criteria**:
- A sticky header bar is always visible at the top of the viewport, even when scrolled.
- The bar contains: an "A−" (decrease font) and "A+" (increase font) button, an "Expand All" / "Collapse All" toggle button, and a dark/light mode toggle.
- Tapping "A−" decreases the base font size by one step (minimum 12px); "A+" increases by one step (maximum 24px). Font size preference persists across page reloads.
- The Expand/Collapse button toggles all nodes in both the Family and Chapters trees at once. The button label reflects the current state ("Expand All" when all collapsed, "Collapse All" when all expanded).
- The navbar does not obscure page content; the page body has enough top padding.
- All navbar tap targets are ≥ 44 × 44 px.

---

### US2 (P2): Dark / Light Mode

**As a** reader who reads at night,
**I want** to toggle between a light parchment theme and a dark theme,
**so that** the screen is comfortable to read in low-light conditions.

**Acceptance Criteria**:
- A toggle button (moon/sun icon or "Dark" / "Light" label) switches the entire page between the existing parchment (light) palette and a dark palette.
- Dark mode colours: background near-black, text near-white, card surfaces dark grey, borders muted.
- The mode preference persists in localStorage across reloads.
- On first load, the page respects `prefers-color-scheme: dark` if no saved preference exists.
- All existing UI elements (nodes, toolbar, setup section, dropdown) adopt the theme without any element remaining in the wrong palette.

---

### US3 (P3): Outline Mode

**As a** reader who wants a clean reading view of their notes,
**I want** an "Outline" toggle in the navbar that renders each node's notes as a parsed bullet list,
**so that** I can read my notes without the visual noise of a text editor.

**Acceptance Criteria**:
- A button labelled "Outline" (or "Outline ●" when active) in the navbar toggles outline mode on and off globally.
- In outline mode, each node's editable textarea is hidden and replaced by a read-only rendered list showing:
  - Each non-empty line of the notes as a bullet item.
  - Lines that start with two or more spaces (or a tab) are indented one extra level.
  - Empty lines are ignored.
- In outline mode, nodes cannot be edited (the textarea is not shown); the "paste" per-node button is also hidden.
- Toggling outline mode off restores the textarea (with the same unchanged text content).
- Outline mode state is not persisted — it resets to off on page reload.
- Outline mode works correctly whether nodes are expanded or collapsed (collapsed nodes stay collapsed; expanded nodes show the outline view).

---

### US4 (P4): Save to Google Doc (Overwrite)

**As a** reader who loaded notes from a Google Doc,
**I want** a "Save to Doc" button that overwrites that Google Doc with my current notes,
**so that** I can persist edits back to the same source document without manually exporting.

**Acceptance Criteria**:
- After a Google Doc is successfully imported (via paste-URL or Recent ▾), a "Save to Doc" button appears in the Google Docs setup section, labelled with the document name (e.g., "Save → Brothers K notes").
- Clicking the button shows an in-page confirmation prompt: "Overwrite «{doc name}» with current notes? [Cancel] [Overwrite]".
- On confirmation: the app exports the current reading map as plain text (same format as "export .txt"), then writes that content back to the Google Doc via the Docs API, replacing all existing content.
- On success: an inline status message confirms "Saved to Google Doc".
- On cancel or error: no data is written; an appropriate status message is shown on error.
- The "Save to Doc" button is only shown when a Google Doc has been loaded in the current session and the user is signed in. It is hidden on sign-out.
- The overwrite requires an expanded scope that allows writing to Google Docs. The sign-in flow is updated to request this scope.

---

## Functional Requirements

| ID    | Requirement |
|-------|-------------|
| FR-1  | A sticky navbar MUST be present at the top of the viewport at all times. |
| FR-2  | Navbar MUST contain: A−, A+, Expand/Collapse toggle, Outline toggle, dark/light toggle. |
| FR-3  | Font size MUST have at least 5 steps from 12px to 24px; preference MUST be stored in localStorage. |
| FR-4  | The Expand/Collapse button MUST operate on all nodes in both trees simultaneously. |
| FR-5  | Dark mode MUST store preference in localStorage and respect `prefers-color-scheme` on first load. |
| FR-6  | In outline mode, each node's textarea MUST be hidden and replaced with a rendered list parsed from the textarea's text content. |
| FR-7  | In outline mode, lines starting with ≥2 spaces or a tab MUST render at one extra indent level. |
| FR-8  | In outline mode, per-node paste buttons MUST be hidden. |
| FR-9  | Toggling outline mode off MUST restore the textarea with unmodified content. |
| FR-10 | After a Google Doc import, the loaded doc's file ID and name MUST be stored in memory. |
| FR-11 | A "Save to Doc" button MUST appear in the Google Docs section after a successful import. |
| FR-12 | The save MUST show an in-page confirmation before writing. |
| FR-13 | The save MUST use the Google Docs API to replace the document's body content with the current plain-text export. |
| FR-14 | The sign-in scope MUST be updated to include write access to Google Docs. |
| FR-15 | All navbar tap targets MUST be ≥ 44 × 44 px. |

---

## Success Criteria

1. On a 390px viewport, the navbar is always visible without scrolling and all controls are easily tappable.
2. Font size adjustments are immediately visible across all nodes and persist on reload.
3. Switching to outline mode on a chapter with multi-sentence notes renders the sentences as individual bullets within 1 second.
4. Dark mode correctly styles all UI elements; toggling produces no flash of incorrect colour.
5. A round-trip (load Google Doc → edit notes → save → reload from Drive) preserves all data accurately.

---

## Scope

**In scope**:
- Sticky navbar with font, expand/collapse, outline, and dark/light controls
- Dark mode CSS with localStorage persistence
- Outline mode (read-only bullet view per node, toggle global)
- Google Doc save/overwrite with in-page confirmation
- Scope upgrade for Google sign-in

**Out of scope**:
- Per-node font size
- Offline sync or conflict resolution between local edits and Drive
- Undo/redo for outline mode
- AI-powered hierarchical outline (flat sentence parse only)
- Exporting to formats other than plain text

---

## Edge Cases

- User toggles outline mode with no nodes open → no visible change; toggling open a node shows outline view immediately.
- Font size at minimum/maximum → A−/A+ button is visually disabled (greyed) but does not error.
- Dark mode toggled mid-session after Google Doc import → Save button correctly adopts dark theme.
- User signs out while Save button is visible → Save button is hidden; re-signing in without a doc loaded → Save button remains hidden.
- Network failure during save → error message shown; doc on Drive is unchanged.
- Google Doc content has no `=== PEOPLE ===` / `=== CHAPTERS ===` sections → save still works (writes whatever the current export produces).

---

## Dependencies and Assumptions

- Builds on `003-read-literature-gdoc` (Google sign-in + Drive import must already work).
- The Google Docs API batchUpdate endpoint is used to replace document content; this requires scope `https://www.googleapis.com/auth/documents`.
- Replacing a Google Doc's body via API clears all existing formatting (notes are plain text, so this is acceptable).
- The existing plain-text export format (`BOOK:` / `=== PEOPLE ===` / `=== CHAPTERS ===`) is the save format for Drive.
- localStorage is available (modern mobile browsers support it).
- All changes remain confined to `read-literature.html`.
