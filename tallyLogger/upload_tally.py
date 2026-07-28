#!/usr/bin/env python3
"""Convert tally_log.csv back to JSON and upload it to Dropbox.

Reverse of download_tally.py — the upload OVERWRITES dropbox:/vercel/tally-log.json
with the local CSV's contents. The browser appends to that file whenever you
click "Log it", so entries logged since your last download would be clobbered.
Two ways to stay safe:
  - run download_tally.py first and edit that fresh CSV, or
  - pass --merge: download the current remote JSON and union it with your CSV
    (dedupes on date|time|label, same rule as the web app) before uploading.

Workflow
--------
1. python download_tally.py          # pull latest
2. Edit tally_log.csv (fix labels, add/remove rows)
3. python upload_tally.py            # push back (overwrites remote)

Requirements
------------
- rclone configured with a Dropbox remote named "dropbox"

Usage
-----
  python upload_tally.py
  python upload_tally.py -i tally_log.csv -d dropbox:/vercel
  python upload_tally.py --merge     # union with remote instead of clobbering
  python upload_tally.py -n          # convert only, skip the upload
"""

import argparse
import csv
import json
import subprocess
import sys
from pathlib import Path


DROPBOX_DIR   = 'dropbox:/vercel'
REMOTE_NAME   = 'tally-log.json'
DEFAULT_INPUT = 'tally_log.csv'
OUTPUT_JSON   = 'tally-log.json'


def run(cmd: list[str], desc: str, check: bool = True) -> str:
    """Run a command, print it, exit on failure (unless check=False), return stdout."""
    print(f'\n$ {" ".join(cmd)}')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if check and result.returncode != 0:
        print(f'{desc} failed:\n{result.stderr}', file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def entry_key(e: dict) -> str:
    return f'{e.get("date", "")}|{e.get("time", "")}|{e.get("label", "")}'


def merge_entries(a: list, b: list) -> list:
    """Union two entry lists, dedupe on date|time|label, sort chronologically.

    Mirrors the merge the web app does on every "Log it"."""
    seen = set()
    merged = []
    for e in a + b:
        if not e.get('date') or not e.get('time'):
            continue
        k = entry_key(e)
        if k in seen:
            continue
        seen.add(k)
        merged.append(e)
    merged.sort(key=lambda e: (e['date'], e['time']))
    return merged


def csv_to_entries(csv_path: Path) -> list:
    """Read a date,time,label CSV into a list of entry dicts."""
    with open(csv_path, 'r', encoding='utf-8', newline='') as f:
        reader = csv.DictReader(f)
        if not reader.fieldnames or 'date' not in reader.fieldnames:
            print('Error: CSV must have a header row with at least: date,time,label',
                  file=sys.stderr)
            sys.exit(1)
        entries, skipped = [], 0
        for row in reader:
            date = (row.get('date') or '').strip()
            time = (row.get('time') or '').strip()
            if not date or not time:
                skipped += 1
                continue
            entries.append({'date': date, 'time': time,
                            'label': (row.get('label') or '').strip()})
    if skipped:
        print(f'  warning: skipped {skipped} row(s) missing date or time')
    return entries


def main():
    parser = argparse.ArgumentParser(
        description='Convert tally CSV to JSON and upload to Dropbox (overwrites remote)'
    )
    parser.add_argument('-i', '--input', default=DEFAULT_INPUT,
                        help=f'Source CSV file (default: {DEFAULT_INPUT})')
    parser.add_argument('-d', '--dropbox-dir', default=DROPBOX_DIR,
                        help=f'Dropbox destination directory (default: {DROPBOX_DIR})')
    parser.add_argument('--merge', action='store_true',
                        help='Union the CSV with the current remote JSON instead of overwriting')
    parser.add_argument('-n', '--no-upload', action='store_true',
                        help='Write the JSON locally but skip the Dropbox upload')
    args = parser.parse_args()

    csv_path = Path(args.input)
    if not csv_path.exists():
        print(f'Error: {csv_path} not found', file=sys.stderr)
        sys.exit(1)

    # 1. Convert CSV → entries
    print(f'Reading {csv_path} ...')
    entries = csv_to_entries(csv_path)
    print(f'  {len(entries)} entry(ies) found')

    # 2. Optionally merge with the current remote so browser-logged entries survive
    if args.merge:
        remote_tmp = Path('.tally-log.remote.json')
        remote_path = f'{args.dropbox_dir}/{REMOTE_NAME}'
        run(['rclone', 'copyto', remote_path, str(remote_tmp.resolve())],
            'rclone copyto (remote may not exist yet)', check=False)
        if remote_tmp.exists():
            remote_entries = json.loads(remote_tmp.read_text(encoding='utf-8'))
            remote_tmp.unlink()
            if isinstance(remote_entries, list):
                before = len(entries)
                entries = merge_entries(entries, remote_entries)
                print(f'-> Merged with {len(remote_entries)} remote entry(ies): '
                      f'{before} local -> {len(entries)} total')
        else:
            print('-> No existing remote file to merge with (first upload?)')

    # 3. Write JSON (indent=2, same shape the browser writes)
    out_path = csv_path.parent / OUTPUT_JSON
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(entries, f, indent=2, ensure_ascii=False)
        f.write('\n')
    print(f'-> Wrote {out_path}')

    # 4. Upload to Dropbox
    if args.no_upload:
        print('-> Skipped upload (-n)')
        return 0
    remote_path = f'{args.dropbox_dir}/{REMOTE_NAME}'
    run(['rclone', 'copyto', str(out_path.resolve()), remote_path], 'rclone copyto')
    print(f'-> {out_path.name} has been copied over to {remote_path}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
