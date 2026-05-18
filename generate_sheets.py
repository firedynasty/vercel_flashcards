#!/usr/bin/env python3
"""Convert an .xlsx workbook into sheets.json for the flashcards app.

Each sheet becomes a key in the JSON object, with rows as arrays of strings.

Usage:
    python generate_sheets.py workbook.xlsx

Output: sheets.json in the current directory.

Deploy:
    rclone copy sheets.json dropbox:/vercel_flashcards
    rclone link dropbox:/vercel_flashcards/sheets.json
    # Then update Vercel with the link (append &raw=1):
    vercel env rm DROPBOX_SHEETS_URL production -y
    echo "<LINK>&raw=1" | vercel env add DROPBOX_SHEETS_URL production
"""

import json
import sys

import openpyxl


def main():
    if len(sys.argv) < 2:
        print("Usage: python generate_sheets.py <workbook.xlsx>")
        sys.exit(1)

    path = sys.argv[1]
    wb = openpyxl.load_workbook(path, read_only=True)
    out = {}

    for name in wb.sheetnames:
        rows = []
        for row in wb[name].iter_rows(values_only=True):
            rows.append([str(c) if c is not None else "" for c in row])
        out[name] = rows

    wb.close()

    with open("sheets.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    print(f"sheets.json written — {len(out)} sheet(s): {', '.join(out.keys())}")
    print()
    print("Deploy commands:")
    print(f"  rclone copy sheets.json dropbox:/vercel_flashcards")
    print(f"  rclone link dropbox:/vercel_flashcards/sheets.json")
    print(f"  # Then: vercel env rm DROPBOX_SHEETS_URL production -y")
    print(f'  # Then: echo "<LINK>&raw=1" | vercel env add DROPBOX_SHEETS_URL production')


if __name__ == "__main__":
    main()
