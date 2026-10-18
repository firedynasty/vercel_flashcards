"""Extract Barnes' NT Notes (CCEL ThML) into per-book JSON: {chapter: {verse: text}}.
Usage: python -I barnes_extract.py <ntnotes.xml> <outdir>"""
import html, json, re, sys
from pathlib import Path

ABBR = {  # osis book -> app abbrev (bible_web.json order)
 'Matt':'mt','Mark':'mk','Luke':'lk','John':'jo','Acts':'act','Rom':'rm','1Cor':'1co','2Cor':'2co','Gal':'gl','Eph':'eph',
 'Phil':'ph','Col':'cl','1Thess':'1ts','2Thess':'2ts','1Tim':'1tm','2Tim':'2tm','Titus':'tt','Phlm':'phm','Heb':'hb',
 'Jas':'jm','1Pet':'1pe','2Pet':'2pe','1John':'1jo','2John':'2jo','3John':'3jo','Jude':'jd','Rev':'re'}

def clean(frag):
    frag = re.sub(r'<h3[^>]*>.*?</h3>', '', frag, flags=re.S)
    frag = re.sub(r'<scripCom[^>]*/>', '', frag)
    frag = re.sub(r'<a class="dblBackBarn".*?</a>', '', frag, flags=re.S)   # "See Barnes ..." cross-links
    frag = re.sub(r'</p>|<br\s*/?>', '\n', frag)
    frag = re.sub(r'<[^>]+>', '', frag)
    frag = html.unescape(frag)
    frag = re.sub(r'[ \t]+', ' ', frag)
    return re.sub(r'\n\s*\n+', '\n', frag).strip()

def main(src, outdir):
    text = Path(src).read_text(encoding='utf-8', errors='replace')
    books = {}
    for m in re.finditer(r'<div3 id="[^"]*"[^>]*title="([^"]+)">(.*?)</div3>', text, flags=re.S):
        body = m.group(2)
        o = re.search(r'osisRef="Bible:([0-9A-Za-z]+)\.(\d+)\.(\d+)"', body)
        if not o or o.group(1) not in ABBR: continue
        t = clean(body)
        t = re.sub(r'^(MATTHEW|MARK|LUKE|JOHN|ACTS|[A-Z0-9 ]+) CHAPTER \d+\s*', '', t)   # per-chapter banner on verse 1
        if len(t) < 20: continue
        books.setdefault(ABBR[o.group(1)], {}).setdefault(o.group(2), {})[o.group(3)] = t
    out = Path(outdir); out.mkdir(parents=True, exist_ok=True)
    for ab, d in books.items():
        (out / (ab + '.json')).write_text(json.dumps(d, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print({ab: sum(len(v) for v in d.values()) for ab, d in books.items()})

main(sys.argv[1], sys.argv[2])
