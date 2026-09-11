# Data Model: Mobile UX, Navbar & Outline Mode for read-literature

**Feature**: [spec.md](spec.md)
**Created**: 2026-09-10

---

## New In-Memory State (module-level variables)

### AppUiState

Tracks UI preferences and current mode. All state is in-memory; font size and theme persist to localStorage.

| Variable         | Type    | Default       | Persistence   | Description |
|------------------|---------|---------------|---------------|-------------|
| `_outlineMode`   | boolean | `false`       | Session only  | Whether outline mode is active globally |
| `_allExpanded`   | boolean | `false`       | Session only  | Whether all nodes were last expanded via navbar button |
| `_loadedDocId`   | string  | `null`        | Session only  | Drive file ID of the last successfully imported Google Doc |
| `_loadedDocName` | string  | `null`        | Session only  | Display name of that document |

### FontSizeState

| localStorage key | Type   | Range      | Default | Description |
|------------------|--------|------------|---------|-------------|
| `'litFontSize'`  | number | 12–24 (px) | 15      | Base font size; applied to `--app-font-size` on load |

### ThemeState

| localStorage key | Type   | Values           | Default (computed)  | Description |
|------------------|--------|------------------|---------------------|-------------|
| `'litTheme'`     | string | `'light'|'dark'` | `prefers-color-scheme` | Active theme; drives `data-theme` on `<html>` |

---

## Outline Rendering (transient DOM)

Each `.node-body` gets one additional element in outline mode:

### OutlineView (DOM element)

| Attribute       | Value                          | Notes |
|-----------------|--------------------------------|-------|
| `data-outline`  | (present)                      | Marker used by JS to find/show/hide the view |
| tag             | `div`                          | Sibling of the `<textarea>` inside `.node-body` |
| content         | `<ul class="outline-list">…`   | Generated from textarea text; read-only |

**OutlineItem** (each `<li>` inside the list):

| Property      | Type   | Description |
|---------------|--------|-------------|
| `text`        | string | Trimmed line content |
| `indentLevel` | 0–2    | 0 = top-level; 1 = line starts with 2+ spaces or tab; 2 = line starts with 4+ spaces or 2 tabs |

---

## Google Doc Save (transient state)

### SaveConfirmState

| State    | Description |
|----------|-------------|
| hidden   | Confirmation panel not visible (`display: none`) |
| visible  | Panel shows doc name + Cancel + Overwrite buttons |
| saving   | Overwrite button disabled, label "Saving…" |
| success  | Panel auto-hides; status message set |
| error    | Panel stays visible or hides; error message set |

**Transitions**:
```
hidden ──click "Save to Doc"──► visible
visible ──Cancel click──► hidden
visible ──Overwrite click──► saving
saving ──API success──► success → hidden
saving ──API error──► error → visible (re-enabled)
```

---

## CSS Variables (new and modified)

### New variable

| Variable          | Light value | Dark value  | Purpose |
|-------------------|-------------|-------------|---------|
| `--app-font-size` | `15px`      | (same)      | Base font size controlled by navbar A−/A+ |

### Dark mode overrides (on `[data-theme="dark"]`)

| Variable        | Dark value  |
|-----------------|-------------|
| `--paper`       | `#1a1a1a`   |
| `--paper-raised`| `#242424`   |
| `--ink`         | `#e8e0d0`   |
| `--ink-soft`    | `#9e9688`   |
| `--oxblood`     | `#c96b6b`   |
| `--teal`        | `#5a9e9c`   |
| `--gold`        | `#c8a050`   |
| `--line`        | `#3a3530`   |
