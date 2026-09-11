# Feature Specification: Recent Files Picker & Expanded Setup for learn-google

**Feature Branch**: `002-learn-google-recent-picker`

**Created**: 2026-09-10

**Status**: Draft

**Input**: Port the "Recent ▾" dropdown from `learn-chinese-tts.html` into `learn-google.html`,
and change the Google Sheets setup section so it starts expanded (visible) instead of collapsed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Pick a Recent File After Sign-In (Priority: P1)

The user opens `learn-google.html`, taps "Sign In" with Google, and is immediately
shown a "Recent ▾" button on its own dedicated row. Tapping it reveals a dropdown list
of the 10 most recently viewed spreadsheets from their Drive. They tap one and it loads —
no typing required.

**Why this priority**: Eliminates the need to remember and type a spreadsheet name.
Identical benefit to the recently delivered feature in `learn-chinese-tts.html`.

**Independent Test**: After signing in, the dropdown appears and selecting any item
loads the flashcard data via the existing sheet pipeline. Delivers full value without
any other story.

**Acceptance Scenarios**:

1. **Given** the user is signed out, **When** they tap "Sign In" and complete Google auth,
   **Then** a "Recent ▾" button appears on its own dedicated row in the Google Sheets
   setup section, enabled and ready to expand.
2. **Given** the recent-files dropdown is visible, **When** the user taps a filename,
   **Then** the spreadsheet loads and the sheet-selector dropdown populates — identical
   behaviour to the current "Load" button success path.
3. **Given** the dropdown is open, **When** the user taps outside the dropdown or taps
   "Recent ▾" again, **Then** the dropdown closes without loading any file.

---

### User Story 2 — Setup Section Starts Expanded (Priority: P2)

The Google Sheets setup section ("Load from Google Sheets") opens fully visible on page
load, without the user needing to tap the toggle to expand it.

**Why this priority**: Reduces the number of taps required to reach the sign-in button.
Currently the user must first expand the section before they can tap Sign In.

**Independent Test**: Open the page and confirm the Google Sheets setup body is immediately
visible without any interaction.

**Acceptance Scenarios**:

1. **Given** the user opens `learn-google.html`, **When** the page finishes loading,
   **Then** the Google Sheets setup section is fully expanded — the setup body is visible
   and the toggle arrow shows ▼ (not ▶).
2. **Given** the setup section is expanded, **When** the user taps the toggle header,
   **Then** the section collapses (existing behaviour preserved).
3. **Given** the setup section is collapsed, **When** the user taps the toggle header,
   **Then** the section expands again (existing behaviour preserved).

---

### User Story 3 — Dropdown Shows While Files Are Loading (Priority: P3)

While the list of recent files is being fetched, the button shows a loading indicator.

**Acceptance Scenarios**:

1. **Given** the user taps "Recent ▾", **When** the Drive API call is in-flight,
   **Then** the button is disabled and displays "Loading…" until results arrive.
2. **Given** the Drive API call completes, **When** results are returned,
   **Then** the button re-enables and the dropdown opens.

---

### User Story 4 — Empty or Error State Handled Gracefully (Priority: P4)

If no recent spreadsheets are found or the API call fails, the app shows a clear
inline message and does not break the existing sign-in flow.

**Acceptance Scenarios**:

1. **Given** the Drive API returns zero spreadsheets, **When** the dropdown would open,
   **Then** an inline message "No recent spreadsheets found" appears instead of an empty list.
2. **Given** the Drive API call fails, **When** the call returns an error,
   **Then** the status area shows a brief human-readable error message and the "Recent ▾"
   button returns to its enabled state so the user can retry.

---

### Edge Cases

- Narrow viewport (≥320 px): dropdown spans the full row width; file names wrap to a
  second line rather than truncating.
- Sign-out while dropdown is open: dropdown closes and button is disabled.
- Token expires between sign-in and "Recent ▾" tap: error message prompts re-authentication.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: On page load, the Google Sheets setup section MUST be fully expanded
  (visible) and the toggle arrow MUST display ▼.
- **FR-002**: After successful Google sign-in, the setup section MUST display a
  "Recent ▾" button on its own dedicated row, separate from the Sign In / Load row.
  The button MUST span the full available row width.
- **FR-003**: When the user activates the "Recent ▾" button, the app MUST fetch
  the 10 most recently viewed Google Drive spreadsheets belonging to the signed-in
  user, ordered by last-viewed date descending.
- **FR-004**: The fetched list MUST be displayed as a dismissible dropdown directly
  below the "Recent ▾" button, showing each file's name in full. File names MUST
  NOT be truncated; long names MUST wrap to a second line.
- **FR-005**: Selecting a file from the dropdown MUST load that spreadsheet and
  populate the sheet-selector — identical to the current successful "Load" outcome.
- **FR-006**: While the file list is being fetched, the "Recent ▾" button MUST be
  disabled and show a loading indicator.
- **FR-007**: If the fetch returns zero results or an error, the app MUST display
  an informative inline message and restore the button to its enabled state.
- **FR-008**: The dropdown MUST close when the user taps outside it, taps the
  button again, or selects a file.
- **FR-009**: The "Recent ▾" dropdown MUST NOT interfere with the existing sign-in
  flow, sheet-selector, or any other load method.
- **FR-010**: The dropdown MUST be usable with touch-only input on a narrow
  viewport (≥320 px) with no horizontal scroll. Tap targets MUST be ≥44 px tall.

### Key Entities

- **Recent File Entry**: A Drive spreadsheet record comprising a unique identifier,
  a display name, and a last-viewed timestamp. Used to populate the dropdown and
  to trigger a spreadsheet load.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On page load, the Google Sheets setup section is immediately visible
  without any user interaction — 0 additional taps required to reach Sign In.
- **SC-002**: Users can select and begin reviewing a flashcard deck within 10 seconds
  of completing Google sign-in, without typing anything.
- **SC-003**: The recent-files list appears within 3 seconds of the user tapping
  "Recent ▾" on a standard mobile data connection.
- **SC-004**: 100% of tap interactions on dropdown items register correctly on a
  touch-only device (no mis-tap due to undersized targets).
- **SC-005**: All existing load methods (manual name search, sheet-selector) remain
  fully functional after this change — 0 regressions.
- **SC-006**: 100% of file names in the dropdown are fully readable without any
  truncation or horizontal scrolling, at a viewport width of 320 px.

## Assumptions

- The existing Google OAuth token (`gdriveAccessToken`) is already obtained during
  sign-in and can be reused directly to call the Drive Files API.
- The list is limited to 10 items; no pagination UI is required.
- Only Google Sheets files (MIME type `application/vnd.google-apps.spreadsheet`)
  are shown; other Drive file types are excluded.
- The existing text-input + "Load" button search row is retained as a fallback.
- The app is deployed as static HTML on Vercel; no server-side changes are needed.
- Mobile-first layout is required (Samsung Galaxy Z Fold cover screen, ≈320 px wide).
- All changes are confined to `learn-google.html` only.
