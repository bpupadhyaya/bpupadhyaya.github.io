#!/usr/bin/env python3
"""Exhaustive audit: every *.html in this repo must carry the EqualInformation header + sticky footer, BYTE-IDENTICAL to index.html (anchors #x == index.html#x).
Run before EVERY commit that touches this repo:  python3 audit-chrome.py   (exit code 1 = problems; fix them, do not ignore)."""
import glob, re, sys
def part(tag, t):
    m = re.search(r'<%s\b.*?</%s>' % (tag, tag), t, re.S)
    return re.sub(r'href="(index\.html)?#', 'href="#', m.group(0)) if m else None
REF_NAV, REF_FOOT = part('nav', open('index.html').read()), part('footer', open('index.html').read())
bad = []; n = 0
for f in sorted(glob.glob('**/*.html', recursive=True)):
    s = open(f, errors='ignore').read()
    if f.startswith('google') and '<nav' not in s: continue  # Google verification file: no UI
    n += 1
    checks = [('new header (ei-word)', 'ei-word' in s), ('Games link', '#games' in s), ('footer-links', 'footer-links' in s),
              ('<footer', '<footer' in s), ('chrome stylesheet', 'style.css' in s or 'chrome.css' in s), ('menu script', 'toggleMobileMenu' in s)]
    checks += [('nav identical to index.html', part('nav', s) == REF_NAV), ('footer identical to index.html', part('footer', s) == REF_FOOT)]
    miss = [name for name, ok in checks if not ok]
    if miss: bad.append((f, miss))
print(f'{n} pages checked, {len(bad)} with problems')
for f, m in bad: print('  ', f, '->', ', '.join(m))
sys.exit(1 if bad else 0)
