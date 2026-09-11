# Research: Google Drive Recent Files Picker

**Feature**: `001-gdrive-recent-picker`
**Date**: 2026-09-10

---

## Decision 1: Drive API Query for Recent Files

**Decision**: Use Google Drive Files API v3 with `orderBy=viewedByMeTime+desc` and a
`mimeType` filter to fetch the 10 most recently viewed spreadsheets.

**Exact query parameters** (extracted from `vercel_google_drive/src/DriveSearch.js`):
```
GET https://www.googleapis.com/drive/v3/files
  ?q=mimeType='application/vnd.google-apps.spreadsheet' and trashed=false
  &orderBy=viewedByMeTime+desc
  &pageSize=10
  &fields=files(id,name,mimeType,viewedByMeTime,modifiedByMeTime)
  Authorization: Bearer <gdriveAccessToken>
```

**Rationale**: The `vercel_google_drive` project already implements this exact call and it
works correctly. We reuse the pattern verbatim. No server-side proxy is needed — the call
is made client-side using the existing `gdriveAccessToken` obtained at sign-in.

**Alternatives considered**:
- `orderBy=modifiedByMeTime+desc` — orders by files the user edited, not viewed. Less
  useful for a reader who opens but doesn't edit sheets. Rejected.
- `orderBy=recency` — not a supported `orderBy` value in Drive v3. Rejected.
- Using Drive Activity API — more complex, requires additional OAuth scope
  (`https://www.googleapis.com/auth/drive.activity.readonly`). Rejected in favour of
  the simpler Files API which uses the already-granted `drive.readonly` scope.

---

## Decision 2: UI Layout — Keep or Replace Text Search

**Decision**: Keep the existing text input and "Load" button as a fallback, but visually
de-emphasize them after sign-in. The "Recent ▾" button is inserted to the left of the
text input row.

**Rationale**: The spec's Assumption section defers this to planning. Keeping the text
search preserves a path for users who need a file that is not in the 10-most-recent list
(e.g., a rarely used deck). Removing it would violate Progressive Enhancement by narrowing
the fallback surface. The simplest implementation is additive: insert the "Recent ▾" button
without removing anything.

**Alternatives considered**:
- Replace text search entirely — breaks the fallback path. Rejected.
- Add a "Search" toggle to reveal the text input — adds unnecessary complexity. Rejected.

---

## Decision 3: Dropdown Dismiss Behaviour on Mobile

**Decision**: Use a `document`-level `touchstart`/`click` listener (added when the dropdown
opens, removed when it closes) to detect outside taps and close the dropdown.

**Rationale**: Mobile browsers do not reliably fire `blur` events on non-input elements.
A delegated document listener is the standard vanilla-JS pattern for dismissible dropdowns
and has no scroll interference.

**Alternatives considered**:
- `<dialog>` backdrop — requires polyfilling on some Android WebViews and adds z-index
  complexity. Overkill for a small list. Rejected.
- `focusout` on the wrapper div — unreliable on touch. Rejected.

---

## Decision 4: Dropdown Positioning on Narrow Viewports

**Decision**: The dropdown renders as a `position: absolute` block below the "Recent ▾"
button, with `max-height: 220px`, `overflow-y: auto`, and `width: 100%` relative to the
setup row container. On ≤320px viewports it stays within the container's horizontal bounds.

**Rationale**: Avoids overflow off-screen on narrow viewports. A fixed-height scrollable
list accommodates up to 10 items (~22px each) without pushing page content.

**Alternatives considered**:
- `position: fixed` full-width overlay — cleaner on mobile but harder to position relative
  to the button. Overkill for 10 items. Rejected.
- Inline expansion (no `position: absolute`) — pushes the search row down; acceptable but
  the absolute approach is cleaner visually. Rejected.

---

## Decision 5: OAuth Scope Requirements

**Decision**: No additional OAuth scope is required. The existing sign-in flow already
requests `https://www.googleapis.com/auth/drive.readonly` (or equivalent), which grants
access to the Files list endpoint.

**Rationale**: Inspecting `learn-chinese-tts.html` around line 1380–1405 shows the token
client is configured with `scope: 'https://www.googleapis.com/auth/drive.readonly'`. The
Files API endpoint respects this scope for listing and reading file metadata.

**Alternatives considered**: N/A — scope already covers the needed API.

---

## Summary of Resolved Unknowns

| Unknown | Resolution |
|---------|-----------|
| Exact API call | Drive v3 `/files` with `viewedByMeTime+desc`, `pageSize=10` |
| Keep or replace text search | Keep as fallback; insert "Recent ▾" button additively |
| Dropdown dismiss on mobile | `document` touchstart/click listener |
| Narrow viewport layout | `position:absolute`, `width:100%`, `max-height:220px` scroll |
| OAuth scope | No change needed; existing scope covers the endpoint |
