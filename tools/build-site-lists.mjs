#!/usr/bin/env node
// Regenerates the home page lists from data files (single source of truth):
//   data/apps.json              -> the .app-card items in  <div class="apps-grid" data-paginate="apps">
//   data/standalone-games.json  -> the .game-tile items in <div class="game-grid" data-paginate="games">
//
//   node tools/build-site-lists.mjs           write index.html (+ data/lists/*) when out of date
//   node tools/build-site-lists.mjs --check   exit 1 if anything is out of date (nothing written); use in CI/release checklists
//
// Env: SITE_ROOT (site repo root, default: this repo), LAZY_THRESHOLD (default 40), CHUNK (default 10).
// Small lists (<= LAZY_THRESHOLD) are written as static HTML inside index.html (everything visible without JS).
// Large lists put only the FIRST CHUNK of cards in index.html as static HTML and the rest in
// data/lists/<name>-<n>.html fragments + a compact search index data/lists/<name>.index.json that assets/js/paginate.js
// loads on demand (global search still covers every item). No dependencies.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = process.env.SITE_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LAZY_THRESHOLD = Number(process.env.LAZY_THRESHOLD || 40);
const CHUNK = Number(process.env.CHUNK || 10);
const check = process.argv.includes('--check');
const htmlFile = path.join(root, 'index.html');

const errors = [];
const fail = (m) => errors.push(m);
const nonEmpty = (v) => typeof v === 'string' && v.trim() !== '';
const STATUSES = ['live', 'in-review', 'soon'];

// ---------- text helpers ----------
const esc = (t) => String(t)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  .replace(/·/g, '&middot;').replace(/’/g, '&rsquo;').replace(/‘/g, '&lsquo;')
  .replace(/—/g, '&mdash;').replace(/–/g, '&ndash;').replace(/↗/g, '&#8599;');
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', nbsp: ' ', middot: '·', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', apos: "'", hellip: '…' };
const decode = (t) => t.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => {
  if (e[0] === '#') { const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return String.fromCodePoint(n); }
  return ENT[e] !== undefined ? ENT[e] : m;
});
const norm = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// same recipe as paginate.js: visible text + data-search + img alt + platform words
function searchText(html, extra) {
  let t = decode(html.replace(/<template[\s\S]*?<\/template>/g, '').replace(/<[^>]+>/g, ' '));
  (html.match(/data-search="[^"]*"/g) || []).forEach((m) => { t += ' ' + decode(m.slice(13, -1)); });
  (html.match(/<img[^>]*\salt="[^"]*"/g) || []).forEach((m) => { t += ' ' + decode(m.replace(/^[\s\S]*\salt="/, '').slice(0, -1)); });
  const hrefs = (html.match(/href="[^"]*"/g) || []).join(' ');
  if (/apps\.apple\.com/.test(hrefs)) t += ' ios iphone ipad app store';
  if (/play\.google\.com/.test(hrefs)) t += ' android google play';
  return norm(t + ' ' + (extra || ''));
}
const uniqWords = (s) => [...new Set(s.split(' ').filter(Boolean))].join(' ');

// ---------- per-type definitions ----------
const storeNames = { appStore: 'the App Store', googlePlay: 'Google Play' };
const storeLabel = (st, name) => (st === 'live' ? 'Live on ' : st === 'in-review' ? 'In review on ' : 'Coming soon on ') + name;
function gameStatusLine(g) {
  const a = g.stores.appStore.status, p = g.stores.googlePlay.status;
  const s = a === p ? storeLabel(a, 'the App Store and Google Play')
    : ['appStore', 'googlePlay'].map((k) => storeLabel(g.stores[k].status, storeNames[k])).join(' · ');
  return `${a === 'soon' && p === 'soon' ? '' : `v${g.version} · `}${s}${g.statusNote ? ` (${g.statusNote})` : ''}`;
}

const TYPES = {
  apps: {
    file: 'data/apps.json', container: 'apps', sep: '\n\n', idOf: (g) => 'app-' + g.slug, label: 'Apps',
    validate(g, w) {
      for (const k of ['slug', 'cardClass', 'iconHtml', 'titleHtml', 'descriptionHtml']) if (!nonEmpty(g[k])) fail(`${w}: missing required field "${k}"`);
      if (!g.tag || !nonEmpty(g.tag.class) || !nonEmpty(g.tag.html)) fail(`${w}: tag needs class and html`);
      if (!Array.isArray(g.platforms)) fail(`${w}: platforms must be an array`);
      else g.platforms.forEach((p) => { if (!(nonEmpty(p.label) || nonEmpty(p.html))) fail(`${w}: platform needs label or html`); });
      if (!Array.isArray(g.footerHtml) || !g.footerHtml.length) fail(`${w}: footerHtml must be a non-empty array of lines`);
    },
    render(g) {
      const L = [];
      L.push(`        <div id="app-${g.slug}" class="${g.cardClass}"${g.cardAttrs ? ' ' + g.cardAttrs : ''}>`);
      L.push(`            <div class="${['app-icon', g.iconClass].filter(Boolean).join(' ')}"${g.iconAttrs ? ' ' + g.iconAttrs : ''}>${g.iconHtml}</div>`);
      L.push(`            <h3>${g.titleHtml}</h3>`);
      L.push(`            <span class="tag ${g.tag.class}"${g.tag.style ? ` style="${g.tag.style}"` : ''}>${g.tag.html}</span>`);
      L.push(`            <p>`, `                ${g.descriptionHtml}`, `            </p>`);
      L.push(`            <div class="app-platforms">`);
      g.platforms.forEach((p) => {
        if (p.html) L.push(`                ${p.html}`);
        else if (p.href) L.push(`                <a href="${p.href}" target="_blank" class="platform-badge" style="text-decoration: none; color: inherit;">${p.label}</a>`);
        else L.push(`                <span class="platform-badge"${p.attrs ? ' ' + p.attrs : ''}>${p.label}</span>`);
      });
      L.push(`            </div>`, `            <div style="margin-top: 12px; font-size: 12px;">`);
      g.footerHtml.forEach((l) => L.push(`                ${l}`));
      L.push(`            </div>`, `        </div>`);
      return L.join('\n');
    },
    extraSearch: () => '',
  },
  games: {
    file: 'data/standalone-games.json', container: 'games', sep: '\n', idOf: (g) => 'game-' + g.slug, label: 'Games',
    validate(g, w) {
      for (const k of ['slug', 'title', 'bannerAlt', 'banner', 'icon', 'meta', 'description', 'version', 'status', 'supportHref', 'privacyHref']) if (!nonEmpty(g[k])) fail(`${w}: missing required field "${k}"`);
      if (nonEmpty(g.slug) && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(g.slug)) fail(`${w}: slug must be lowercase letters/digits/hyphens`);
      if (!STATUSES.includes(g.status)) fail(`${w}: status must be one of ${STATUSES.join(', ')}`);
      if (!g.stores || typeof g.stores !== 'object') fail(`${w}: missing "stores" {appStore, googlePlay}`);
      else for (const s of ['appStore', 'googlePlay']) {
        const st = g.stores[s];
        if (!st || !STATUSES.includes(st.status)) { fail(`${w}: stores.${s}.status must be one of ${STATUSES.join(', ')}`); continue; }
        if (st.status === 'live' && !/^https:\/\//.test(st.url || '')) fail(`${w}: stores.${s} is live but has no https url`);
      }
      if (g.demo && (!nonEmpty(g.demo.label) || !nonEmpty(g.demo.href))) fail(`${w}: demo needs label and href`);
      for (const k of ['banner', 'icon', 'supportHref', 'privacyHref'])
        if (nonEmpty(g[k]) && !/^https?:/.test(g[k]) && !fs.existsSync(path.join(root, g[k]))) fail(`${w}: ${k} file not found: ${g[k]}`);
    },
    render(g) {
      const L = [];
      L.push(`        <article id="game-${g.slug}" class="game-tile"${g.keywords && g.keywords.length ? ` data-search="${esc(g.keywords.join(' '))}"` : ''}>`);
      L.push(`            <a class="game-tile-art" style="--art:url(${g.banner})" href="${esc(g.supportHref)}" target="_blank" rel="noopener">`);
      L.push(`                <img src="${esc(g.banner)}" alt="${esc(g.bannerAlt)}" loading="lazy" width="1024" height="500">`, `            </a>`);
      L.push(`            <div class="game-tile-body">`, `                <div class="game-tile-head">`);
      L.push(`                    <img class="game-icon" src="${esc(g.icon)}" alt="" width="64" height="64">`, `                    <div>`);
      L.push(`                        <h3>${esc(g.title)}</h3>`, `                        <div class="game-meta">${esc(g.meta)}</div>`, `                    </div>`, `                </div>`);
      L.push(`                <p>`, `                    ${esc(g.description)}`, `                </p>`);
      L.push(`                <div class="game-status">${esc(gameStatusLine(g))}</div>`);
      const btns = [];
      if (g.stores.appStore.status === 'live') btns.push(`<a class="store-btn primary" href="${esc(g.stores.appStore.url)}" target="_blank" rel="noopener">View on App Store &#8599;</a>`);
      if (g.stores.googlePlay.status === 'live') btns.push(`<a class="store-btn primary" href="${esc(g.stores.googlePlay.url)}" target="_blank" rel="noopener">Get it on Google Play &#8599;</a>`);
      if (g.demo) btns.push(`<a class="store-btn" href="${esc(g.demo.href)}" target="_blank" rel="noopener">${esc(g.demo.label)} &#8599;</a>`);
      if (btns.length) { L.push(`                <div class="af-actions">`); btns.forEach((b) => L.push(`                    ${b}`)); L.push(`                </div>`); }
      L.push(`                <div class="af-links">`);
      L.push(`                    <a href="${esc(g.privacyHref)}" target="_blank" rel="noopener">Privacy</a>`);
      L.push(`                    <a href="${esc(g.supportHref)}" target="_blank" rel="noopener">App Support</a>`, `                </div>`, `            </div>`, `        </article>`);
      return L.join('\n');
    },
    extraSearch: () => 'game standalone',
  },
};

// ---------- load, validate, sort ----------
const dateKey = (g) => (g.date ? Date.parse(g.date) || 0 : 0);
function load(name, T) {
  const f = path.join(root, T.file);
  let arr;
  try { arr = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { fail(`${T.file}: cannot read/parse: ${e.message}`); return []; }
  if (!Array.isArray(arr)) { fail(`${T.file}: must be a JSON array`); return []; }
  const seen = new Set();
  arr.forEach((g, i) => {
    const w = `${T.file} entry #${i + 1} (${g && g.slug})`;
    if (!g || typeof g !== 'object') return fail(w + ': not an object');
    if (g.order !== undefined && typeof g.order !== 'number') fail(`${w}: order must be a number`);
    if (g.featured !== undefined && typeof g.featured !== 'boolean') fail(`${w}: featured must be true/false`);
    if (g.date !== undefined && isNaN(Date.parse(g.date))) fail(`${w}: date must be YYYY-MM-DD`);
    T.validate(g, w);
    if (nonEmpty(g.slug)) { if (seen.has(g.slug)) fail(`${w}: duplicate slug`); seen.add(g.slug); }
  });
  // sort: featured first, then explicit order ascending, then newest date first, then slug
  return arr.map((g, i) => [g, i]).sort((a, b) =>
    ((b[0].featured ? 1 : 0) - (a[0].featured ? 1 : 0)) ||
    ((a[0].order ?? 1e9) - (b[0].order ?? 1e9)) ||
    (dateKey(b[0]) - dateKey(a[0])) ||
    String(a[0].slug).localeCompare(String(b[0].slug))).map((x) => x[0]);
}
const lists = {};
for (const [name, T] of Object.entries(TYPES)) lists[name] = load(name, T);
if (errors.length) { console.error('build-site-lists: ' + errors.length + ' problem(s):\n  - ' + errors.join('\n  - ')); process.exit(1); }

// ---------- generate ----------
let html = fs.readFileSync(htmlFile, 'utf8');
const outputs = new Map(); // path -> content (data/lists files)
const hash = crypto.createHash('sha1');
for (const name of Object.keys(TYPES)) hash.update(fs.readFileSync(path.join(root, TYPES[name].file)));
hash.update(`${LAZY_THRESHOLD}/${CHUNK}`);
const ver = hash.digest('hex').slice(0, 8);

const summary = [];
for (const [name, T] of Object.entries(TYPES)) {
  const items = lists[name];
  const cards = items.map((g) => T.render(g));
  const lazy = items.length > LAZY_THRESHOLD;
  let body;
  if (!lazy) body = cards.join(T.sep);
  else {
    const pieces = [];
    for (let i = 0; i < cards.length; i += CHUNK) pieces.push(cards.slice(i, i + CHUNK).join(T.sep));
    pieces.forEach((p, i) => outputs.set(`data/lists/${name}-${i + 1}.html`, p.replace(/^ {8}/gm, '') + '\n'));
    outputs.set(`data/lists/${name}.index.json`, JSON.stringify({
      v: ver, chunk: CHUNK, total: items.length,
      items: items.map((g, i) => [T.idOf(g), uniqWords(searchText(cards[i], T.extraSearch()))]),
    }) + '\n');
    body = `        <template data-paginate-lazy="data/lists/${name}.index.json?v=${ver}" data-v="${ver}" data-chunk="${CHUNK}" data-total="${items.length}"></template>\n` + pieces[0];
  }
  const begin = `<!-- LIST:BEGIN ${name} (generated by tools/build-site-lists.mjs from ${T.file}; do not hand-edit) -->`;
  const re = new RegExp(`[ \\t]*<!-- LIST:BEGIN ${name}[^>]*-->\\n[\\s\\S]*?<!-- LIST:END ${name} -->`);
  if (!re.test(html)) { console.error(`build-site-lists: markers "LIST:BEGIN ${name}" / "LIST:END ${name}" not found in index.html`); process.exit(1); }
  html = html.replace(re, () => `        ${begin}\n${body}\n        <!-- LIST:END ${name} -->`);
  summary.push(`${name}: ${items.length} items, ${lazy ? 'lazy (first ' + CHUNK + ' static + ' + Math.ceil(items.length / CHUNK) + ' chunks)' : 'all static'}`);
}

// ---------- write / check ----------
const listsDir = path.join(root, 'data', 'lists');
const existing = fs.existsSync(listsDir) ? fs.readdirSync(listsDir).map((f) => 'data/lists/' + f) : [];
const stale = existing.filter((f) => !outputs.has(f));
const changed = [];
if (fs.readFileSync(htmlFile, 'utf8') !== html) changed.push('index.html');
for (const [p, c] of outputs) { const f = path.join(root, p); if (!fs.existsSync(f) || fs.readFileSync(f, 'utf8') !== c) changed.push(p); }
stale.forEach((p) => changed.push(p + ' (remove)'));
if (check) {
  if (changed.length) { console.error('OUT OF DATE: ' + changed.length + ' generated file(s) differ from the data files: ' + changed.slice(0, 5).join(', ') + (changed.length > 5 ? ', ...' : '') + '\nFIX: node tools/build-site-lists.mjs'); process.exit(1); }
  console.log('OK: generated lists are in sync with data files (' + summary.join('; ') + ')'); process.exit(0);
}
if (changed.length) {
  fs.mkdirSync(listsDir, { recursive: true });
  fs.writeFileSync(htmlFile, html);
  for (const [p, c] of outputs) fs.writeFileSync(path.join(root, p), c);
  stale.forEach((p) => fs.unlinkSync(path.join(root, p)));
}
console.log((changed.length ? `updated ${changed.length} file(s)` : 'already up to date') + ' - ' + summary.join('; '));
