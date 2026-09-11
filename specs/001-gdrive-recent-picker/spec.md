# Feature Specification: Google Drive Recent Files Picker

**Feature Branch**: `001-gdrive-recent-picker`

**Created**: 2026-09-10

**Status**: Draft

**Input**: User description: "After Google login, replace the spreadsheet name search + Load button with a dropdown of recently touched files so I can pick the most recent file directly. The dropdown button must be on its own row so file names are fully visible — currently names are truncated (e.g. 'chine…' and 'korean')."

**Amended**: 2026-09-10 — Added layout and full-filename display requirements (FR-010, FR-011).

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pick a Recent File After Sign-In (Priority: P1)

The user opens the flashcard app, taps "Sign In" with Google, and is immediately
shown a dropdown list of the 10 most recently viewed spreadsheets from their Drive.
They tap one name and it loads — no typing required.

**Why this priority**: This is the entire point of the feature. The current search
workflow requires remembering a filename and typing it exactly. Replacing it with
a recency-ordered list removes all friction for the common case (returning to the
same file you used yesterday).

**Independent Test**: After signing in, the dropdown appears and selecting any item
loads the flashcard data. Delivers full value without any other story.

**Acceptance Scenarios**:

1. **Given** the user is signed out, **When** they tap "Sign In" and complete Google auth, **Then** a "Recent ▾" button appears on its own dedicated row in the Google Sheets setup section, enabled and ready to expand.
2. **Given** the recent-files dropdown is visible, **When** the user taps a filename, **Then** the spreadsheet loads and the sheet-selector dropdown populates — identical behaviour to the current "Load" button success path.
3. **Given** the dropdown is open, **When** the user taps outside the dropdown or taps "Recent ▾" again, **Then** the dropdown closes without loading any file.

---

### User Story 2 — Dropdown Shows While Files Are Loading (Priority: P2)

While the list of recent files is being fetched from Google Drive, the button
shows a loading indicator so the user knows to wait.

**Why this priority**: The fetch can take 1–2 seconds on mobile. Without feedback
the user may tap the button multiple times thinking it did not register.

**Independent Test**: Tap "Recent ▾" on a slow connection and verify a visual
loading state appears on the button.

**Acceptance Scenarios**:

1. **Given** the user taps "Recent ▾", **When** the Drive API call is in-flight, **Then** the button is disabled and displays "Loading…" (or a spinner) until results arrive.
2. **Given** the Drive API call completes, **When** results are returned, **Then** the button re-enables and the dropdown opens immediately.

---

### User Story 3 — Empty or Error State Handled Gracefully (Priority: P3)

If the user has no recent spreadsheets in Drive, or the API call fails, the app
displays a clear inline message and does not break the existing sign-in flow.

**Why this priority**: Edge case, but important for the primary user who may try
this on a new Google account or in an offline scenario.

**Independent Test**: Simulate zero results or a network error and verify the app
remains usable (sign-in state intact, other load methods still functional).

**Acceptance Scenarios**:

1. **Given** the Drive API returns zero spreadsheets, **When** the dropdown would open, **Then** an inline message "No recent spreadsheets found" appears instead of an empty list.
2. **Given** the Drive API call fails (network error, token expired), **When** the call returns an error, **Then** the status area shows a brief human-readable error message and the "Recent ▾" button returns to its enabled state so the user can retry.

---

### Edge Cases

- What if the user has more than 10 recent files — does the list scroll or paginate?
  (Assumption: list is capped at 10 items, no pagination for v1.)
- What happens when the token expires mid-session and the user taps "Recent ▾"?
  (Expected: error message prompts re-authentication.)
- What if a recently viewed file has been deleted from Drive?
  (Expected: loading that file surfaces a Drive export error, same as the current search path.)
- What if the dropdown is open and the user taps the sign-out button?
  (Expected: dropdown closes and the list is cleared.)
- On narrow viewports (cover screen of Samsung Fold, ~320 px), does the dropdown
  overflow or truncate? (Expected: dropdown spans the full row width; file names wrap
  to a second line rather than truncating.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: After successful Google sign-in, the setup section MUST display a
  "Recent ▾" button on its own dedicated row, separate from the Sign In / Load
  button row. The button MUST span the full available row width so that the
  dropdown it opens also spans the full width.
- **FR-002**: When the user activates the "Recent ▾" button, the app MUST fetch
  the 10 most recently viewed Google Drive spreadsheets belonging to the signed-in
  user, ordered by last-viewed date descending.
- **FR-003**: The fetched list MUST be displayed as a dismissible dropdown directly
  below the "Recent ▾" button, showing each file's name in full. File names MUST
  NOT be truncated with ellipsis; long names MUST wrap to a second line within the
  dropdown item rather than being cut off.
- **FR-004**: Selecting a file from the dropdown MUST load that spreadsheet and
  populate the sheet-selector — identical to the current successful "Load" outcome.
- **FR-005**: While the file list is being fetched, the "Recent ▾" button MUST be
  disabled and show a loading indicator.
- **FR-006**: If the fetch returns zero results or an error, the app MUST display
  an informative inline message and restore the button to an interactive state.
- **FR-007**: The dropdown MUST close when the user taps outside it, taps the
  button again, or selects a file.
- **FR-008**: The "Recent ▾" dropdown MUST NOT interfere with the existing sign-in
  flow, sheet-selector, or any other load method (Drop Folder, Drop File, Paste CSV).
- **FR-009**: The dropdown MUST be usable with touch-only input on a narrow
  viewport (≥ 320 px wide) with no horizontal scroll.
- **FR-010**: The "Recent ▾" button row MUST be visually distinct from the
  Sign In / search row — rendered as a separate block row with full container
  width so the dropdown list has maximum horizontal space.
- **FR-011**: Each dropdown item MUST display the complete file name. Text MUST
  wrap across multiple lines if needed; truncation (ellipsis or clipping) is NOT
  permitted.

### Key Entities

- **Recent File Entry**: A Drive spreadsheet record comprising a unique identifier,
  a display name, and a last-viewed timestamp. Used to populate the dropdown and
  to trigger a spreadsheet load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and begin reviewing a flashcard deck within 10 seconds
  of completing Google sign-in, without typing anything.
- **SC-002**: The recent-files list appears within 3 seconds of the user tapping
  "Recent ▾" on a standard mobile data connection.
- **SC-003**: 100% of tap interactions on dropdown items register correctly on a
  touch-only device (no mis-tap due to undersized targets).
- **SC-004**: All existing load methods (Drop Folder, Drop File, Paste CSV, Paste
  from Sheets, manual search) remain fully functional after this change — 0 regressions.
- **SC-005**: 100% of file names in the dropdown are fully readable without any
  truncation or horizontal scrolling, at a viewport width of 320 px.

## Assumptions

- The user is the sole user of this app; no multi-account switching is needed in v1.
- The existing Google OAuth token (`gdriveAccessToken`) is already obtained during
  sign-in and can be reused directly to call the Drive Files API.
- The list is limited to 10 items; no pagination UI is required.
- Only Google Sheets files (MIME type `application/vnd.google-apps.spreadsheet`)
  are shown; other Drive file types are excluded.
- The existing text-input + "Load" button search row MAY be retained as a fallback,
  or hidden to simplify the UI — this is an implementation decision deferred to planning.
- The app is deployed as static HTML on Vercel; no server-side changes are needed
  for the Drive API call (it is made client-side using the existing access token).
- Mobile-first layout is required (Samsung Galaxy Z Fold cover screen, ≈ 320 px wide).
