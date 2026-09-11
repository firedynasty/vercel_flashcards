# Research: Recent Files Picker & Expanded Setup for learn-google

**Feature**: `002-learn-google-recent-picker`
**Date**: 2026-09-10
**Source**: Porting from completed `001-gdrive-recent-picker` (learn-chinese-tts.html)

---

## Decision 1: Drive API query — reuse identical pattern from 001

**Decision**: Use the same Drive Files API v3 query already proven in `001-gdrive-recent-picker`:
```
GET https://www.googleapis.com/drive/v3/files
  ?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false
  &orderBy=viewedByMeTime+desc
  &pageSize=10
  &fields=files(id,name,viewedByMeTime)
Authorization: Bearer {gdriveAccessToken}
```

**Rationale**: The existing `gdriveAccessToken` (obtained with `drive.readonly` scope during
sign-in) already has permission to list files. The identical query was implemented and validated
in `learn-chinese-tts.html`. No new OAuth scope is required.

**Alternatives considered**: Re-research from scratch — rejected; the 001 feature resolved this.

---

## Decision 2: Load function call signature

**Decision**: Call `gdriveLoadSpreadsheet(file.id, file.name)` (two-argument form) when the
user selects a recent file. This matches the existing function signature in `learn-google.html`.

**Rationale**: `learn-google.html` uses `gdriveLoadSpreadsheet(fileId, fileName)` whereas
`learn-chinese-tts.html` uses `loadSpreadsheet(id)`. The recent-dropdown item click handler
must use the correct signature for each file.

**Alternatives considered**: `gdriveSearch()` (search-based) — rejected; the recent picker
bypasses search entirely and calls the load function directly.

---

## Decision 3: Expanded setup on page load

**Decision**: Remove the `collapsed` class from `<div class="setup-section collapsed" id="setupSection">`
in the HTML, and change the initial arrow from `&#9658;` (▶) to `&#9660;` (▼).

**Rationale**: The `toggleSetup()` function reads the current class to determine which arrow
to show. Starting without `collapsed` means the setup body is displayed and the arrow is ▼ —
consistent with the toggle logic already in place. No JavaScript change needed; it's a pure
HTML attribute change.

**Alternatives considered**: JavaScript `DOMContentLoaded` to remove the class — rejected;
simpler and more reliable to just change the HTML default.

---

## Decision 4: CSS and JS are self-contained copies (no shared file)

**Decision**: Copy the CSS and JS for the recent dropdown into `learn-google.html` directly.
No shared stylesheet or module is created.

**Rationale**: The project constitution (Principle I) requires all changes to a single HTML
file. The project has no build step and no shared partials. The CSS is ~25 lines and the JS
is ~60 lines — acceptable duplication for a static single-file architecture.

**Alternatives considered**: Extract shared module — rejected; violates Principle III
(Vanilla Stack, no build pipeline) and Principle I (single-file changes).

---

## Decision 5: Element ID namespace — keep `g` prefix for learn-google

**Decision**: Use `recentBtn` and `recentDropdown` as the button/dropdown IDs (no `g` prefix),
consistent with `learn-chinese-tts.html`. Other existing IDs (`gSearchInput`, `gSearchBtn`,
`gSheetSelect`) retain their `g` prefix.

**Rationale**: `recentBtn` and `recentDropdown` are new elements with no naming conflict.
Keeping the same IDs as the 001 feature means the JS functions (`fetchRecentFiles`,
`openRecentDropdown`, `closeRecentDropdown`) can be ported verbatim.

**Alternatives considered**: `gRecentBtn` / `gRecentDropdown` — rejected; unnecessary
prefix since these IDs don't conflict with any existing element.

---

## Decision 6: Status message function — use `setGStatus()`

**Decision**: Error and loading messages use `setGStatus(msg)` (the existing status helper
in `learn-google.html`) instead of `setStatus()` (used in `learn-chinese-tts.html`).

**Rationale**: Each file has its own status element and helper. Using the correct helper
ensures messages appear in the right place in the UI.

**Alternatives considered**: Inline `document.getElementById` — rejected; `setGStatus`
already exists and is the conventional pattern in this file.
