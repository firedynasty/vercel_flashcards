"""Fetch a commentary from the HelloAO API (https://bible.helloao.org) and merge it into commentary/<abbrev>.json.
Usage: python -I fetch_helloao.py <commentary-id> "<Source name>" <outdir> <bible_web.json> nm mt ...   (or: ot | nt | all)
Existing chunks from other sources are kept; chunks with the same source name are replaced, so re-runs are safe."""
import json, re, sys, time, urllib.request
from pathlib import Path

IDS = {'gn':'GEN','ex':'EXO','lv':'LEV','nm':'NUM','dt':'DEU','js':'JOS','jud':'JDG','rt':'RUT','1sm':'1SA','2sm':'2SA','1kgs':'1KI','2kgs':'2KI','1ch':'1CH','2ch':'2CH','ezr':'EZR','ne':'NEH','et':'EST','job':'JOB','ps':'PSA','prv':'PRO','ec':'ECC','so':'SNG','is':'ISA','jr':'JER','lm':'LAM','ez':'EZK','dn':'DAN','ho':'HOS','jl':'JOL','am':'AMO','ob':'OBA','jn':'JON','mi':'MIC','na':'NAM','hk':'HAB','zp':'ZEP','hg':'HAG','zc':'ZEC','ml':'MAL','mt':'MAT','mk':'MRK','lk':'LUK','jo':'JHN','act':'ACT','rm':'ROM','1co':'1CO','2co':'2CO','gl':'GAL','eph':'EPH','ph':'PHP','cl':'COL','1ts':'1TH','2ts':'2TH','1tm':'1TI','2tm':'2TI','tt':'TIT','phm':'PHM','hb':'HEB','jm':'JAS','1pe':'1PE','2pe':'2PE','1jo':'1JN','2jo':'2JN','3jo':'3JN','jd':'JUD','re':'REV'}
ORDER = list(IDS)           # bible_web.json order: first 39 are the Old Testament
MAX = 1100

def split_text(text):
    out, cur = [], ''
    for para in re.split(r'\n\n+', text):
        para = re.sub(r'\s*\n\s*', ' ', para).strip()
        if not para: continue
        while len(para) > MAX:
            k = para.rfind('. ', 0, MAX); k = k + 1 if k > 300 else MAX
            if cur: out.append(cur); cur = ''
            out.append(para[:k].strip()); para = para[k:].strip()
        if cur and len(cur) + len(para) > MAX: out.append(cur); cur = ''
        cur = (cur + '\n\n' + para) if cur else para
    if cur: out.append(cur)
    return out

def get(url):
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'spiritual-teacher-build'}), timeout=30) as r:
                return json.load(r)
        except urllib.error.HTTPError as e:
            if e.code == 404: return None
            time.sleep(2 * (attempt + 1))
        except Exception:
            time.sleep(2 * (attempt + 1))
    return None

def main(cid, src, outdir, biblejson, books):
    bible = json.load(open(biblejson))
    nch = {b['abbrev']: len(b['chapters']) for b in bible}
    if books in (['ot'], ['nt'], ['all']):
        books = ORDER[:39] if books == ['ot'] else ORDER[39:] if books == ['nt'] else ORDER
    Path(outdir).mkdir(parents=True, exist_ok=True)
    for ab in books:
        chunks = []
        for ch in range(1, nch[ab] + 1):
            d = get(f'https://bible.helloao.org/api/c/{cid}/{IDS[ab]}/{ch}.json')
            time.sleep(0.15)
            if not d: continue
            items = [x for x in d['chapter']['content'] if x.get('type') == 'verse']
            for i, it in enumerate(items):
                f = it['number']; t = items[i + 1]['number'] - 1 if i + 1 < len(items) else f   # a skipped verse is covered by the entry before it
                txt = '\n\n'.join(p for p in it['content'] if isinstance(p, str)).strip()
                for piece in split_text(txt): chunks.append(dict(c=ch, f=f, t=max(t, f), src=src, title='', text=piece))
        p = Path(outdir) / (ab + '.json')
        old = json.loads(p.read_text(encoding='utf-8')) if p.exists() else []
        merged = [k for k in old if k['src'] != src] + chunks
        merged.sort(key=lambda x: (x['c'], x['f'], x['src']))
        p.write_text(json.dumps(merged, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        print(ab, len(chunks), 'new chunks;', len(merged), 'total', flush=True)

main(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:])
