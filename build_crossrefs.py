#!/usr/bin/env python3
"""Build crossrefs.json for spiritual_teacher.html.

Source: crossRefs.json in the vercel_bible_current project — 29,226 verses,
each with a list of related verses, already in relevance order. That file is
12.7 MB, which is not something to hand a phone.

What comes out is 913 KB: per verse, the chapters its top links land in. The
page only ever offers chapters to read, so the target verse number is dropped,
duplicates collapse, and six chapters per verse is where the quality stops
improving (four loses good links, eight adds noise).

Keys are "<chapter id>.<verse>", values are chapter ids, where a chapter id is
the chapter's position in the whole Bible, 0 for Genesis 1 to 1188 for
Revelation 22. Book order and chapter counts come from bible_web.json, so the
ids mean the same thing on both sides.

    python3 build_crossrefs.py [path/to/crossRefs.json]
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_SRC = os.path.join(
    os.path.dirname(HERE), 'vercel_bible_current', 'public', 'crossRefs.json')
KEEP = 6

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SRC
    bible = json.load(open(os.path.join(HERE, 'bible_web.json')))
    xrefs = json.load(open(src))

    book_of = {b['abbrev']: i for i, b in enumerate(bible)}
    chapter_id, n = {}, 0
    for bi, book in enumerate(bible):
        for c in range(1, len(book['chapters']) + 1):
            chapter_id[(bi, c)] = n
            n += 1

    out, dropped = {}, 0
    for key, links in xrefs.items():
        abbrev, chapter, verse = key.rsplit('-', 2)
        src_id = chapter_id.get((book_of.get(abbrev, -1), int(chapter)))
        if src_id is None:
            dropped += 1
            continue
        seen = []
        for link in links:
            tid = chapter_id.get((book_of.get(link['book'], -1), link['chapter']))
            if tid is not None and tid != src_id and tid not in seen:
                seen.append(tid)
            if len(seen) >= KEEP:
                break
        if seen:
            out['%d.%s' % (src_id, verse)] = seen

    dest = os.path.join(HERE, 'crossrefs.json')
    with open(dest, 'w') as f:
        json.dump(out, f, separators=(',', ':'))
    print('%s: %d verses, %d chapters, %.0f KB (%d source keys skipped)'
          % (os.path.basename(dest), len(out), n, os.path.getsize(dest) / 1024, dropped))

if __name__ == '__main__':
    main()
