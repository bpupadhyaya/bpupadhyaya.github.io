# bpupadhyaya.github.io (equalinformation.com) - rules for every agent working in this repo

READ FIRST, EVERY TIME you change a header, footer, menu, logo, wordmark, colors, a shared page element, or add a page:
1. `CHROME-README.md` (this repo) and `~/coding_common/pvt/dotfiles/global-memory/site-chrome-change-checklist.md` (full procedure, SCOPE RULE, LESSONS LEARNED).
2. Every page carries its own copy of the nav/footer markup: use a script over ALL `*.html`, never hand-edit a few pages. Shared CSS = `style.css`; after changing header/footer/brand CSS run `python3 build-chrome-css.py` (regenerates `chrome.css` for the pages with their own design).
3. BEFORE committing run `python3 audit-chrome.py` (must print 0 problems), LOOK at screenshots at desktop and phone width, then commit + push and tell the owner exactly which files changed.
4. A NEW page must start from an existing page's `<nav>`, `<footer>` and scripts (copy `privacy-sristi.html`) and be added to the relevant dropdown lists on every page.
5. Scope: only this repo gets the navy/crimson chrome. Separate sites under equalinformation.com (insurance-site, tools, global-intelligence-site, ...) keep their own branding; the Arcforge games site has the Arcforge look.
