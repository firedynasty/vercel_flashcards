# Data Model: Google Doc Voice Notes

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-11

All entities below are in-memory client-side JS state in `googlenotes.html` — there is no
database and nothing is persisted outside the Google Doc itself and (transiently) the browser tab.

---

## RecentFile

Represents one item in the "Recent ▾" dropdown (spec: *Recent File*).

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Google Drive file ID. |
| `name` | string | Display name shown in the dropdown. |
| `mimeType` | string | `application/vnd.google-apps.document` or `.spreadsheet`. Determines whether Edit/Save/mic controls are enabled after load (Docs only — see spec Assumptions) or the item loads read-only. |
| `viewedByMeTime` | string (ISO 8601) | Used only for the `orderBy` sort already applied server-side by the Drive API query; not displayed. |

**Source**: `GET drive/v3/files?q=...` response (`files[]`), per research.md Decision 3.

---

## NoteSession

Represents the single in-progress editing session for the currently loaded file (spec: *Note
Session*). Exactly one exists at a time; loading a different file replaces it (after the
unsaved-changes warning, FR-012).

| Field | Type | Notes |
|-------|------|-------|
| `fileId` | string \| null | The loaded file's Drive ID. `null` before any file is loaded. |
| `fileName` | string | For display in the page header/status. |
| `mimeType` | string | Copied from the `RecentFile` selected. |
| `originalContent` | string | Content as last successfully loaded from or saved to the Doc. Used to detect unsaved changes (`content !== originalContent`). |
| `content` | string | The current note text — what's shown in View mode and what Save writes back. This is the field voice-note transcripts get appended to (FR-008). |
| `mode` | enum: `"view"` \| `"edit"` | Drives which UI is shown. Starts at `"view"` on load. A mic tap while `mode === "edit"` synchronously sets `content` from the live textarea value and forces `mode = "view"` *before* recording starts (FR-007a). |
| `saving` | boolean | True while a Save request is in flight; disables the Save button and other content-mutating actions to avoid racing a save against an in-flight transcript append. |
| `dirty` | boolean (derived) | `content !== originalContent`. Drives the `beforeunload` warning (FR-012) and the "discard unsaved changes?" prompt when switching files. |

**State transitions**:

```text
(no file loaded)
   │ user selects a RecentFile
   ▼
mode = "view", content = originalContent = <fetched text>
   │ user taps "Edit"                              │ user taps mic (see VoiceNote below)
   ▼                                                ▼
mode = "edit" (textarea editable)         content updated in place, mode stays "view"
   │ user taps "Edit" again (toggle off)
   ▼
mode = "view", content = <textarea value> (applied, not yet saved)
   │ user taps "Save"
   ▼
Docs API batchUpdate(content) → on success: originalContent = content, saving = false
                               → on failure: originalContent unchanged, content unchanged,
                                 error shown (FR-006), user can retry
```

---

## VoiceNote

Represents one record→stop→transcribe→append cycle (spec: *Voice Note*). Not retained as a list
after appending — each cycle's state is transient UI state that resets to idle once its text lands
in `NoteSession.content` (or fails).

| Field | Type | Notes |
|-------|------|-------|
| `status` | enum: `"idle"` \| `"recording"` \| `"transcribing"` \| `"failed"` | Drives the mic button's visual state and whether a new recording can start. Only `"idle"` (or a fresh page/file load) allows starting a new recording — this is FR-007b, preventing two overlapping transcriptions. |
| `startedAt` | timestamp \| null | Set when recording starts; used only for an optional elapsed-time indicator. |
| `blob` | Blob \| null | The recorded audio (`MediaRecorder` output), held only between "stop" and receiving the transcription response. Discarded after use — not persisted (spec Assumption: no long-term audio archive). |
| `errorMessage` | string \| null | Set on failure (mic permission denied, network error, transcription service error); cleared when a new recording starts. |

**State transitions**:

```text
idle ──(mic tap; if NoteSession.mode === "edit", apply+switch to view first, FR-007a)──▶ recording
recording ──(mic tap again = "stop")──▶ transcribing
transcribing ──(POST /api/transcribe succeeds)──▶ idle, NoteSession.content += "\n\n" + text
transcribing ──(request fails)──▶ failed, errorMessage set, NoteSession.content unchanged
failed ──(mic tap = retry)──▶ recording
recording ──(mic permission denied)──▶ failed, errorMessage set (no transcribing state entered)
```

While `status` is `"recording"` or `"transcribing"`, the mic control is disabled to further
recording starts (only the in-progress action's own "stop" affordance is active) — this is the
concrete mechanism behind FR-007b.
