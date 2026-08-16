#!/usr/bin/env python3
"""Bake a .csv into a standalone copy of learn-google.html.

Usage:
    python3 script_google_csv_to_html.py path/to/words.csv
    # -> learn-google_words.html at the repo root, next to the template
    #    (auto-loads the CSV into deck view on open)

The generated file carries its data inside the page (EMBEDDED_CSV_TEXT), so
opening it skips the paste/Dropbox UI and renders the CSV immediately.
Same parsing as the Paste CSV button — it feeds the embedded text through the
page's own loadPastedCsv(). Note: jQuery/DataTables/XLSX still load from CDN,
so the page still needs internet on first open.
"""
import argparse
import json
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / 'learn-google.html'


def main():
    ap = argparse.ArgumentParser(description='Generate a standalone flashcard HTML with a CSV baked in.')
    ap.add_argument('csv', help='Path to the .csv file (term, definition)')
    ap.add_argument('-o', '--output',
                    help='Output .html path (default: learn-google_<name>.html next to the template)')
    ap.add_argument('-t', '--template', default=str(TEMPLATE),
                    help='Template HTML (default: learn-google.html at the repo root, one level up)')
    args = ap.parse_args()

    csv_path = Path(args.csv).expanduser().resolve()
    if not csv_path.is_file():
        sys.exit(f'error: CSV not found: {csv_path}')
    csv_text = csv_path.read_text(encoding='utf-8-sig')  # utf-8-sig strips an Excel BOM

    template_path = Path(args.template).expanduser()
    if not template_path.is_file():
        sys.exit(f'error: template not found: {template_path}')
    html = template_path.read_text(encoding='utf-8')

    out_path = (Path(args.output).expanduser() if args.output
                else template_path.resolve().parent / f'learn-google_{csv_path.stem}.html')

    # JSON-encode the CSV, then neutralize "</" so the data can't close the script block
    data_js = json.dumps(csv_text, ensure_ascii=False).replace('</', '<\\/')
    name_js = json.dumps(csv_path.name)

    embed = (
        '<style>\n'
        '/* script_google_csv_to_html.py: hide setup UI not needed in baked copies */\n'
        'div:has(> #pasteCsvInput), div:has(> #dbxAuthBtn) { display: none !important; }\n'
        '</style>\n'
        '<script>\n'
        '// Baked in by script_google_csv_to_html.py — consumed after page scripts load\n'
        f'var EMBEDDED_CSV_TEXT = {data_js};\n'
        f'var EMBEDDED_CSV_NAME = {name_js};\n'
        '// setTimeout defers until after all inline scripts have parsed and run\n'
        'if (EMBEDDED_CSV_TEXT) {\n'
        '  setTimeout(function() {\n'
        '    var ta = document.getElementById("pasteCsvInput");\n'
        '    if (ta) ta.value = EMBEDDED_CSV_TEXT;\n'
        '    if (typeof loadPastedCsv === "function") loadPastedCsv();\n'
        '  }, 0);\n'
        '}\n'
        '</script>\n'
    )

    # Insert right before the main inline script (the one declaring allVocab)
    anchor = html.find('var allVocab')
    if anchor == -1:
        sys.exit('error: "var allVocab" not found — is the template learn-google.html?')
    script_tag = html.rfind('<script', 0, anchor)
    if script_tag == -1:
        sys.exit('error: could not find the main <script> tag in the template')
    html = html[:script_tag] + embed + html[script_tag:]

    out_path.write_text(html, encoding='utf-8')
    lines = sum(1 for ln in csv_text.splitlines() if ln.strip()) - 1  # minus header
    print(f'wrote {out_path}  ({max(lines, 0)} data rows)')


if __name__ == '__main__':
    main()
