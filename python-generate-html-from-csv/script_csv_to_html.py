#!/usr/bin/env python3
"""Bake an input file into a standalone copy of learn-chinese-tts.html.

Usage:
    python3 script_csv_to_html.py input.csv            # 3-column CSV (default)
    python3 script_csv_to_html.py input.csv -f 2       # 2-column CSV
    python3 script_csv_to_html.py input.txt -f 0       # multi-line block format
    # -> learn-chinese-tts_<name>.html next to the template

-f / --format:
    3  (default) term,pronunciation,definition
    2  term,definition
    0  multi-line blocks — blank-line-separated, each field on its own line;
       purely numeric blocks (verse refs like "10", "11a") are skipped
"""
import argparse
import csv
import io
import json
import re
import sys
from pathlib import Path

TEMPLATE = Path(__file__).resolve().parent.parent / 'learn-chinese-tts.html'


def convert_multiline_blocks_to_csv(text: str) -> str:
    """Convert blank-line-separated multi-line blocks to CSV."""
    blocks = re.split(r'\n{2,}', text.replace('\r\n', '\n').replace('\r', '\n'))

    # Detect lines-per-card from first valid (non-numeric) block
    lines_per_card = 3
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if lines and not all(re.fullmatch(r'\d+[a-z]?', l, re.IGNORECASE) for l in lines):
            lines_per_card = len(lines)
            break

    rows = []
    for block in blocks:
        lines = [l.strip() for l in block.splitlines() if l.strip()]
        if not lines:
            continue
        if all(re.fullmatch(r'\d+[a-z]?', l, re.IGNORECASE) for l in lines):
            continue  # skip verse-ref / numeric-only blocks
        if len(lines) != lines_per_card:
            continue
        rows.append(lines)

    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(['term', 'pronunciation', 'definition'] if lines_per_card == 3 else ['term', 'definition'])
    for r in rows:
        writer.writerow(r)
    return out.getvalue()


def main():
    ap = argparse.ArgumentParser(description='Generate a standalone flashcard HTML with data baked in.')
    ap.add_argument('input', help='Path to the input file (.csv or .txt)')
    ap.add_argument('-f', '--format', type=int, choices=[0, 2, 3], default=3,
                    help='Input format: 3=term,pronunciation,definition (default)  2=term,definition  0=multi-line blocks')
    ap.add_argument('-o', '--output',
                    help='Output .html path (default: learn-chinese-tts_<name>.html next to the template)')
    ap.add_argument('-t', '--template', default=str(TEMPLATE),
                    help='Template HTML (default: learn-chinese-tts.html at the repo root)')
    ap.add_argument('--no-table', action='store_true',
                    help='Boot into lyrics view instead of table view')
    args = ap.parse_args()

    input_path = Path(args.input).expanduser().resolve()
    if not input_path.is_file():
        sys.exit(f'error: input not found: {input_path}')
    raw_text = input_path.read_text(encoding='utf-8-sig')  # utf-8-sig strips Excel BOM

    if args.format == 0:
        csv_text = convert_multiline_blocks_to_csv(raw_text)
        col_mode = 3 if csv_text.startswith('term,pronunciation') else 2
    else:
        csv_text = raw_text
        col_mode = args.format

    template_path = Path(args.template).expanduser()
    if not template_path.is_file():
        sys.exit(f'error: template not found: {template_path}')
    html = template_path.read_text(encoding='utf-8')

    out_path = (Path(args.output).expanduser() if args.output
                else template_path.resolve().parent / f'learn-chinese-tts_{input_path.stem}.html')

    # JSON-encode the CSV, then neutralize "</" so the data can't close the script block
    data_js = json.dumps(csv_text, ensure_ascii=False).replace('</', '<\\/')
    name_js = json.dumps(input_path.name)

    embed = (
        '<style>\n'
        '/* script_csv_to_html.py: hide setup UI not needed in baked copies */\n'
        '/* direct-child :has(>) — a plain descendant match would also hide ancestor wrappers and blank the page */\n'
        'div:has(> #pasteCsvInput), div:has(> #dbxAuthBtn) { display: none !important; }\n'
        '</style>\n'
        '<script>\n'
        '// Baked in by script_csv_to_html.py — consumed by the INIT block\n'
        f'var EMBEDDED_CSV_TEXT = {data_js};\n'
        f'var EMBEDDED_CSV_NAME = {name_js};\n'
        f'var EMBEDDED_TABLE_VIEW = {"false" if args.no_table else "true"};\n'
        f'var EMBEDDED_COL_MODE = {col_mode};\n'
        '</script>\n'
    )

    # Insert right before the main inline script (the one declaring filteredRows)
    anchor = html.find('let filteredRows')
    if anchor == -1:
        sys.exit('error: "let filteredRows" not found — is the template learn-chinese-tts.html?')
    script_tag = html.rfind('<script', 0, anchor)
    if script_tag == -1:
        sys.exit('error: could not find the main <script> tag in the template')
    html = html[:script_tag] + embed + html[script_tag:]

    out_path.write_text(html, encoding='utf-8')
    data_rows = sum(1 for ln in csv_text.splitlines() if ln.strip()) - 1  # minus header
    print(f'wrote {out_path}  ({max(data_rows, 0)} rows, format={args.format}, table view {"off" if args.no_table else "on"})')


if __name__ == '__main__':
    main()
