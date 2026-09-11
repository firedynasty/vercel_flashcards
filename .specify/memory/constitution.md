<!--
SYNC IMPACT REPORT (remove before committing)
=============================================
Version change: [TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A — first substantive population of all placeholders
Added sections:
  - Core Principles (5 principles derived from repo + memory context)
  - Content Pipeline Standards
  - Development Workflow
  - Governance
Removed sections: None
Follow-up TODOs:
  - RATIFICATION_DATE set to today (2026-09-10) as no prior date is documented.
-->

# vercel_flashcards Constitution

## Core Principles

### I. Single-File, Universal Design (NON-NEGOTIABLE)

`learn-chinese-tts.html` is the canonical flashcard engine for ALL languages. No per-language
forks or copies are permitted. New language support MUST be added to this single file via
configuration, data, or UI toggles — never by duplicating the file or creating a language-specific
variant. Derived experiment files (e.g., `learn-chinese-tts_sentences.html`) are acceptable as
read-only prototypes but MUST NOT become maintained parallel implementations.

**Rationale**: A previous pattern of per-language ports produced maintenance debt and divergence.
This principle protects against regression to that pattern.

### II. Mobile-First, Touch-Optimized UI

All interactive UI elements MUST be designed for the Samsung Galaxy Z Fold cover screen and similar
narrow-viewport mobile devices. Requirements:

- Touch event handlers take precedence over mouse events.
- No gesture conflicts: pinch-zoom and page scroll MUST NOT be captured or suppressed by app code
  unless the gesture is unambiguously directed at an in-app element (e.g., a zoomable flashcard).
- Tap targets MUST be ≥ 44 × 44 px.
- Responsive layout MUST function on viewports as narrow as 320 px.

**Rationale**: The primary user runs the app daily on a Fold cover screen; desktop/mouse UX is
secondary.

### III. Vanilla HTML/JS Stack — No Build Pipeline

All application files are self-contained HTML pages. The stack is:

- Vanilla JavaScript (ES2020+) — no TypeScript compile step, no bundler.
- CDN-loaded libraries only (jQuery, DataTables, xlsx.js, etc.) — no local `node_modules`.
- Python scripts for offline data generation; their output is committed static JS/JSON files.
- No framework (React, Vue, Svelte, etc.) unless a specific file is explicitly scoped as a
  standalone experiment and does not modify the canonical flashcard file.

**Rationale**: Zero-build-step constraint keeps Vercel deployments instant and the repo
accessible without toolchain setup.

### IV. Content Pipeline: Python-Generated Data, HTML-Consumed

Dynamic content (vocabulary, sentences, audio metadata) is produced offline by Python scripts
that read CSV/XLSX source files and emit static JS or JSON. HTML files consume these outputs.
Rules:

- Python scripts MUST be idempotent; re-running produces identical output given identical input.
- Generated files (e.g., `template_data.js`, `video_array.js`) MUST be committed to the repo —
  they are not build artifacts to be ignored.
- HTML files MUST NOT inline large datasets directly; reference the generated file instead.
- Source CSVs/XLSXs are the authoritative data source; generated JS files are derived.

**Rationale**: Keeps data authoring in spreadsheet tools the user already uses, while keeping
deployment purely static.

### V. Progressive Enhancement for External Integrations

Core flashcard functionality (display cards, play TTS, track progress) MUST work with no
authentication and no network calls beyond CDN asset loading. Google Sheets sync, Supabase
persistence, and other integrations are optional enhancement layers:

- Auth flows MUST be opt-in and gracefully skipped when credentials are absent.
- The app MUST NOT block on a failed external API call; show a clear inline error and fall back
  to local/CSV data.
- New integrations MUST be gated behind a UI toggle or separate setup section, not silently
  activated on load.

**Rationale**: The app is used in contexts with unreliable connectivity; resilient offline-first
behavior is non-negotiable.

## Content Pipeline Standards

- Source data lives in `.csv` or `.xlsx` files in designated folders (`chinese_xlsx/`,
  `spanish_xlsx/`, `python-generate-html-from-csv/sample_csvs/`, etc.).
- Python generation scripts reside at the repo root or in `python-generate-html-from-csv/`.
- Generated JS/JSON output files are committed alongside source data.
- Column-mode selection and sheet/tab selection MUST be controlled by UI radio buttons or
  dropdowns in the HTML, not by editing the generated data file.
- When adding a new language or content type, update `generate_sheets.py` and the relevant
  CSV pipeline; do not create a new standalone Python script unless the pipeline is genuinely
  incompatible.

## Development Workflow

- **Feature addition**: Modify `learn-chinese-tts.html` directly. Test on a mobile viewport
  (≤ 390 px width) before marking complete.
- **Data updates**: Edit source CSV/XLSX → run the relevant Python script → commit both source
  and generated output.
- **Prototyping**: Experiment files (named `learn-chinese-tts_<variant>.html`) are acceptable
  but MUST carry a comment at the top marking them as non-maintained prototypes.
- **Vercel deployment**: The repo root is the Vercel project root. All HTML files are served
  as static pages. The `api/` directory contains serverless function routes.
- **No minification or asset hashing** is required; Vercel's CDN handles caching at the edge.
- Commits touching the canonical flashcard file SHOULD include a manual smoke-test note
  confirming touch interaction and TTS playback were verified.

## Governance

This constitution supersedes all other documented practices for the `vercel_flashcards` project.
Principles I–V are binding; Section-level rules (Content Pipeline Standards, Development
Workflow) are strong guidance that MAY be overridden by explicit user decision with a note in the
commit message.

Amendment procedure:
1. Identify the principle or section to change and the reason.
2. Update this file, increment `CONSTITUTION_VERSION` per semantic versioning rules, and update
   `LAST_AMENDED_DATE`.
3. Include a Sync Impact Report HTML comment (as above) describing the change; remove it before
   or at the next commit after review.

Versioning policy:
- **MAJOR**: A Core Principle is removed or its non-negotiable rule is reversed.
- **MINOR**: A new Core Principle is added, or a section is materially expanded.
- **PATCH**: Wording clarified, typo fixed, non-semantic refinement.

Compliance review: Review this constitution when starting any new feature or integration. If a
proposed change conflicts with a principle, either justify an amendment or redesign the feature
to comply.

**Version**: 1.0.0 | **Ratified**: 2026-09-10 | **Last Amended**: 2026-09-10
