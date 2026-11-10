#!/usr/bin/env python3
"""Static sanity checks for talkinghead/ — no JS engine needed.

Catches the bug classes that actually bite here:
  1. unbalanced brackets (gross syntax breakage)
  2. imported names that the source module never exports
  3. $('id') lookups in app.js with no matching id in talkinghead.html

Ported from talkinghead/web/scripts/check.py. Layout differs: the modules
sit in this folder and the page is ../talkinghead.html, because this repo
serves its pages flat from the root.
"""
import re, sys, pathlib

# This folder: the four modules. The page is one level up.
ROOT = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else pathlib.Path(__file__).parent).resolve()
PAGE = ROOT.parent / 'talkinghead.html' 
fail = []

def strip_js(src):
    """Remove strings, template literals, regex-ish and comments, crudely but
    conservatively, so bracket counting is not fooled by text."""
    out, i, n = [], 0, len(src)
    while i < n:
        c = src[i]
        if c == '/' and i + 1 < n and src[i+1] == '/':
            while i < n and src[i] != '\n':
                i += 1
        elif c == '/' and i + 1 < n and src[i+1] == '*':
            i += 2
            while i + 1 < n and not (src[i] == '*' and src[i+1] == '/'):
                i += 1
            i += 2
        elif c in '"\'`':
            q = c
            i += 1
            while i < n:
                if src[i] == '\\':
                    i += 2
                    continue
                if src[i] == q:
                    i += 1
                    break
                # template literal ${...} can contain brackets; keep them
                if q == '`' and src[i] == '$' and i + 1 < n and src[i+1] == '{':
                    depth = 1
                    i += 2
                    out.append('{')
                    while i < n and depth:
                        if src[i] == '{':
                            depth += 1
                        elif src[i] == '}':
                            depth -= 1
                        out.append(src[i])
                        i += 1
                    continue
                i += 1
        else:
            out.append(c)
            i += 1
    return ''.join(out)

files = sorted(ROOT.glob('*.js'))

# ---- 1. bracket balance -------------------------------------------------
pairs = {')': '(', ']': '[', '}': '{'}
for f in files:
    src = strip_js(f.read_text())
    stack = []
    for ch in src:
        if ch in '([{':
            stack.append(ch)
        elif ch in ')]}':
            if not stack or stack[-1] != pairs[ch]:
                fail.append(f"{f.relative_to(ROOT)}: unbalanced '{ch}'")
                break
            stack.pop()
    else:
        if stack:
            fail.append(f"{f.relative_to(ROOT)}: {len(stack)} unclosed {stack[-3:]}")
print(f"bracket balance ....... {len(files)} files")

# ---- 2. imports resolve to real exports --------------------------------
exports = {}
for f in files:
    src = f.read_text()
    names = set()
    for m in re.finditer(r'^export\s+(?:async\s+)?(?:function|const|let|var|class)\s+(\w+)', src, re.M):
        names.add(m.group(1))
    for m in re.finditer(r'^export\s*\{([^}]*)\}', src, re.M):
        for part in m.group(1).split(','):
            part = part.strip().split(' as ')[-1].strip()
            if part:
                names.add(part)
    exports[f.resolve()] = names

imports_checked = 0
for f in files:
    src = f.read_text()
    for m in re.finditer(r'import\s*\{([^}]*)\}\s*from\s*[\'"]([^\'"]+)[\'"]', src):
        spec = m.group(2)
        if not spec.startswith('.'):
            continue
        target = (f.parent / spec).resolve()
        if target not in exports:
            fail.append(f"{f.relative_to(ROOT)}: imports missing file {spec}")
            continue
        for name in m.group(1).split(','):
            name = name.strip().split(' as ')[0].strip()
            if not name:
                continue
            imports_checked += 1
            if name not in exports[target]:
                fail.append(f"{f.relative_to(ROOT)}: '{name}' not exported by {spec}")
print(f"import/export ......... {imports_checked} named imports resolved")

# ---- 3. DOM ids referenced by app.js exist in index.html ----------------
html = PAGE.read_text()
html_ids = set(re.findall(r'id="([^"]+)"', html))
app = (ROOT / 'app.js').read_text()
wanted = set(re.findall(r"\$\('([^']+)'\)", app))
missing = wanted - html_ids
if missing:
    fail.append(f"app.js references ids absent from {PAGE.name}: {sorted(missing)}")
print(f"dom ids ............... {len(wanted)} referenced, {len(html_ids)} defined")

unused = html_ids - wanted
if unused:
    print(f"  (ids in {PAGE.name} not read by app.js: {sorted(unused)})")

# ---- report -------------------------------------------------------------
print()
if fail:
    print("FAIL")
    for x in fail:
        print("  -", x)
    sys.exit(1)
print("all checks passed")
