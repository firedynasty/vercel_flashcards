# Data Model: Google Drive Recent Files Picker

**Feature**: `001-gdrive-recent-picker`
**Date**: 2026-09-10

---

## Entities

### RecentFile

Represents a single Google Sheets spreadsheet entry returned by the Drive API.

| Field              | Type    | Source              | Notes                                              |
|--------------------|---------|---------------------|----------------------------------------------------|
| `id`               | string  | Drive API response  | Unique Drive file ID; passed to `loadSpreadsheet()` |
| `name`             | string  | Drive API response  | Display name shown in the dropdown                  |
| `viewedByMeTime`   | string  | Drive API response  | ISO 8601 timestamp; used for ordering (desc)        |

**Validation rules**:
- `id` MUST be a non-empty string before `loadSpreadsheet()` is called.
- `name` MAY be empty (Drive allows unnamed files); display as `"(untitled)"` in that case.
- If the API returns a file without an `id`, it MUST be excluded from the dropdown list.

---

### RecentFilesState (runtime, in-memory only)

Tracks the lifecycle of the dropdown within the current page session. Not persisted.

| Field            | Type              | Initial value | Description                                       |
|------------------|-------------------|---------------|---------------------------------------------------|
| `files`          | RecentFile[]      | `[]`          | Last successfully fetched list                     |
| `isOpen`         | boolean           | `false`       | Whether the dropdown is currently visible          |
| `isLoading`      | boolean           | `false`       | Whether a Drive API fetch is in-flight             |
| `error`          | string \| null    | `null`        | Last error message; cleared on next fetch attempt  |

**State transitions**:

```
[closed, idle]
  → user taps "Recent ▾"
  → [closed, loading] — button disabled, label = "Loading…"
  → fetch succeeds → [open, idle] — dropdown visible, files populated
  → fetch fails   → [closed, error] — button re-enabled, error shown in #status

[open, idle]
  → user selects file → [closed, idle] — loadSpreadsheet() called
  → user taps "Recent ▾" again → [closed, idle]
  → user taps outside → [closed, idle]
  → user signs out → [closed, idle] — files list cleared
```

---

## Relationships to Existing Entities

| Existing entity       | Relationship                                              |
|-----------------------|-----------------------------------------------------------|
| `gdriveAccessToken`   | Required for the Drive API call; already managed by sign-in flow |
| `gdriveSpreadsheetId` | Set to `RecentFile.id` when user selects a file          |
| `#sheetSelect`        | Populated by `loadSpreadsheet()` after file is selected  |
| `#status` div         | Receives error and loading messages from this feature     |
| `#searchBtn`          | Remains functional as a fallback; not removed             |
| `#searchInput`        | Remains visible as a fallback text search                 |
