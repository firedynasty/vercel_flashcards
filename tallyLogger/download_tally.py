#!/usr/bin/env python3
"""Download tally-log.json from Dropbox and convert it to CSV.

Companion to tallyLogger/index.html (which appends timestamped entries to
dropbox:/vercel/tally-log.json from the browser). Run this to pull the log
down and get a spreadsheet-friendly CSV — same columns as the page's
"Download .csv" button: date,time,label.

Workflow
--------
1. Browser: click "Log it" (entries sync to Dropbox when signed in)
2. Run:  python download_tally.py
   - Downloads JSON from Dropbox via rclone
   - Writes tally_log.csv (and keeps the raw tally-log.json alongside it)

Requirements
------------
- rclone configured with a Dropbox remote named "dropbox"

Usage
-----
  python download_tally.py
  python download_tally.py -d dropbox:/vercel -o tally_log.csv
"""

import argparse
import csv
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path


DROPBOX_DIR    = 'dropbox:/vercel'
REMOTE_NAME    = 'tally-log.json'
LOCAL_JSON     = 'tally-log.json'
DEFAULT_OUTPUT = 'tally_log.csv'


def run(cmd: list[str], desc: str) -> str:
    """Run a command, print it, exit on failure, return stdout."""
    print(f'\n$ {" ".join(cmd)}')
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print(f'{desc} failed:\n{result.stderr}', file=sys.stderr)
        sys.exit(1)
    return result.stdout.strip()


def main():
    parser = argparse.ArgumentParser(
        description='Download tally log JSON from Dropbox and convert to CSV'
    )
    parser.add_argument('-d', '--dropbox-dir', default=DROPBOX_DIR,
                        help=f'Dropbox source directory (default: {DROPBOX_DIR})')
    parser.add_argument('-o', '--output', default=DEFAULT_OUTPUT,
                        help=f'Output CSV file (default: {DEFAULT_OUTPUT})')
    args = parser.parse_args()

    json_path = Path(LOCAL_JSON)

    # 1. Download JSON from Dropbox
    remote_path = f'{args.dropbox_dir}/{REMOTE_NAME}'
    run(['rclone', 'copyto', remote_path, str(json_path.resolve())], 'rclone copyto')
    print(f'-> Downloaded {remote_path}')

    # 2. Load JSON
    entries = json.loads(json_path.read_text(encoding='utf-8'))
    if not isinstance(entries, list):
        print('Error: expected a JSON array of entries', file=sys.stderr)
        sys.exit(1)
    print(f'  {len(entries)} entry(ies) found')

    # 3. Write CSV (csv module quotes labels containing commas)
    out_path = Path(args.output)
    with open(out_path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.writer(f)
        writer.writerow(['date', 'time', 'label'])
        for e in entries:
            writer.writerow([e.get('date', ''), e.get('time', ''), e.get('label', '')])
    print(f'-> Wrote {out_path}')

    # 4. Per-day summary
    counts = Counter(e.get('date', '') for e in entries)
    for day in sorted(counts):
        print(f'  {day}: {counts[day]}')

    return 0


if __name__ == '__main__':
    raise SystemExit(main())
