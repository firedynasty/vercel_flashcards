# Implementation Plan: Mobile UX, Navbar & Outline Mode for read-literature

**Branch**: `004-read-literature-ux` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Add a sticky mobile navbar (font ±, expand/collapse, outline toggle, dark/light),
dark mode, outline-mode rendering per node, and a "Save to Google Doc" overwrite flow to
`read-literature.html`. Builds on `003-read-literature-gdoc`.

## Summary

Four additions to `read-literature.html`:

1. **Sticky navbar**: `<nav class="app-nav">` at body top with A−/A+, expand/collapse, outline, dark/light controls. CSS: `position: sticky; top: 0`.

2. **Dark mode**: `[data-theme="dark"]` overrides all CSS variables. Toggle stored in localStorage; respects `prefers-color-scheme` on first load.

3. **Outline mode**: Toggle hides textarea per node, renders a `<div data-outline>` bullet list parsed from the textarea's current text by lines. Read-only. Per-node paste buttons hidden.

4. **Google Doc save**: Upgrade GIS scope to include `documents`. Track `_loadedDocId`/`_loadedDocName` on successful import. "Save → name" button reveals a confirmation panel; on confirm, Docs API `batchUpdate` overwrites the document body.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2020+

**New dependencies**:
- Google Docs API v1 (`docs.googleapis.com/v1/documents/{id}:batchUpdate`) — for US4 write-back

**Scope change**:
- Current: `drive.readonly`
- New: `drive.readonly https://www.googleapis.com/auth/documents`

**Storage**:
- `localStorage['litFontSize']` — number 12–24
- `localStorage['litTheme']` — `'light'` | `'dark'`
- All other state in-memory only

**Target Platform**: Mobile browser, Samsung Galaxy Z Fold cover screen (≥ 320px)

**Constraints**:
- All changes in `read-literature.html` only
- No build pipeline
- Touch-first, ≥ 44px tap targets

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single-File, Universal Design | ✅ PASS | `read-literature.html` is not the flashcard engine; Principle I does not apply |
| II. Mobile-First, Touch-Optimized | ✅ PASS | Sticky navbar with ≥ 44px targets; dark mode reduces eye strain in dark environments |
| III. Vanilla HTML/JS Stack | ✅ PASS | No new frameworks or CDNs; Docs API called via plain `fetch()` |
| IV. Content Pipeline | ✅ PASS | Not applicable |
| V. Progressive Enhancement | ✅ PASS | All features opt-in; page functions without Google sign-in and without outline mode |

## File Structure Changes

```text
read-literature.html   ← sole modified file
  │
  ├── CSS additions (~90 lines)
  │     --app-font-size variable on :root
  │     [data-theme="dark"] variable overrides
  │     .app-nav sticky navbar styles
  │     .outline-list / .outline-item (outline mode render)
  │     .gdoc-confirm-panel (save confirmation overlay)
  │
  ├── HTML additions (~30 lines)
  │     <nav class="app-nav"> at top of <body>
  │       A− A+ buttons
  │       Expand/Collapse button
  │       Outline toggle button
  │       Dark/Light toggle button
  │     <div id="gdocConfirmPanel"> in Google Docs setup section
  │     <button id="gdocSaveBtn"> in Google Docs setup row
  │
  └── JS additions / modifications (~140 lines)
        New module-level vars: _outlineMode, _allExpanded,
          _loadedDocId, _loadedDocName
        initFontSize() / setFontSize(n)  — A− A+
        initTheme() / toggleTheme()      — dark/light
        toggleAllNodes(expand)           — navbar expand/collapse
        buildOutlineView(nodeBodyEl)     — parse textarea → bullet list
        toggleOutlineMode()              — show/hide outline per open node
        applyOutlineMode(nodeBodyEl)     — apply to single node
        Modify gdocImport(): store _loadedDocId/_loadedDocName,
          update save button
        Modify gdocSignIn() sign-out: clear _loadedDocId, hide save btn
        gdocSave()                       — Docs API batchUpdate
        showGdocConfirm() / hideGdocConfirm()
        DOMContentLoaded: wire all navbar buttons + save btn
```

## Implementation Strategy

### MVP order

1. CSS: `--app-font-size`, `[data-theme="dark"]`, `.app-nav` styles, `.outline-list`
2. HTML: `<nav>` element, `#gdocSaveBtn`, `#gdocConfirmPanel`
3. JS: `initFontSize`, `setFontSize`, `initTheme`, `toggleTheme`
4. JS: `toggleAllNodes`
5. JS: `buildOutlineView`, `applyOutlineMode`, `toggleOutlineMode`
6. JS: modify `gdocImport()`, add `gdocSave()`, `showGdocConfirm()`, `hideGdocConfirm()`
7. JS: upgrade GIS scope in `gdocInitClient()`
8. DOMContentLoaded wiring for all new controls

### Risky areas

- **Outline mode + expand**: When outline mode is on and the user expands a node, the node's click listener must trigger `applyOutlineMode` for that newly opened node. The existing `head.addEventListener('click', () => node.classList.toggle('open'))` handler in `buildPersonNode` / `buildChapterNode` must be extended.
- **Docs API write scope**: The scope change from `drive.readonly` to include `documents` requires the user to re-authenticate (GIS will prompt automatically if the new scope isn't already granted).
- **Save button state**: `gdocImport()` is async and can be called from multiple paths (paste, recent). All paths must update `_loadedDocId` and the save button consistently.
