#!/usr/bin/env python3
"""Exhaustive audit: every *.html in this repo must carry the EqualInformation header + sticky footer.
Run before EVERY commit that touches this repo:  python3 audit-chrome.py   (exit code 1 = problems; fix them, do not ignore)."""
import glob, sys
bad = []; n = 0
for f in sorted(glob.glob('**/*.html', recursive=True)):
    s = open(f, errors='ignore').read()
    if f.startswith('google') and '<nav' not in s: continue  # Google verification file: no UI
    n += 1
    checks = [('new header (ei-word)', 'ei-word' in s), ('Games link', '#games' in s), ('footer-links', 'footer-links' in s),
              ('<footer', '<footer' in s), ('chrome stylesheet', 'style.css' in s or 'chrome.css' in s), ('menu script', 'toggleMobileMenu' in s)]
    miss = [name for name, ok in checks if not ok]
    if miss: bad.append((f, miss))
print(f'{n} pages checked, {len(bad)} with problems')
for f, m in bad: print('  ', f, '->', ', '.join(m))
sys.exit(1 if bad else 0)
