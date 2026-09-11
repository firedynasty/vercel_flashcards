# Research: Mobile UX, Navbar & Outline Mode for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## Decision 1: Sticky Navbar Implementation

**Decision**: Use `position: sticky; top: 0; z-index: 200` on a new `<nav class="app-nav">` element inserted as the first child of `<body>`, with `padding-top` added to `<div class="wrap">` to prevent content overlap.

**Rationale**: `position: sticky` keeps the navbar in the normal flow on mobile (no layout thrash), sticks as soon as the user scrolls, and avoids the fixed-position pitfall of virtual keyboard resize on mobile. The `.wrap` padding-top compensates for the navbar height (approximately 52px).

**Alternatives considered**:
- `position: fixed`: Works but pulls element out of flow, requires explicit body padding and causes issues when virtual keyboard changes viewport height on iOS Safari.
- JavaScript scroll listener: More complex, not needed — CSS `sticky` is sufficient.

---

## Decision 2: Font-Size Control

**Decision**: Introduce a CSS custom property `--app-font-size` (default `15px`) that the navbar A−/A+ buttons adjust in 2px increments (range 12px–24px, 7 steps). `document.documentElement.style.setProperty('--app-font-size', size + 'px')` applies immediately. Value stored in `localStorage` as `'litFontSize'` and restored on load.

**Rationale**: A single CSS variable propagates through all element styles that reference it (`font-size: var(--app-font-size)`). No need to query or update individual elements.

**Implementation note**: Each existing `font-size` pixel value in the stylesheet should reference `--app-font-size` proportionally via `calc()` where needed, or the base body font size is overridden and everything scales.

**Simpler alternative chosen**: Set `font-size` on `body` via the CSS variable; all `em`-relative children scale automatically. For fixed-`px` elements, update only the most important (node name, body text, textarea).

---

## Decision 3: Dark Mode

**Decision**: Use a `data-theme="dark"` attribute on `<html>` toggled by the navbar button. All colour variables are re-declared in `[data-theme="dark"] { ... }`. Preference stored in `localStorage` as `'litTheme'`. On load, check localStorage first; if absent, check `window.matchMedia('(prefers-color-scheme: dark)')`.

**Dark palette**:
- `--paper`: `#1a1a1a`
- `--paper-raised`: `#242424`
- `--ink`: `#e8e0d0`
- `--ink-soft`: `#9e9688`
- `--oxblood`: `#c96b6b`
- `--teal`: `#5a9e9c`
- `--gold`: `#c8a050`
- `--line`: `#3a3530`

**Rationale**: Attribute-based theming is simpler than a CSS class and avoids specificity conflicts. CSS variables cascade so every existing colour reference updates automatically.

**Alternatives considered**:
- `prefers-color-scheme` media query only: Can't be toggled by the user at runtime.
- Two separate stylesheets: More bytes, no benefit.

---

## Decision 4: Expand/Collapse All Toggle in Navbar

**Decision**: The navbar Expand/Collapse button queries `document.querySelectorAll('.node')` and adds/removes the `.open` class from all of them. Button label is "Expand All" when most nodes are closed, "Collapse All" when any is open. State tracked by a module-level boolean `_allExpanded`.

**Rationale**: The same approach already used by the per-branch "expand all" / "collapse all" linklike buttons. The navbar version operates globally on both trees.

**Implementation note**: When outline mode is active, expanding a node shows the outline view (not the textarea). The outline rendering is driven by whether the node is `.open`, not by the expand/collapse button directly.

---

## Decision 5: Outline Mode — Parser

**Decision**: Split each node's `notes` text by line breaks (`\n`). For each non-empty line:
- Strip trailing whitespace.
- Detect indent level: count leading spaces / 2 (or 1 if a leading tab found). Cap at 2 levels.
- Render as `<li style="margin-left: {level * 20}px">` inside a `<ul class="outline-list">`.
- Skip fully empty lines.

No sentence-splitting is used (unlike vercel_bible_current). The user controls granularity through how they write their notes (one idea per line).

**Rationale**: The notes textarea in `read-literature.html` is already free-form text. Line-based parsing is immediately useful (user just presses Enter between ideas), deterministic, and easy to understand. Sentence splitting adds complexity with marginal gain for personal notes.

**Alternatives considered**:
- Sentence splitting (`. `, `! `, `? ` delimiters): Useful for prose but breaks bullet-style notes that already use line breaks.
- Markdown parsing: Feature creep; not requested and not part of the existing aesthetic.

---

## Decision 6: Outline Mode — Toggle Mechanism

**Decision**: A module-level boolean `_outlineMode = false` is toggled by the navbar button. On toggle:
- Each open node's body is queried for `[data-outline]` (the rendered div) and the textarea.
- In outline mode: textarea hidden, outline div shown (created if absent, re-rendered).
- Out of outline mode: outline div hidden, textarea shown.
- Closed (not `.open`) nodes: no rendering needed — the body isn't visible.

**Rendering strategy**: `buildOutlineView(node)` creates or refreshes the `<div data-outline>` adjacent to the textarea inside each `.node-body`. The div is always created from the live textarea value, so it always reflects current note content.

**Why not rebuild on every node open?** The outline div is built lazily when a node opens in outline mode (via the existing `node-head` click listener). No global re-render needed when the user opens a node while in outline mode.

---

## Decision 7: Google Doc Save — API and Scope

**Decision**: Use the Google Docs API v1 `batchUpdate` endpoint to overwrite document content. Scope upgraded from `drive.readonly` to `drive.readonly https://www.googleapis.com/auth/documents`. The save flow:
1. `DELETE` all existing body content via `deleteContentRange` (from start index to end of body).
2. `INSERT` the plain-text export string via `insertText` at index 1.

Both operations sent as one `batchUpdate` request to `https://docs.googleapis.com/v1/documents/{docId}:batchUpdate`.

**Tracking loaded doc**: When `gdocImport(fileId)` succeeds, store `_loadedDocId` and `_loadedDocName` as module-level variables. Reset on sign-out.

**Confirmation UI**: An in-page `<div id="gdocSaveConfirm">` (initially hidden) slides in with "Overwrite «{name}»?" + Cancel + Overwrite buttons. No `window.confirm()` — the spec requires an in-page prompt.

**Rationale**: `batchUpdate` is the canonical Docs API write mechanism. A single request with delete-then-insert is atomic from the API's perspective. Using `window.confirm()` would block the JS thread and feel jarring on mobile; an in-page panel matches the page's aesthetic.

**Alternatives considered**:
- Drive API multipart upload (for plain text): Only works for binary/non-native formats; does not update a native Google Doc.
- Docs API: insertText only (without delete): Would append content rather than replace it.

---

## Decision 8: Save Button Visibility

**Decision**: The "Save to Doc" button is a `<button class="linklike" id="gdocSaveBtn" style="display:none">` in the Google Docs setup section. `gdocImport()` sets its `textContent` to `"Save → {name}"` and makes it visible on success. `gdocSignIn()` sign-out branch resets `_loadedDocId = null` and hides the button.

**Rationale**: Minimal HTML change — just add one hidden button to the existing setup row. No new containers needed.

---

## Decision 9: Navbar Layout on Narrow Viewport

**Decision**: Navbar uses `display: flex; flex-wrap: nowrap; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch` so all controls fit in one scrollable row on 320px screens. Controls are grouped: [A− A+] [⇅] [Outline] [☀/🌙]. Icon-only or very short labels used to stay compact.

**Rationale**: A single horizontal scrollable row is better than wrapping to two rows (which would double the navbar height and obscure more content). The user expects a compact bar, not a full toolbar palette.
