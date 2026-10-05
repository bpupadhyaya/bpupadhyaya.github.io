# bpupadhyaya.github.io (equalinformation.com) - rules for every agent working in this repo

READ FIRST, EVERY TIME you change a header, footer, menu, logo, wordmark, colors, a shared page element, or add a page:
1. `CHROME-README.md` (this repo) and `~/coding_common/pvt/dotfiles/global-memory/site-chrome-change-checklist.md` (full procedure, SCOPE RULE, LESSONS LEARNED).
2. Every page carries its own copy of the nav/footer markup: use a script over ALL `*.html`, never hand-edit a few pages. Shared CSS = `style.css`; after changing header/footer/brand CSS run `python3 build-chrome-css.py` (regenerates `chrome.css` for the pages with their own design).
3. BEFORE committing run `python3 audit-chrome.py` (must print 0 problems), LOOK at screenshots at desktop and phone width, then commit + push and tell the owner exactly which files changed.
4. A NEW page must start from an existing page's `<nav>`, `<footer>` and scripts (copy `privacy-sristi.html`) and be added to the relevant dropdown lists on every page.
5. Scope: only this repo gets the navy/crimson chrome. Separate sites under equalinformation.com (insurance-site, tools, global-intelligence-site, ...) keep their own branding; the Arcforge games site has the Arcforge look.

## Home page Apps + Standalone games lists are GENERATED from data (never hand-edit the cards)
- `data/apps.json` -> the `.app-card` items in `#apps`; `data/standalone-games.json` -> the `.game-tile` items in `#games`. Both are rendered by ONE script between `<!-- LIST:BEGIN <name> -->` / `<!-- LIST:END <name> -->` markers in `index.html`: `node tools/build-site-lists.mjs` (writes) or `... --check` (exit 1 if out of date). No npm, no dependencies. `python3 audit-chrome.py` runs the check too and fails when the generated blocks are stale.
- **Add an app:** append an entry to `data/apps.json` (copy an existing one; `*Html` fields are raw HTML), run the script, review `git diff`, commit data + `index.html` (+ `data/lists/`), push.
- **Add / flip a standalone game:** do NOT type it. From release-ops run `node release-ops/_tools/site-standalone-entry.mjs <app> --status in-review|live [--appstore-url U] [--play-url U]` (or `--from-all`, `--check`); it derives everything from `app.release.json`, the games repo and the store assets, upserts `data/standalone-games.json`, runs the script, and prints the commit/push commands. Needs `app-support-<app>.html` + `privacy-<app>.html` in this repo first.
- Ordering: `featured: true` first, then `order` ascending, then `date` newest first, then slug. Optional per-entry `keywords` feed the home-page search.
- Scale: lists up to 40 items are fully static HTML (works without JS). Above that the script writes only the first 10 cards into `index.html` plus `data/lists/<name>.index.json` (compact search index, all items) and `data/lists/<name>-<n>.html` page fragments that `assets/js/paginate.js` fetches on demand (`LAZY_THRESHOLD`/`CHUNK` env vars override). Commit `data/lists/` with the data file. `data/` is not a page: the audit skips it.
- Entry schemas: see the validation in `tools/build-site-lists.mjs` (it prints every problem with the entry number and field).
