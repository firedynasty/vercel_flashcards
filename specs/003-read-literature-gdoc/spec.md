# Feature Specification: Google Doc Import & Recent Docs for read-literature

**Feature directory**: `specs/003-read-literature-gdoc/`
**Created**: 2026-09-10
**Status**: Draft

---

## Overview

Add Google sign-in and Google Docs integration to `read-literature.html` so that users can:
1. Sign in with their Google account from within the reading map page.
2. Import a reading map saved as a Google Doc by pasting its URL — no file download required.
3. Quickly reload a recently accessed Google Doc from a "Recent ▾" dropdown.

All features are optional enhancements; the page continues to work without signing in (local add/export/import-file flows are unchanged).

---

## User Stories

### US1 (P1): Sign-In Setup Section

**As a** reader who stores reading notes in Google Docs,
**I want** a sign-in button directly on the reading map page,
**so that** I can authenticate once and then access my Google Docs without leaving the page.

**Acceptance Criteria**:
- A collapsible "Google Docs" setup section appears on the page (starts expanded on first load).
- The section contains a "Sign In / Sign Out" button.
- Clicking "Sign In" initiates the Google OAuth flow; on success the button label changes to "Sign Out".
- Clicking "Sign Out" revokes the session; the button returns to "Sign In" and any doc-specific controls are disabled.
- The sign-in state is visible at a glance (label change is sufficient; no additional indicator required).

---

### US2 (P2): Paste Import from Google Doc URL

**As a** reader who stores my reading-map export in a Google Doc,
**I want** to paste the Google Doc URL and have my notes imported automatically,
**so that** I do not have to download and re-upload a `.txt` file each time I update my notes in the doc.

**Acceptance Criteria**:
- After sign-in, clicking "paste import" reads the clipboard.
- If the clipboard contains a Google Doc URL, the app extracts the document ID, fetches the document's plain-text content via the Google Drive export API, and imports it using the existing import parser.
- A status message confirms success ("Imported from Google Doc") or explains failure (e.g., "Could not access that document").
- If the clipboard does not contain a recognisable Google Doc URL, the existing behaviour is preserved: the clipboard text is treated as an exported `.txt` and parsed directly.
- If the user is not signed in, clicking "paste import" preserves the existing clipboard-text import flow (no Google fetch attempt is made).

---

### US3 (P3): Recent Docs Dropdown

**As a** reader who revisits the same few Google Docs repeatedly,
**I want** a "Recent ▾" button that lists my recently viewed Google Docs,
**so that** I can reload my notes with one tap instead of hunting for the doc URL.

**Acceptance Criteria**:
- After sign-in, a "Recent ▾" button appears in the Google Docs setup section.
- Tapping "Recent ▾" fetches up to 10 recently viewed Google Docs from Google Drive.
- The dropdown lists full document names (no ellipsis; long names wrap to a second line).
- Selecting a document fetches its plain-text content and imports it, exactly as if the user had pasted its URL.
- The dropdown closes when the user selects a document or taps outside the dropdown.
- While the fetch is in progress, the button is disabled and shows "Loading…"; it restores to "Recent ▾" once complete.
- If no Google Docs are found, the dropdown shows "No recent documents found".
- If the fetch fails, an inline status message explains the error; the button is re-enabled.

---

## Functional Requirements

| ID   | Requirement |
|------|-------------|
| FR-1 | The page MUST include a Google Sign-In button using Google Identity Services (GIS). |
| FR-2 | The sign-in section MUST default to expanded (visible) on page load. |
| FR-3 | Sign-in and sign-out MUST be handled without a page reload. |
| FR-4 | `#pasteImportBtn` MUST detect whether the clipboard contains a Google Doc URL (regex on `docs.google.com/document/d/{ID}`). |
| FR-5 | When a Google Doc URL is detected and the user is signed in, the app MUST fetch the document as plain text via the Drive export API and pass the result to the existing `importTxt()` parser. |
| FR-6 | When the clipboard does not contain a Google Doc URL, or the user is not signed in, `#pasteImportBtn` MUST fall back to the existing clipboard-text import behaviour. |
| FR-7 | A "Recent ▾" button MUST appear in the setup section after sign-in and be disabled before sign-in. |
| FR-8 | The recent docs list MUST use the Google Drive Files API, filtered to Google Docs mime type, ordered by most recently viewed, limited to 10 results. |
| FR-9 | Selecting a recent doc MUST import its content the same way as a pasted URL (fetch plain text → parse → render). |
| FR-10 | All tap targets in the Google section MUST be ≥ 44 × 44 px. |
| FR-11 | The dropdown MUST dismiss when the user taps outside it (touchstart + click). |
| FR-12 | Status messages MUST appear inline (not as alert dialogs). |

---

## Success Criteria

1. A signed-in user can import a Google Doc in ≤ 5 seconds on a mobile connection by pasting its URL.
2. The "Recent ▾" dropdown lists recent docs and triggers an import with a single tap.
3. Signing out disables all Google-dependent controls; the page remains fully functional for local workflows.
4. The page layout does not break on viewports as narrow as 320 px.
5. The existing `.txt` export/import/paste-import flows continue to work identically when the user is not signed in.

---

## Scope

**In scope**:
- Google sign-in/sign-out setup section in `read-literature.html`
- Upgraded `#pasteImportBtn` to detect and fetch Google Doc URLs
- "Recent ▾" dropdown for recent Google Docs
- Inline status messaging

**Out of scope**:
- Saving/writing back to Google Docs (read-only import only)
- Persistence across page reloads (in-memory only; use Export → Google Docs manually)
- Syncing or auto-refreshing from a watched Google Doc
- Support for Google Sheets or other Drive file types

---

## Edge Cases

- User pastes a Google Doc URL but the doc is not accessible (wrong account, private) → show clear error message.
- User pastes a non-Google-Doc URL or plain text → fall back to existing paste import.
- Google Drive API returns an empty list → show "No recent documents found".
- Network failure during fetch → show error, re-enable button.
- User is on a very narrow viewport (320 px) → dropdown must not overflow horizontally.

---

## Dependencies and Assumptions

- The Google OAuth client ID used by `learn-google.html` is available and scoped to include `drive.readonly` — the same client ID will be reused.
- The Drive export API (`/drive/v3/files/{id}/export?mimeType=text/plain`) returns the Google Doc body as plain text.
- Users format their Google Docs with the same heading conventions that `parseExport()` expects (`BOOK:`, `=== PEOPLE ===`, `=== CHAPTERS ===`).
- No changes are made to any other file; all modifications are confined to `read-literature.html`.
