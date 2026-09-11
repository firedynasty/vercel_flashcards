# Research: Google Doc Import & Recent Docs for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## Decision 1: Google Docs API vs Drive Export for plain-text fetch

**Decision**: Use the Google Drive Files export endpoint (`GET /drive/v3/files/{fileId}/export?mimeType=text/plain`) rather than the Google Docs API v1.

**Rationale**: The Drive export endpoint returns a single plain-text string that can be passed directly to the existing `parseExport()` function. The Docs API v1 returns a structured JSON object (`document.body.content[].paragraph.elements[].textRun.content`), which would require a custom walker to reassemble plain text — more code, more failure modes, same result.

**Alternatives considered**:
- Docs API v1 (`GET https://docs.googleapis.com/v1/documents/{id}`): More expressive but unnecessary complexity for a plain-text parse use case.
- Drive API `files.get` with `alt=media`: Only works for binary files, not Google Docs native format.

---

## Decision 2: OAuth Scope

**Decision**: Request `https://www.googleapis.com/auth/drive.readonly`.

**Rationale**: This scope covers both `files.list` (for Recent ▾) and `files.export` (for document fetch). It is the same scope already used by `learn-google.html`, enabling potential client-ID reuse.

**Alternatives considered**:
- `https://www.googleapis.com/auth/documents.readonly`: Docs-API-only scope; insufficient for Drive `files.list` calls.
- `https://www.googleapis.com/auth/drive`: Full Drive access — over-privileged for a read-only import feature.

---

## Decision 3: Doc ID extraction from clipboard URL

**Decision**: Extract the document ID with the regex `/\/document\/d\/([a-zA-Z0-9_-]+)/`.

**Rationale**: All Google Doc URLs follow the pattern `https://docs.google.com/document/d/{ID}/edit` (or `/view`, `/preview`). The ID segment consists of alphanumeric characters, hyphens, and underscores. A simple regex is sufficient; no URL-parsing library is needed.

**Alternatives considered**:
- `URL` constructor + pathname splitting: More robust but adds verbosity for a predictable URL pattern.
- Full-URL match requiring `docs.google.com` host: Too strict — avoids breaking if Google ever changes subdomain.

**Detection logic**:
```javascript
function extractGDocId(text) {
  var m = text.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
```
If the regex returns null → fall back to existing `importTxt(text)` plain-text parse.

---

## Decision 4: Fallback when not signed in or no Google Doc URL

**Decision**: Preserve the existing `#pasteImportBtn` clipboard-text import exactly when either (a) the user is not signed in, or (b) the clipboard does not contain a Google Doc URL.

**Rationale**: Existing behaviour is useful and tested. Progressive enhancement means Google-augmented behaviour layers on top without breaking what already works.

**Detection order in click handler**:
1. Read clipboard text.
2. `extractGDocId(text)` → if truthy AND signed in → Drive export path.
3. Otherwise → call existing `importTxt(text)`.

---

## Decision 5: GIS auth wiring in read-literature.html

**Decision**: Model the auth setup after `learn-google.html`. Use `google.accounts.oauth2.initTokenClient()` with `callback` for the token response. Store token in a module-level variable `gdriveAccessToken`. Wire the sign-in button toggle the same way.

**Key adapter differences from learn-google.html**:
- No spreadsheet/sheet selectors → simpler HTML.
- Status helper: add a new `<p id="gdocStatus">` element and a `setGdocStatus(msg)` helper (instead of `setGStatus()`).
- No `gdriveSearch()` function needed.
- Load function: `gdocImport(fileId)` (instead of `gdriveLoadSpreadsheet()`).
- Recent button enable wire: inside the GIS token callback (same pattern as `gdriveInitClient()` in `learn-google.html`).

---

## Decision 6: Recent docs query

**Decision**: Use Drive Files API v3 with `q=mimeType='application/vnd.google-apps.document' and trashed=false`, `orderBy=viewedByMeTime desc`, `pageSize=10`, `fields=files(id,name,viewedByMeTime)`.

**Rationale**: Identical pattern to the Sheets recent picker in `learn-google.html` and `learn-chinese-tts.html`, substituting the mime type for Google Docs. This consistency makes the code predictable and easy to port.

---

## Decision 7: Status element placement

**Decision**: Add a `<p id="gdocStatus" class="gdoc-status"></p>` element inside the Google Docs setup section, immediately below the button row. `setGdocStatus(msg)` sets its `textContent`; an empty string clears it.

**Rationale**: Inline status avoids interrupting the user's view of the reading map. No alert dialogs (constitution Principle II — touch-first UX).

---

## Decision 8: CSS approach

**Decision**: Reuse the `.recent-dropdown-wrapper`, `.recent-dropdown`, `.recent-dropdown-item` CSS classes from `learn-google.html` / `learn-chinese-tts.html`, and add a minimal setup section styled to match `read-literature.html`'s parchment/book aesthetic (`--paper`, `--ink`, `--line` variables).

**Rationale**: The dropdown CSS is already validated on mobile. The setup section needs its own minimal styling that blends with the existing page theme rather than reusing the teal `.setup-section` from the flashcard files.
