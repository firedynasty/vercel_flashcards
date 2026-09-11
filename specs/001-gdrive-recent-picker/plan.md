# Implementation Plan: Google Drive Recent Files Picker

**Branch**: `001-gdrive-recent-picker` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-gdrive-recent-picker/spec.md`

## Summary

After Google sign-in, insert a "Recent ▾" button into the Google Sheets setup row of
`learn-chinese-tts.html`. Tapping it fetches the 10 most recently viewed Google Sheets
spreadsheets via the Drive Files API v3 and displays them in a dismissible dropdown.
Selecting an entry calls the existing `loadSpreadsheet()` function. The existing text
search + "Load" button is kept as a fallback.

## Technical Context

**Language/Version**: Vanilla JavaScript ES2020+ (no transpile step)

**Primary Dependencies**:
- Google Identity Services (`accounts.google.com/gsi/client`) — existing, CDN
- Google Drive Files API v3 — existing endpoint, reused access token
- xlsx.js (`cdnjs.cloudflare.com`) — existing, CDN (no change)
- jQuery / DataTables — existing, CDN (no change)

**Storage**: In-memory only (no localStorage, no server state)

**Testing**: Manual browser validation per `quickstart.md`

**Target Platform**: Mobile browser (Samsung Galaxy Z Fold, ≥320px viewport), Vercel
static hosting

**Project Type**: Static web application — single HTML file

**Performance Goals**: Dropdown list appears within 3 seconds on mobile data connection

**Constraints**:
- All changes in `learn-chinese-tts.html` only (Principle I)
- No build pipeline (Principle III)
- Touch-first, ≥44px tap targets, no horizontal overflow on 320px (Principle II)
- Feature gated behind sign-in; core flashcard unaffected (Principle V)

**Scale/Scope**: Single user; 10 recent files listed; single HTML file changed

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Single-File, Universal Design | ✅ PASS | Only `learn-chinese-tts.html` is modified |
| II. Mobile-First, Touch-Optimized | ✅ PASS | Dropdown designed for ≥320px; ≥44px targets; no scroll interference |
| III. Vanilla HTML/JS Stack | ✅ PASS | Pure ES2020+ in existing file; no new CDN deps; no build step |
| IV. Content Pipeline | ✅ PASS | Not applicable — no data pipeline changes |
| V. Progressive Enhancement | ✅ PASS | Gated behind sign-in; graceful error + fallback to existing search |

Post-design re-check: no violations introduced by Phase 1 design. All gates remain green.

## Project Structure

### Documentation (this feature)

```text
specs/001-gdrive-recent-picker/
├── plan.md          ← this file
├── research.md      ← Phase 0 output
├── data-model.md    ← Phase 1 output
├── quickstart.md    ← Phase 1 output
├── checklists/
│   └── requirements.md
└── tasks.md         ← Phase 2 output (/speckit-tasks — not yet created)
```

### Source Code (repository root)

```text
learn-chinese-tts.html   ← sole modified file
  │
  ├── CSS additions (~30 lines)
  │     .recent-dropdown-wrapper  (position:relative container)
  │     .recent-dropdown          (position:absolute list)
  │     .recent-dropdown-item     (tap target ≥44px)
  │
  ├── HTML additions (~10 lines, inside existing Google Sheets setup row)
  │     <div class="recent-dropdown-wrapper">
  │       <button id="recentBtn">Recent ▾</button>
  │       <div id="recentDropdown" class="recent-dropdown" hidden>…</div>
  │     </div>
  │
  └── JS additions (~60 lines, after existing gdriveSearch function)
        fetchRecentFiles()   — Drive API call, populates dropdown
        openRecentDropdown() — renders list items, registers dismiss listener
        closeRecentDropdown()— hides dropdown, removes listener
        (wired to existing gdriveSignIn callback to enable recentBtn)
```

**Structure Decision**: Single-file modification — no new source files, no new directories.
The additive approach (insert button + dropdown HTML, CSS block, and JS functions) keeps
the diff minimal and the fallback text-search path intact.

## Complexity Tracking

> No constitution violations — this section is not required.
