"""Build per-book commentary chunk files for the Spiritual Teacher RAG.
Output: <outdir>/<abbrev>.json = [{c, f, t, src, title, text}, ...]  (chapter, first/last verse the chunk speaks to)
Sources: Matthew Henry (local MHC HTML), Barnes' NT Notes (extracted by barnes_extract.py).
Usage: python -I build_commentary.py <mhc_dir> <barnes_dir> <outdir> mt:40 nm:04   (abbrev:MHC book number)"""
import html, json, re, sys
from pathlib import Path

MAX = 1100   # chars per chunk

def clean(frag):
    frag = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', frag, flags=re.S | re.I)
    frag = re.sub(r'</?P[^>]*>|<BR\s*/?>', '\n', frag, flags=re.I)
    frag = re.sub(r'<[^>]+>', '', frag)
    frag = html.unescape(frag).replace('\xa0', ' ')
    frag = re.sub(r'[ \t]+', ' ', frag)
    frag = re.sub(r'\n[ \t]*', '\n', frag)
    return re.sub(r'\n{2,}', '\n\n', frag).strip()

def split_text(text):
    out, cur = [], ''
    for para in re.split(r'\n\n+', text):
        para = re.sub(r'\s*\n\s*', ' ', para).strip()
        if not para: continue
        while len(para) > MAX:   # very long paragraph: cut at a sentence end
            k = para.rfind('. ', 0, MAX); k = k + 1 if k > 300 else MAX
            if cur: out.append(cur); cur = ''
            out.append(para[:k].strip()); para = para[k:].strip()
        if cur and len(cur) + len(para) > MAX: out.append(cur); cur = ''
        cur = (cur + '\n\n' + para) if cur else para
    if cur: out.append(cur)
    return out

def mh_chunks(mhc, num, ch, abbr_prefix):
    p = Path(mhc) / f'MHC{num}{ch:03d}.HTM'
    if not p.exists(): return []
    h = p.read_text(encoding='utf-8', errors='replace')
    end = h.find('(End Body)'); h = h[:end] if end > 0 else h
    start = h.find('(Begin Body)'); h = h[start + len('(Begin Body)'):].lstrip(' -->\n') if start >= 0 else h
    # Sections are delimited by the KJV text blocks (<FONT SIZE=+1>..</FONT></P>); the anchors/Sec markers are not reliable.
    blocks = list(re.finditer(r'<FONT SIZE=\+1>(?:(?!</TD>).)*?</FONT>\s*</P>', h, flags=re.S | re.I))
    out = []
    first = blocks[0].start() if blocks else len(h)
    head = h[:first]
    cut = [m.start() for m in re.finditer(r'<A NAME="(?:Sec\d+|' + abbr_prefix + r'%d_\d+)"' % ch, head)]
    ov = clean(re.sub(r'CHAP\.[^\n<]*', '', head[:cut[0]] if cut else head))
    ov = re.sub(r'^[A-Z .]+\n', '', ov).strip()
    for t in split_text(ov): out.append(dict(c=ch, f=1, t=0, src='Matthew Henry', title='Chapter overview', text=t))
    for i, m in enumerate(blocks):
        nxt_start = blocks[i + 1].start() if i + 1 < len(blocks) else len(h)
        between = h[m.end():nxt_start]
        stop = re.search(r'<A NAME="(?:Sec\d+|' + abbr_prefix + r'%d_\d+)"' % ch, between)
        body = between[:stop.start()] if stop else between
        # section title: italic text in the table just before the KJV block
        pre = h[max(0, m.start() - 600):m.start()]
        tm = re.findall(r'<I>(.*?)</I>', pre[pre.rfind('<TABLE'):], flags=re.S) if '<TABLE' in pre else []
        title = clean(tm[0]) if tm else ''
        nums = [int(x) for x in re.findall(r'(?:^|&nbsp;\s*)(\d+)\s', clean(m.group(0)).replace('\n', ' &nbsp; ') )]
        nums = [n for n in re.findall(r'(?:^|\s)(\d{1,3})\s+[A-Za-z]', clean(m.group(0)))]
        nums = [int(n) for n in nums]
        f, t = (min(nums), max(nums)) if nums else (0, 0)
        for txt in split_text(clean(body)):
            out.append(dict(c=ch, f=f, t=t, src='Matthew Henry', title=title, text=txt))
    return out

def barnes_chunks(barnes_dir, abbr):
    p = Path(barnes_dir) / f'{abbr}.json'
    if not p.exists(): return []
    d = json.loads(p.read_text(encoding='utf-8')); out = []
    for ch, vs in d.items():
        for v, txt in vs.items():
            txt = re.sub(r'^\{\w+\} .*$', '', txt, flags=re.M)                       # footnote cross-ref lines
            txt = re.sub(r'\n{2,}', '\n', txt).strip()
            for piece in split_text(txt.replace('\n', '\n\n') if len(txt) > MAX else txt):
                out.append(dict(c=int(ch), f=int(v), t=int(v), src="Barnes' Notes", title='', text=piece))
    return out

def main(mhc, barnes, outdir, specs):
    Path(outdir).mkdir(parents=True, exist_ok=True)
    for spec in specs:
        abbr, num = spec.split(':')
        prefix = {'mt': 'Mt', 'nm': 'Nu'}.get(abbr)
        if not prefix: sys.exit('add the MHC anchor prefix for ' + abbr)
        chunks = []
        for ch in range(1, 200):
            if not (Path(mhc) / f'MHC{num}{ch:03d}.HTM').exists(): break
            chunks += mh_chunks(mhc, num, ch, prefix)
        chunks += barnes_chunks(barnes, abbr)
        chunks.sort(key=lambda x: (x['c'], x['f'], x['src']))
        Path(outdir, abbr + '.json').write_text(json.dumps(chunks, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        n = {}
        for c in chunks: n[c['src']] = n.get(c['src'], 0) + 1
        print(abbr, len(chunks), n)

main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4:])
