# Feature Specification: Google Doc Voice Notes

**Feature Branch**: `006-gdoc-voice-notes`

**Created**: 2026-09-11

**Status**: Draft

**Input**: User description: "Add a new page to the flashcards app for voice note-taking against a Google Drive Doc. Flow: user signs in with Google (OAuth token client, same pattern as vercel_google_drive's DriveSearch.js), the page fetches their most recently viewed Google Docs (and Sheets) via the Drive API and lists them in a dropdown (equivalent to the 'Recent' picker already used for Google Sheets in learn-google.html/learn-chinese-tts.html, but scoped to Drive 'recent files' ordered by viewedByMeTime, mimeType Docs/Sheets). Selecting a file and clicking 'Edit' loads its content into an editable note page. While on this edit/note page, the user can use a mic/record button to record voice notes; recorded notes should be transcribed and inserted into the note content so the user can take notes into the doc both by typing and by voice while reviewing the selected file. Must support saving the edited content back to the same Google Doc."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sign in and pick a recent Google Doc (Priority: P1)

A user opens the new notes page, signs in with their Google account, and sees a dropdown of the Google Docs (and Sheets) they've opened most recently, without having to search for or paste a link to the file.

**Why this priority**: Nothing else in this feature works until the user can authenticate and get to their file. This is the entry point and the minimum viable slice — it's already independently valuable as a "jump back into my last doc" shortcut.

**Independent Test**: Can be fully tested by signing in, confirming the recent-files list appears populated with real titles, and selecting one to load its content read-only. Delivers value on its own even before edit/voice features exist.

**Acceptance Scenarios**:

1. **Given** the user is not signed in, **When** they open the page, **Then** they see a "Sign In" control and no file list.
2. **Given** the user signs in successfully, **When** the page requests their recent files, **Then** a dropdown/list of their most recently viewed Google Docs and Sheets appears, most-recent first.
3. **Given** the recent list is showing, **When** the user selects a file, **Then** the file's content loads into view on the page within a few seconds.
4. **Given** the user is signed in but has no recent Docs/Sheets, **When** the list loads, **Then** the page shows a clear "no recent files found" message instead of an empty or broken dropdown.

---

### User Story 2 - Edit a note and save it back to the same Google Doc (Priority: P1)

After loading a file, the user switches into an edit view, types notes directly into the document text, and saves — updating the original Google Doc in place.

**Why this priority**: Typed note-taking with save-back is the core "notes" capability the page exists for; voice input (US3) is an alternate way to get text in, but typing + saving must work first.

**Independent Test**: Can be fully tested by loading a known test Doc, entering edit mode, changing the text, saving, and confirming (by reloading the Doc in Google Docs directly) that the change persisted.

**Acceptance Scenarios**:

1. **Given** a file is loaded, **When** the user clicks "Edit", **Then** the content becomes an editable text area pre-filled with the file's current content.
2. **Given** the user is editing, **When** they type additional notes and click "Save", **Then** the system writes the updated content back to the same Google Doc and confirms success to the user.
3. **Given** a save is in progress, **When** the network or API call fails, **Then** the user sees a clear error message and their edits remain visible on the page (not lost).
4. **Given** the user has unsaved edits, **When** they try to leave the page or load a different file, **Then** they are warned that unsaved changes will be discarded.

---

### User Story 3 - Take a voice note that gets transcribed into the doc (Priority: P2)

While viewing or editing a loaded file, the user taps a mic/record button to speak a note. Tapping the mic immediately applies any in-progress typed edits and drops the page into View mode — recording and transcription happen entirely in View mode, and the spoken words appear as text appended to the note content once transcription finishes, ready to save or to keep adding to (by typing or recording again).

**Why this priority**: This is the differentiating capability of the page (hands-free note capture) but depends on US1 and US2 already working; it extends rather than replaces typed notes. Recording and transcribing exclusively in View mode (rather than inside a live Edit textarea) keeps the interaction simple: the note content is a single static value while a recording/transcription is in flight, with no in-progress typing to reconcile against an async result.

**Independent Test**: Can be fully tested by opening a loaded file, recording a short spoken phrase, confirming the page switches to View mode and the matching transcribed text appears appended to the note content, then saving and verifying it persisted to the Google Doc (per US2's save path).

**Acceptance Scenarios**:

1. **Given** the user is in Edit mode with unsaved typed text, **When** they tap the mic button, **Then** the typed text is applied to the note content, the page switches to View mode, and the page requests microphone access (if not already granted) and visibly indicates that recording is active.
2. **Given** the user is already in View mode, **When** they tap the mic button, **Then** the page requests microphone access (if not already granted) and visibly indicates that recording is active, with no mode switch needed.
3. **Given** recording is active, **When** the user taps the mic button again to stop, **Then** the recorded audio is sent for transcription and the page shows a "transcribing…" state while remaining in View mode.
4. **Given** transcription succeeds, **When** the text comes back, **Then** it is appended to the View-mode note content (with a line break separating it from existing text) without erasing or reordering the user's existing notes, and without automatically re-entering Edit mode.
5. **Given** transcription fails (network error, empty/unintelligible audio, etc.), **When** the failure occurs, **Then** the user sees a clear error message, no partial/garbled text is inserted, the page remains in View mode, and they can retry recording.
6. **Given** the user records multiple voice notes in one session (in View mode, with or without switching to Edit and back in between), **When** each finishes transcribing, **Then** each transcript is appended in order, so a session of several voice notes plus typed notes all end up in the note content together.
7. **Given** the browser or device denies microphone permission, **When** the user taps the mic button, **Then** the page explains that microphone access is required, does not show a stuck/silent failure, and does not switch to View mode if a switch would discard nothing new (no-op on denial while already in View mode; typed edits already applied if the switch already happened per Scenario 1).

---

### Edge Cases

- What happens if the selected Google Doc was modified elsewhere (e.g., directly in Google Docs) after it was loaded into the note page but before the user saves? (System does not currently detect this — see Assumptions; last save wins.)
- What happens if the user selects a Google Sheet from the recent list instead of a Doc? Editing/voice-note behavior for Sheets is out of scope for this feature (see Assumptions) — selecting one should not crash the page.
- What happens if the user's Google sign-in session expires mid-edit or mid-recording? The user should be prompted to re-authenticate without losing their in-progress note text.
- What happens if a voice recording is very long or silent for a long time? The system should still return either a transcript or a clear failure, not hang indefinitely.
- What happens if the user records a voice note but never saves before leaving the page? The unsaved-changes warning from US2 covers this — the transcribed text is part of the note content and is lost the same way any unsaved typed edit would be.
- What happens if the user taps the mic button again while a previous recording is still transcribing? The system should either queue/disable a second recording until the first transcript is appended, or clearly indicate a second recording is in progress — it must not let two in-flight transcriptions race and append out of order.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST let the user sign in with their Google account before showing any file content or recent-files list.
- **FR-002**: System MUST fetch and display the user's most recently viewed Google Docs and Sheets, ordered most-recent-first, after sign-in.
- **FR-003**: System MUST let the user select one file from the recent list and load its current text content into the page.
- **FR-004**: System MUST let the user enter an edit mode in which the loaded content is directly editable as text.
- **FR-005**: System MUST let the user save edited content back to the same Google Doc they loaded it from, overwriting its prior content with the edited version.
- **FR-006**: System MUST confirm to the user when a save succeeds and show a clear, specific error message when a save fails, without discarding the user's unsaved edits.
- **FR-007**: System MUST provide a microphone record control, available in both View and Edit mode, which starts and stops audio recording on tap/click.
- **FR-007a**: System MUST, when the mic control is tapped while in Edit mode, apply the current typed content to the note and switch to View mode before recording begins; recording and transcription MUST always proceed in View mode.
- **FR-007b**: System MUST prevent starting a second recording while a prior recording's transcription is still in progress, so transcripts cannot be appended out of order.
- **FR-008**: System MUST send recorded audio for speech-to-text transcription and append the resulting text to the note content once transcription completes.
- **FR-009**: System MUST show the user a visible state while recording is active and while transcription is in progress, so they always know whether the system is listening, working, idle, or has failed.
- **FR-010**: System MUST surface a clear, specific error message if recording or transcription fails (e.g., microphone permission denied, no network, transcription service error) and MUST NOT insert partial or corrupted text into the note.
- **FR-011**: System MUST support multiple voice notes being recorded and transcribed in sequence within a single session, appending each new transcript to the existing note content in the order recorded.
- **FR-012**: System MUST warn the user before they navigate away from the page or load a different file while unsaved edits (typed or voice-transcribed) exist.
- **FR-013**: System MUST NOT transmit or store the user's Google API credentials or the transcription service's credentials in a way that exposes them to other users of the page.

### Key Entities

- **Recent File**: A Google Drive item (Doc or Sheet) the user has viewed recently — has a name, a Drive file identifier, a type (Doc/Sheet), and a last-viewed time used for ordering.
- **Note Session**: The in-progress editing state for one loaded file — the original content, the currently edited content, and whether there are unsaved changes.
- **Voice Note**: One recorded-and-transcribed segment — has a recording duration, a transcription status (recording / transcribing / done / failed), and the resulting text once transcription succeeds.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can go from opening the page to viewing the content of their most recently used Google Doc in under 15 seconds (after having signed in once previously).
- **SC-002**: A user can record a short (under 30-second) voice note and see its transcribed text appear in the note within 10 seconds of stopping the recording, under normal network conditions.
- **SC-003**: 100% of successful saves are verifiable by reopening the same Google Doc directly in Google Docs and finding the edited content present.
- **SC-004**: Users encounter zero data loss of typed or voice-transcribed note content due to a failed save — every save failure leaves the content visibly intact on the page for retry.
- **SC-005**: At least 90% of clear, single-speaker voice notes recorded in a quiet environment are transcribed accurately enough that the user does not need to manually correct more than a couple of words.

## Assumptions

- The user already has (or will create) a Google Cloud OAuth client and, separately, an OpenAI API key with access to transcription; provisioning those credentials is out of scope for this feature's UX but a working configuration is a prerequisite for testing.
- Audio recorded for a voice note is used only to produce a transcript and is not required to be permanently retained after successful transcription (no separate long-term audio archive/playback feature is in scope here); this differs from the app's existing unrelated `recordBtn` feature, which does keep the audio file.
- Editing and voice notes apply to Google Docs; Google Sheets may appear in the recent-files list for parity with the existing "Recent" picker pattern elsewhere in the app, but full edit/voice-note support for Sheets content is out of scope for this feature.
- Only one Google Doc is open for editing at a time (no multi-doc/tabbed editing in this feature).
- The feature does not attempt to detect or merge concurrent edits made directly in Google Docs while a note session is open; saving simply overwrites the Doc with the page's current content ("last save wins").
- Standard web microphone permission prompts and browser support (a modern desktop or mobile browser with microphone access) are assumed; no support for browsers without microphone API access is required.
- This is a single-user personal tool (as with the rest of this app); no multi-user access control, sharing, or collaboration features are in scope.
