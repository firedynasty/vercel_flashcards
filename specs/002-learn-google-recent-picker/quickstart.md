# Quickstart: Recent Files Picker & Expanded Setup for learn-google

**Feature**: `002-learn-google-recent-picker`
**Date**: 2026-09-10
**Target file**: `learn-google.html`

---

## Prerequisites

- Google OAuth client ID configured (same as existing setup)
- At least one Google Sheets spreadsheet in your Drive that has been recently viewed
- A browser with ≥320 px viewport (or DevTools mobile emulation)

---

## Setup

Open `learn-google.html` directly in a browser (file:// or served via local server or
the Vercel preview URL).

---

## Validation Scenarios

### Scenario 1 — Page Load: Setup Section Starts Expanded

**Steps**:
1. Open `learn-google.html`

**Expected**:
- The "Load from Google Sheets" section is immediately visible (not collapsed)
- The toggle arrow shows ▼
- No tap required to reveal the Sign In button

**Pass / Fail**: ___

---

### Scenario 2 — Toggle Still Works After Change

**Steps**:
1. Open `learn-google.html` (section starts expanded)
2. Tap the "Load from Google Sheets" header

**Expected**:
- Section collapses, arrow changes to ▶

**Steps (continued)**:
3. Tap the header again

**Expected**:
- Section expands, arrow changes to ▼

**Pass / Fail**: ___

---

### Scenario 3 — Sign In Enables Recent ▾ Button

**Steps**:
1. Open `learn-google.html`
2. Tap "Sign In" and complete Google auth

**Expected**:
- "Recent ▾" button appears on its own row below the Sign In / Load row
- Button is enabled
- Status area shows "Signed in…"

**Pass / Fail**: ___

---

### Scenario 4 — Recent ▾ Loads and Displays Files

**Steps**:
1. (Already signed in from Scenario 3)
2. Tap "Recent ▾"

**Expected**:
- Button shows "Loading…" and is disabled briefly
- Dropdown opens with up to 10 recent spreadsheet names
- Button returns to "Recent ▾" and is enabled
- File names display in full (no ellipsis)

**Pass / Fail**: ___

---

### Scenario 5 — Select File From Dropdown

**Steps**:
1. (Dropdown open from Scenario 4)
2. Tap any file name in the dropdown

**Expected**:
- Dropdown closes
- Spreadsheet loads (same behaviour as tapping "Load" after typing a name)
- Sheet-selector (`gSheetSelect`) populates with sheet tabs

**Pass / Fail**: ___

---

### Scenario 6 — Outside-Tap Dismisses Dropdown

**Steps**:
1. Tap "Recent ▾" to open dropdown
2. Tap anywhere outside the dropdown

**Expected**:
- Dropdown closes, no file is loaded

**Pass / Fail**: ___

---

### Scenario 7 — Sign Out Disables Recent ▾

**Steps**:
1. (Signed in, dropdown closed)
2. Tap "Sign In" button (which is now "Sign Out")

**Expected**:
- Button changes back to "Sign In"
- "Recent ▾" button is disabled
- Status shows "Signed out"

**Pass / Fail**: ___

---

### Scenario 8 — Narrow Viewport (320 px)

**Steps**:
1. Open DevTools, set viewport to 320 px wide
2. Sign in, tap "Recent ▾"

**Expected**:
- Dropdown spans the full row width
- Long file names wrap to a second line (no horizontal scroll)
- All tap targets are ≥44 px tall

**Pass / Fail**: ___
