# Data Model: Recent Files Picker for learn-google

**Feature**: `002-learn-google-recent-picker`
**Date**: 2026-09-10

---

## Entities

### RecentFile

Represents a single Google Sheets spreadsheet returned by the Drive Files API.

| Field           | Type   | Source           | Notes                              |
|-----------------|--------|------------------|------------------------------------|
| `id`            | string | Drive API        | Unique file ID, passed to `gdriveLoadSpreadsheet()` |
| `name`          | string | Drive API        | Display name shown in dropdown     |
| `viewedByMeTime`| string | Drive API        | ISO 8601 timestamp; used for ordering (not displayed) |

Validation rules:
- `id` MUST be a non-empty string (Drive guarantees this for valid files)
- `name` MUST be a non-empty string; displayed in full (no truncation)
- `viewedByMeTime` MAY be absent if the user has never opened the file via the Drive UI

---

### RecentFilesState (in-memory, not persisted)

Tracks the UI state of the recent-files feature.

| State         | Description                                          |
|---------------|------------------------------------------------------|
| `idle`        | Button shows "Recent ▾", enabled (after sign-in)     |
| `loading`     | Button shows "Loading…", disabled; API call in-flight |
| `open`        | Dropdown is visible with file list or empty message  |
| `error`       | API call failed; status area shows error; button idle |

State transitions:
```
idle → loading  (user taps "Recent ▾")
loading → open  (API returns ≥0 results)
loading → error (API call throws or returns non-OK)
open → idle     (user taps outside, taps button again, or selects a file)
error → loading (user taps "Recent ▾" again)
```

---

## Notes

- The `RecentFile` list is held only in the closure of `openRecentDropdown()` and
  released when the dropdown closes. No localStorage or session storage is used.
- The `gdriveAccessToken` variable (already global in `learn-google.html`) is read
  directly by `fetchRecentFiles()`.
