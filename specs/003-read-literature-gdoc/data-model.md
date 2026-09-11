# Data Model: Google Doc Import & Recent Docs for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## Entities

### RecentDoc

Represents a Google Docs file returned by the Drive Files API v3.

| Field            | Type   | Nullable | Notes |
|------------------|--------|----------|-------|
| id               | string | No       | Google Drive file ID (used in export URL) |
| name             | string | No       | Display name of the Google Doc |
| viewedByMeTime   | string | Yes      | ISO 8601 timestamp; used for ordering only, not displayed |

**Source**: `GET /drive/v3/files?q=mimeType='application/vnd.google-apps.document' and trashed=false&orderBy=viewedByMeTime+desc&pageSize=10&fields=files(id,name,viewedByMeTime)`

**Lifetime**: In-memory only; fetched fresh on each "Recent ▾" click.

---

### GdocAuthState

Represents the current authentication state in the page.

| Field             | Type    | Values |
|-------------------|---------|--------|
| gdriveAccessToken | string  | `''` (unauthenticated) or OAuth Bearer token string |

**Transitions**:
```
unauthenticated  ──sign-in success──►  authenticated
authenticated    ──sign-out click──►   unauthenticated
```

**Lifetime**: In-memory (module-level variable). Cleared on page reload.

---

### RecentDropdownState

Represents the UI state of the Recent Docs dropdown.

| State    | Description |
|----------|-------------|
| idle     | Button enabled, dropdown hidden |
| loading  | Button disabled, label "Loading…", dropdown hidden |
| open     | Button enabled, dropdown visible with file list |
| error    | Button enabled, dropdown hidden, status message shown |

**Transitions**:
```
idle    ──click recentBtn──►  loading
loading ──API success──►      open
loading ──API error──►        error (→ idle)
open    ──select item──►      idle (import starts)
open    ──tap outside──►      idle
open    ──click recentBtn──►  idle (toggle close)
error   ──(auto)──►           idle
```

---

## In-Memory Data (pre-existing, unchanged)

The following arrays are already managed by `read-literature.html` and are not changed by this feature:

| Variable  | Type   | Description |
|-----------|--------|-------------|
| `people`  | Array  | Character/person entries |
| `chapters`| Array  | Chapter entries |

Google Doc import populates these arrays by calling the existing `importTxt()` function after fetching the document's plain-text content.
